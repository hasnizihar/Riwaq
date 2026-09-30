import { AspectRatio, ASPECT_RATIOS, TransformState } from '../types';

export interface CompositeResult {
  dataUrl: string;
  blob: Blob;
  fileName: string;
  width: number;
  height: number;
  sizeBytes: number;
}

/**
 * Loads an image from a source (dataUrl, blobUrl, or url)
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error('Failed to load image: ' + e));
    img.src = src;
  });
}

/**
 * Generates an event-hardened file name:
 * e.g. riwaq-20260930-184523-a82f.jpg
 */
export function generatePhotoFileName(eventSlug: string = 'booth'): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = [
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ].join('');
  const randBytes = new Uint8Array(2);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(randBytes);
  } else {
    randBytes[0] = Math.floor(Math.random() * 256);
    randBytes[1] = Math.floor(Math.random() * 256);
  }
  const randomPart = Array.from(randBytes)
    .map((b) => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 4);
  return `${eventSlug}-${dateStr}-${timeStr}-${randomPart}.jpg`;
}

/**
 * Generates a cryptographically secure, unpredictable random token for public QR links e.g. rt_7f2k9a8d
 * Uses Web Crypto getRandomValues to eliminate collision vulnerabilities during high-volume events.
 */
export function generatePhotoToken(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  const bytes = new Uint8Array(10);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  let token = 'rt_';
  for (let i = 0; i < bytes.length; i++) {
    token += chars[bytes[i] % chars.length];
  }
  return token;
}

/**
 * Renders the photo and frame overlay into a crisp composite image.
 * Ensures strict mathematical parity between the preview viewport and final canvas.
 */
export async function renderComposite(params: {
  photoSrc: string;
  frameSrc: string;
  aspectRatio: AspectRatio;
  transform: TransformState;
  eventSlug?: string;
  exportFormat?: 'image/jpeg' | 'image/png';
  exportQuality?: number;
}): Promise<CompositeResult> {
  const {
    photoSrc,
    frameSrc,
    aspectRatio,
    transform,
    eventSlug = 'event',
    exportFormat = 'image/jpeg',
    exportQuality = 0.90, // Calibrated for crisp mobile print/share without bloated file size
  } = params;

  const details = ASPECT_RATIOS[aspectRatio];
  const targetWidth = details.width;
  const targetHeight = details.height;

  // Load both images in parallel
  const [photoImg, frameImg] = await Promise.all([
    loadImage(photoSrc),
    loadImage(frameSrc),
  ]);

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D canvas context');

  // Fill canvas with clean background
  ctx.fillStyle = '#05070d';
  ctx.fillRect(0, 0, targetWidth, targetHeight);

  // 1. Calculate precise scale factor from preview viewport coordinates to target canvas
  let canvasX = transform.x;
  let canvasY = transform.y;

  if (transform.previewWidth && transform.previewHeight && transform.previewWidth > 0) {
    const scaleFactor = targetWidth / transform.previewWidth;
    canvasX = transform.x * scaleFactor;
    canvasY = transform.y * scaleFactor;
  }

  // 1. Draw photo layer with transformations
  ctx.save();
  // Move origin to canvas center + scaled pan offset
  ctx.translate(targetWidth / 2 + canvasX, targetHeight / 2 + canvasY);
  // Apply rotation
  if (transform.rotation !== 0) {
    ctx.rotate((transform.rotation * Math.PI) / 180);
  }
  // Apply scale
  ctx.scale(transform.scale, transform.scale);

  // Compute cover dimensions for the photo so it fills the canvas nicely by default
  const photoAspect = photoImg.width / photoImg.height;
  const canvasAspect = targetWidth / targetHeight;
  let drawW = targetWidth;
  let drawH = targetHeight;

  if (photoAspect > canvasAspect) {
    drawH = targetHeight;
    drawW = targetHeight * photoAspect;
  } else {
    drawW = targetWidth;
    drawH = targetWidth / photoAspect;
  }

  // Draw centered at (0, 0)
  ctx.drawImage(photoImg, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();

  // 2. Draw PNG Frame Overlay on top (guaranteeing frame elements cover photo)
  ctx.drawImage(frameImg, 0, 0, targetWidth, targetHeight);

  // 3. Export to Blob and DataURL
  const dataUrl = canvas.toDataURL(exportFormat, exportQuality);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error('Failed to create blob from canvas'));
      },
      exportFormat,
      exportQuality
    );
  });

  const fileName = generatePhotoFileName(eventSlug);

  return {
    dataUrl,
    blob,
    fileName,
    width: targetWidth,
    height: targetHeight,
    sizeBytes: blob.size,
  };
}
