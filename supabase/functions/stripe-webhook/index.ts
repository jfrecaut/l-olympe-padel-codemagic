import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey, stripe-signature',
};

async function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const parts = signature.split(',');

  let timestamp = '';
  let v1Signature = '';

  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key === 't') timestamp = value;
    if (key === 'v1') v1Signature = value;
  }

  if (!timestamp || !v1Signature) {
    return false;
  }

  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBytes = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(signedPayload)
  );

  const computedSignature = Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const timestampAge = Date.now() / 1000 - parseInt(timestamp);
  if (timestampAge > 300) {
    return false;
  }

  return computedSignature === v1Signature;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: stripeSettings, error: stripeError } = await supabaseAdmin
      .from('stripe_settings')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();

    if (stripeError || !stripeSettings) {
      throw new Error('Stripe not configured');
    }

    const webhookSecret = stripeSettings.webhook_secret;
    if (!webhookSecret) {
      throw new Error('Webhook secret not configured');
    }

    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      throw new Error('Missing signature');
    }

    const payload = await req.text();

    const isValid = await verifyStripeSignature(payload, signature, webhookSecret);
    if (!isValid) {
      throw new Error('Invalid signature');
    }

    const event = JSON.parse(payload);

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        const bookingId = paymentIntent.metadata.booking_id;
        const userId = paymentIntent.metadata.user_id;
        const paymentType = paymentIntent.metadata.payment_type;

        const { data: paymentLog, error: logError } = await supabaseAdmin
          .from('payment_logs')
          .select('*')
          .eq('stripe_payment_intent_id', paymentIntent.id)
          .maybeSingle();

        if (logError) {
          throw logError;
        }

        if (!paymentLog) {
          break;
        }

        await supabaseAdmin
          .from('payment_logs')
          .update({
            status: 'succeeded',
            stripe_charge_id: paymentIntent.latest_charge,
          })
          .eq('id', paymentLog.id);

        const { data: booking, error: bookingError } = await supabaseAdmin
          .from('bookings')
          .select('*')
          .eq('id', bookingId)
          .maybeSingle();

        if (bookingError || !booking) {
          throw bookingError || new Error('Booking not found');
        }

        const currentPayment = paymentLog.amount;
        const newAmountPaid = (booking.amount_paid || 0) + currentPayment;

        let newStatus = 'pending_payment';
        if (newAmountPaid >= booking.total_amount) {
          newStatus = 'payment_completed';
        } else if (newAmountPaid > 0) {
          newStatus = 'partial_payment_completed';
        }

        await supabaseAdmin
          .from('bookings')
          .update({
            payment_status: newStatus,
            amount_paid: newAmountPaid,
          })
          .eq('id', bookingId);

        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;

        const { data: paymentLog } = await supabaseAdmin
          .from('payment_logs')
          .select('*')
          .eq('stripe_payment_intent_id', paymentIntent.id)
          .maybeSingle();

        if (paymentLog) {
          await supabaseAdmin
            .from('payment_logs')
            .update({
              status: 'failed',
              error_message: paymentIntent.last_payment_error?.message || 'Payment failed',
            })
            .eq('id', paymentLog.id);
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object;

        const { data: paymentLog } = await supabaseAdmin
          .from('payment_logs')
          .select('*')
          .eq('stripe_charge_id', charge.id)
          .maybeSingle();

        if (paymentLog) {
          await supabaseAdmin
            .from('payment_logs')
            .update({ status: 'refunded' })
            .eq('id', paymentLog.id);

          const { data: booking } = await supabaseAdmin
            .from('bookings')
            .select('*')
            .eq('id', paymentLog.booking_id)
            .maybeSingle();

          if (booking) {
            const newAmountPaid = Math.max(0, (booking.amount_paid || 0) - paymentLog.amount);

            let newStatus = 'pending_payment';
            if (newAmountPaid >= booking.total_amount) {
              newStatus = 'payment_completed';
            } else if (newAmountPaid > 0) {
              newStatus = 'partial_payment_completed';
            }

            await supabaseAdmin
              .from('bookings')
              .update({
                payment_status: newStatus,
                amount_paid: newAmountPaid,
              })
              .eq('id', paymentLog.booking_id);
          }
        }
        break;
      }

      default:
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        status: 200,
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