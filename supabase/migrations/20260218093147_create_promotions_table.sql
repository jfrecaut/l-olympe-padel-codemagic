/*
  # Create promotions table

  1. New Tables
    - `promotions`
      - `id` (uuid, primary key) - Unique identifier for the promotion
      - `name` (text) - Name of the promotion (e.g., "Opening Offer")
      - `label` (text) - Display label shown to players
      - `court_ids` (uuid[]) - Array of court IDs this promotion applies to
      - `discount_type` (text) - Type of discount: 'percentage' or 'amount'
      - `discount_value` (numeric) - Value of the discount (percentage or amount in cents)
      - `start_date` (timestamptz) - Start date and time of the promotion
      - `end_date` (timestamptz) - End date and time of the promotion
      - `is_active` (boolean) - Whether the promotion is currently active
      - `created_at` (timestamptz) - When the promotion was created
      - `updated_at` (timestamptz) - When the promotion was last updated
      - `created_by` (uuid) - User who created the promotion

  2. Security
    - Enable RLS on `promotions` table
    - Add policy for authenticated users to read active promotions
    - Add policy for admins to manage promotions (create, update, delete)

  3. Indexes
    - Add index on start_date and end_date for efficient date range queries
    - Add index on is_active for filtering active promotions
*/

CREATE TABLE IF NOT EXISTS promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  label text NOT NULL,
  court_ids uuid[] NOT NULL DEFAULT '{}',
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'amount')),
  discount_value numeric NOT NULL CHECK (discount_value >= 0),
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  CONSTRAINT valid_date_range CHECK (end_date > start_date),
  CONSTRAINT valid_percentage CHECK (
    discount_type != 'percentage' OR (discount_value >= 0 AND discount_value <= 100)
  )
);

-- Enable RLS
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read active promotions
CREATE POLICY "Users can view active promotions"
  ON promotions
  FOR SELECT
  TO authenticated
  USING (is_active = true AND now() >= start_date AND now() <= end_date);

-- Admins can view all promotions
CREATE POLICY "Admins can view all promotions"
  ON promotions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- Admins can create promotions
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

-- Admins can update promotions
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

-- Admins can delete promotions
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_promotions_dates ON promotions(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_promotions_court_ids ON promotions USING GIN(court_ids);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_promotions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER promotions_updated_at
  BEFORE UPDATE ON promotions
  FOR EACH ROW
  EXECUTE FUNCTION update_promotions_updated_at();