/*
  # Allow Managers to Create Managers

  ## Changes

  1. **Update create_user function**
     - Managers can now create other manager accounts
     - Only admins can create admin accounts
     - Both admins and managers can create player accounts

  ## Summary
  
  This migration updates the `create_user` function to allow managers to create other managers.
  Previously, only admins could create managers. Now:
  - Admins can create: admins, managers, players
  - Managers can create: managers, players
  - Players cannot create any accounts
*/

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

  -- Only admins can create admin accounts
  -- Managers can create manager and player accounts
  IF user_role = 'admin' AND caller_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can create admin accounts';
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
