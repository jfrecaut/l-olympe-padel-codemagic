/*
  # Insert default opening hours

  1. Data Insertion
    - Insert 7 days of the week (0-6) with default hours 9:00-22:00
    - Monday (1) to Sunday (0)
    - All days are open by default
  
  2. Notes
    - Uses ON CONFLICT to prevent errors if data already exists
    - Day 0 = Sunday, 1 = Monday, ..., 6 = Saturday
*/

-- Insert default opening hours for all days of the week
INSERT INTO public.opening_hours (day_of_week, open_time, close_time, is_closed)
VALUES 
  (0, '09:00:00', '22:00:00', false), -- Sunday
  (1, '09:00:00', '22:00:00', false), -- Monday
  (2, '09:00:00', '22:00:00', false), -- Tuesday
  (3, '09:00:00', '22:00:00', false), -- Wednesday
  (4, '09:00:00', '22:00:00', false), -- Thursday
  (5, '09:00:00', '22:00:00', false), -- Friday
  (6, '09:00:00', '22:00:00', false)  -- Saturday
ON CONFLICT (day_of_week) DO NOTHING;