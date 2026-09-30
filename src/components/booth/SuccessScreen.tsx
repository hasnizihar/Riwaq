import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { PhotoRecord } from '../../types';
import { generatePhotoQRCode, downloadPhoto, sharePhotoPage } from '../../services/emailService';
import { incrementDownloadCount } from '../../services/storage';
import {
  Check,
  Download,
  Share2,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { RiwaqLogo } from '../common/RiwaqLogo';

interface SuccessScreenProps {
  photoRecord: PhotoRecord;
  onSendEmail?: (email: string) => Promise<void>;
  onNextVisitor: () => void;
  isEmailSending?: boolean;
}

export const SuccessScreen: React.FC<SuccessScreenProps> = ({
  photoRecord,
  onNextVisitor,
}) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [downloadFeedback, setDownloadFeedback] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const token = photoRecord.photoToken || photoRecord.token;

  useEffect(() => {
    // Restrained celebration burst
    confetti({
      particleCount: 25,
      spread: 40,
      origin: { y: 0.65 },
      colors: ['#006B3C', '#C9A227', '#E5E9E6'],
    });

    // QR points specifically to this photo's page /photo/:token
    generatePhotoQRCode(token).then((qr) => {
      setQrCodeDataUrl(qr);
    });
  }, [token]);

  const handleDownload = async () => {
    const imgUrl = photoRecord.generatedPhotoUrl || photoRecord.finalUrl;
    downloadPhoto(imgUrl, photoRecord.fileName);
    await incrementDownloadCount(photoRecord.id);
    setDownloadFeedback(true);
    setTimeout(() => setDownloadFeedback(false), 2000);
  };

  const handleShare = async () => {
    const shared = await sharePhotoPage(token, photoRecord.templateName || 'Souvenir');
    if (shared && !navigator.share) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#FAFAF7] text-[#17201B] overflow-hidden select-none">
      {/* Top Header */}
      <div className="sticky top-0 z-20 bg-[#FAFAF7]/95 backdrop-blur-sm border-b border-[#E5E9E6] px-4 py-2.5 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#006B3C] flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#006B3C]" />
          Photo Ready
        </span>
        <span className="text-[11px] font-mono text-[#66706A]">
          #{token.replace('rt_', '')}
        </span>
      </div>

      {/* Main Content Stage */}
      <div className="flex-1 overflow-y-auto p-5 flex flex-col justify-between max-w-sm mx-auto w-full space-y-4">
        {/* Hero Header with Brand Emblem */}
        <div className="text-center space-y-1.5 pt-1">
          <div className="mx-auto flex justify-center mb-1">
            <RiwaqLogo variant="icon" size="sm" />
          </div>
          <h1 className="text-lg font-bold text-[#17201B] font-['Manrope'] uppercase tracking-tight">
            YOUR PHOTO IS READY
          </h1>
          <p className="text-xs text-[#66706A]">
            Scan with your phone camera to save
          </p>
        </div>

        {/* Primary Handover: QR Code Card */}
        <div className="bg-[#FFFFFF] border border-[#006B3C]/30 rounded-2xl p-4 shadow-xs text-center relative flex flex-col items-center">
          {/* Subtle gold accent */}
          <div className="absolute top-2.5 right-2.5 text-[#C9A227] text-xs">
            ✦
          </div>

          {/* High-reliability Black/White QR encoding /photo/:token */}
          <div className="p-1 bg-white rounded-xl inline-block shadow-xs border border-[#E5E9E6]/60">
            {qrCodeDataUrl ? (
              <img
                src={qrCodeDataUrl}
                alt="QR Code to your photo"
                className="w-44 h-44 object-contain mx-auto"
              />
            ) : (
              <div className="w-44 h-44 flex items-center justify-center text-xs text-[#66706A]">
                Preparing QR...
              </div>
            )}
          </div>

          {/* Direct link label */}
          <a
            href={`/photo/${token}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-[#006B3C] hover:underline font-mono mt-2 flex items-center gap-1"
          >
            <span>/photo/{token}</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          {/* Quick Handoff Action Buttons */}
          <div className="grid grid-cols-2 gap-2 w-full pt-3 mt-1 border-t border-[#E5E9E6]">
            <button
              onClick={handleDownload}
              className="h-10 rounded-xl bg-[#FAFAF7] hover:bg-[#EAF4EE] border border-[#E5E9E6] text-[#17201B] text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#006B3C]" />
              <span>{downloadFeedback ? 'Saved!' : 'Save Photo'}</span>
            </button>

            <button
              onClick={handleShare}
              className="h-10 rounded-xl bg-[#FAFAF7] hover:bg-[#EAF4EE] border border-[#E5E9E6] text-[#17201B] text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-[#006B3C]" />
              <span>{copiedLink ? 'Copied' : 'Share'}</span>
            </button>
          </div>
        </div>

        {/* Instant QR Hand-off Verification Notice */}
        <div className="bg-[#FFFFFF] border border-[#E5E9E6] rounded-2xl p-3.5 flex items-center gap-3 text-left">
          <div className="w-8 h-8 rounded-xl bg-[#EAF4EE] text-[#006B3C] flex items-center justify-center shrink-0">
            <Check className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#17201B]">Instant QR Hand-off</p>
            <p className="text-[11px] text-[#66706A]">
              Point any phone camera at the QR code above to immediately view and download your souvenir photo.
            </p>
          </div>
        </div>

        {/* Primary Emerald Action: NEXT VISITOR → (56px high) */}
        <div className="pt-1 pb-2">
          <button
            onClick={onNextVisitor}
            className="w-full h-14 rounded-xl bg-[#006B3C] hover:bg-[#004D2C] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-all cursor-pointer"
          >
            <span>NEXT VISITOR</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
};
