import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Image as ImageIcon,
  SwitchCamera,
  ArrowLeft,
  ShieldAlert,
  HelpCircle,
} from 'lucide-react';

interface CameraCaptureProps {
  eventName: string;
  onPhotoCaptured: (photoDataUrl: string) => void;
  onBack: () => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({
  eventName,
  onPhotoCaptured,
  onBack,
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isFlashing, setIsFlashing] = useState(false);
  const [isLoadingCamera, setIsLoadingCamera] = useState(false);
  const [showPermissionGuide, setShowPermissionGuide] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const currentStreamRef = useRef<MediaStream | null>(null);

  const stopCurrentStream = useCallback(() => {
    if (currentStreamRef.current) {
      currentStreamRef.current.getTracks().forEach((track) => track.stop());
      currentStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStream(null);
  }, []);

  const startCamera = useCallback(async (facing: 'user' | 'environment') => {
    setIsLoadingCamera(true);
    setCameraError(null);
    stopCurrentStream();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera is not supported on this device/browser.');
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1440, min: 480 },
        },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      currentStreamRef.current = mediaStream;
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play().catch((err) => {
          console.warn('Video play interrupted:', err);
        });
      }
    } catch (err: unknown) {
      console.warn('Camera initialization error:', err);
      let errMsg = 'Camera permission was denied.';
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errMsg = 'Camera access was blocked by your browser settings.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          errMsg = 'No camera found on this device.';
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          errMsg = 'Camera is in use by another tab or app.';
        }
      } else if (err instanceof Error) {
        errMsg = err.message;
      }
      setCameraError(errMsg);
    } finally {
      setIsLoadingCamera(false);
    }
  }, [stopCurrentStream]);

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      stopCurrentStream();
    };
  }, [facingMode, startCamera, stopCurrentStream]);

  const toggleCameraFacing = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  const handleCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    // Trigger subtle flash effect
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 180);

    const targetW = video.videoWidth;
    const targetH = video.videoHeight;

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Move to center of canvas
    ctx.translate(targetW / 2, targetH / 2);

    // Mirror user-facing camera horizontally for natural selfie capture
    if (facingMode === 'user') {
      ctx.scale(-1, 1);
    }

    // Draw the video frame centered
    ctx.drawImage(video, -targetW / 2, -targetH / 2);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

    stopCurrentStream();
    onPhotoCaptured(dataUrl);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        stopCurrentStream();
        onPhotoCaptured(result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset file input so selecting the same file triggers onChange again
  };

  return (
    <div className="relative flex flex-col h-full w-full bg-black text-white select-none overflow-hidden">
      {/* Flash overlay */}
      {isFlashing && (
        <div className="absolute inset-0 bg-white z-50 pointer-events-none opacity-90 duration-150" />
      )}

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Top Overlay Bar */}
      <div className="absolute top-0 left-0 right-0 z-30 p-4 flex items-center justify-between pointer-events-auto bg-gradient-to-b from-black/60 to-transparent">
        <button
          onClick={onBack}
          className="min-h-[44px] min-w-[44px] -ml-1 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 active:scale-95 transition-all cursor-pointer"
          aria-label="Back to home"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <span className="text-xs font-semibold tracking-wider text-white/90 uppercase block font-['Manrope']">
            {eventName}
          </span>
          <span className="text-[10px] text-[#C9A227] font-mono uppercase tracking-wider">
            {facingMode === 'user' ? 'Front (Selfie)' : 'Main Camera (Rear)'}
          </span>
        </div>

        {/* Quick flip toggle in top header */}
        <button
          onClick={toggleCameraFacing}
          disabled={!!cameraError}
          className="min-h-[44px] px-3 rounded-full bg-black/40 hover:bg-black/60 active:scale-95 transition-all flex items-center gap-1.5 text-xs font-medium cursor-pointer disabled:opacity-30"
          title={facingMode === 'user' ? 'Switch to Main Camera' : 'Switch to Selfie Camera'}
        >
          <SwitchCamera className="w-4 h-4 text-[#C9A227]" />
          <span className="font-semibold text-[11px]">
            {facingMode === 'user' ? 'Main' : 'Selfie'}
          </span>
        </button>
      </div>

      {/* Main Viewfinder Area */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-black">
        {cameraError ? (
          <div className="max-w-xs text-center p-6 bg-[#FAFAF7] text-[#17201B] rounded-2xl border border-[#E5E9E6] shadow-xl space-y-4 z-10 m-4">
            <div className="w-12 h-12 mx-auto rounded-xl bg-[#EAF4EE] border border-[#006B3C]/20 flex items-center justify-center text-[#006B3C]">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#17201B]">Camera Access Needed</h3>
              <p className="text-xs text-[#66706A] mt-1 leading-relaxed">
                {cameraError}
              </p>
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-12 px-4 bg-[#006B3C] hover:bg-[#004D2C] text-white font-semibold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
            >
              <ImageIcon className="w-4 h-4" />
              Upload from Photos
            </button>

            <div className="flex items-center justify-center gap-3 pt-1 text-xs">
              <button
                onClick={() => startCamera(facingMode)}
                className="text-[#006B3C] hover:underline font-medium cursor-pointer"
              >
                Retry Camera
              </button>
              <span className="text-[#E5E9E6]">·</span>
              <button
                onClick={() => setShowPermissionGuide(!showPermissionGuide)}
                className="text-[#66706A] hover:text-[#17201B] flex items-center gap-1 cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                Help
              </button>
            </div>

            {showPermissionGuide && (
              <div className="p-3 bg-white border border-[#E5E9E6] rounded-xl text-left text-[11px] text-[#66706A] space-y-1">
                <p className="font-semibold text-[#17201B]">Allow camera in browser:</p>
                <p>• iOS Safari: Settings &gt; Safari &gt; Camera &gt; Allow</p>
                <p>• Android Chrome: Address bar icon &gt; Permissions &gt; Camera</p>
              </div>
            )}
          </div>
        ) : (
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              style={{
                transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
              }}
              className="w-full h-full object-cover"
            />

            {/* Subtle framing guide line */}
            <div className="absolute inset-8 pointer-events-none border border-white/20 rounded-2xl" />
          </div>
        )}
      </div>

      {/* Ergonomic Bottom Controls Bar: Gallery | Shutter | Flip Camera (Selfie/Main) */}
      <div className="bg-black/85 backdrop-blur-md px-6 py-4 pb-7 flex items-center justify-between">
        {/* Gallery button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Upload photo from gallery"
          className="min-h-[48px] min-w-[48px] p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white/90 active:scale-95 transition-all flex flex-col items-center justify-center cursor-pointer"
          title="Upload from gallery"
        >
          <ImageIcon className="w-5 h-5" />
          <span className="text-[9px] text-white/70 mt-0.5">Gallery</span>
        </button>

        {/* Shutter Button: White outer ring, emerald center, subtle gold micro-accent */}
        <div className="relative flex items-center justify-center">
          <button
            type="button"
            onClick={handleCapture}
            disabled={!!cameraError || isLoadingCamera}
            aria-label="Capture photo"
            className="w-20 h-20 rounded-full border-4 border-white p-1 flex items-center justify-center active:scale-90 transition-transform disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          >
            <div className="relative w-full h-full bg-[#006B3C] hover:bg-[#004D2C] rounded-full flex items-center justify-center shadow-md">
              {/* Subtle gold micro-accent center dot */}
              <div className="w-2.5 h-2.5 rounded-full bg-[#C9A227]" />
            </div>
          </button>
        </div>

        {/* Flip front / back camera lens (Selfie vs Main Camera) */}
        <button
          type="button"
          onClick={toggleCameraFacing}
          disabled={!!cameraError}
          aria-label="Flip between selfie and main camera"
          className="min-h-[48px] px-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white/90 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-30 cursor-pointer border border-white/10"
          title={`Currently ${facingMode === 'user' ? 'Selfie (Front)' : 'Main (Rear)'}. Tap to switch`}
        >
          <SwitchCamera className="w-5 h-5 text-[#C9A227]" />
          <div className="flex flex-col text-left leading-tight">
            <span className="text-[9px] text-white/60 uppercase tracking-wider font-mono">Flip to</span>
            <span className="text-xs font-bold text-white">
              {facingMode === 'user' ? 'Main' : 'Selfie'}
            </span>
          </div>
        </button>
      </div>
    </div>
  );
};
