import React from 'react';

interface RiwaqLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon' | 'horizontal';
  showSubtitle?: boolean;
}

export const RiwaqLogo: React.FC<RiwaqLogoProps> = ({
  className = '',
  size = 'md',
  variant = 'full',
  showSubtitle = true,
}) => {
  // Dimension presets
  const sizeMap = {
    xs: { iconSize: 24, fullWidth: 120, fullHeight: 120 },
    sm: { iconSize: 32, fullWidth: 160, fullHeight: 160 },
    md: { iconSize: 44, fullWidth: 210, fullHeight: 210 },
    lg: { iconSize: 64, fullWidth: 260, fullHeight: 260 },
    xl: { iconSize: 96, fullWidth: 340, fullHeight: 340 },
  };

  const dimensions = sizeMap[size];

  // Variant 1: Compact Icon
  if (variant === 'icon') {
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        <img
          src="/logo.png"
          alt="Riwaq Logo"
          className="object-contain"
          style={{ width: dimensions.iconSize, height: dimensions.iconSize }}
          loading="eager"
        />
      </div>
    );
  }

  // Variant 2: Horizontal Lockup (Icon + Typography Side-by-Side)
  if (variant === 'horizontal') {
    return (
      <div className={`inline-flex items-center gap-2.5 ${className}`}>
        <div className="shrink-0 p-1 rounded-xl bg-white border border-[#E5E9E6] shadow-xs flex items-center justify-center">
          <img
            src="/logo.png"
            alt="Riwaq Logo"
            className="object-contain"
            style={{ width: dimensions.iconSize, height: dimensions.iconSize }}
            loading="eager"
          />
        </div>
        <div className="flex flex-col leading-none">
          <div className="flex items-center">
            <span
              className="text-[#004D2C] font-['Cinzel',_serif] font-bold tracking-[0.08em]"
              style={{ fontSize: size === 'xs' ? '12px' : size === 'sm' ? '15px' : '18px' }}
            >
              RIWAQ
            </span>
            <span className="text-[#C9A227] text-[10px] ml-0.5 -mt-0.5">✦</span>
          </div>
          {showSubtitle && (
            <span
              className="text-[#17201B] font-['Cinzel',_serif] tracking-[0.24em] font-semibold uppercase mt-0.5"
              style={{ fontSize: size === 'xs' ? '7px' : size === 'sm' ? '8.5px' : '10px' }}
            >
              UTH-THAQAFA
            </span>
          )}
        </div>
      </div>
    );
  }

  // Variant 3: Full Official Brand Logo
  return (
    <div className={`flex flex-col items-center justify-center text-center select-none ${className}`}>
      <img
        src="/logo.png"
        alt="Riwaq Uth-Thaqafa Official Logo"
        className="object-contain"
        style={{
          width: dimensions.fullWidth,
          height: dimensions.fullHeight,
          maxWidth: '100%',
        }}
        loading="eager"
      />
    </div>
  );
};
