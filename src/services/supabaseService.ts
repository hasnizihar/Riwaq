import { createClient } from '@supabase/supabase-js';
import { PhotoRecord, EventConfig, PhotoTemplate, EventCategory, EmailStatus } from '../types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = (): boolean => {
  return !!SUPABASE_URL && !SUPABASE_URL.includes('your-project') && !!SUPABASE_ANON_KEY;
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Maps camelCase PhotoRecord to snake_case Supabase table columns
 */
export function mapPhotoRecordToDb(p: PhotoRecord) {
  return {
    id: p.id,
    event_id: p.eventId,
    template_id: p.templateId,
    template_name: p.templateName || '',
    photo_token: p.photoToken || p.token,
    original_photo_url: p.originalPhotoUrl || p.originalUrl || '',
    generated_photo_url: p.generatedPhotoUrl || p.finalUrl || '',
    email: p.email || '',
    email_status: p.emailStatus || 'not_requested',
    download_count: p.downloadCount || 0,
    aspect_ratio: p.aspectRatio,
    file_name: p.fileName,
    created_at: p.createdAt,
    updated_at: p.updatedAt || new Date().toISOString(),
    expires_at: p.expiresAt || null,
  };
}

/**
 * Maps snake_case Supabase row to PhotoRecord
 */
export function mapDbToPhotoRecord(row: Record<string, unknown>): PhotoRecord {
  const token = (row.photo_token as string) || (row.id as string);
  return {
    id: row.id as string,
    eventId: row.event_id as string,
    templateId: (row.template_id as string) || 'tmpl_custom',
    templateName: (row.template_name as string) || 'Souvenir',
    photoToken: token,
    token: token,
    originalPhotoUrl: (row.original_photo_url as string) || '',
    originalUrl: (row.original_photo_url as string) || '',
    generatedPhotoUrl: (row.generated_photo_url as string) || '',
    finalUrl: (row.generated_photo_url as string) || '',
    email: (row.email as string) || '',
    emailStatus: (row.email_status as EmailStatus) || 'not_requested',
    status: (row.email_status === 'provider_accepted' ? 'email_sent' : 'ready'),
    downloadCount: (row.download_count as number) || 0,
    aspectRatio: (row.aspect_ratio as PhotoRecord['aspectRatio']) || '4:3',
    fileName: (row.file_name as string) || `souvenir-${token}.jpg`,
    createdAt: (row.created_at as string) || new Date().toISOString(),
    updatedAt: (row.updated_at as string) || new Date().toISOString(),
    expiresAt: (row.expires_at as string) || undefined,
  };
}

/**
 * Synchronizes uploaded cloud URLs (Cloudinary) to Supabase via secure RPC.
 * Does not require or request broad UPDATE privileges on public.photos.
 */
export async function syncPhotoCloudUrlsInSupabase(
  photoId: string,
  photoToken: string,
  originalUrl: string,
  generatedUrl: string
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const { error } = await supabase.rpc('sync_photo_cloud_urls', {
      p_id: photoId,
      p_token: photoToken,
      p_original_url: originalUrl,
      p_generated_url: generatedUrl,
    });

    if (!error) return true;
    console.warn('[Supabase] sync_photo_cloud_urls RPC warning:', error.message);
    return false;
  } catch (err) {
    console.warn('[Supabase] Failed to call sync_photo_cloud_urls RPC:', err);
    return false;
  }
}

/**
 * Saves or updates a photo record in Supabase.
 * Uses atomic INSERT for initial creation; if duplicate key, invokes sync_photo_cloud_urls.
 */
export async function syncPhotoToSupabase(photo: PhotoRecord): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const payload = mapPhotoRecordToDb(photo);
    // 1. Initial insert path (allowed by anon INSERT policy)
    const { error: insertError } = await supabase
      .from('photos')
      .insert(payload);

    if (!insertError) {
      return true;
    }

    // 2. If row already exists (duplicate key error), invoke secure RPC to update cloud URLs
    const errCode = (insertError as { code?: string }).code;
    if (errCode === '23505' || insertError.message.includes('duplicate key') || insertError.message.includes('already exists')) {
      return await syncPhotoCloudUrlsInSupabase(
        photo.id,
        photo.photoToken || photo.token,
        photo.originalPhotoUrl || photo.originalUrl || '',
        photo.generatedPhotoUrl || photo.finalUrl || ''
      );
    }

    console.warn('[Supabase] Photo insert warning:', insertError.message);
    return false;
  } catch (err) {
    console.warn('[Supabase] Failed to sync photo to Supabase (retaining in local DB):', err);
    return false;
  }
}

