-- ==============================================================================
-- Riwaq Uth-Thaqafa Photo Booth - Supabase Schema Migration
-- ==============================================================================

-- 1. Events Table
CREATE TABLE IF NOT EXISTS public.events (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  retention_days INTEGER DEFAULT 30,
  default_template_id TEXT,
  allow_frame_selection BOOLEAN DEFAULT TRUE,
  default_category_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  event_id TEXT REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);

-- 3. Templates Table
CREATE TABLE IF NOT EXISTS public.templates (
  id TEXT PRIMARY KEY,
  event_id TEXT REFERENCES public.events(id) ON DELETE CASCADE,
  category_id TEXT,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  aspect_ratio TEXT NOT NULL CHECK (aspect_ratio IN ('1:1', '4:3', '3:4', '16:9', '9:16')),
  active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Photos Table
CREATE TABLE IF NOT EXISTS public.photos (
  id TEXT PRIMARY KEY,
  event_id TEXT REFERENCES public.events(id) ON DELETE CASCADE,
  template_id TEXT,
  template_name TEXT,
  photo_token TEXT UNIQUE NOT NULL,
  original_photo_url TEXT,
  generated_photo_url TEXT,
  email TEXT,
  email_status TEXT DEFAULT 'not_requested' CHECK (
    email_status IN (
      'not_requested',
      'queued',
      'sending',
      'provider_accepted',
      'delivered',
      'delivery_failed',
      'bounced',
      'unknown'
    )
  ),
  download_count INTEGER DEFAULT 0,
  aspect_ratio TEXT NOT NULL,
  file_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_photos_event_id ON public.photos(event_id);
CREATE INDEX IF NOT EXISTS idx_photos_photo_token ON public.photos(photo_token);
CREATE INDEX IF NOT EXISTS idx_photos_email_status ON public.photos(email_status);
CREATE INDEX IF NOT EXISTS idx_templates_event_id ON public.templates(event_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

-- Anonymous public read policies
CREATE POLICY "Public read events" ON public.events FOR SELECT USING (true);
CREATE POLICY "Public read categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Public read templates" ON public.templates FOR SELECT USING (true);
CREATE POLICY "Public read photos by token" ON public.photos FOR SELECT USING (
  expires_at IS NULL OR expires_at > NOW()
);

-- Booth operator policies (Insert photos & templates)
CREATE POLICY "Public insert events" ON public.events FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update events" ON public.events FOR UPDATE USING (true);
CREATE POLICY "Public insert photos" ON public.photos FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert templates" ON public.templates FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update templates" ON public.templates FOR UPDATE USING (true);

-- ==============================================================================
-- Secure RPC: increment_photo_download
-- Visitors can ONLY increment download_count for their token.
-- Prevents visitors from modifying photo_token, URLs, or other visitor records.
-- ==============================================================================
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

-- Secure RPC: request_photo_email
CREATE OR REPLACE FUNCTION public.request_photo_email(p_token TEXT, p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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

GRANT EXECUTE ON FUNCTION public.increment_photo_download(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.request_photo_email(TEXT, TEXT) TO anon, authenticated;
REVOKE UPDATE ON public.photos FROM anon;

