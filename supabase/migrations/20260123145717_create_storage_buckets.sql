/*
  # Create storage buckets

  1. Buckets
    - `media` - For welcome videos, banners, and company logos
    - `court-images` - For court images
  
  2. Security
    - Both buckets are public (files can be accessed without authentication)
    - Authenticated users can upload files
    - Admins can delete files
*/

-- Create media bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- Create court-images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('court-images', 'court-images', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist, then create new ones
DO $$
BEGIN
  -- Media bucket policies
  DROP POLICY IF EXISTS "Authenticated users can upload to media" ON storage.objects;
  CREATE POLICY "Authenticated users can upload to media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'media');

  DROP POLICY IF EXISTS "Anyone can read media files" ON storage.objects;
  CREATE POLICY "Anyone can read media files"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'media');

  DROP POLICY IF EXISTS "Admins can delete media files" ON storage.objects;
  CREATE POLICY "Admins can delete media files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'media' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

  DROP POLICY IF EXISTS "Admins can update media files" ON storage.objects;
  CREATE POLICY "Admins can update media files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'media' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    bucket_id = 'media' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

  -- Court-images bucket policies
  DROP POLICY IF EXISTS "Authenticated users can upload to court-images" ON storage.objects;
  CREATE POLICY "Authenticated users can upload to court-images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'court-images');

  DROP POLICY IF EXISTS "Anyone can read court images" ON storage.objects;
  CREATE POLICY "Anyone can read court images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'court-images');

  DROP POLICY IF EXISTS "Admins can delete court images" ON storage.objects;
  CREATE POLICY "Admins can delete court images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'court-images' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

  DROP POLICY IF EXISTS "Admins can update court images" ON storage.objects;
  CREATE POLICY "Admins can update court images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'court-images' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    bucket_id = 'court-images' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
END $$;