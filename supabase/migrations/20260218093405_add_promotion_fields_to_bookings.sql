/*
  # Add promotion fields to bookings table

  1. Changes
    - Add `original_amount` (integer) - Original price before promotion
    - Add `promotion_id` (uuid) - Reference to the promotion applied
    - Add `promotion_discount` (integer) - Amount discounted by promotion
    
  2. Notes
    - These fields allow tracking which promotion was applied to each booking
    - Helps calculate proper refund amounts when bookings are cancelled
    - original_amount stores the price before any promotion discount
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'original_amount'
  ) THEN
    ALTER TABLE bookings ADD COLUMN original_amount integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'promotion_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN promotion_id uuid REFERENCES promotions(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'promotion_discount'
  ) THEN
    ALTER TABLE bookings ADD COLUMN promotion_discount integer DEFAULT 0;
  END IF;
END $$;