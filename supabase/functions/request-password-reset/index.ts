import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  email: string;
}

function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email }: RequestBody = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "L'adresse email est requise" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();

    if (userError) {
      throw userError;
    }

    const user = userData.users.find(u => u.email === email.toLowerCase());

    if (!user) {
      return new Response(
        JSON.stringify({ message: "Si cet email existe, un nouveau mot de passe a été envoyé" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: recentReset } = await supabase
      .from('password_resets')
      .select('created_at')
      .eq('user_id', user.id)
      .gte('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
      .maybeSingle();

    if (recentReset) {
      return new Response(
        JSON.stringify({ error: "Vous devez attendre 10 minutes entre chaque demande" }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await hashPassword(temporaryPassword);

    const { error: insertError } = await supabase
      .from('password_resets')
      .insert({
        user_id: user.id,
        temporary_password_hash: passwordHash,
      });

    if (insertError) {
      throw insertError;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name, username')
      .eq('id', user.id)
      .maybeSingle();

    const { data: brevoSettings } = await supabase
      .from('brevo_settings')
      .select('*')
      .maybeSingle();

    if (brevoSettings?.api_key && brevoSettings?.template_password_reset) {
      const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': brevoSettings.api_key,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: {
            name: brevoSettings.sender_name,
            email: brevoSettings.sender_email,
          },
          to: [{ email: user.email }],
          templateId: brevoSettings.template_password_reset,
          params: {
            first_name: profile?.first_name || '',
            last_name: profile?.last_name || '',
            username: profile?.username || '',
            temporary_password: temporaryPassword,
          },
        }),
      });

      if (!brevoResponse.ok) {
        const errorData = await brevoResponse.json();
        console.error('Brevo error:', errorData);
        throw new Error('Erreur lors de l\'envoi de l\'email');
      }
    }

    return new Response(
      JSON.stringify({ message: "Si cet email existe, un nouveau mot de passe a été envoyé" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error('Password reset error:', error);
    return new Response(
      JSON.stringify({ error: error.message || "Une erreur est survenue" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
