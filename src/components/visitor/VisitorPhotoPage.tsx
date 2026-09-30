import React, { useState, useEffect } from 'react';
import { PhotoRecord, EventConfig } from '../../types';
import { getPhotoByToken, getEvents, incrementDownloadCount } from '../../services/storage';
import { downloadPhoto, sharePhotoPage } from '../../services/emailService';
import {
  Download,
  Share2,
  AlertCircle,
  Check,
  Sparkles,
} from 'lucide-react';
import { RiwaqLogo } from '../common/RiwaqLogo';

interface VisitorPhotoPageProps {
  token: string;
  onBackToApp?: () => void;
}

export const VisitorPhotoPage: React.FC<VisitorPhotoPageProps> = ({ token }) => {
  const [photo, setPhoto] = useState<PhotoRecord | null>(null);
  const [event, setEvent] = useState<EventConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const isIOS =
    typeof navigator !== 'undefined' &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

  useEffect(() => {
    async function load() {
      try {
        const foundPhoto = await getPhotoByToken(token);
        if (foundPhoto) {
          setPhoto(foundPhoto);
          const events = await getEvents();
          const foundEvent = events.find((e) => e.id === foundPhoto.eventId);
          if (foundEvent) setEvent(foundEvent);
        }
      } catch (err) {
        console.error('Failed to load attendee photo:', err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [token]);

  /**
   * Only increments download_count when visitor actually taps Save Photo / Download
   */
  const handleDownload = async () => {
    if (!photo) return;
    const imgUrl = photo.generatedPhotoUrl || photo.finalUrl;
    await downloadPhoto(imgUrl, photo.fileName);

    const newCount = await incrementDownloadCount(photo.photoToken || photo.token || photo.id);
    if (newCount !== null) {
      setPhoto((prev) => (prev ? { ...prev, downloadCount: newCount } : null));
    }
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2500);
  };

  /**
   * Shares the photo page URL (e.g. /photo/rt_...) rather than exposing storage URL
   * Does NOT increment download count
   */
  const handleShare = async () => {
    if (!photo) return;
    const eventName = event?.name || 'Event Photo';
    const shared = await sharePhotoPage(token, eventName);
    if (shared && !navigator.share) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] text-[#17201B] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#006B3C] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-[#66706A]">Loading your photo...</p>
        </div>
      </div>
    );
  }

  // If token doesn't exist or is invalid:
  if (!photo) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] text-[#17201B] flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-12 h-12 rounded-2xl bg-[#EAF4EE] text-[#006B3C] flex items-center justify-center mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h1 className="text-base font-bold text-[#17201B] font-['Manrope']">
          Photo Not Found
        </h1>
        <p className="text-xs text-[#66706A] max-w-xs mt-1.5 leading-relaxed">
          This photo may have expired or the link may be invalid.
        </p>
      </div>
    );
  }

  const imageUrl = photo.generatedPhotoUrl || photo.finalUrl;

  return (
    <div className="min-h-screen bg-[#FAFAF7] text-[#17201B] flex flex-col antialiased select-none">
      {/* Top Event Branding Bar with Official Logo */}
      <header className="sticky top-0 z-30 bg-[#FAFAF7]/95 backdrop-blur-sm border-b border-[#E5E9E6] px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <RiwaqLogo variant="horizontal" size="xs" showSubtitle={true} />
        </div>

        <span className="text-[10px] font-mono text-[#66706A] bg-[#FFFFFF] px-2 py-0.5 rounded-md border border-[#E5E9E6]">
          #{photo.photoToken.replace('rt_', '')}
        </span>
      </header>

      {/* Main Content Area: Zero distraction, no login, no registration */}
      <main className="flex-1 max-w-sm w-full mx-auto p-4 sm:p-5 flex flex-col justify-between space-y-4">
        {/* Title */}
        <div className="text-center space-y-1 pt-1">
          <h1 className="text-xl font-bold text-[#17201B] font-['Manrope'] tracking-tight">
            Your photo is ready to save.
          </h1>
          <p className="text-xs text-[#66706A]">
            Tap below to download directly to your device
          </p>
        </div>

        {/* Generated Photo Card */}
        <div className="relative rounded-2xl overflow-hidden shadow-xs border border-[#E5E9E6] bg-[#FFFFFF] p-1 flex items-center justify-center">
          <img
            src={imageUrl}
            alt="Generated Souvenir Photo"
            className="w-full h-full object-contain max-h-[58vh] rounded-xl"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Primary Handover Actions */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2.5">
            {/* Save Photo button: downloads image & increments download_count in DB */}
            <button
              onClick={handleDownload}
              className="h-[52px] rounded-xl bg-[#006B3C] hover:bg-[#004D2C] text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 stroke-[2.2]" />
              <span>{downloadSuccess ? 'Photo Saved!' : 'Save Photo'}</span>
            </button>

            {/* Share button: shares photo page URL */}
            <button
              onClick={handleShare}
              className="h-[52px] rounded-xl bg-[#FFFFFF] hover:bg-[#FAFAF7] border border-[#E5E9E6] text-[#17201B] font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
            >
              {copiedLink ? (
                <>
                  <Check className="w-4 h-4 text-[#006B3C]" />
                  <span>Link Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 text-[#006B3C]" />
                  <span>Share</span>
                </>
              )}
            </button>
          </div>

          {/* Save Instructions Card */}
          <div className="p-3.5 bg-[#FFFFFF] border border-[#E5E9E6] rounded-2xl flex items-center gap-3 text-left">
            <div className="w-8 h-8 rounded-xl bg-[#EAF4EE] text-[#006B3C] flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#17201B]">
                {isIOS ? 'iPhone Safari Saving Tip' : 'High Resolution Souvenir'}
              </p>
              <p className="text-[11px] text-[#66706A]">
                {isIOS
                  ? 'Tap "Save Photo" above, or press and hold the image directly to tap "Save to Photos".'
                  : 'Tap "Save Photo" above to download the full-resolution souvenir image to your device.'}
              </p>
            </div>
          </div>
        </div>

        {/* Minimal Footer Motif */}
        <footer className="text-center pt-2 pb-3 text-[11px] text-[#66706A]">
          <p>A moment to keep · {event?.name || 'Riwaq Uth-Thaqafa'}</p>
        </footer>
      </main>
    </div>
  );
};
