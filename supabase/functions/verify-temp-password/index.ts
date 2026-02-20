import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  email: string;
  password: string;
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

    const { email, password }: RequestBody = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email et mot de passe requis" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: userData } = await supabase.auth.admin.listUsers();
    const user = userData.users.find(u => u.email === email.toLowerCase());

    if (!user) {
      return new Response(
        JSON.stringify({ valid: false }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const passwordHash = await hashPassword(password);

    const { data: resetData } = await supabase
      .from('password_resets')
      .select('*')
      .eq('user_id', user.id)
      .eq('temporary_password_hash', passwordHash)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!resetData) {
      return new Response(
        JSON.stringify({ valid: false }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password }
    );

    if (updateError) {
      throw updateError;
    }

    const { error: markUsedError } = await supabase
      .from('password_resets')
      .update({ used: true })
      .eq('id', resetData.id);

    if (markUsedError) {
      console.error('Error marking password reset as used:', markUsedError);
    }

    return new Response(
      JSON.stringify({ valid: true, passwordUpdated: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error('Temp password verification error:', error);
    return new Response(
      JSON.stringify({ error: error.message || "Une erreur est survenue" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
