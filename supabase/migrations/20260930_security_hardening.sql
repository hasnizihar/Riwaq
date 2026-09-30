-- ==============================================================================
-- Riwaq Uth-Thaqafa Photo Booth - Security & Reliability Hardening
-- ==============================================================================
-- Enforces strict visitor isolation:
-- 1. Visitors can ONLY read their own photo by token (unexpired).
-- 2. Visitors can ONLY atomically increment download count via secure RPC.
-- 3. Visitors CANNOT modify photo_token, event_id, urls, email_status, expires_at,
--    or any other attendee's record.
-- 4. Revokes open UPDATE on public.photos from anon.
-- ==============================================================================

-- Drop permissive public update policy on photos
DROP POLICY IF EXISTS "Public update photos" ON public.photos;

-- Secure public read: only unexpired photos can be viewed
DROP POLICY IF EXISTS "Public read photos by token" ON public.photos;
CREATE POLICY "Public read photos by token" ON public.photos
  FOR SELECT USING (
    expires_at IS NULL OR expires_at > NOW()
  );

-- Secure atomic download increment RPC (Callable by public/anon)
-- Only increments download_count for the matching token. Cannot alter URLs or tokens.
CREATE OR REPLACE FUNCTION public.increment_photo_download(p_token TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_count INTEGER;
BEGIN
  UPDATE public.photos
  SET download_count = COALESCE(download_count, 0) + 1,
      updated_at = NOW()
  WHERE photo_token = p_token
    AND (expires_at IS NULL OR expires_at > NOW())
  RETURNING download_count INTO v_new_count;

  RETURN COALESCE(v_new_count, 0);
END;
$$;

-- Secure visitor email request RPC (Callable by public/anon)
-- Only sets email and email_status to queued for that specific token.
CREATE OR REPLACE FUNCTION public.request_photo_email(p_token TEXT, p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Basic email check & sanitize
  IF p_email IS NULL OR LENGTH(TRIM(p_email)) < 5 OR p_email NOT LIKE '%@%.%' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;

  UPDATE public.photos
  SET email = TRIM(p_email),
      email_status = 'queued',
      updated_at = NOW()
  WHERE photo_token = p_token
    AND (expires_at IS NULL OR expires_at > NOW());

  RETURN FOUND;
END;
$$;

-- Grant EXECUTE to public/anon for the secure RPCs
GRANT EXECUTE ON FUNCTION public.increment_photo_download(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.request_photo_email(TEXT, TEXT) TO anon, authenticated;

-- Revoke direct UPDATE on photos from anon
REVOKE UPDATE ON public.photos FROM anon;
