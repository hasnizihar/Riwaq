import {
  EventConfig,
  EventCategory,
  PhotoTemplate,
  PhotoRecord,
  PendingPhoto,
  EmailStatus,
  DeliveryStatus,
  ASPECT_RATIOS,
} from '../types';
import { createThemedFramePNG } from '../utils/frameGenerator';
import { generatePhotoToken } from '../utils/imageCompositor';
import {
  syncPhotoToSupabase,
  syncPhotoCloudUrlsInSupabase,
  fetchPhotoByTokenFromSupabase,
  incrementDownloadCountInSupabase,
  updatePhotoEmailStatusInSupabase,
  syncEventToSupabase,
  syncTemplateToSupabase,
  deleteTemplateFromSupabase,
  deletePhotoFromSupabase,
} from './supabaseService';
import { uploadOriginalPhoto, uploadGeneratedPhoto, getCloudinaryConfig } from './cloudinaryService';

const DB_NAME = 'EventPhotoBoothDB';
const DB_VERSION = 3; // Version 3: photoToken index, emailStatus, expiresAt, downloadCount tracking

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('events')) {
        const eventStore = db.createObjectStore('events', { keyPath: 'id' });
        eventStore.createIndex('slug', 'slug', { unique: true });
      }

      if (!db.objectStoreNames.contains('categories')) {
        const catStore = db.createObjectStore('categories', { keyPath: 'id' });
        catStore.createIndex('eventId', 'eventId', { unique: false });
      }

      if (!db.objectStoreNames.contains('templates')) {
        const tmplStore = db.createObjectStore('templates', { keyPath: 'id' });
        tmplStore.createIndex('eventId', 'eventId', { unique: false });
      }

      if (!db.objectStoreNames.contains('photos')) {
        const photoStore = db.createObjectStore('photos', { keyPath: 'id' });
        photoStore.createIndex('eventId', 'eventId', { unique: false });
        photoStore.createIndex('token', 'token', { unique: false });
        photoStore.createIndex('photoToken', 'photoToken', { unique: false });
        photoStore.createIndex('emailStatus', 'emailStatus', { unique: false });
        photoStore.createIndex('createdAt', 'createdAt', { unique: false });
      } else {
        const photoStore = (e.target as IDBOpenDBRequest).transaction?.objectStore('photos');
        if (photoStore) {
          if (!photoStore.indexNames.contains('token')) {
            photoStore.createIndex('token', 'token', { unique: false });
          }
          if (!photoStore.indexNames.contains('photoToken')) {
            photoStore.createIndex('photoToken', 'photoToken', { unique: false });
          }
          if (!photoStore.indexNames.contains('emailStatus')) {
            photoStore.createIndex('emailStatus', 'emailStatus', { unique: false });
          }
        }
      }

      if (!db.objectStoreNames.contains('pendingPhotos')) {
        const pendingStore = db.createObjectStore('pendingPhotos', { keyPath: 'id' });
        pendingStore.createIndex('eventId', 'eventId', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

// Initial default seed event & templates
export async function seedInitialDataIfNeeded(): Promise<void> {
  const db = await getDB();

  // Check if events exist
  const events = await getAllFromStore<EventConfig>(db, 'events');
  if (events.length > 0) return;

  const defaultEventId = 'event_riwaq_2026';
  const defaultEvent: EventConfig = {
    id: defaultEventId,
    name: 'Riwaq Uth-Thaqafa',
    slug: 'riwaq',
    date: '30 September 2026',
    logoUrl: '/logo.png',
    location: 'Cultural Pavilion & Artisan Plaza',
    tagline: 'Bridging heritage, flavors, and moments',
    organizerEmail: 'booth@riwaq-festival.org',
    status: 'active',
    photoRetentionDays: 30, // Default 30-day retention
    createdAt: new Date().toISOString(),
  };

  const categories: EventCategory[] = [
    { id: 'cat_all', eventId: defaultEventId, name: 'All Frames', sortOrder: 0 },
    { id: 'cat_islamic', eventId: defaultEventId, name: 'Islamic & Cultural', sortOrder: 1 },
    { id: 'cat_food', eventId: defaultEventId, name: 'Food & Flavors', sortOrder: 2 },
    { id: 'cat_gala', eventId: defaultEventId, name: 'Special Event & Gala', sortOrder: 3 },
  ];

  // Pre-generate standard templates with true transparency
  const tmpl1PNG = createThemedFramePNG({
    aspectRatio: '3:4',
    theme: 'riwaq',
    eventName: 'RIWAQ UTH-THAQAFA',
    eventDate: '30 SEPTEMBER 2026',
    badgeText: 'CULTURAL SOUVENIR',
  });

  const tmpl2PNG = createThemedFramePNG({
    aspectRatio: '1:1',
    theme: 'riwaq',
    eventName: 'RIWAQ UTH-THAQAFA',
    eventDate: '30 SEPTEMBER 2026',
    badgeText: 'OFFICIAL MOMENT',
  });

  const tmpl3PNG = createThemedFramePNG({
    aspectRatio: '4:3',
    theme: 'food',
    eventName: 'FESTIVAL FEAST & CUISINE',
    eventDate: 'SEPTEMBER 2026',
    badgeText: 'FOOD STALL SPECIAL',
  });

  const tmpl4PNG = createThemedFramePNG({
    aspectRatio: '1:1',
    theme: 'food',
    eventName: 'RIWAQ DELICACIES',
    eventDate: 'SEPTEMBER 2026',
    badgeText: 'CHEF CHOICE',
  });

  const tmpl5PNG = createThemedFramePNG({
    aspectRatio: '9:16',
    theme: 'gala',
    eventName: 'RIWAQ GALA EVENING',
    eventDate: '30 SEPTEMBER 2026',
    badgeText: 'VIP GUEST',
  });

  const tmpl6PNG = createThemedFramePNG({
    aspectRatio: '3:4',
    theme: 'minimal',
    eventName: 'RIWAQ 2026',
    eventDate: '30 SEP 2026',
    badgeText: 'MEMORIES',
  });

  const templates: PhotoTemplate[] = [
    {
      id: 'tmpl_food_landscape',
      eventId: defaultEventId,
      categoryId: 'cat_food',
      categoryName: 'Food & Flavors',
      name: 'Food Frame 01',
      imageUrl: tmpl3PNG,
      aspectRatio: '4:3',
      width: ASPECT_RATIOS['4:3'].width,
      height: ASPECT_RATIOS['4:3'].height,
      orientation: 'landscape',
      active: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'tmpl_food_square',
      eventId: defaultEventId,
      categoryId: 'cat_food',
      categoryName: 'Food & Flavors',
      name: 'Food Frame 02',
      imageUrl: tmpl4PNG,
      aspectRatio: '1:1',
      width: ASPECT_RATIOS['1:1'].width,
      height: ASPECT_RATIOS['1:1'].height,
      orientation: 'square',
      active: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'tmpl_riwaq_portrait',
      eventId: defaultEventId,
      categoryId: 'cat_islamic',
      categoryName: 'Islamic & Cultural',
      name: 'Cultural Frame 01',
      imageUrl: tmpl1PNG,
      aspectRatio: '3:4',
      width: ASPECT_RATIOS['3:4'].width,
      height: ASPECT_RATIOS['3:4'].height,
      orientation: 'portrait',
      active: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'tmpl_riwaq_square',
      eventId: defaultEventId,
      categoryId: 'cat_islamic',
      categoryName: 'Islamic & Cultural',
      name: 'Cultural Frame 02',
      imageUrl: tmpl2PNG,
      aspectRatio: '1:1',
      width: ASPECT_RATIOS['1:1'].width,
      height: ASPECT_RATIOS['1:1'].height,
      orientation: 'square',
      active: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'tmpl_gala_story',
      eventId: defaultEventId,
      categoryId: 'cat_gala',
      categoryName: 'Special Event & Gala',
      name: 'Special Frame 01',
      imageUrl: tmpl5PNG,
      aspectRatio: '9:16',
      width: ASPECT_RATIOS['9:16'].width,
      height: ASPECT_RATIOS['9:16'].height,
      orientation: 'portrait',
      active: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'tmpl_minimal_portrait',
      eventId: defaultEventId,
      categoryId: 'cat_gala',
      categoryName: 'Special Event & Gala',
      name: 'Special Frame 02',
      imageUrl: tmpl6PNG,
      aspectRatio: '3:4',
      width: ASPECT_RATIOS['3:4'].width,
      height: ASPECT_RATIOS['3:4'].height,
      orientation: 'portrait',
      active: true,
      createdAt: new Date().toISOString(),
    },
  ];

  // Save event
  await putInStore(db, 'events', defaultEvent);
  for (const cat of categories) {
    await putInStore(db, 'categories', cat);
  }
  for (const tmpl of templates) {
    await putInStore(db, 'templates', tmpl);
  }

  // Routine sweep of expired photo assets from local storage
  purgeExpiredPhotos().catch(() => {});
}

/**
 * Sweeps expired photos from local IndexedDB based on photo expiresAt timestamp.
 */
export async function purgeExpiredPhotos(): Promise<number> {
  try {
    const db = await getDB();
    const photos = await getAllFromStore<PhotoRecord>(db, 'photos');
    const now = Date.now();
    let purged = 0;

    for (const p of photos) {
      if (p.expiresAt && new Date(p.expiresAt).getTime() < now) {
        await deleteFromStore(db, 'photos', p.id);
        purged++;
      }
    }
    return purged;
  } catch (err) {
    console.warn('[Storage] Expired photos purge notice:', err);
    return 0;
  }
}

// Database Helpers
function getAllFromStore<T>(db: IDBDatabase, storeName: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

function putInStore<T>(db: IDBDatabase, storeName: string, item: T): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.put(item);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function deleteFromStore(db: IDBDatabase, storeName: string, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Public API
export async function getEvents(): Promise<EventConfig[]> {
  await seedInitialDataIfNeeded();
  const db = await getDB();
  return getAllFromStore<EventConfig>(db, 'events');
}

export async function getEventBySlug(slug: string): Promise<EventConfig | null> {
  await seedInitialDataIfNeeded();
  const db = await getDB();
  const events = await getAllFromStore<EventConfig>(db, 'events');
  return events.find((e) => e.slug.toLowerCase() === slug.toLowerCase()) || null;
}

export async function saveEvent(event: EventConfig): Promise<void> {
  const db = await getDB();
  await putInStore(db, 'events', event);
  syncEventToSupabase(event).catch(() => {});
}

export async function getCategories(eventId: string): Promise<EventCategory[]> {
  await seedInitialDataIfNeeded();
  const db = await getDB();
  const cats = await getAllFromStore<EventCategory>(db, 'categories');
  return cats
    .filter((c) => c.eventId === eventId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function saveCategory(category: EventCategory): Promise<void> {
  const db = await getDB();
  await putInStore(db, 'categories', category);
}

export async function getTemplates(eventId: string, activeOnly: boolean = false): Promise<PhotoTemplate[]> {
  await seedInitialDataIfNeeded();
  const db = await getDB();
  const tmpls = await getAllFromStore<PhotoTemplate>(db, 'templates');
  return tmpls
    .filter((t) => t.eventId === eventId && (!activeOnly || t.active))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function saveTemplate(template: PhotoTemplate): Promise<void> {
  const db = await getDB();

  // Upload template image to Cloudinary if it's a local data URL
  let templateToSave = { ...template };
  const { cloudName } = getCloudinaryConfig();
  const isLocalImage = template.imageUrl &&
    (template.imageUrl.startsWith('data:') || template.imageUrl.startsWith('blob:'));

  if (isLocalImage && cloudName && !cloudName.includes('your-cloud-name')) {
    try {
      const result = await uploadGeneratedPhoto(template.imageUrl, {
        eventSlug: 'templates',
        fileName: `template_${template.id}`,
      });
      if (result.isCloudStored && result.secureUrl) {
        templateToSave.imageUrl = result.secureUrl;
        console.info('[Storage] Template image uploaded to Cloudinary:', result.secureUrl);
      }
    } catch (err) {
      console.warn('[Storage] Template Cloudinary upload failed, keeping local data URL:', err);
    }
  }

  await putInStore(db, 'templates', templateToSave);
  syncTemplateToSupabase(templateToSave).catch(() => {});
}

export async function deleteTemplate(templateId: string): Promise<void> {
  const db = await getDB();
  await deleteFromStore(db, 'templates', templateId);
  deleteTemplateFromSupabase(templateId).catch((err) => {
    console.warn('[Storage] Background cloud template deletion failed:', err);
  });
}

// Pending Photo Handling for Session Recovery
export async function savePendingPhoto(pending: PendingPhoto): Promise<void> {
  const db = await getDB();
  await putInStore(db, 'pendingPhotos', pending);
}

export async function getPendingPhoto(eventId: string): Promise<PendingPhoto | null> {
  const db = await getDB();
  const pendings = await getAllFromStore<PendingPhoto>(db, 'pendingPhotos');
  return pendings.find((p) => p.eventId === eventId) || null;
}

export async function deletePendingPhoto(id: string): Promise<void> {
  const db = await getDB();
  await deleteFromStore(db, 'pendingPhotos', id);
}

// Generated Photos Handling
export async function savePhoto(photo: Partial<PhotoRecord> & { id: string; eventId: string }): Promise<PhotoRecord> {
  const db = await getDB();
  const now = new Date().toISOString();

  // Ensure unique secure token (connects QR directly to this photo's page)
  const token = photo.photoToken || photo.token || generatePhotoToken();

  // Normalizing fields to guarantee both standard properties exist
  const completeRecord: PhotoRecord = {
    id: photo.id,
    eventId: photo.eventId,
    templateId: photo.templateId || 'tmpl_custom',
    templateName: photo.templateName || 'Custom Souvenir',
    photoToken: token,
    token: token,
    originalPhotoUrl: photo.originalPhotoUrl || photo.originalUrl || '',
    originalUrl: photo.originalPhotoUrl || photo.originalUrl || '',
    generatedPhotoUrl: photo.generatedPhotoUrl || photo.finalUrl || '',
    finalUrl: photo.generatedPhotoUrl || photo.finalUrl || '',
    email: photo.email || '',
    emailStatus: photo.emailStatus || 'not_requested',
    status: (photo.status as DeliveryStatus) || 'ready',
    downloadCount: photo.downloadCount || 0,
    aspectRatio: photo.aspectRatio || '4:3',
    fileName: photo.fileName || `souvenir-${token}.jpg`,
    createdAt: photo.createdAt || now,
    updatedAt: now,
    sentAt: photo.sentAt,
    expiresAt: photo.expiresAt,
    syncStatus: photo.syncStatus || 'queued',
  };

  await putInStore(db, 'photos', completeRecord);

  // Background non-blocking sync to Supabase (preserves offline resilience)
  syncPhotoToSupabase(completeRecord).catch((err) => {
    console.warn('[Storage] Background Supabase sync scheduled:', err);
  });

  return completeRecord;
}

export async function getPhotos(eventId: string): Promise<PhotoRecord[]> {
  const db = await getDB();
  const photos = await getAllFromStore<PhotoRecord>(db, 'photos');
  return photos
    .filter((p) => p.eventId === eventId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getPhotoByToken(token: string): Promise<PhotoRecord | null> {
  const db = await getDB();
  const photos = await getAllFromStore<PhotoRecord>(db, 'photos');
  let found = photos.find((p) => (p.photoToken === token || p.token === token));

  // If attendee scans QR on their own phone, local IndexedDB won't have it yet:
  // Fetch from Supabase cloud database
  if (!found) {
    const cloudRecord = await fetchPhotoByTokenFromSupabase(token);
    if (cloudRecord) {
      found = cloudRecord;
      // Cache locally in IndexedDB for fast subsequent operations
      putInStore(db, 'photos', cloudRecord).catch(() => {});
    }
  }

  if (!found) return null;

  // Check photo expiration if expiresAt is set
  if (found.expiresAt) {
    const expiryTime = new Date(found.expiresAt).getTime();
    if (Date.now() > expiryTime) {
      return null; // Expired
    }
  }

  return found;
}

export async function updatePhotoEmailStatus(
  photoId: string,
  emailStatus: EmailStatus,
  options?: { email?: string; sentAt?: string }
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('photos', 'readwrite');
  const store = tx.objectStore('photos');
  const req = store.get(photoId);

  await new Promise<void>((resolve, reject) => {
    req.onsuccess = () => {
      const record = req.result as PhotoRecord | undefined;
      if (record) {
        record.emailStatus = emailStatus;
        record.updatedAt = new Date().toISOString();
        if (options?.email) record.email = options.email;
        if (options?.sentAt) record.sentAt = options.sentAt;

        // Sync legacy status
        if (emailStatus === 'provider_accepted') {
          record.status = 'email_sent';
        } else if (emailStatus === 'delivery_failed' || emailStatus === 'bounced') {
          record.status = 'email_failed';
        } else if (emailStatus === 'queued' || emailStatus === 'sending') {
          record.status = 'email_pending';
        }

        store.put(record);
        // Non-blocking sync to Supabase
        updatePhotoEmailStatusInSupabase(photoId, emailStatus, options).catch(() => {});
      }
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}

// Backwards-compatible status updater
export async function updatePhotoStatus(
  photoId: string,
  status: DeliveryStatus,
  sentAt?: string
): Promise<void> {
  const emailStatusMap: Record<DeliveryStatus, EmailStatus> = {
    pending: 'queued',
    processing: 'sending',
    ready: 'not_requested',
    email_pending: 'queued',
    email_sent: 'provider_accepted',
    email_failed: 'delivery_failed',
    downloaded: 'not_requested',
  };

  await updatePhotoEmailStatus(photoId, emailStatusMap[status] || 'unknown', { sentAt });
}

/**
 * Asynchronously syncs local photo record to Cloudinary and Supabase.
 * If offline or Cloudinary is unavailable, marks syncStatus = 'queued'.
 * Does NOT throw errors to callers; preserves the emergency local safety net.
 */
export async function syncPhotoToCloud(photoId: string): Promise<boolean> {
  const db = await getDB();
  const tx = db.transaction('photos', 'readonly');
  const store = tx.objectStore('photos');
  const req = store.get(photoId);

  const photo = await new Promise<PhotoRecord | undefined>((resolve) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(undefined);
  });

  if (!photo) return false;

  try {
    const isOrigLocal =
      photo.originalPhotoUrl &&
      (photo.originalPhotoUrl.startsWith('data:') || photo.originalPhotoUrl.startsWith('blob:'));
    const isGenLocal =
      photo.generatedPhotoUrl &&
      (photo.generatedPhotoUrl.startsWith('data:') || photo.generatedPhotoUrl.startsWith('blob:'));

    let newOrigUrl = photo.originalPhotoUrl;
    let newGenUrl = photo.generatedPhotoUrl;

    if (isOrigLocal || isGenLocal) {
      const uploadPromises: Promise<void>[] = [];

      if (isOrigLocal) {
        uploadPromises.push(
          uploadOriginalPhoto(photo.originalPhotoUrl, {
            token: photo.photoToken || photo.token,
          }).then((res) => {
            if (res.isCloudStored && res.secureUrl) {
              newOrigUrl = res.secureUrl;
            }
          })
        );
      }

      if (isGenLocal) {
        uploadPromises.push(
          uploadGeneratedPhoto(photo.generatedPhotoUrl, {
            token: photo.photoToken || photo.token,
            fileName: photo.fileName,
          }).then((res) => {
            if (res.isCloudStored && res.secureUrl) {
              newGenUrl = res.secureUrl;
            }
          })
        );
      }

      await Promise.all(uploadPromises);
    }

    const isCloudSaved = newGenUrl.includes('cloudinary.com') || !isGenLocal;

    const updatedRecord: PhotoRecord = {
      ...photo,
      originalPhotoUrl: newOrigUrl,
      originalUrl: newOrigUrl,
      generatedPhotoUrl: newGenUrl,
      finalUrl: newGenUrl,
      syncStatus: isCloudSaved ? 'synced' : 'queued',
      updatedAt: new Date().toISOString(),
    };

    // Update in local IndexedDB
    await putInStore(db, 'photos', updatedRecord);

    // Sync to Supabase cloud database
    await syncPhotoToSupabase(updatedRecord);

    return isCloudSaved;
  } catch (err) {
    console.warn('[Storage] Cloud sync deferred (photo retained in local IndexedDB safety net):', err);
    return false;
  }
}

/**
 * Scans and syncs all pending photos queued during offline or flaky connections
 */
export async function syncPendingUploads(): Promise<{ synced: number; failed: number }> {
  const db = await getDB();
  const photos = await getAllFromStore<PhotoRecord>(db, 'photos');
  const pending = photos.filter((p) => p.syncStatus === 'queued' || p.syncStatus === 'failed');

  let synced = 0;
  let failed = 0;

  for (const item of pending) {
    const success = await syncPhotoToCloud(item.id);
    if (success) synced++;
    else failed++;
  }

  return { synced, failed };
}

/**
 * Returns sync queue metrics for admin and monitoring
 */
export async function getSyncQueueStatus(eventId?: string): Promise<{
  total: number;
  synced: number;
  queued: number;
}> {
  const db = await getDB();
  const allPhotos = await getAllFromStore<PhotoRecord>(db, 'photos');
  const photos = eventId ? allPhotos.filter((p) => p.eventId === eventId) : allPhotos;

  const queued = photos.filter((p) => p.syncStatus === 'queued' || p.syncStatus === 'failed').length;
  const synced = photos.filter((p) => p.syncStatus === 'synced').length;

  return {
    total: photos.length,
    synced,
    queued,
  };
}

// Auto-sync listener when browser reconnects to internet
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.info('[Storage] Network connectivity restored. Syncing emergency local queue to cloud...');
    syncPendingUploads().catch(() => {});
  });
}

/**
 * Increments download count ONLY when user explicitly clicks Save Photo / Download.
 * Performs atomic increment via secure RPC in Supabase and updates local IndexedDB.
 */
export async function incrementDownloadCount(photoIdOrToken: string): Promise<number> {
  const db = await getDB();
  const all = await getAllFromStore<PhotoRecord>(db, 'photos');
  const record = all.find(
    (p) => p.id === photoIdOrToken || p.photoToken === photoIdOrToken || p.token === photoIdOrToken
  );

  let newCount = (record?.downloadCount || 0) + 1;

  if (record) {
    record.downloadCount = newCount;
    record.updatedAt = new Date().toISOString();
    await putInStore(db, 'photos', record);
  }

  // Secure atomic increment via Supabase RPC (cannot mutate other columns)
  const tokenForRpc = record ? (record.photoToken || record.token || record.id) : photoIdOrToken;
  incrementDownloadCountInSupabase(tokenForRpc)
    .then((cloudCount) => {
      if (cloudCount && record && cloudCount !== newCount) {
        record.downloadCount = cloudCount;
        putInStore(db, 'photos', record).catch(() => {});
      }
    })
    .catch(() => {});

  return newCount;
}

export async function deletePhoto(photoId: string): Promise<void> {
  const db = await getDB();
  await deleteFromStore(db, 'photos', photoId);
  // Also delete from Supabase cloud database
  deletePhotoFromSupabase(photoId).catch((err) => {
    console.warn('[Storage] Background cloud photo deletion failed:', err);
  });
}

export async function getEventStats(eventId: string) {
  const photos = await getPhotos(eventId);
  const templates = await getTemplates(eventId);

  const totalGenerated = photos.length;
  // Specific download metrics
  const downloadedPhotos = photos.filter((p) => p.downloadCount && p.downloadCount > 0);
  const downloadedCount = downloadedPhotos.length;
  const totalDownloads = photos.reduce((acc, p) => acc + (p.downloadCount || 0), 0);

  // Specific email metrics: explicit breakdown
  const emailsAcceptedCount = photos.filter(
    (p) => p.emailStatus === 'provider_accepted' || p.status === 'email_sent'
  ).length;
  const emailsDeliveredCount = photos.filter((p) => p.emailStatus === 'delivered').length;
  const emailsFailedCount = photos.filter(
    (p) => p.emailStatus === 'delivery_failed' || p.emailStatus === 'bounced' || p.status === 'email_failed'
  ).length;
  const emailsNotRequestedCount = photos.filter(
    (p) => !p.emailStatus || p.emailStatus === 'not_requested'
  ).length;
  const emailsQueuedCount = photos.filter(
    (p) => p.emailStatus === 'queued' || p.emailStatus === 'sending' || p.status === 'email_pending'
  ).length;

  const activeTemplates = templates.filter((t) => t.active).length;

  // Breakdown of templates used
  const templateUsageMap: Record<string, { name: string; ratio: string; count: number }> = {};
  for (const t of templates) {
    templateUsageMap[t.id] = { name: t.name, ratio: t.aspectRatio, count: 0 };
  }
  for (const p of photos) {
    if (templateUsageMap[p.templateId]) {
      templateUsageMap[p.templateId].count++;
    } else {
      templateUsageMap[p.templateId] = {
        name: p.templateName || 'Custom Frame',
        ratio: p.aspectRatio,
        count: 1,
      };
    }
  }

  const templateBreakdown = Object.values(templateUsageMap).sort((a, b) => b.count - a.count);

  return {
    totalPhotosTaken: totalGenerated,
    totalGenerated,
    downloadedCount,
    totalDownloads,
    emailsAcceptedCount,
    emailsDeliveredCount,
    emailsFailedCount,
    emailsNotRequestedCount,
    emailsQueuedCount,
    sentCount: emailsAcceptedCount, // alias for legacy views
    failedCount: emailsFailedCount,
    totalTemplates: templates.length,
    activeTemplates,
    deliveryRate:
      totalGenerated > 0
        ? Math.round(((emailsAcceptedCount + downloadedCount) / totalGenerated) * 100)
        : 100,
    templateBreakdown,
  };
}
