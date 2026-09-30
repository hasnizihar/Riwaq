import QRCode from 'qrcode';
import { PhotoRecord } from '../types';

export interface EmailDispatchOptions {
  recipientEmail: string;
  eventName: string;
  eventDate?: string;
  photoRecord: PhotoRecord;
}

export interface EmailDispatchResult {
  success: boolean;
  status: 'provider_accepted' | 'delivery_failed';
  messageId?: string;
  error?: string;
  dispatchedAt: string;
}

/**
 * Validates email format strictly
 */
export function isValidEmail(email: string): boolean {
  const re =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return re.test(email.trim());
}

/**
 * Computes the public canonical photo page URL.
 * Prefers VITE_APP_URL so external mobile phone scans point to the public domain
 * instead of internal kiosk hostnames or localhost.
 */
export function getPhotoShareUrl(token: string): string {
  const envUrl = (import.meta.env.VITE_APP_URL || '').trim().replace(/\/$/, '');
  const base = envUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/photo/${token}`;
}

/**
 * Generates an attendee-friendly QR code pointing exclusively to that visitor's dedicated photo page:
 * e.g. https://.../photo/rt_9a8f2c
 * Token uniquely identifies only that visitor's photo.
 */
export async function generatePhotoQRCode(tokenOrUrl: string): Promise<string> {
  try {
    const fullUrl = tokenOrUrl.startsWith('http')
      ? tokenOrUrl
      : getPhotoShareUrl(tokenOrUrl);

    return await QRCode.toDataURL(fullUrl, {
      width: 340,
      margin: 2,
      color: {
        dark: '#030712',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Failed to generate QR code', err);
    return '';
  }
}

/**
 * Dispatches event photo email.
 * For offline/kiosk events without a serverless email gateway, this gracefully rejects
 * and directs attendees to the instant QR code & direct download handoff.
 */
export async function dispatchPhotoEmail(
  _options: EmailDispatchOptions
): Promise<EmailDispatchResult> {
  return {
    success: false,
    status: 'delivery_failed',
    error: 'Direct email delivery is disabled for this kiosk event. Please scan the QR code to save your souvenir immediately to your device.',
    dispatchedAt: new Date().toISOString(),
  };
}

/**
 * Triggers browser download for the photo file.
 * If dataUrl is a remote URL (e.g. Cloudinary CDN), fetches as a blob first so
 * iOS Safari and mobile browsers download the image instead of navigating away.
 */
export async function downloadPhoto(dataUrl: string, fileName: string): Promise<void> {
  try {
    if (dataUrl.startsWith('http')) {
      const res = await fetch(dataUrl);
      if (res.ok) {
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
        return;
      }
    }

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.warn('[Download] Fallback to direct anchor:', err);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.target = '_blank';
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

/**
 * Native mobile share sheet via Web Share API.
 * Shares the visitor's dedicated photo page URL (e.g. /photo/rt_...) rather than exposing raw storage URL.
 * Does NOT increment download_count (download count is only incremented when Save Photo is tapped).
 */
export async function sharePhotoPage(token: string, eventName: string): Promise<boolean> {
  const photoPageUrl = getPhotoShareUrl(token);
  try {
    if (navigator.share) {
      await navigator.share({
        title: `${eventName} Souvenir Photo`,
        text: `Check out my photo from ${eventName}!`,
        url: photoPageUrl,
      });
      return true;
    } else {
      await navigator.clipboard.writeText(photoPageUrl);
      return true;
    }
  } catch (err) {
    console.info('Share dismissed or cancelled:', err);
    return false;
  }
}

// Backwards compatible sharePhoto alias
export async function sharePhoto(
  _dataUrl: string,
  _fileName: string,
  eventName: string = 'Event'
): Promise<boolean> {
  const currentUrl = window.location.href;
  try {
    if (navigator.share) {
      await navigator.share({
        title: `${eventName} Souvenir`,
        text: `Here is my official souvenir from ${eventName}!`,
        url: currentUrl,
      });
      return true;
    } else {
      await navigator.clipboard.writeText(currentUrl);
      return true;
    }
  } catch {
    return false;
  }
}
