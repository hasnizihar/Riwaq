export type AspectRatio = '1:1' | '4:3' | '3:4' | '16:9' | '9:16';

export type Orientation = 'portrait' | 'landscape' | 'square';

export type EmailStatus =
  | 'not_requested'
  | 'queued'
  | 'sending'
  | 'provider_accepted'
  | 'delivered'
  | 'delivery_failed'
  | 'bounced'
  | 'unknown';

export type DeliveryStatus =
  | 'pending'
  | 'processing'
  | 'ready'
  | 'email_pending'
  | 'email_sent'
  | 'email_failed'
  | 'downloaded';

export interface AspectRatioDetails {
  ratio: AspectRatio;
  label: string;
  orientation: Orientation;
  width: number;
  height: number;
  description: string;
}

export const ASPECT_RATIOS: Record<AspectRatio, AspectRatioDetails> = {
  '1:1': {
    ratio: '1:1',
    label: '1:1 Square',
    orientation: 'square',
    width: 1080,
    height: 1080,
    description: '1080 × 1080 px • Square',
  },
  '4:3': {
    ratio: '4:3',
    label: '4:3 Landscape',
    orientation: 'landscape',
    width: 1600,
    height: 1200,
    description: '1600 × 1200 px • Landscape',
  },
  '3:4': {
    ratio: '3:4',
    label: '3:4 Portrait',
    orientation: 'portrait',
    width: 1200,
    height: 1600,
    description: '1200 × 1600 px • Portrait',
  },
  '16:9': {
    ratio: '16:9',
    label: '16:9 Landscape',
    orientation: 'landscape',
    width: 1920,
    height: 1080,
    description: '1920 × 1080 px • Widescreen',
  },
  '9:16': {
    ratio: '9:16',
    label: '9:16 Portrait',
    orientation: 'portrait',
    width: 1080,
    height: 1920,
    description: '1080 × 1920 px • Vertical Story',
  },
};

export interface EventConfig {
  id: string;
  name: string;
  slug: string;
  date: string;
  logoUrl?: string;
  status: 'active' | 'archived';
  location?: string;
  organizerEmail?: string;
  tagline?: string;
  defaultTemplateId?: string; // Preselected default frame
  allowFrameSelection?: boolean; // When false, bypasses frame selector: Photo -> Adjust directly
  defaultCategoryId?: string; // Default category
  photoRetentionDays?: number; // 7, 30, 90, 0 (never)
  createdAt: string;
}

export interface EventCategory {
  id: string;
  eventId: string;
  name: string;
  sortOrder: number;
}

export interface PhotoTemplate {
  id: string;
  eventId: string;
  categoryId: string;
  categoryName: string;
  name: string;
  imageUrl: string;
  aspectRatio: AspectRatio;
  width: number;
  height: number;
  orientation: Orientation;
  active: boolean;
  createdAt: string;
}

/**
 * Single source of truth for generated attendee photos
 */
export interface PhotoRecord {
  id: string;
  eventId: string; // event_id
  templateId: string; // template_id
  templateName?: string;
  photoToken: string; // photo_token: connects QR code to that exact photo
  token: string; // alias for backwards compatibility
  originalPhotoUrl: string; // original_photo_url
  originalUrl: string; // alias
  generatedPhotoUrl: string; // generated_photo_url
  finalUrl: string; // alias
  email: string;
  emailStatus: EmailStatus; // email_status: explicit state machine
  status: DeliveryStatus; // legacy status alias
  downloadCount: number; // download_count: incremented on explicit download only
  aspectRatio: AspectRatio;
  fileName: string;
  createdAt: string; // created_at
  updatedAt: string; // updated_at
  sentAt?: string;
  expiresAt?: string; // photo retention expiry timestamp
  syncStatus?: 'local_only' | 'queued' | 'synced' | 'failed'; // emergency local vs cloud sync status
}

export interface PendingPhoto {
  id: string;
  eventId: string;
  originalPhoto: string;
  templateId: string;
  transform: TransformState;
  updatedAt: string;
}

export interface TransformState {
  scale: number;
  x: number;
  y: number;
  rotation: number;
  previewWidth?: number;
  previewHeight?: number;
}

export type BoothStep =
  | 'home' // Luxurious minimal home screen
  | 'camera' // Camera capture view
  | 'frame' // Select template with underlined category tabs
  | 'adjust' // Crop, pan, zoom within template frame
  | 'preview' // Inspect composite before commit
  | 'processing' // Rendering composite & saving locally
  | 'ready'; // Polished Souvenir Ready Hub (QR, download, email, next visitor)
