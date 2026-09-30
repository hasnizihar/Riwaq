import React, { useRef } from 'react';
import { EventConfig } from '../../types';
import { Camera, Image as ImageIcon } from 'lucide-react';
import { RiwaqLogo } from '../common/RiwaqLogo';

interface BoothHomeProps {
  event: EventConfig;
  onStartCamera: () => void;
  onPhotoSelected: (photoDataUrl: string) => void;
}

export const BoothHome: React.FC<BoothHomeProps> = ({
  event,
  onStartCamera,
  onPhotoSelected,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        onPhotoSelected(result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset input value so selecting the same file triggers onChange again
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-between p-6 sm:p-8 bg-[#FAFAF7] text-[#17201B] select-none text-center">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Top clean status */}
      <div className="w-full flex justify-end">
        <span className="text-[11px] font-medium tracking-wider uppercase text-[#66706A]">
          Event Booth
        </span>
      </div>

      {/* Center Event Hero Block with Official Logo */}
      <div className="w-full max-w-xs space-y-5 my-auto">
        {/* Official Riwaq Uth-Thaqafa Logo as Main Visual Anchor */}
        <div className="mx-auto flex flex-col items-center justify-center p-3">
          <RiwaqLogo size="lg" variant="full" showSubtitle={true} />
        </div>

        <p className="text-xs text-[#66706A] font-normal px-2">
          {event.tagline || 'Bridging heritage, flavors, and moments.'}
        </p>

        {/* Action Buttons Zone */}
        <div className="space-y-3 pt-4">
          {/* Primary Emerald Button: 56px high, rounded 12px, weight 600 */}
          <button
            onClick={onStartCamera}
            className="w-full h-14 rounded-xl bg-[#006B3C] hover:bg-[#004D2C] text-white font-semibold text-sm flex items-center justify-center gap-2.5 shadow-sm active:scale-[0.98] transition-all cursor-pointer"
          >
            <Camera className="w-5 h-5 stroke-[2]" />
            <span>TAKE PHOTO</span>
            <span className="text-[#C9A227] text-sm font-serif">◎</span>
          </button>

          {/* Secondary Gallery Upload */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-11 rounded-xl bg-transparent hover:bg-[#FFFFFF] border border-transparent hover:border-[#E5E9E6] text-[#66706A] hover:text-[#17201B] font-medium text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <ImageIcon className="w-4 h-4 text-[#006B3C]" />
            <span>Upload from Gallery</span>
          </button>
        </div>
      </div>

      {/* Subtle Cultural Motif Footer */}
      <div className="w-full max-w-xs space-y-2 pt-6">
        <div className="cultural-divider text-xs">
          <span>✦</span>
        </div>
        <p className="text-[11px] text-[#66706A] font-medium">
          A moment to keep · {event.date}
        </p>
      </div>
    </div>
  );
};
