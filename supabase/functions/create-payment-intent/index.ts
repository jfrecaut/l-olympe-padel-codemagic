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
      throw new Error('Missing Authorization header');
    }

    const token = authHeader.replace('Bearer ', '');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError) {
      throw new Error(`Auth error: ${userError.message}`);
    }

    if (!user) {
      throw new Error('Unauthorized');
    }

    const { bookingId, userId, amount, paymentType, metadata } = await req.json();

    if (!bookingId || !userId || !amount || !paymentType) {
      throw new Error('Missing required fields');
    }

    if (userId !== user.id) {
      throw new Error('User ID mismatch');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: stripeSettings, error: stripeError } = await supabaseAdmin
      .from('stripe_settings')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();

    if (stripeError) {
      throw new Error(`Stripe settings error: ${stripeError.message}`);
    }

    if (!stripeSettings) {
      throw new Error('Stripe is not configured');
    }

    const stripeSecretKey = stripeSettings.secret_key;

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id, username')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      throw new Error(`Profile error: ${profileError.message}`);
    }

    if (!profile) {
      throw new Error('Profile not found');
    }

    let stripeCustomerId = profile.stripe_customer_id;

    if (!stripeCustomerId) {
      const customerParams = new URLSearchParams({
        'metadata[user_id]': userId,
        name: profile.username,
        email: user.email || '',
      });

      const customerResponse = await fetch('https://api.stripe.com/v1/customers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeSecretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: customerParams.toString(),
      });

      if (!customerResponse.ok) {
        const error = await customerResponse.json();
        throw new Error(error.error?.message || 'Failed to create Stripe customer');
      }

      const customer = await customerResponse.json();
      stripeCustomerId = customer.id;

      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', userId);

      if (updateError) {
        throw new Error(`Failed to save customer ID: ${updateError.message}`);
      }
    }

    const stripeResponse = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        amount: amount.toString(),
        currency: 'eur',
        customer: stripeCustomerId,
        'metadata[booking_id]': bookingId,
        'metadata[user_id]': userId,
        'metadata[payment_type]': paymentType,
      }).toString(),
    });

    if (!stripeResponse.ok) {
      const error = await stripeResponse.json();
      throw new Error(error.error?.message || 'Stripe API error');
    }

    const paymentIntent = await stripeResponse.json();

    const { data: paymentLog, error: logError } = await supabaseAdmin
      .from('payment_logs')
      .insert({
        booking_id: bookingId,
        user_id: userId,
        amount: amount,
        payment_type: paymentType,
        stripe_payment_intent_id: paymentIntent.id,
        status: 'pending',
        metadata: metadata || {},
      })
      .select()
      .single();

    if (logError) {
      throw logError;
    }

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentLogId: paymentLog.id,
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
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});