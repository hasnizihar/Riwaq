/**
 * Dedicated Cloudinary Integration Layer for Riwaq Photo Booth.
 * Handles client-side asset uploads via unsigned upload preset.
 * Provides resilient fallback to local dataUrls if offline or upload is unavailable.
 */

const STORAGE_KEY = 'riwaq_cloudinary_config';

export interface CloudinaryConfig {
  cloudName: string;
  uploadPreset: string;
}

/**
 * Returns current Cloudinary configuration with runtime override support
 */
export function getCloudinaryConfig(): CloudinaryConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.cloudName && parsed.uploadPreset) {
        return {
          cloudName: parsed.cloudName.trim(),
          uploadPreset: parsed.uploadPreset.trim(),
        };
      }
    }
  } catch {
    // ignore json errors
  }

  return {
    cloudName: (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '').trim(),
    uploadPreset: (import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '').trim(),
  };
}

/**
 * Saves runtime Cloudinary configuration (operator override)
 */
export function setCloudinaryConfig(config: CloudinaryConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    cloudName: config.cloudName.trim(),
    uploadPreset: config.uploadPreset.trim(),
  }));
}

/**
 * Resets Cloudinary configuration to environment defaults
 */
export function resetCloudinaryConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export interface CloudinaryUploadResult {
  url: string;
  secureUrl: string;
  publicId?: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
  isCloudStored: boolean;
  error?: string;
}

export interface CloudinaryTestResult {
  success: boolean;
  statusCode?: number;
  cloudName: string;
  uploadPreset: string;
  message: string;
  details?: string;
  sampleUrl?: string;
}

/**
 * Diagnoses Cloudinary setup: verifies cloud_name and upload_preset validity.
 * Uploads a minimal 1x1 test gif/png to verify the pipeline.
 */
export async function testCloudinaryConnection(
  customConfig?: CloudinaryConfig
): Promise<CloudinaryTestResult> {
  const config = customConfig || getCloudinaryConfig();
  const { cloudName, uploadPreset } = config;

  if (!cloudName || cloudName.includes('your-cloud-name')) {
    return {
      success: false,
      cloudName,
      uploadPreset,
      message: 'Cloud name is missing or set to placeholder',
      details: 'Please enter your actual Cloudinary Cloud Name in settings.',
    };
  }

  // 1x1 transparent GIF base64
  const testPixel = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

  const formData = new FormData();
  formData.append('file', testPixel);
  formData.append('upload_preset', uploadPreset);
  formData.append('folder', 'riwaq-photobooth/diagnostics');
  formData.append('public_id', `ping_${Date.now()}`);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000); // 9s timeout

    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const responseText = await response.text();
    let data: Record<string, unknown> = {};
    try {
      data = JSON.parse(responseText);
    } catch {
      // ignore
    }

    if (response.ok && data.secure_url) {
      return {
        success: true,
        statusCode: 200,
        cloudName,
        uploadPreset,
        message: 'Cloudinary connection verified successfully!',
        sampleUrl: data.secure_url as string,
        details: `Successfully uploaded diagnostic asset to https://res.cloudinary.com/${cloudName}/`,
      };
    }

    // Parse Cloudinary specific error messages
    const errObj = (data.error as { message?: string }) || {};
    const errMsg = errObj.message || responseText || 'Unknown Cloudinary error';

    let helpfulHint = '';
    if (response.status === 404 || errMsg.toLowerCase().includes('not found') || errMsg.toLowerCase().includes('cloud')) {
      helpfulHint = `The cloud name "${cloudName}" was not found. Note: Cloud names in Cloudinary are typically lowercase alphanumeric strings (e.g. 'dcgnjhjkp' from your dashboard URL 'cloudinary://...@dcgnjhjkp'), which can differ from your account username or display name.`;
    } else if (response.status === 400 && (errMsg.toLowerCase().includes('preset') || errMsg.toLowerCase().includes('upload_preset'))) {
      helpfulHint = `Upload preset "${uploadPreset}" is not recognized or not configured for unsigned access. Go to Cloudinary Settings -> Upload -> Upload presets -> Add unsigned preset.`;
    }

    return {
      success: false,
      statusCode: response.status,
      cloudName,
      uploadPreset,
      message: `Cloudinary rejected test upload (${response.status}): ${errMsg}`,
      details: helpfulHint || errMsg,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      cloudName,
      uploadPreset,
      message: `Network failure connecting to Cloudinary API (${msg})`,
      details: 'Check your internet connection or browser network permissions.',
    };
  }
}

