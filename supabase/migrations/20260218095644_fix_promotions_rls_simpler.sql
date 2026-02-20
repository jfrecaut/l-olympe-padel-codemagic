/*
  # Simplify promotions RLS policies

  1. Changes
    - Drop all existing policies
    - Create simpler, more permissive policies for testing
    - Grant necessary permissions to authenticated role

  2. Security
    - Temporary simplified policies to identify the issue
    - Will be tightened once working
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view promotions" ON promotions;
DROP POLICY IF EXISTS "Admins can create promotions" ON promotions;
DROP POLICY IF EXISTS "Admins can update promotions" ON promotions;
DROP POLICY IF EXISTS "Admins can delete promotions" ON promotions;

-- Grant basic permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON promotions TO authenticated;

-- Create a simple SELECT policy for all authenticated users
CREATE POLICY "Authenticated users can view all promotions"
  ON promotions
  FOR SELECT
  TO authenticated
  USING (true);

-- Create INSERT policy for authenticated users with admin/manager role
CREATE POLICY "Admins and managers can create promotions"
  ON promotions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- Create UPDATE policy for authenticated users with admin/manager role
CREATE POLICY "Admins and managers can update promotions"
  ON promotions
  FOR UPDATE
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

-- Create DELETE policy for authenticated users with admin/manager role
CREATE POLICY "Admins and managers can delete promotions"
  ON promotions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );
