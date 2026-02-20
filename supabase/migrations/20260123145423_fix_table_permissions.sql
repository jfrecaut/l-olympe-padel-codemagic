/*
  # Fix table permissions

  1. Changes
    - Add GRANT statements for all tables to allow anon, authenticated, and service_role access
    - This is required for RLS policies to work correctly

  2. Security
    - RLS remains enabled on all tables
    - Policies control actual access
*/

-- Grant permissions on all tables
GRANT ALL ON TABLE public.profiles TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.courts TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.bookings TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.booking_participants TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.holidays TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.opening_hours TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.settings TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.stripe_settings TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.brevo_settings TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.email_queue TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.manifest_settings TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.password_resets TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.payment_logs TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.refunds TO anon, authenticated, service_role;

-- Grant permissions on all functions
GRANT ALL ON FUNCTION public.can_user_book(uuid) TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.cancel_expired_unpaid_bookings() TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.check_and_cancel_my_expired_bookings() TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.check_booking_limit() TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.check_court_capacity() TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.cleanup_expired_password_resets() TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.count_upcoming_bookings(uuid) TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.create_user(text, text, text, text, text, text, text) TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.generate_booking_code() TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.get_active_stripe_publishable_key() TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.get_participant_count(uuid) TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.get_user_email(uuid) TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.handle_new_user() TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.set_booking_code() TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.update_brevo_settings_updated_at() TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.update_email_queue_updated_at() TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.update_updated_at() TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.update_user_email(uuid, text) TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.update_user_password(uuid, text) TO anon, authenticated, service_role;