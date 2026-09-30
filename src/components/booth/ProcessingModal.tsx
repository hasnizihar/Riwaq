import React, { useEffect, useState } from 'react';
import { Layers, Image as ImageIcon, Camera, Send } from 'lucide-react';
import { RiwaqLogo } from '../common/RiwaqLogo';

interface ProcessingModalProps {
  currentStage: 'compositing' | 'compressing' | 'storing' | 'dispatching';
  progressPercent: number;
}

export const ProcessingModal: React.FC<ProcessingModalProps> = ({
  currentStage,
  progressPercent,
}) => {
  const [subText, setSubText] = useState('Compositing photo layers...');

  useEffect(() => {
    switch (currentStage) {
      case 'compositing':
        setSubText('Aligning photo aperture with frame overlay...');
        break;
      case 'compressing':
        setSubText('Optimizing high-resolution JPEG color profiles...');
        break;
      case 'storing':
        setSubText('Saving your event keepsake...');
        break;
      case 'dispatching':
        setSubText('Delivering photo to participant inbox...');
        break;
    }
  }, [currentStage]);

  return (
    <div className="fixed inset-0 z-50 bg-[#FAFAF7] flex flex-col items-center justify-center p-6 text-[#17201B] text-center select-none">
      <div className="w-full max-w-xs space-y-6">
        {/* Brand visual emblem */}
        <div className="mx-auto flex justify-center -mb-2">
          <RiwaqLogo variant="icon" size="sm" />
        </div>

        {/* Animated icon stage */}
        <div className="relative w-16 h-16 mx-auto">
          <div className="w-full h-full rounded-2xl bg-[#EAF4EE] border border-[#006B3C]/20 flex items-center justify-center text-[#006B3C] shadow-sm">
            {currentStage === 'compositing' && <Layers className="w-7 h-7 animate-pulse" />}
            {currentStage === 'compressing' && <ImageIcon className="w-7 h-7 animate-pulse" />}
            {currentStage === 'storing' && <Camera className="w-7 h-7 animate-pulse" />}
            {currentStage === 'dispatching' && <Send className="w-7 h-7 animate-pulse" />}
          </div>
        </div>

        {/* Text */}
        <div className="space-y-1">
          <h2 className="text-base font-bold text-[#17201B] font-['Manrope']">
            Creating your photo...
          </h2>
          <p className="text-xs text-[#66706A] min-h-[32px]">
            {subText}
          </p>
        </div>

        {/* Clean Progress Bar (Emerald) */}
        <div className="space-y-2">
          <div className="w-full h-2 bg-[#E5E9E6] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#006B3C] rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.min(100, Math.max(5, progressPercent))}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] text-[#66706A] font-mono">
            <span>PROCESSING</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
        </div>

        <p className="text-[11px] text-[#66706A]">Please hold on for a moment</p>
      </div>
    </div>
  );
};
