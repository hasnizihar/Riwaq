import React from 'react';
import { ArrowLeft, Check, Edit3, Layers } from 'lucide-react';

interface PhotoPreviewProps {
  compositeDataUrl: string;
  onConfirm: () => void;
  onEdit: () => void;
  onChangeFrame?: () => void;
  onBack: () => void;
}

export const PhotoPreview: React.FC<PhotoPreviewProps> = ({
  compositeDataUrl,
  onConfirm,
  onEdit,
  onChangeFrame,
  onBack,
}) => {
  return (
    <div className="flex flex-col h-full w-full bg-[#FAFAF7] text-[#17201B] overflow-hidden select-none">
      {/* Top Header */}
      <div className="sticky top-0 z-20 bg-[#FAFAF7]/95 backdrop-blur-sm border-b border-[#E5E9E6] px-4 py-3 flex items-center justify-between">
        <button
          onClick={onBack}
          className="min-h-[44px] min-w-[44px] -ml-2 flex items-center justify-center text-[#66706A] hover:text-[#17201B] active:scale-95 transition-transform cursor-pointer"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <h2 className="text-sm font-semibold tracking-tight text-[#17201B] font-['Manrope']">
            Review Your Souvenir
          </h2>
          <p className="text-[11px] text-[#66706A]">Ready to save & share</p>
        </div>

        {onChangeFrame ? (
          <button
            onClick={onChangeFrame}
            className="min-h-[44px] px-2 flex items-center gap-1 text-[11px] font-medium text-[#006B3C] hover:text-[#004D2C] active:scale-95 transition-transform cursor-pointer"
            title="Choose a different frame"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Frame</span>
          </button>
        ) : (
          <div className="w-8" />
        )}
      </div>

      {/* Main Image Stage - Hero Presentation */}
      <div className="flex-1 flex items-center justify-center p-4 bg-[#FAFAF7] overflow-hidden">
        <div className="relative max-h-[70vh] max-w-full rounded-2xl overflow-hidden shadow-sm border border-[#E5E9E6] bg-[#FFFFFF] flex items-center justify-center p-1">
          <img
            src={compositeDataUrl}
            alt="Final Souvenir"
            className="w-full h-full object-contain max-h-[68vh] rounded-xl"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>

      {/* Bottom Actions Bar */}
      <div className="bg-[#FFFFFF] border-t border-[#E5E9E6] px-5 py-4 pb-7 grid grid-cols-2 gap-3 shadow-sm">
        {/* Outline Edit / Adjust Button */}
        <button
          onClick={onEdit}
          className="h-[52px] rounded-xl bg-transparent hover:bg-[#FAFAF7] border border-[#E5E9E6] text-[#17201B] font-semibold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
        >
          <Edit3 className="w-4 h-4 text-[#66706A]" />
          <span>Adjust Photo</span>
        </button>

        {/* Primary Emerald Confirmation Button */}
        <button
          onClick={onConfirm}
          className="h-[52px] rounded-xl bg-[#006B3C] hover:bg-[#004D2C] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all cursor-pointer"
        >
          <span>Confirm & Save</span>
          <Check className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};
