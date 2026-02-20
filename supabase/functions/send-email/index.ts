import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface EmailRequest {
  to: string;
  eventType: string;
  params?: Record<string, string | number>;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { to, eventType, params = {} }: EmailRequest = await req.json();

    if (!to || !eventType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, eventType' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: settings } = await supabase
      .from('brevo_settings')
      .select('*')
      .maybeSingle();

    if (!settings || !settings.api_key) {
      return new Response(
        JSON.stringify({ error: 'Brevo settings not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const templateIdMap: Record<string, number | null> = {
      account_created: settings.template_account_created,
      booking_created: settings.template_booking_created,
      booking_cancelled: settings.template_booking_cancelled,
      participant_added: settings.template_participant_added,
      participant_accepted: settings.template_participant_accepted,
      participant_declined: settings.template_participant_declined,
    };

    const templateId = templateIdMap[eventType];

    if (!templateId) {
      return new Response(
        JSON.stringify({ error: `No template configured for event type: ${eventType}` }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let recipientName = to.split('@')[0];

    const { data: recipientUser } = await supabase.rpc('get_user_by_email', {
      email: to,
    });

    if (recipientUser) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('first_name, last_name, username')
        .eq('id', recipientUser.user_id)
        .maybeSingle();

      if (profileData) {
        const fullName = `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim();
        recipientName = fullName || profileData.username;
      }
    }

    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': settings.api_key,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        to: [{ email: to, name: recipientName }],
        templateId: templateId,
        params: params,
      }),
    });

    const brevoData = await brevoResponse.json();

    if (!brevoResponse.ok) {
      await supabase.from('email_queue').insert({
        recipient_email: to,
        recipient_name: recipientName,
        template_id: templateId,
        template_params: params,
        status: 'failed',
        error_message: JSON.stringify(brevoData),
        sent_at: new Date().toISOString(),
      });

      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: brevoData }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    await supabase.from('email_queue').insert({
      recipient_email: to,
      recipient_name: recipientName,
      template_id: templateId,
      template_params: params,
      status: 'sent',
      sent_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({ success: true, messageId: brevoData.messageId }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});