/**
 * Uploads an image asset to Cloudinary.
 * Accepts dataUrl, Blob, or File.
 * Falls back to local dataUrl gracefully if network is unavailable or upload fails.
 */
async function uploadToCloudinary(
  file: string | Blob,
  folder: string,
  fileName?: string
): Promise<CloudinaryUploadResult> {
  const { cloudName, uploadPreset } = getCloudinaryConfig();

  // If the cloud name is placeholder or missing, fallback immediately
  if (!cloudName || cloudName.includes('your-cloud-name')) {
    const localUrl = typeof file === 'string' ? file : URL.createObjectURL(file);
    return {
      url: localUrl,
      secureUrl: localUrl,
      isCloudStored: false,
      error: 'Cloudinary cloud name is not configured',
    };
  }

  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);
  formData.append('folder', folder);

  if (fileName) {
    formData.append('public_id', fileName.replace(/\.[^/.]+$/, ''));
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`[Cloudinary] Upload returned status ${response.status}:`, errText);
      const localUrl = typeof file === 'string' ? file : URL.createObjectURL(file);
      return {
        url: localUrl,
        secureUrl: localUrl,
        isCloudStored: false,
        error: `Upload status ${response.status}: ${errText.slice(0, 100)}`,
      };
    }

    const data = await response.json();
    return {
      url: data.url,
      secureUrl: data.secure_url,
      publicId: data.public_id,
      width: data.width,
      height: data.height,
      format: data.format,
      bytes: data.bytes,
      isCloudStored: true,
    };
  } catch (err: unknown) {
    console.warn('[Cloudinary] Network error uploading asset, falling back to local storage:', err);
    const localUrl = typeof file === 'string' ? file : URL.createObjectURL(file);
    return {
      url: localUrl,
      secureUrl: localUrl,
      isCloudStored: false,
      error: err instanceof Error ? err.message : 'Network error during upload',
    };
  }
}

/**
 * Uploads participant's original uncropped photo to Cloudinary
 */
export async function uploadOriginalPhoto(
  photoDataUrl: string,
  options?: { eventSlug?: string; token?: string }
): Promise<CloudinaryUploadResult> {
  const folder = `riwaq-photobooth/${options?.eventSlug || 'general'}/originals`;
  const fileName = options?.token ? `orig_${options.token}` : undefined;
  return uploadToCloudinary(photoDataUrl, folder, fileName);
}

/**
 * Uploads attendee's final composited souvenir photo to Cloudinary
 */
export async function uploadGeneratedPhoto(
  compositeDataUrlOrBlob: string | Blob,
  options?: { eventSlug?: string; token?: string; fileName?: string }
): Promise<CloudinaryUploadResult> {
  const folder = `riwaq-photobooth/${options?.eventSlug || 'general'}/generated`;
  const name = options?.fileName || (options?.token ? `souvenir_${options.token}.jpg` : undefined);
  return uploadToCloudinary(compositeDataUrlOrBlob, folder, name);
}

/**
 * Generates an optimized Cloudinary delivery URL with auto format & quality
 */
export function getOptimizedPhotoUrl(
  urlOrPublicId: string,
  options?: { width?: number; quality?: string | number; format?: 'auto' | 'webp' | 'jpg' }
): string {
  if (!urlOrPublicId || !urlOrPublicId.includes('cloudinary.com')) {
    return urlOrPublicId;
  }

  const { width = 1200, quality = 'auto', format = 'auto' } = options || {};
  const transformation = `w_${width},q_${quality},f_${format},c_limit`;

  // Inject transformation before the version or folder in the Cloudinary upload URL
  return urlOrPublicId.replace('/image/upload/', `/image/upload/${transformation}/`);
}

/**
 * Deletes asset (Client-side deletes require server-side signature; this logs or queues)
 */
export async function deletePhotoAsset(publicId: string): Promise<boolean> {
  console.info(`[Cloudinary] Asset marked for deletion: ${publicId}`);
  return true;
}
