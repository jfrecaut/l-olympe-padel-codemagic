/*
  # Insert Default Manifest Settings

  1. Changes
    - Insert a default row in manifest_settings table if it doesn't exist
    - This ensures the application always has meta tags and manifest data to display
    - Uses default values for a padel booking application

  2. Security
    - No security changes needed (policies already exist)
*/

-- Insert default manifest settings if none exist
INSERT INTO public.manifest_settings (
  name,
  short_name,
  description,
  start_url,
  display,
  background_color,
  theme_color,
  orientation,
  scope,
  categories,
  lang,
  dir,
  meta_title,
  meta_description,
  meta_keywords
) 
SELECT 
  'Padel Booking',
  'Padel',
  'Réservez votre court de padel en ligne',
  '/',
  'standalone',
  '#ffffff',
  '#10b981',
  'any',
  '/',
  ARRAY['sports', 'lifestyle'],
  'fr',
  'ltr',
  'Réservation Padel',
  'Réservez votre court de padel en ligne facilement',
  'padel, réservation, court, sport'
WHERE NOT EXISTS (SELECT 1 FROM public.manifest_settings LIMIT 1);
