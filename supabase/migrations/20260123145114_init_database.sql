/*
  # Initialize Padel Booking Database

  1. New Tables
    - `profiles` - User profiles with roles (admin/player)
    - `courts` - Padel courts with capacity and pricing
    - `bookings` - Court bookings with payment tracking
    - `booking_participants` - Additional players for bookings
    - `holidays` - Closed dates
    - `opening_hours` - Operating hours per day
    - `settings` - App configuration
    - `stripe_settings` - Payment configuration
    - `brevo_settings` - Email configuration
    - `email_queue` - Email sending queue
    - `manifest_settings` - PWA configuration
    - `password_resets` - Password reset tokens
    - `payment_logs` - Payment history
    - `refunds` - Refund requests

  2. Security
    - Enable RLS on all tables
    - Add comprehensive policies for admins and players
    - Secure functions for user management

  3. Functions
    - User creation and management
    - Booking validation
    - Payment processing helpers
    - Email queue management
*/

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Functions
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, first_name, last_name, phone, role, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    'player',
    true
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_booking_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result text := '';
  i integer;
  code_exists boolean;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..15 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    
    SELECT EXISTS(SELECT 1 FROM bookings WHERE booking_code = result) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_booking_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.booking_code IS NULL THEN
    NEW.booking_code := generate_booking_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.count_upcoming_bookings(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM bookings
  WHERE user_id = p_user_id
    AND status = 'confirmed'
    AND (
      booking_date > CURRENT_DATE
      OR (
        booking_date = CURRENT_DATE
        AND start_time > CURRENT_TIME
      )
    );
  
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_user_book(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_bookings integer;
  v_max_bookings integer;
BEGIN
  SELECT count_upcoming_bookings(p_user_id) INTO v_current_bookings;
  
  SELECT max_bookings_per_user
  INTO v_max_bookings
  FROM settings
  LIMIT 1;
  
  IF v_max_bookings IS NULL THEN
    v_max_bookings := 5;
  END IF;
  
  RETURN v_current_bookings < v_max_bookings;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_booking_limit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_can_book boolean;
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status = 'confirmed') OR
     (TG_OP = 'UPDATE' AND OLD.status != 'confirmed' AND NEW.status = 'confirmed') THEN
    
    SELECT can_user_book(NEW.user_id) INTO v_can_book;
    
    IF NOT v_can_book THEN
      RAISE EXCEPTION 'User has reached the maximum number of upcoming bookings';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_participant_count(p_booking_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::integer
    FROM booking_participants
    WHERE booking_id = p_booking_id
    AND status IN ('pending', 'accepted')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.check_court_capacity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_court_capacity integer;
  v_current_count integer;
BEGIN
  SELECT c.capacity INTO v_court_capacity
  FROM bookings b
  JOIN courts c ON b.court_id = c.id
  WHERE b.id = NEW.booking_id;

  SELECT COUNT(*) INTO v_current_count
  FROM booking_participants
  WHERE booking_id = NEW.booking_id
  AND status IN ('pending', 'accepted');

  IF v_current_count >= v_court_capacity THEN
    RAISE EXCEPTION 'Cannot add participant: court capacity (%) would be exceeded', v_court_capacity;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_email(target_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  caller_role text;
  user_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT role INTO caller_role
  FROM profiles
  WHERE id = auth.uid();

  IF caller_role != 'admin' AND auth.uid() != target_user_id THEN
    RAISE EXCEPTION 'Unauthorized: You can only access your own email';
  END IF;

  SELECT email INTO user_email
  FROM auth.users
  WHERE id = target_user_id;

  IF user_email IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  RETURN user_email;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_user(
  user_email text,
  user_password text,
  user_username text,
  user_first_name text,
  user_last_name text,
  user_phone text,
  user_role text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'pg_catalog'
AS $_$
DECLARE
  caller_role text;
  new_user_id uuid;
  username_exists boolean;
  email_exists boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT role INTO caller_role
  FROM profiles
  WHERE id = auth.uid();

  IF caller_role != 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  IF user_role NOT IN ('admin', 'player') THEN
    RAISE EXCEPTION 'Invalid role. Must be admin or player';
  END IF;

  IF user_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z0-9]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM auth.users WHERE email = user_email
  ) INTO email_exists;

  IF email_exists THEN
    RAISE EXCEPTION 'Email already in use';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM profiles WHERE username = user_username
  ) INTO username_exists;

  IF username_exists THEN
    RAISE EXCEPTION 'Username already in use';
  END IF;

  new_user_id := gen_random_uuid();

  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    user_email,
    extensions.crypt(user_password, extensions.gen_salt('bf'::text)),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    'authenticated',
    'authenticated',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  );

  INSERT INTO profiles (
    id,
    username,
    first_name,
    last_name,
    phone,
    role,
    is_active
  ) VALUES (
    new_user_id,
    user_username,
    user_first_name,
    user_last_name,
    user_phone,
    user_role,
    true
  );

  RETURN json_build_object(
    'success', true,
    'message', 'User created successfully',
    'user_id', new_user_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION '%', SQLERRM;
END;
$_$;

CREATE OR REPLACE FUNCTION public.update_user_email(target_user_id uuid, new_email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $_$
DECLARE
  caller_role text;
  email_exists boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT role INTO caller_role
  FROM profiles
  WHERE id = auth.uid();

  IF caller_role != 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  IF new_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z0-9]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM auth.users
    WHERE email = new_email AND id != target_user_id
  ) INTO email_exists;

  IF email_exists THEN
    RAISE EXCEPTION 'Email already in use';
  END IF;

  UPDATE auth.users
  SET
    email = new_email,
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    email_change = NULL,
    email_change_token_new = NULL,
    email_change_token_current = NULL,
    email_change_sent_at = NULL,
    email_change_confirm_status = 0,
    raw_user_meta_data = jsonb_set(
      COALESCE(raw_user_meta_data, '{}'::jsonb),
      '{email}',
      to_jsonb(new_email)
    ),
    updated_at = now()
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', 'Email updated successfully'
  );
END;
$_$;

CREATE OR REPLACE FUNCTION public.update_user_password(target_user_id uuid, new_password text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'pg_catalog'
AS $$
DECLARE
  caller_role text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT role INTO caller_role
  FROM profiles
  WHERE id = auth.uid();

  IF caller_role != 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  UPDATE auth.users
  SET 
    encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf'::text)),
    updated_at = NOW()
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', 'Password updated successfully'
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION '%', SQLERRM;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_active_stripe_publishable_key()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  pub_key text;
BEGIN
  SELECT publishable_key INTO pub_key
  FROM stripe_settings
  WHERE is_active = true
  LIMIT 1;
  
  RETURN pub_key;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_expired_unpaid_bookings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  payment_timeout_minutes INTEGER;
  cutoff_time TIMESTAMPTZ;
BEGIN
  SELECT COALESCE(
    (SELECT (payment_timeout_hours * 60)::INTEGER FROM settings LIMIT 1),
    60
  ) INTO payment_timeout_minutes;

  cutoff_time := NOW() - (payment_timeout_minutes || ' minutes')::INTERVAL;

  UPDATE bookings
  SET 
    status = 'cancelled',
    payment_status = 'cancelled'
  WHERE 
    payment_status = 'pending_payment'
    AND created_at < cutoff_time
    AND status != 'cancelled'
    AND (created_by_admin = false OR created_by_admin IS NULL);
END;
$$;

CREATE OR REPLACE FUNCTION public.check_and_cancel_my_expired_bookings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  payment_timeout_minutes INTEGER;
  cutoff_time TIMESTAMPTZ;
BEGIN
  SELECT COALESCE(
    (SELECT (payment_timeout_hours * 60)::INTEGER FROM settings LIMIT 1),
    60
  ) INTO payment_timeout_minutes;

  cutoff_time := NOW() - (payment_timeout_minutes || ' minutes')::INTERVAL;

  UPDATE bookings
  SET 
    status = 'cancelled',
    payment_status = 'cancelled'
  WHERE 
    user_id = auth.uid()
    AND payment_status = 'pending_payment'
    AND created_at < cutoff_time
    AND status != 'cancelled'
    AND (created_by_admin = false OR created_by_admin IS NULL);
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_password_resets()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM password_resets
  WHERE expires_at < now() OR used = true;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_brevo_settings_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_email_queue_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Tables
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL PRIMARY KEY,
  username text NOT NULL UNIQUE,
  phone text NOT NULL,
  role text DEFAULT 'player' NOT NULL,
  created_at timestamptz DEFAULT now(),
  first_name text DEFAULT '' NOT NULL,
  last_name text DEFAULT '' NOT NULL,
  is_active boolean DEFAULT true,
  stripe_customer_id text UNIQUE,
  CONSTRAINT profiles_role_check CHECK (role = ANY (ARRAY['admin', 'player'])),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.courts (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  name text NOT NULL,
  capacity integer NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  price integer DEFAULT 0,
  image_url text,
  CONSTRAINT courts_capacity_check CHECK (capacity = ANY (ARRAY[2, 4]))
);

CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  court_id uuid NOT NULL,
  user_id uuid NOT NULL,
  booking_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  players_count integer NOT NULL,
  status text DEFAULT 'confirmed',
  created_at timestamptz DEFAULT now(),
  payment_status text DEFAULT 'pending_payment',
  total_amount integer DEFAULT 0,
  amount_paid integer DEFAULT 0,
  created_by_admin boolean DEFAULT false,
  booking_code text UNIQUE,
  CONSTRAINT bookings_payment_status_check CHECK (payment_status = ANY (ARRAY['pending_payment', 'partial_payment_completed', 'payment_completed', 'payment_failed', 'confirmed', 'cancelled'])),
  CONSTRAINT bookings_status_check CHECK (status = ANY (ARRAY['confirmed', 'cancelled'])),
  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  CONSTRAINT bookings_court_id_fkey FOREIGN KEY (court_id) REFERENCES public.courts(id) ON DELETE CASCADE,
  CONSTRAINT bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.booking_participants (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  booking_id uuid NOT NULL,
  user_id uuid NOT NULL,
  status text DEFAULT 'pending' NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT booking_participants_status_check CHECK (status = ANY (ARRAY['pending', 'accepted', 'declined'])),
  CONSTRAINT unique_booking_participant UNIQUE (booking_id, user_id),
  CONSTRAINT booking_participants_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE,
  CONSTRAINT booking_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.holidays (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  date date NOT NULL UNIQUE,
  reason text NOT NULL,
  created_at timestamptz DEFAULT now(),
  end_date date,
  CONSTRAINT holidays_end_date_check CHECK ((end_date IS NULL) OR (end_date >= date))
);

CREATE TABLE IF NOT EXISTS public.opening_hours (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  day_of_week integer NOT NULL UNIQUE,
  open_time time NOT NULL,
  close_time time NOT NULL,
  is_closed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT opening_hours_day_of_week_check CHECK ((day_of_week >= 0) AND (day_of_week <= 6))
);

CREATE TABLE IF NOT EXISTS public.settings (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  game_duration_minutes integer DEFAULT 45 NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  cancellation_hours integer DEFAULT 48 NOT NULL,
  max_bookings_per_user integer DEFAULT 5 NOT NULL,
  welcome_banner_url text,
  welcome_banner_mobile_url text,
  welcome_video_url text,
  welcome_video_mobile_url text,
  company_logo_url text,
  payment_timeout_hours numeric(4,2) DEFAULT 1.0,
  company_logo_dark_url text,
  CONSTRAINT settings_payment_timeout_hours_check CHECK (payment_timeout_hours >= 0.5)
);

CREATE TABLE IF NOT EXISTS public.stripe_settings (
  id integer DEFAULT 1 NOT NULL PRIMARY KEY,
  environment text NOT NULL UNIQUE,
  is_active boolean DEFAULT false NOT NULL,
  publishable_key text NOT NULL,
  secret_key text NOT NULL,
  webhook_secret text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT stripe_settings_environment_check CHECK (environment = ANY (ARRAY['staging', 'production']))
);

CREATE TABLE IF NOT EXISTS public.brevo_settings (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  api_key text DEFAULT '' NOT NULL,
  template_account_created integer,
  template_booking_created integer,
  template_booking_cancelled integer,
  template_participant_added integer,
  template_participant_accepted integer,
  template_participant_declined integer,
  sender_email text DEFAULT '' NOT NULL,
  sender_name text DEFAULT '' NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  template_refund_approved integer,
  template_refund_rejected integer,
  template_password_reset integer
);

CREATE TABLE IF NOT EXISTS public.email_queue (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  recipient_email text NOT NULL,
  recipient_name text NOT NULL,
  template_id bigint NOT NULL,
  template_params jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'pending' NOT NULL,
  error_message text,
  attempts integer DEFAULT 0,
  max_attempts integer DEFAULT 3,
  created_at timestamptz DEFAULT now(),
  scheduled_for timestamptz DEFAULT now(),
  sent_at timestamptz,
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT email_queue_status_check CHECK (status = ANY (ARRAY['pending', 'sent', 'failed']))
);

CREATE TABLE IF NOT EXISTS public.manifest_settings (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  name text DEFAULT 'Padel Booking' NOT NULL,
  short_name text DEFAULT 'Padel' NOT NULL,
  description text DEFAULT 'Book your padel court easily' NOT NULL,
  start_url text DEFAULT '/' NOT NULL,
  display text DEFAULT 'standalone' NOT NULL,
  background_color text DEFAULT '#ffffff' NOT NULL,
  theme_color text DEFAULT '#3b82f6' NOT NULL,
  orientation text DEFAULT 'any' NOT NULL,
  scope text DEFAULT '/' NOT NULL,
  categories text[] DEFAULT ARRAY['sports', 'lifestyle'],
  lang text DEFAULT 'fr' NOT NULL,
  dir text DEFAULT 'ltr' NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  icon_url text,
  meta_title text,
  meta_description text,
  meta_keywords text,
  favicon_url text,
  og_image_url text,
  screenshots jsonb DEFAULT '[]'::jsonb,
  features text[] DEFAULT ARRAY[]::text[],
  icons jsonb DEFAULT '[]'::jsonb,
  shortcuts jsonb DEFAULT '[]'::jsonb,
  display_override text[] DEFAULT ARRAY[]::text[],
  related_applications jsonb DEFAULT '[]'::jsonb,
  prefer_related_applications boolean DEFAULT false,
  launch_handler jsonb DEFAULT '{"client_mode": "navigate-existing"}'::jsonb,
  edge_side_panel jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.password_resets (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  user_id uuid NOT NULL,
  temporary_password_hash text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  expires_at timestamptz DEFAULT (now() + '00:10:00'::interval) NOT NULL,
  used boolean DEFAULT false NOT NULL,
  CONSTRAINT password_resets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.payment_logs (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  booking_id uuid NOT NULL,
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  payment_type text NOT NULL,
  stripe_payment_intent_id text,
  stripe_charge_id text,
  status text DEFAULT 'pending' NOT NULL,
  error_message text,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT payment_logs_payment_type_check CHECK (payment_type = ANY (ARRAY['partial', 'full'])),
  CONSTRAINT payment_logs_status_check CHECK (status = ANY (ARRAY['pending', 'succeeded', 'failed', 'refunded'])),
  CONSTRAINT payment_logs_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE,
  CONSTRAINT payment_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.refunds (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  booking_id uuid NOT NULL,
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  status text DEFAULT 'pending' NOT NULL,
  cancelled_by text NOT NULL,
  cancelled_at timestamptz DEFAULT now() NOT NULL,
  reviewed_by uuid,
  reviewed_at timestamptz,
  rejection_reason text,
  stripe_refund_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT refunds_cancelled_by_check CHECK (cancelled_by = ANY (ARRAY['admin', 'client'])),
  CONSTRAINT refunds_status_check CHECK (status = ANY (ARRAY['pending', 'approved', 'rejected'])),
  CONSTRAINT refunds_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE,
  CONSTRAINT refunds_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT refunds_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_booking_participants_booking ON public.booking_participants USING btree (booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_participants_status ON public.booking_participants USING btree (status);
CREATE INDEX IF NOT EXISTS idx_booking_participants_user ON public.booking_participants USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_court_date ON public.bookings USING btree (court_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON public.bookings USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_email_queue_status_scheduled ON public.email_queue USING btree (status, scheduled_for) WHERE (status = 'pending');
CREATE INDEX IF NOT EXISTS idx_password_resets_expires_at ON public.password_resets USING btree (expires_at);
CREATE INDEX IF NOT EXISTS idx_password_resets_used ON public.password_resets USING btree (used);
CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON public.password_resets USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles USING btree (role);
CREATE INDEX IF NOT EXISTS idx_refunds_booking_id ON public.refunds USING btree (booking_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON public.refunds USING btree (status);
CREATE INDEX IF NOT EXISTS idx_refunds_user_id ON public.refunds USING btree (user_id);
CREATE INDEX IF NOT EXISTS payment_logs_booking_id_idx ON public.payment_logs USING btree (booking_id);
CREATE INDEX IF NOT EXISTS payment_logs_created_at_idx ON public.payment_logs USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS payment_logs_status_idx ON public.payment_logs USING btree (status);
CREATE INDEX IF NOT EXISTS payment_logs_user_id_idx ON public.payment_logs USING btree (user_id);

-- Triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS trigger_set_booking_code ON public.bookings;
CREATE TRIGGER trigger_set_booking_code
  BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_booking_code();

DROP TRIGGER IF EXISTS enforce_booking_limit ON public.bookings;
CREATE TRIGGER enforce_booking_limit
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.check_booking_limit();

DROP TRIGGER IF EXISTS check_capacity_before_insert ON public.booking_participants;
CREATE TRIGGER check_capacity_before_insert
  BEFORE INSERT ON public.booking_participants
  FOR EACH ROW EXECUTE FUNCTION public.check_court_capacity();

DROP TRIGGER IF EXISTS update_booking_participants_updated_at ON public.booking_participants;
CREATE TRIGGER update_booking_participants_updated_at
  BEFORE UPDATE ON public.booking_participants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_payment_logs_updated_at ON public.payment_logs;
CREATE TRIGGER update_payment_logs_updated_at
  BEFORE UPDATE ON public.payment_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_stripe_settings_updated_at ON public.stripe_settings;
CREATE TRIGGER update_stripe_settings_updated_at
  BEFORE UPDATE ON public.stripe_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_brevo_settings_updated_at_trigger ON public.brevo_settings;
CREATE TRIGGER update_brevo_settings_updated_at_trigger
  BEFORE UPDATE ON public.brevo_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_brevo_settings_updated_at();

DROP TRIGGER IF EXISTS set_email_queue_updated_at ON public.email_queue;
CREATE TRIGGER set_email_queue_updated_at
  BEFORE UPDATE ON public.email_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_email_queue_updated_at();

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opening_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brevo_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manifest_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_resets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone authenticated can read profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles profiles_1 WHERE profiles_1.id = auth.uid() AND profiles_1.role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles profiles_1 WHERE profiles_1.id = auth.uid() AND profiles_1.role = 'admin'));
CREATE POLICY "Only admins can manually insert profiles" ON public.profiles FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles profiles_1 WHERE profiles_1.id = auth.uid() AND profiles_1.role = 'admin'));

CREATE POLICY "Anyone authenticated can read courts" ON public.courts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone authenticated can insert courts" ON public.courts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Anyone authenticated can update courts" ON public.courts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Anyone authenticated can delete courts" ON public.courts FOR DELETE TO authenticated USING (true);

CREATE POLICY "Anyone authenticated can read bookings" ON public.bookings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own bookings" ON public.bookings FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can insert bookings for any user" ON public.bookings FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
CREATE POLICY "Users can update own bookings" ON public.bookings FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can update any booking" ON public.bookings FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
CREATE POLICY "Anyone authenticated can delete bookings" ON public.bookings FOR DELETE TO authenticated USING (true);

CREATE POLICY "Users can view participants of their bookings" ON public.booking_participants FOR SELECT TO authenticated USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.bookings WHERE bookings.id = booking_participants.booking_id AND bookings.user_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
CREATE POLICY "Booking creators can add participants" ON public.booking_participants FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.bookings WHERE bookings.id = booking_participants.booking_id AND bookings.user_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
CREATE POLICY "Users can update participation status" ON public.booking_participants FOR UPDATE TO authenticated USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.bookings WHERE bookings.id = booking_participants.booking_id AND bookings.user_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')) WITH CHECK (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.bookings WHERE bookings.id = booking_participants.booking_id AND bookings.user_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
CREATE POLICY "Booking creators can remove participants" ON public.booking_participants FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.bookings WHERE bookings.id = booking_participants.booking_id AND bookings.user_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Players can view holidays" ON public.holidays FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage holidays" ON public.holidays TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Players can view opening hours" ON public.opening_hours FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage opening hours" ON public.opening_hours TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Players can view settings" ON public.settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public can view company logo" ON public.settings FOR SELECT TO anon USING (true);
CREATE POLICY "Public can view company dark logo" ON public.settings FOR SELECT TO anon USING (true);
CREATE POLICY "Admin can manage settings" ON public.settings TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Only admins can view stripe settings" ON public.stripe_settings FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
CREATE POLICY "Only admins can insert stripe settings" ON public.stripe_settings FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
CREATE POLICY "Only admins can update stripe settings" ON public.stripe_settings FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Admin can view Brevo settings" ON public.brevo_settings FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
CREATE POLICY "Admin can insert Brevo settings" ON public.brevo_settings FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin') AND NOT EXISTS (SELECT 1 FROM public.brevo_settings brevo_settings_1));
CREATE POLICY "Admin can update Brevo settings" ON public.brevo_settings FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Admins can view email queue" ON public.email_queue FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
CREATE POLICY "Admins can insert into email queue" ON public.email_queue FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
CREATE POLICY "Admins can update email queue" ON public.email_queue FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Public can read manifest settings" ON public.manifest_settings FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Admins can insert manifest settings" ON public.manifest_settings FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
CREATE POLICY "Admins can update manifest settings" ON public.manifest_settings FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Users can view own password resets" ON public.password_resets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service role can insert password resets" ON public.password_resets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Service role can update password resets" ON public.password_resets FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Users can view their own payment logs" ON public.payment_logs FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can view all payment logs" ON public.payment_logs FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
CREATE POLICY "System can insert payment logs" ON public.payment_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own payment logs" ON public.payment_logs FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own refunds" ON public.refunds FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can view all refunds" ON public.refunds FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
CREATE POLICY "Users can create refunds for own bookings" ON public.refunds FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.bookings WHERE bookings.id = refunds.booking_id AND bookings.user_id = auth.uid()));
CREATE POLICY "Admins can insert refunds" ON public.refunds FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
CREATE POLICY "Admins can update refunds" ON public.refunds FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
CREATE POLICY "Admins can delete refunds" ON public.refunds FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));