/**
 * Fetches photo record by opaque random photo token.
 * Securely uses RPC 'get_photo_by_token' or restricted column SELECT.
 * NEVER returns attendee email or original photo URL to anonymous visitors.
 * Validates expiration if expires_at is set.
 */
export async function fetchPhotoByTokenFromSupabase(token: string): Promise<PhotoRecord | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    // 1. Preferred secure RPC: returns ONLY attendee-safe public souvenir fields
    const { data: rpcRows, error: rpcError } = await supabase.rpc('get_photo_by_token', {
      p_token: token,
    });

    if (!rpcError && Array.isArray(rpcRows) && rpcRows.length > 0) {
      const row = rpcRows[0];
      return {
        id: row.id,
        eventId: row.event_id || '',
        templateId: '',
        templateName: row.template_name || 'Riwaq Frame',
        photoToken: token,
        token: token,
        originalPhotoUrl: '', // attendee email & original photo NEVER exposed to visitor
        originalUrl: '',
        generatedPhotoUrl: row.generated_photo_url || '',
        finalUrl: row.generated_photo_url || '',
        email: '',
        emailStatus: 'not_requested',
        status: 'ready',
        downloadCount: 0,
        aspectRatio: (row.aspect_ratio as any) || '4:3',
        fileName: row.file_name || `souvenir-${token}.jpg`,
        createdAt: row.created_at || new Date().toISOString(),
        updatedAt: row.created_at || new Date().toISOString(),
        expiresAt: row.expires_at || undefined,
        syncStatus: 'synced',
      };
    }

    // 2. Direct query fallback: explicitly select ONLY public visitor fields (never email or original photo)
    const { data, error } = await supabase
      .from('photos')
      .select('id, event_id, template_name, photo_token, generated_photo_url, aspect_ratio, file_name, created_at, expires_at')
      .eq('photo_token', token)
      .maybeSingle();

    if (error || !data) return null;

    // Security check: verify expiration
    if (data.expires_at) {
      const expiry = new Date(data.expires_at as string).getTime();
      if (Date.now() > expiry) {
        return null; // Expired
      }
    }

    return {
      id: data.id,
      eventId: data.event_id || '',
      templateId: '',
      templateName: data.template_name || 'Riwaq Frame',
      photoToken: data.photo_token || token,
      token: data.photo_token || token,
      originalPhotoUrl: '',
      originalUrl: '',
      generatedPhotoUrl: data.generated_photo_url || '',
      finalUrl: data.generated_photo_url || '',
      email: '',
      emailStatus: 'not_requested',
      status: 'ready',
      downloadCount: 0,
      aspectRatio: (data.aspect_ratio as any) || '4:3',
      fileName: data.file_name || `souvenir-${token}.jpg`,
      createdAt: data.created_at || new Date().toISOString(),
      updatedAt: data.created_at || new Date().toISOString(),
      expiresAt: data.expires_at || undefined,
      syncStatus: 'synced',
    };
  } catch (err) {
    console.warn('[Supabase] Token lookup fallback:', err);
    return null;
  }
}

/**
 * Atomically increments download_count in Supabase.
 * Uses secure SECURITY DEFINER RPC 'increment_photo_download' so visitors cannot
 * modify any other column or record.
 */
export async function incrementDownloadCountInSupabase(photoTokenOrId: string): Promise<number | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    // 1. Preferred secure RPC path: restricted to ONLY incrementing download_count by token
    const { data: rpcCount, error: rpcError } = await supabase.rpc('increment_photo_download', {
      p_token: photoTokenOrId,
    });

    if (!rpcError && typeof rpcCount === 'number') {
      return rpcCount;
    }

    // 2. Fallback if RPC has not been migrated yet in the connected project
    const { data } = await supabase
      .from('photos')
      .select('download_count, id, photo_token')
      .or(`photo_token.eq.${photoTokenOrId},id.eq.${photoTokenOrId}`)
      .maybeSingle();

    if (data) {
      const targetId = data.id;
      const currentCount = data.download_count || 0;
      await supabase
        .from('photos')
        .update({
          download_count: currentCount + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', targetId);
      return currentCount + 1;
    }
    return null;
  } catch (err) {
    console.warn('[Supabase] Failed to increment download count in cloud:', err);
    return null;
  }
}

