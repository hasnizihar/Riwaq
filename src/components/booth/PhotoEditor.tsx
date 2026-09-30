import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PhotoTemplate, TransformState, ASPECT_RATIOS } from '../../types';
import { ZoomIn, ZoomOut, RotateCw, RefreshCw, ArrowLeft, ArrowRight, Layers } from 'lucide-react';

interface PhotoEditorProps {
  photoSrc: string;
  template: PhotoTemplate;
  transform: TransformState;
  onChangeTransform: (newTransform: TransformState) => void;
  onContinue: () => void;
  onBack: () => void;
}

export const PhotoEditor: React.FC<PhotoEditorProps> = ({
  photoSrc,
  template,
  transform,
  onChangeTransform,
  onContinue,
  onBack,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const frameBoxRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [boxDimensions, setBoxDimensions] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  const dragStartRef = useRef<{ x: number; y: number; initialX: number; initialY: number }>({
    x: 0,
    y: 0,
    initialX: 0,
    initialY: 0,
  });

  const initialPinchDistRef = useRef<number | null>(null);
  const initialPinchScaleRef = useRef<number>(1);

  const ratioDetails = ASPECT_RATIOS[template.aspectRatio];
  const aspectFraction = ratioDetails.width / ratioDetails.height;

  const measureBox = useCallback(() => {
    if (frameBoxRef.current) {
      const rect = frameBoxRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setBoxDimensions({ width: rect.width, height: rect.height });
        if (transform.previewWidth !== rect.width || transform.previewHeight !== rect.height) {
          onChangeTransform({
            ...transform,
            previewWidth: rect.width,
            previewHeight: rect.height,
          });
        }
      }
    }
  }, [transform, onChangeTransform]);

  useEffect(() => {
    measureBox();
    window.addEventListener('resize', measureBox);
    return () => window.removeEventListener('resize', measureBox);
  }, [measureBox]);

  const handleZoomChange = (newScale: number) => {
    const clamped = Math.min(3.5, Math.max(0.5, Number(newScale.toFixed(2))));
    onChangeTransform({
      ...transform,
      scale: clamped,
      previewWidth: boxDimensions.width || transform.previewWidth,
      previewHeight: boxDimensions.height || transform.previewHeight,
    });
  };

  const handleRotate = () => {
    const nextRot = (transform.rotation + 90) % 360;
    onChangeTransform({
      ...transform,
      rotation: nextRot,
      previewWidth: boxDimensions.width || transform.previewWidth,
      previewHeight: boxDimensions.height || transform.previewHeight,
    });
  };

  const handleReset = () => {
    onChangeTransform({
      scale: 1,
      x: 0,
      y: 0,
      rotation: 0,
      previewWidth: boxDimensions.width || transform.previewWidth,
      previewHeight: boxDimensions.height || transform.previewHeight,
    });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialX: transform.x,
      initialY: transform.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;
    onChangeTransform({
      ...transform,
      x: Math.round(dragStartRef.current.initialX + deltaX),
      y: Math.round(dragStartRef.current.initialY + deltaY),
      previewWidth: boxDimensions.width || transform.previewWidth,
      previewHeight: boxDimensions.height || transform.previewHeight,
    });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignored
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialPinchDistRef.current = dist;
      initialPinchScaleRef.current = transform.scale;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialPinchDistRef.current) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = dist / initialPinchDistRef.current;
      const newScale = Math.min(3.5, Math.max(0.5, initialPinchScaleRef.current * ratio));
      onChangeTransform({
        ...transform,
        scale: Number(newScale.toFixed(2)),
        previewWidth: boxDimensions.width || transform.previewWidth,
        previewHeight: boxDimensions.height || transform.previewHeight,
      });
    }
  };

  const handleTouchEnd = () => {
    initialPinchDistRef.current = null;
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#FAFAF7] text-[#17201B] select-none overflow-hidden">
      {/* Top Header */}
      <div className="sticky top-0 z-30 bg-[#FAFAF7]/95 backdrop-blur-sm border-b border-[#E5E9E6] px-4 py-3 flex items-center justify-between">
        <button
          onClick={onBack}
          className="min-h-[44px] min-w-[44px] -ml-2 flex items-center gap-1 text-xs font-semibold text-[#006B3C] hover:text-[#004D2C] active:scale-95 transition-transform cursor-pointer"
          aria-label="Back to frames"
          title="Choose a different frame"
        >
          <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          <span>Frame</span>
        </button>

        <div className="text-center">
          <h2 className="text-sm font-semibold tracking-tight text-[#17201B] font-['Manrope']">
            Adjust Photo
          </h2>
          <p className="text-[11px] text-[#66706A]">
            {template.name} · {template.aspectRatio}
          </p>
        </div>

        <button
          onClick={handleReset}
          className="min-h-[44px] px-2 flex items-center justify-center text-xs font-medium text-[#66706A] hover:text-[#17201B] active:scale-95 transition-transform cursor-pointer"
          title="Reset position and zoom"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1" />
          Reset
        </button>
      </div>

      {/* Viewport Canvas Stage - Dynamically sized by aspect ratio! */}
      <div
        ref={containerRef}
        className="relative flex-1 flex flex-col items-center justify-center p-4 bg-[#FAFAF7] overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          ref={frameBoxRef}
          style={{
            aspectRatio: `${aspectFraction}`,
            maxHeight: '100%',
            maxWidth: '100%',
          }}
          className="relative w-full h-full max-h-[62vh] rounded-2xl overflow-hidden shadow-sm bg-[#FFFFFF] border border-[#E5E9E6] touch-none flex items-center justify-center transition-all duration-200"
        >
          {/* Visitor Photo Layer */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{
              transform: `translate(${transform.x}px, ${transform.y}px) rotate(${transform.rotation}deg) scale(${transform.scale})`,
              transition: isDragging ? 'none' : 'transform 0.12s ease-out',
            }}
          >
            <img
              src={photoSrc}
              alt="Photo subject"
              className="max-w-none w-full h-full object-cover select-none pointer-events-none"
              draggable={false}
              referrerPolicy="no-referrer"
            />
          </div>

          {/* PNG Frame Overlay */}
          <img
            src={template.imageUrl}
            alt="Frame overlay"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10 select-none drop-shadow-sm"
            draggable={false}
            referrerPolicy="no-referrer"
          />

          {/* Drag Surface for Pan / Move */}
          <div
            className="absolute inset-0 z-20 cursor-grab active:cursor-grabbing touch-none"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            title="Drag to position photo"
          />
        </div>

        {/* Dynamic Aspect Ratio Label */}
        <div className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-[#006B3C]">
          <Layers className="w-3.5 h-3.5" />
          <span>{template.aspectRatio}</span>
          <span className="text-[#66706A] font-normal">
            ({ratioDetails.width}×{ratioDetails.height}px)
          </span>
        </div>
      </div>

      {/* Ergonomic Bottom Controls Bar */}
      <div className="bg-[#FFFFFF] border-t border-[#E5E9E6] px-5 py-3.5 pb-6 flex flex-col gap-3 shadow-sm">
        {/* Zoom Slider with direct feedback */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-[#66706A]">
            <span className="font-medium text-[#17201B]">Zoom</span>
            <span className="font-mono text-[11px] text-[#006B3C] font-semibold">
              {Math.round(transform.scale * 100)}%
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleZoomChange(transform.scale - 0.15)}
              className="min-h-[38px] min-w-[38px] rounded-lg bg-[#FAFAF7] border border-[#E5E9E6] text-[#66706A] hover:text-[#17201B] flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
              aria-label="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <div className="flex-1 flex items-center">
              <input
                type="range"
                min="0.5"
                max="3.0"
                step="0.05"
                value={transform.scale}
                onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-[#E5E9E6] rounded-lg appearance-none cursor-pointer accent-[#006B3C]"
              />
            </div>

            <button
              onClick={() => handleZoomChange(transform.scale + 0.15)}
              className="min-h-[38px] min-w-[38px] rounded-lg bg-[#FAFAF7] border border-[#E5E9E6] text-[#66706A] hover:text-[#17201B] flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
              aria-label="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <button
              onClick={handleRotate}
              className="min-h-[38px] min-w-[38px] rounded-lg bg-[#FAFAF7] border border-[#E5E9E6] text-[#006B3C] hover:bg-[#EAF4EE] flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
              aria-label="Rotate 90 degrees"
              title="Rotate photo"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Secondary quick reset button & Change Frame shortcut */}
        <div className="flex items-center justify-between text-xs pt-0.5">
          <button
            onClick={onBack}
            className="text-[#66706A] hover:text-[#006B3C] font-medium flex items-center gap-1 cursor-pointer transition-colors"
          >
            ← Change Frame
          </button>
          <button
            onClick={handleReset}
            className="text-[#66706A] hover:text-[#17201B] font-medium px-2 py-1 rounded bg-[#FAFAF7] border border-[#E5E9E6] cursor-pointer"
          >
            Reset Position
          </button>
        </div>

        {/* Primary Emerald Action Button: 52px high, rounded 12px */}
        <button
          onClick={() => {
            if (frameBoxRef.current) {
              const rect = frameBoxRef.current.getBoundingClientRect();
              if (rect.width > 0 && rect.height > 0) {
                if (!transform.previewWidth || transform.previewWidth !== rect.width) {
                  onChangeTransform({
                    ...transform,
                    previewWidth: rect.width,
                    previewHeight: rect.height,
                  });
                }
              }
            }
            onContinue();
          }}
          className="w-full h-[52px] rounded-xl bg-[#006B3C] hover:bg-[#004D2C] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-all cursor-pointer"
        >
          <span>Continue to Preview</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
