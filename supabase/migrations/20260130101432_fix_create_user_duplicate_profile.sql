/*
  # Fix duplicate profile creation when creating users

  ## Changes

  1. **Update `handle_new_user` trigger function**
     - Read role from raw_user_meta_data instead of hardcoding 'player'
     - This allows creating both admin and player accounts

  2. **Update `create_user` function**
     - Remove manual profile insertion
     - Pass user data via raw_user_meta_data
     - Let the trigger handle profile creation automatically
     - Prevents duplicate key constraint violation

  ## Problem Fixed

  Previously, when creating a user via `create_user()`:
  1. Auth.users row inserted → trigger fires → profile created
  2. Function tries to insert profile again → ERROR: duplicate key

  Now: Function passes data to trigger, which creates the profile once.
*/

-- Update trigger to respect role from metadata
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
    COALESCE(NEW.raw_user_meta_data->>'role', 'player'),
    true
  );
  RETURN NEW;
END;
$$;

-- Update create_user to use metadata instead of manual insert
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

  -- Insert user with metadata - trigger will create profile automatically
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

  -- Profile is now created by the handle_new_user trigger

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
