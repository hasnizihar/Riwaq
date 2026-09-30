-- ==============================================================================
-- Riwaq Uth-Thaqafa Photo Booth - Photo Privacy & Cloud Sync Migration
-- ==============================================================================
-- 1. get_photo_by_token: Secure lookup returning ONLY fields needed by visitor.
--    Does NOT return attendee email or original photo URL to anonymous visitors.
-- 2. sync_photo_cloud_urls: Restricted RPC to update Cloudinary URLs after upload
--    without granting broad table UPDATE privileges to anon.
-- 3. Restricts direct anonymous SELECT on public.photos table.
-- ==============================================================================

-- 1. Secure token lookup function
CREATE OR REPLACE FUNCTION public.get_photo_by_token(p_token TEXT)
RETURNS TABLE (
  id TEXT,
  template_name TEXT,
  generated_photo_url TEXT,
  aspect_ratio TEXT,
  file_name TEXT,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  event_id TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.template_name,
    p.generated_photo_url,
    p.aspect_ratio,
    p.file_name,
    p.created_at,
    p.expires_at,
    p.event_id
  FROM public.photos p
  WHERE p.photo_token = p_token
    AND (p.expires_at IS NULL OR p.expires_at > NOW())
  LIMIT 1;
END;
$$;

-- 2. Secure cloud URL synchronization function
CREATE OR REPLACE FUNCTION public.sync_photo_cloud_urls(
  p_id TEXT,
  p_token TEXT,
  p_original_url TEXT,
  p_generated_url TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validates that both id and token match an existing unexpired photo record
  UPDATE public.photos
  SET 
    original_photo_url = COALESCE(p_original_url, original_photo_url),
    generated_photo_url = COALESCE(p_generated_url, generated_photo_url),
    updated_at = NOW()
  WHERE id = p_id
    AND photo_token = p_token
    AND (expires_at IS NULL OR expires_at > NOW());

  RETURN FOUND;
END;
$$;

-- 3. Grants for anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.get_photo_by_token(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_photo_cloud_urls(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- 4. Privacy: Drop broad public SELECT policies on photos
DROP POLICY IF EXISTS "Public read photos by token" ON public.photos;
DROP POLICY IF EXISTS "Public read photos by token restricted" ON public.photos;

-- Revoke direct SELECT on photos from anon to prevent attendee enumeration and email dumping.
-- Visitors access individual souvenir photos exclusively through the secure RPC get_photo_by_token(p_token).
REVOKE SELECT ON public.photos FROM anon;