/**
 * Securely requests an email copy via RPC, updating only the email column for that token
 */
export async function requestPhotoEmailInSupabase(
  photoToken: string,
  email: string
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const { error } = await supabase.rpc('request_photo_email', {
      p_token: photoToken,
      p_email: email.trim(),
    });
    return !error;
  } catch (err) {
    console.warn('[Supabase] RPC email request warning:', err);
    return false;
  }
}

/**
 * Updates email status in Supabase (Operator / booth side)
 */
export async function updatePhotoEmailStatusInSupabase(
  photoId: string,
  emailStatus: EmailStatus,
  options?: { email?: string; sentAt?: string }
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const updates: Record<string, unknown> = {
      email_status: emailStatus,
      updated_at: new Date().toISOString(),
    };
    if (options?.email) updates.email = options.email;

    await supabase.from('photos').update(updates).eq('id', photoId);
  } catch (err) {
    console.warn('[Supabase] Failed to update email status in cloud:', err);
  }
}

/**
 * Syncs event configuration to Supabase
 */
export async function syncEventToSupabase(event: EventConfig): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const payload = {
      id: event.id,
      slug: event.slug,
      name: event.name,
      description: event.tagline || '',
      logo_url: event.logoUrl || null,
      status: event.status,
      retention_days: event.photoRetentionDays ?? 30,
      default_template_id: event.defaultTemplateId || null,
      allow_frame_selection: event.allowFrameSelection !== false,
      default_category_id: event.defaultCategoryId || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('events').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn('[Supabase] Event upsert warning:', error.message);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Fetches events from Supabase with graceful fallback
 */
export async function fetchEventsFromSupabase(): Promise<EventConfig[] | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase.from('events').select('*');
    if (error || !data || data.length === 0) return null;

    return data.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      date: '30 September 2026',
      tagline: row.description || '',
      status: (row.status as EventConfig['status']) || 'active',
      defaultTemplateId: row.default_template_id || undefined,
      allowFrameSelection: row.allow_frame_selection !== false,
      defaultCategoryId: row.default_category_id || undefined,
      photoRetentionDays: row.retention_days ?? 30,
      createdAt: row.created_at || new Date().toISOString(),
    }));
  } catch {
    return null;
  }
}

/**
 * Syncs template to Supabase
 */
export async function syncTemplateToSupabase(tmpl: PhotoTemplate): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const payload = {
      id: tmpl.id,
      event_id: tmpl.eventId,
      category_id: tmpl.categoryId,
      name: tmpl.name,
      image_url: tmpl.imageUrl,
      aspect_ratio: tmpl.aspectRatio,
      active: tmpl.active,
      created_at: tmpl.createdAt,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('templates').upsert(payload, { onConflict: 'id' });
    return !error;
  } catch {
    return false;
  }
}

/**
 * Fetches templates from Supabase
 */
export async function fetchTemplatesFromSupabase(eventId: string): Promise<PhotoTemplate[] | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('event_id', eventId);

    if (error || !data || data.length === 0) return null;

    return data.map((t) => ({
      id: t.id,
      eventId: t.event_id,
      categoryId: t.category_id || 'cat_food',
      categoryName: 'Category',
      name: t.name,
      imageUrl: t.image_url,
      aspectRatio: t.aspect_ratio || '4:3',
      width: 1200,
      height: 1600,
      orientation: 'portrait',
      active: t.active !== false,
      createdAt: t.created_at || new Date().toISOString(),
    }));
  } catch {
    return null;
  }
}

/**
 * Deletes template from Supabase
 */
export async function deleteTemplateFromSupabase(templateId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const { error } = await supabase.from('templates').delete().eq('id', templateId);
    return !error;
  } catch {
    return false;
  }
}
