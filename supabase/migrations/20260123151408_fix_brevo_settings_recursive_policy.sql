/*
  # Fix Brevo Settings Recursive Policy

  1. Changes
    - Drop the existing INSERT policy that causes infinite recursion
    - Create a new INSERT policy without the recursive check
    - Add a UNIQUE constraint to ensure only one row exists (better approach)

  2. Details
    - The original policy had `NOT EXISTS (SELECT 1 FROM brevo_settings)` in WITH CHECK
    - This caused infinite recursion when checking the policy during INSERT
    - Solution: Remove the recursive check and use database constraint instead

  3. Security
    - Maintains admin-only access
    - No security downgrade
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Admin can insert Brevo settings" ON public.brevo_settings;

-- Create new policy without recursive check
CREATE POLICY "Admin can insert Brevo settings" 
  ON public.brevo_settings 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Add a partial unique index to ensure only one row exists
-- This prevents multiple rows at the database level
CREATE UNIQUE INDEX IF NOT EXISTS brevo_settings_singleton_idx 
  ON public.brevo_settings ((true));
