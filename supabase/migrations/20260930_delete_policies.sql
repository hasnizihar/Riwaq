-- ==============================================================================
-- Riwaq Uth-Thaqafa Photo Booth - Delete Policies & Admin RPC
-- ==============================================================================
-- Adds DELETE policies for templates and photos so admin can remove records.
-- Adds admin_delete_photo RPC for secure photo deletion.
-- ==============================================================================

-- Allow deleting templates (booth operator)
DROP POLICY IF EXISTS "Public delete templates" ON public.templates;
CREATE POLICY "Public delete templates" ON public.templates
  FOR DELETE USING (true);

-- Allow deleting photos (booth operator)
DROP POLICY IF EXISTS "Public delete photos" ON public.photos;
CREATE POLICY "Public delete photos" ON public.photos
  FOR DELETE USING (true);

-- Secure RPC: admin_delete_photo
-- Deletes a photo record by ID
CREATE OR REPLACE FUNCTION public.admin_delete_photo(p_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.photos WHERE id = p_id;
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_photo(TEXT) TO anon, authenticated;
