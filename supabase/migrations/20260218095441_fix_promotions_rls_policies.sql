/*
  # Fix promotions RLS policies

  1. Changes
    - Drop existing RLS policies on promotions table
    - Recreate policies with correct logic to avoid conflicts
    - Separate read policies for players vs admins/managers

  2. Security
    - Players can only view active promotions within date range
    - Admins and managers can view all promotions
    - Only admins and managers can create, update, and delete promotions
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view active promotions" ON promotions;
DROP POLICY IF EXISTS "Admins can view all promotions" ON promotions;
DROP POLICY IF EXISTS "Admins can create promotions" ON promotions;
DROP POLICY IF EXISTS "Admins can update promotions" ON promotions;
DROP POLICY IF EXISTS "Admins can delete promotions" ON promotions;

-- Create new SELECT policy that works for both players and admins
CREATE POLICY "Users can view promotions"
  ON promotions
  FOR SELECT
  TO authenticated
  USING (
    -- Admins and managers can view all promotions
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
    OR
    -- Regular users can only view active promotions within date range
    (is_active = true AND now() >= start_date AND now() <= end_date)
  );

-- Admins and managers can create promotions
CREATE POLICY "Admins can create promotions"
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

-- Admins and managers can update promotions
CREATE POLICY "Admins can update promotions"
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

-- Admins and managers can delete promotions
CREATE POLICY "Admins can delete promotions"
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
