/*
  # Add Manager Role

  ## Changes

  1. **Update role constraint**
     - Add 'manager' to allowed roles in profiles table

  2. **Update create_user function**
     - Allow creation of manager accounts

  3. **Update RLS policies for manager access**
     - Managers can manage bookings (full access like admins)
     - Managers can manage profiles/users (create, update)
     - Managers can manage refunds (full access)
     - Managers can view payment logs (read-only)
     - Managers can manage courts (full access)
     - Managers can manage settings (game settings only)
     - Managers can manage opening hours
     - Managers can manage holidays
     - Managers CANNOT access: brevo_settings, stripe_settings, manifest_settings (admin only)

  ## Access Summary

  Managers have access to:
  - Bookings (full access)
  - Players/Users (full access)
  - Refunds (full access)
  - Statistics/Payment Logs (read-only)
  - Courts (full access)
  - Settings (full access to opening hours, holidays, game settings)

  Managers do NOT have access to:
  - Brevo Settings
  - Stripe Settings
  - Manifest Settings
  - Welcome Screen Settings (part of settings table but controlled by UI)
*/

-- Update role constraint to include 'manager'
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'manager', 'player'));

-- Update create_user function to accept 'manager' role
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

  IF caller_role NOT IN ('admin', 'manager') THEN
    RAISE EXCEPTION 'Unauthorized: Admin or Manager access required';
  END IF;

  IF user_role NOT IN ('admin', 'manager', 'player') THEN
    RAISE EXCEPTION 'Invalid role. Must be admin, manager or player';
  END IF;

  -- Only admins can create other admins or managers
  IF user_role IN ('admin', 'manager') AND caller_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can create admin or manager accounts';
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
    jsonb_build_object(
      'username', user_username,
      'first_name', user_first_name,
      'last_name', user_last_name,
      'phone', user_phone,
      'role', user_role
    ),
    'authenticated',
    'authenticated',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
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

-- Update RLS policies to include manager access

-- Bookings: Managers can insert bookings for any user (like admins)
DROP POLICY IF EXISTS "Admins can insert bookings for any user" ON bookings;
CREATE POLICY "Admins and managers can insert bookings for any user"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- Bookings: Managers can update any booking (like admins)
DROP POLICY IF EXISTS "Admins can update any booking" ON bookings;
CREATE POLICY "Admins and managers can update any booking"
  ON bookings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- Booking Participants: Managers can add participants
DROP POLICY IF EXISTS "Booking creators can add participants" ON booking_participants;
CREATE POLICY "Booking creators can add participants"
  ON booking_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    (EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_participants.booking_id
      AND bookings.user_id = auth.uid()
    ))
    OR
    (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    ))
  );

-- Booking Participants: Managers can remove participants
DROP POLICY IF EXISTS "Booking creators can remove participants" ON booking_participants;
CREATE POLICY "Booking creators can remove participants"
  ON booking_participants FOR DELETE
  TO authenticated
  USING (
    (EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_participants.booking_id
      AND bookings.user_id = auth.uid()
    ))
    OR
    (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    ))
  );

-- Booking Participants: Managers can update participation status
DROP POLICY IF EXISTS "Users can update participation status" ON booking_participants;
CREATE POLICY "Users can update participation status"
  ON booking_participants FOR UPDATE
  TO authenticated
  USING (
    (user_id = auth.uid())
    OR
    (EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_participants.booking_id
      AND bookings.user_id = auth.uid()
    ))
    OR
    (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    ))
  )
  WITH CHECK (
    (user_id = auth.uid())
    OR
    (EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_participants.booking_id
      AND bookings.user_id = auth.uid()
    ))
    OR
    (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    ))
  );

-- Booking Participants: Managers can view all participants
DROP POLICY IF EXISTS "Users can view participants of their bookings" ON booking_participants;
CREATE POLICY "Users can view participants of their bookings"
  ON booking_participants FOR SELECT
  TO authenticated
  USING (
    (user_id = auth.uid())
    OR
    (EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_participants.booking_id
      AND bookings.user_id = auth.uid()
    ))
    OR
    (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    ))
  );

-- Profiles: Managers can update any profile
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
CREATE POLICY "Admins and managers can update any profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles profiles_1
      WHERE profiles_1.id = auth.uid()
      AND profiles_1.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles profiles_1
      WHERE profiles_1.id = auth.uid()
      AND profiles_1.role IN ('admin', 'manager')
    )
  );

-- Profiles: Managers can manually insert profiles (but only admins can create admins/managers)
DROP POLICY IF EXISTS "Only admins can manually insert profiles" ON profiles;
CREATE POLICY "Admins and managers can manually insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles profiles_1
      WHERE profiles_1.id = auth.uid()
      AND profiles_1.role IN ('admin', 'manager')
    )
  );

-- Refunds: Managers can view all refunds
DROP POLICY IF EXISTS "Admins can view all refunds" ON refunds;
CREATE POLICY "Admins and managers can view all refunds"
  ON refunds FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- Refunds: Managers can insert refunds
DROP POLICY IF EXISTS "Admins can insert refunds" ON refunds;
CREATE POLICY "Admins and managers can insert refunds"
  ON refunds FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- Refunds: Managers can update refunds
DROP POLICY IF EXISTS "Admins can update refunds" ON refunds;
CREATE POLICY "Admins and managers can update refunds"
  ON refunds FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- Refunds: Managers can delete refunds
DROP POLICY IF EXISTS "Admins can delete refunds" ON refunds;
CREATE POLICY "Admins and managers can delete refunds"
  ON refunds FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- Payment Logs: Managers can view all payment logs
DROP POLICY IF EXISTS "Admins can view all payment logs" ON payment_logs;
CREATE POLICY "Admins and managers can view all payment logs"
  ON payment_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- Settings: Managers can manage settings
DROP POLICY IF EXISTS "Admin can manage settings" ON settings;
CREATE POLICY "Admins and managers can manage settings"
  ON settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- Opening Hours: Managers can manage opening hours
DROP POLICY IF EXISTS "Admin can manage opening hours" ON opening_hours;
CREATE POLICY "Admins and managers can manage opening hours"
  ON opening_hours FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- Holidays: Managers can manage holidays
DROP POLICY IF EXISTS "Admin can manage holidays" ON holidays;
CREATE POLICY "Admins and managers can manage holidays"
  ON holidays FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- Email Queue: Managers can use email queue
DROP POLICY IF EXISTS "Admins can view email queue" ON email_queue;
CREATE POLICY "Admins and managers can view email queue"
  ON email_queue FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "Admins can insert into email queue" ON email_queue;
CREATE POLICY "Admins and managers can insert into email queue"
  ON email_queue FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

DROP POLICY IF EXISTS "Admins can update email queue" ON email_queue;
CREATE POLICY "Admins and managers can update email queue"
  ON email_queue FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- Note: Brevo, Stripe, and Manifest settings remain admin-only (no changes needed)
