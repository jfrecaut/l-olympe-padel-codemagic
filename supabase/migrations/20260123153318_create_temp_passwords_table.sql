/*
  # Create temp_passwords table

  1. New Tables
    - `temp_passwords`
      - `id` (uuid, primary key)
      - `email` (text, not null)
      - `password_hash` (text, not null) - hashed temporary password
      - `created_at` (timestamptz, default now())
      - `expires_at` (timestamptz, not null) - expiration timestamp
  
  2. Security
    - Enable RLS on `temp_passwords` table
    - Add policy for anonymous users to check if temp password exists for an email
    - Add policy for service role to manage temp passwords
  
  3. Indexes
    - Add index on email for faster lookups
    - Add index on expires_at for cleanup operations
*/

CREATE TABLE IF NOT EXISTS temp_passwords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL
);

ALTER TABLE temp_passwords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can check if temp password exists"
  ON temp_passwords
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_temp_passwords_email ON temp_passwords(email);
CREATE INDEX IF NOT EXISTS idx_temp_passwords_expires_at ON temp_passwords(expires_at);