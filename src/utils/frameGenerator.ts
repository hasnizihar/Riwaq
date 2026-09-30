import { AspectRatio, ASPECT_RATIOS } from '../types';

/**
 * Generates an event-ready PNG overlay with a transparent aperture in the middle.
 * Designed with a restrained cultural aesthetic:
 * Pure white (#FFFFFF), Deep Emerald (#004D2C), Primary Emerald (#006B3C), Muted Gold (#C9A227), Soft Gold (#F6F0D9).
 */
export function createThemedFramePNG(options: {
  aspectRatio: AspectRatio;
  theme: 'riwaq' | 'food' | 'gala' | 'minimal';
  eventName?: string;
  eventDate?: string;
  badgeText?: string;
}): string {
  const details = ASPECT_RATIOS[options.aspectRatio];
  const width = details.width;
  const height = details.height;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Clear to full transparency
  ctx.clearRect(0, 0, width, height);

  const eventName = (options.eventName || 'RIWAQ UTH-THAQAFA').toUpperCase();
  const eventDate = (options.eventDate || '30 SEPTEMBER 2026').toUpperCase();
  const badge = options.badgeText || (options.theme === 'food' ? 'FOOD FESTIVAL' : 'OFFICIAL SOUVENIR');

  const borderMargin = Math.round(Math.min(width, height) * 0.075);
  const topBannerHeight = Math.round(height * 0.14);
  const bottomBannerHeight = Math.round(height * 0.13);

  // Aperture coordinates (where the visitor's face/photo shines through!)
  const photoX = borderMargin;
  const photoY = topBannerHeight;
  const photoW = width - borderMargin * 2;
  const photoH = height - topBannerHeight - bottomBannerHeight;
  const photoRadius = Math.round(Math.min(width, height) * 0.024);

  // Helper to draw rounded rectangle
  function drawRoundedRect(
    c: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y);
    c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r);
    c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r);
    c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
  }

  if (options.theme === 'riwaq') {
    // Elegant Heritage: Deep Emerald (#004D2C) with muted gold (#C9A227) trim and crisp white typography
    ctx.fillStyle = '#004D2C';
    ctx.fillRect(0, 0, width, topBannerHeight);
    ctx.fillRect(0, height - bottomBannerHeight, width, bottomBannerHeight);

    // Side borders
    ctx.fillStyle = '#004D2C';
    ctx.fillRect(0, topBannerHeight, borderMargin, photoH);
    ctx.fillRect(width - borderMargin, topBannerHeight, borderMargin, photoH);

    // Cut out the inner photo area with soft corners
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    drawRoundedRect(ctx, photoX, photoY, photoW, photoH, photoRadius);
    ctx.fill();
    ctx.restore();

    // Golden border trim around the photo aperture (#C9A227)
    ctx.strokeStyle = '#C9A227';
    ctx.lineWidth = Math.max(3, Math.round(width * 0.0035));
    drawRoundedRect(ctx, photoX, photoY, photoW, photoH, photoRadius);
    ctx.stroke();

    // Subtle inner hairline
    ctx.strokeStyle = 'rgba(201, 162, 39, 0.3)';
    ctx.lineWidth = Math.max(1, Math.round(width * 0.0012));
    drawRoundedRect(ctx, photoX + 6, photoY + 6, photoW - 12, photoH - 12, photoRadius * 0.8);
    ctx.stroke();

    // Top typography
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Subtitle / Cultural badge
    ctx.font = `600 ${Math.round(topBannerHeight * 0.16)}px "Manrope", sans-serif`;
    ctx.fillStyle = '#C9A227';
    ctx.letterSpacing = '3px';
    ctx.fillText('✦  ' + badge + '  ✦', width / 2, topBannerHeight * 0.33);

    // Main event name
    ctx.font = `600 ${Math.round(topBannerHeight * 0.28)}px "Manrope", sans-serif`;
    ctx.fillStyle = '#FFFFFF';
    ctx.letterSpacing = '2px';
    ctx.fillText(eventName, width / 2, topBannerHeight * 0.68);

    // Bottom typography
    ctx.font = `600 ${Math.round(bottomBannerHeight * 0.23)}px "Manrope", sans-serif`;
    ctx.fillStyle = '#F6F0D9';
    ctx.letterSpacing = '3px';
    ctx.fillText(eventDate, width / 2, height - bottomBannerHeight * 0.62);

    ctx.font = `400 ${Math.round(bottomBannerHeight * 0.15)}px "Inter", sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.letterSpacing = '1px';
    ctx.fillText('CULTURAL ENCOUNTER & MOMENTS', width / 2, height - bottomBannerHeight * 0.32);

  } else if (options.theme === 'food') {
    // Restrained Food Festival Frame: Deep Emerald & Warm White with Gold Accent
    ctx.fillStyle = '#004D2C';
    ctx.fillRect(0, 0, width, topBannerHeight);
    ctx.fillRect(0, height - bottomBannerHeight, width, bottomBannerHeight);

    // Side borders
    ctx.fillStyle = '#004D2C';
    ctx.fillRect(0, topBannerHeight, borderMargin, photoH);
    ctx.fillRect(width - borderMargin, topBannerHeight, borderMargin, photoH);

    // Clear center
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    drawRoundedRect(ctx, photoX, photoY, photoW, photoH, photoRadius);
    ctx.fill();
    ctx.restore();

    // Muted gold border trim
    ctx.strokeStyle = '#C9A227';
    ctx.lineWidth = Math.max(3, Math.round(width * 0.0035));
    drawRoundedRect(ctx, photoX, photoY, photoW, photoH, photoRadius);
    ctx.stroke();

    // Top text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = `600 ${Math.round(topBannerHeight * 0.16)}px "Manrope", sans-serif`;
    ctx.fillStyle = '#C9A227';
    ctx.letterSpacing = '3px';
    ctx.fillText('FLAVORS OF THE FESTIVAL', width / 2, topBannerHeight * 0.33);

    ctx.font = `600 ${Math.round(topBannerHeight * 0.28)}px "Manrope", sans-serif`;
    ctx.fillStyle = '#FFFFFF';
    ctx.letterSpacing = '2px';
    ctx.fillText(eventName, width / 2, topBannerHeight * 0.68);

    // Bottom text
    ctx.font = `600 ${Math.round(bottomBannerHeight * 0.23)}px "Manrope", sans-serif`;
    ctx.fillStyle = '#F6F0D9';
    ctx.letterSpacing = '2px';
    ctx.fillText('SAVOR THE MOMENT', width / 2, height - bottomBannerHeight * 0.62);

    ctx.font = `400 ${Math.round(bottomBannerHeight * 0.15)}px "Inter", sans-serif`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.letterSpacing = '1px';
    ctx.fillText(`${eventDate} · STALL & ARTISAN`, width / 2, height - bottomBannerHeight * 0.32);

  } else if (options.theme === 'gala') {
    // Pure White Canvas with Deep Emerald (#004D2C) & Gold Accent lines
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    // Cut out inner photo window
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    drawRoundedRect(ctx, photoX, photoY, photoW, photoH, photoRadius);
    ctx.fill();
    ctx.restore();

    // Deep Emerald inner border
    ctx.strokeStyle = '#004D2C';
    ctx.lineWidth = Math.max(3, Math.round(width * 0.003));
    drawRoundedRect(ctx, photoX, photoY, photoW, photoH, photoRadius);
    ctx.stroke();

    // Muted Gold outer accent hairline
    ctx.strokeStyle = '#C9A227';
    ctx.lineWidth = Math.max(1, Math.round(width * 0.0012));
    drawRoundedRect(ctx, photoX - 5, photoY - 5, photoW + 10, photoH + 10, photoRadius + 2);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = `600 ${Math.round(topBannerHeight * 0.15)}px "Manrope", sans-serif`;
    ctx.fillStyle = '#C9A227';
    ctx.letterSpacing = '3px';
    ctx.fillText('OFFICIAL GUEST SOUVENIR', width / 2, topBannerHeight * 0.33);

    ctx.font = `600 ${Math.round(topBannerHeight * 0.28)}px "Manrope", sans-serif`;
    ctx.fillStyle = '#17201B';
    ctx.letterSpacing = '2px';
    ctx.fillText(eventName, width / 2, topBannerHeight * 0.68);

    ctx.font = `600 ${Math.round(bottomBannerHeight * 0.22)}px "Manrope", sans-serif`;
    ctx.fillStyle = '#004D2C';
    ctx.letterSpacing = '2px';
    ctx.fillText(eventDate, width / 2, height - bottomBannerHeight * 0.6);

    ctx.font = `400 ${Math.round(bottomBannerHeight * 0.15)}px "Inter", sans-serif`;
    ctx.fillStyle = '#66706A';
    ctx.letterSpacing = '1px';
    ctx.fillText('RIWAQ UTH-THAQAFA PAVILION', width / 2, height - bottomBannerHeight * 0.32);

  } else {
    // Clean Minimal: Warm Off-White / Pure White with crisp hairline borders
    ctx.fillStyle = '#FAFAF7';
    ctx.fillRect(0, 0, width, height);

    // Cut out window
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    drawRoundedRect(ctx, photoX, photoY * 0.75, photoW, height - photoY * 0.75 - bottomBannerHeight * 1.25, 8);
    ctx.fill();
    ctx.restore();

    // Hairline border around photo
    ctx.strokeStyle = '#E5E9E6';
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, photoX, photoY * 0.75, photoW, height - photoY * 0.75 - bottomBannerHeight * 1.25, 8);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = `600 ${Math.round(bottomBannerHeight * 0.24)}px "Manrope", sans-serif`;
    ctx.fillStyle = '#17201B';
    ctx.letterSpacing = '2px';
    ctx.fillText(eventName, width / 2, height - bottomBannerHeight * 0.7);

    ctx.font = `400 ${Math.round(bottomBannerHeight * 0.16)}px "Inter", sans-serif`;
    ctx.fillStyle = '#66706A';
    ctx.fillText(eventDate, width / 2, height - bottomBannerHeight * 0.35);
  }

  return canvas.toDataURL('image/png');
}
