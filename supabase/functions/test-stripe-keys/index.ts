import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Authentication failed',
          details: authError?.message
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Error fetching profile',
          details: profileError.message
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    if (!profile || profile.role !== 'admin') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Admin access required',
          debug: {
            profileExists: !!profile,
            role: profile?.role
          }
        }),
        {
          status: 403,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const { publishable_key, secret_key, environment } = await req.json();

    if (!publishable_key || !secret_key) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing keys' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const testAmount = 100;
    const stripeResponse = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secret_key}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        amount: testAmount.toString(),
        currency: 'eur',
        'metadata[test]': 'true',
      }).toString(),
    });

    if (!stripeResponse.ok) {
      const error = await stripeResponse.json();
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: error.error?.message || 'Invalid Stripe keys',
          details: error
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const paymentIntent = await stripeResponse.json();

    await fetch(`https://api.stripe.com/v1/payment_intents/${paymentIntent.id}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secret_key}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'cancellation_reason': 'abandoned',
      }).toString(),
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Clés ${environment} valides et fonctionnelles`,
        test_payment_intent: paymentIntent.id
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'An unexpected error occurred',
        stack: error.stack
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
