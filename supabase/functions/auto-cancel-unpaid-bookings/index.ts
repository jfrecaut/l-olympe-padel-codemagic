import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: settings } = await supabase
      .from('settings')
      .select('payment_timeout_hours')
      .maybeSingle();

    if (!settings || !settings.payment_timeout_hours) {
      return new Response(
        JSON.stringify({ error: 'Payment timeout setting not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const timeoutHours = settings.payment_timeout_hours;
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - timeoutHours);

    const { data: bookingsToCancel, error: fetchError } = await supabase
      .from('bookings')
      .select('id, user_id, booking_date, start_time, court_id, courts(name)')
      .eq('status', 'confirmed')
      .eq('created_by_admin', false)
      .gt('total_amount', 0)
      .in('payment_status', ['pending_payment', 'payment_failed'])
      .lt('created_at', cutoffTime.toISOString());

    if (fetchError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch bookings', details: fetchError }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!bookingsToCancel || bookingsToCancel.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No bookings to cancel', count: 0 }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const bookingIds = bookingsToCancel.map((b) => b.id);

    const { error: updateError } = await supabase
      .from('bookings')
      .update({ status: 'cancelled', payment_status: 'cancelled' })
      .in('id', bookingIds);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: 'Failed to cancel bookings', details: updateError }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    for (const booking of bookingsToCancel) {
      try {
        const { data: userData } = await supabase.rpc('get_user_email', {
          user_uuid: booking.user_id,
        });

        if (userData && userData.email) {
          await fetch(`${supabaseUrl}/functions/v1/send-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              to: userData.email,
              eventType: 'booking_cancelled',
              params: {
                DATE: new Date(booking.booking_date).toLocaleDateString('fr-FR'),
                TIME: booking.start_time.slice(0, 5),
                COURT: booking.courts?.name || 'Court',
                REASON: 'Paiement non effectué dans le délai imparti',
              },
            }),
          });
        }
      } catch (emailError) {
        console.error('Failed to send email for booking:', booking.id, emailError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Cancelled ${bookingIds.length} unpaid booking(s)`,
        count: bookingIds.length,
        bookingIds
      }),
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