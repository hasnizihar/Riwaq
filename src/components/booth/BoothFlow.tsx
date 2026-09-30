import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  EventConfig,
  EventCategory,
  PhotoTemplate,
  PhotoRecord,
  TransformState,
  BoothStep,
} from '../../types';
import {
  getTemplates,
  getCategories,
  savePhoto,
  updatePhotoStatus,
  syncPhotoToCloud,
  getPhotoByToken,
} from '../../services/storage';
import { renderComposite, CompositeResult, generatePhotoToken } from '../../utils/imageCompositor';
import { dispatchPhotoEmail } from '../../services/emailService';
import { uploadOriginalPhoto, uploadGeneratedPhoto } from '../../services/cloudinaryService';

import { BoothHome } from './BoothHome';
import { CameraCapture } from './CameraCapture';
import { TemplateSelector } from './TemplateSelector';
import { PhotoEditor } from './PhotoEditor';
import { PhotoPreview } from './PhotoPreview';
import { ProcessingModal } from './ProcessingModal';
import { SuccessScreen } from './SuccessScreen';
import { Settings, Maximize2, Minimize2, AlertCircle } from 'lucide-react';
import { RiwaqLogo } from '../common/RiwaqLogo';

interface BoothFlowProps {
  event: EventConfig;
  onOpenAdmin?: () => void;
  isKioskMode?: boolean;
  onToggleKioskMode?: () => void;
}

const DEFAULT_TRANSFORM: TransformState = {
  scale: 1,
  x: 0,
  y: 0,
  rotation: 0,
};

export const BoothFlow: React.FC<BoothFlowProps> = ({
  event,
  onOpenAdmin,
  isKioskMode = false,
  onToggleKioskMode,
}) => {
  const [currentStep, setCurrentStep] = useState<BoothStep>('home');
  const [templates, setTemplates] = useState<PhotoTemplate[]>([]);
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<PhotoTemplate | null>(null);

  // Participant Photo State
  const [originalPhoto, setOriginalPhoto] = useState<string | null>(null);
  const [photoSource, setPhotoSource] = useState<'camera' | 'upload'>('camera');
  const [transform, setTransform] = useState<TransformState>(DEFAULT_TRANSFORM);
  const [compositeResult, setCompositeResult] = useState<CompositeResult | null>(null);
  const [savedPhotoRecord, setSavedPhotoRecord] = useState<PhotoRecord | null>(null);

  // Processing & Delivery State
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStage, setProcessingStage] = useState<
    'compositing' | 'compressing' | 'storing' | 'dispatching'
  >('compositing');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [isEmailSending, setIsEmailSending] = useState<boolean>(false);

  // Guard Dialog State
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [discardMessage, setDiscardMessage] = useState<string>('');
  const [consecutiveCount, setConsecutiveCount] = useState<number>(0);
  const isSubmittingRef = useRef<boolean>(false);

  const loadEventData = useCallback(async () => {
    try {
      const [tmpls, cats] = await Promise.all([
        getTemplates(event.id, true),
        getCategories(event.id),
      ]);
      setTemplates(tmpls);
      setCategories(cats);

      if (tmpls.length > 0) {
        if (event.defaultTemplateId) {
          const def = tmpls.find((t) => t.id === event.defaultTemplateId && t.active);
          if (def) setSelectedTemplate(def);
          else if (!selectedTemplate) setSelectedTemplate(tmpls[0]);
        } else if (!selectedTemplate) {
          setSelectedTemplate(tmpls[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load booth data', err);
    }
  }, [event.id, event.defaultTemplateId, selectedTemplate]);

  useEffect(() => {
    loadEventData();
  }, [loadEventData]);

  // Handle Photo Captured or Selected
  const handlePhotoCaptured = (photoDataUrl: string, source: 'camera' | 'upload' = 'camera') => {
    setOriginalPhoto(photoDataUrl);
    setPhotoSource(source);
    setTransform(DEFAULT_TRANSFORM);
    setCompositeResult(null);

    // Determine target template based on event settings
    let targetTemplate = selectedTemplate;
    if (event.defaultTemplateId) {
      const def = templates.find((t) => t.id === event.defaultTemplateId && t.active);
      if (def) targetTemplate = def;
    }
    if (!targetTemplate && templates.length > 0) {
      targetTemplate = templates.find((t) => t.active) || templates[0];
    }
    if (targetTemplate) {
      setSelectedTemplate(targetTemplate);
    }

    // Check if frame selection is allowed for this event
    const isFrameSelectionAllowed = event.allowFrameSelection !== false;

    if (isFrameSelectionAllowed) {
      // Flow: PHOTO CAPTURED -> CHOOSE YOUR FRAME
      setCurrentStep('frame');
    } else if (targetTemplate) {
      // Flow: PHOTO CAPTURED -> ADJUST PHOTO (Direct single-frame speed flow)
      setCurrentStep('adjust');
    } else {
      setCurrentStep('frame');
    }
  };

  // Called when user selects and confirms frame on Choose Your Frame screen
  const handleConfirmTemplate = (template: PhotoTemplate) => {
    if (selectedTemplate && selectedTemplate.aspectRatio !== template.aspectRatio) {
      // Reinitialize viewport transform so old aspect ratio dimensions do not distort new frame
      setTransform({
        scale: 1,
        rotation: 0,
        x: 0,
        y: 0,
        previewWidth: 0,
        previewHeight: 0,
      });
    }
    setSelectedTemplate(template);
    // Aspect ratio automatically applied from template -> opens crop editor!
    setCurrentStep('adjust');
  };

  const handleAdjustContinue = async () => {
    if (!originalPhoto || !selectedTemplate) return;
    if (isSubmittingRef.current || isProcessing) return;
    isSubmittingRef.current = true;

    try {
      setIsProcessing(true);
      setCurrentStep('processing');
      setProcessingStage('compositing');
      setProgressPercent(40);

      const result = await renderComposite({
        photoSrc: originalPhoto,
        frameSrc: selectedTemplate.imageUrl,
        aspectRatio: selectedTemplate.aspectRatio,
        transform,
        eventSlug: event.slug,
      });

      setCompositeResult(result);
      setProgressPercent(100);
      setIsProcessing(false);
      setCurrentStep('preview');
    } catch (err) {
      console.error('Composite generation error:', err);
      alert('Failed to composite image. Please adjust your photo and try again.');
      setIsProcessing(false);
      setCurrentStep('adjust');
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handlePreviewConfirm = async () => {
    if (!compositeResult || !selectedTemplate || !originalPhoto) return;
    if (isSubmittingRef.current || isProcessing) return;
    isSubmittingRef.current = true;

    try {
      setIsProcessing(true);
      setCurrentStep('processing');
      setProcessingStage('storing');
      setProgressPercent(80);

      const token = generatePhotoToken();
      const retentionDays = event.photoRetentionDays ?? 30;
      const expiresAt =
        retentionDays > 0
          ? new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000).toISOString()
          : undefined;

      // Emergency local safety net: construct photo record with local full-res assets first
      const photoRecord: PhotoRecord = {
        id: `photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        photoToken: token,
        token: token,
        eventId: event.id,
        templateId: selectedTemplate.id,
        templateName: selectedTemplate.name,
        originalPhotoUrl: originalPhoto,
        originalUrl: originalPhoto,
        generatedPhotoUrl: compositeResult.dataUrl,
        finalUrl: compositeResult.dataUrl,
        email: '',
        emailStatus: 'not_requested',
        status: 'ready',
        fileName: compositeResult.fileName,
        aspectRatio: selectedTemplate.aspectRatio,
        downloadCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        expiresAt,
        syncStatus: 'queued',
      };

      // 1. Save immediately to local IndexedDB
      const saved = await savePhoto(photoRecord);
      setSavedPhotoRecord(saved);
      setProgressPercent(100);
      setIsProcessing(false);
      setConsecutiveCount((prev) => prev + 1);

      // Instant UI handover to QR Ready Screen (zero network lag for operator)
      setCurrentStep('ready');

      // 2. Background non-blocking sync: Cloudinary upload + Supabase metadata registration
      syncPhotoToCloud(saved.id)
        .then((isSynced) => {
          if (isSynced) {
            getPhotoByToken(token)
              .then((cloudRec) => {
                if (cloudRec) {
                  setSavedPhotoRecord((prev) => (prev?.id === saved.id ? cloudRec : prev));
                }
              })
              .catch(() => {});
          }
        })
        .catch((err) => {
          console.warn('[Booth] Background cloud sync queued for retry:', err);
        });
    } catch (err) {
      console.error('Failed to save photo record to local safety net:', err);
      setIsProcessing(false);
      alert('Failed to save souvenir. Please try again.');
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handleSendEmail = async (email: string) => {
    if (!savedPhotoRecord) return;

    setIsEmailSending(true);
    await updatePhotoStatus(savedPhotoRecord.id, 'email_pending');
    setSavedPhotoRecord((prev) =>
      prev ? { ...prev, emailStatus: 'sending', email } : null
    );

    try {
      const result = await dispatchPhotoEmail({
        recipientEmail: email,
        eventName: event.name,
        eventDate: event.date,
        photoRecord: savedPhotoRecord,
      });

      if (result.success) {
        await updatePhotoStatus(savedPhotoRecord.id, 'email_sent', result.dispatchedAt);
        setSavedPhotoRecord((prev) =>
          prev
            ? {
                ...prev,
                emailStatus: 'provider_accepted',
                status: 'email_sent',
                email,
                sentAt: result.dispatchedAt,
              }
            : null
        );
      } else {
        await updatePhotoStatus(savedPhotoRecord.id, 'email_failed');
        setSavedPhotoRecord((prev) =>
          prev
            ? { ...prev, emailStatus: 'delivery_failed', status: 'email_failed', email }
            : null
        );
      }
    } catch (err) {
      console.error('Email delivery error:', err);
      await updatePhotoStatus(savedPhotoRecord.id, 'email_failed');
      setSavedPhotoRecord((prev) =>
        prev
          ? { ...prev, emailStatus: 'delivery_failed', status: 'email_failed', email }
          : null
      );
    } finally {
      setIsEmailSending(false);
    }
  };

  const executeReset = () => {
    setOriginalPhoto(null);
    setTransform(DEFAULT_TRANSFORM);
    setCompositeResult(null);
    setSavedPhotoRecord(null);
    setIsEmailSending(false);
    setIsProcessing(false);
    isSubmittingRef.current = false;

    // Reset selected template to event's configured default template (not prior visitor's choice)
    const defaultTmpl =
      templates.find((t) => t.id === event.defaultTemplateId && t.active) ||
      templates.find((t) => t.active) ||
      null;
    setSelectedTemplate(defaultTmpl);
    setCurrentStep('home');
  };

  const handleNextVisitor = () => {
    if (isSubmittingRef.current) return;

    if (isEmailSending) {
      setDiscardMessage('An email is currently being delivered. Reset anyway?');
      setShowDiscardConfirm(true);
      return;
    }

    if (currentStep !== 'ready' && currentStep !== 'home' && originalPhoto) {
      setDiscardMessage('The current photo has not been saved. Discard?');
      setShowDiscardConfirm(true);
      return;
    }

    executeReset();
  };

  return (
    <div className="relative flex flex-col h-full w-full max-w-md mx-auto bg-[#FAFAF7] overflow-hidden shadow-sm">
      {/* Subtle Step Progress Header (Visible when in process) */}
      {currentStep !== 'home' && (
        <div className="bg-[#FAFAF7]/95 border-b border-[#E5E9E6] px-4 py-2 flex items-center justify-between text-xs z-30 select-none">
          <div className="flex items-center gap-2 font-medium text-[#17201B]">
            <RiwaqLogo variant="icon" size="xs" />
            <span className="truncate max-w-[130px] font-semibold text-xs">{event.name}</span>
            {consecutiveCount > 0 && (
              <span className="text-[10px] text-[#C9A227] font-mono">#{consecutiveCount}</span>
            )}
          </div>

          {/* Clean minimal step indicator: camera -> frame -> adjust -> preview -> ready */}
          <div className="flex items-center gap-1.5">
            {(['camera', 'frame', 'adjust', 'preview', 'ready'] as BoothStep[]).map((step, idx) => {
              const stepsOrder: BoothStep[] = ['camera', 'frame', 'adjust', 'preview', 'ready'];
              const currentIdx = stepsOrder.indexOf(currentStep);
              const isCompleted = currentIdx > idx;
              const isCurrent = currentStep === step;

              return (
                <div
                  key={step}
                  className={`h-1.5 rounded-full transition-all ${
                    isCurrent
                      ? 'w-4 bg-[#006B3C]'
                      : isCompleted
                      ? 'w-1.5 bg-[#006B3C]/60'
                      : 'w-1.5 bg-[#E5E9E6]'
                  }`}
                />
              );
            })}
          </div>

          <div className="flex items-center gap-1">
            {onToggleKioskMode && (
              <button
                onClick={onToggleKioskMode}
                className="p-1 text-[#66706A] hover:text-[#17201B] rounded-lg active:scale-90 transition-transform cursor-pointer"
                title={isKioskMode ? 'Exit Kiosk' : 'Kiosk Mode'}
              >
                {isKioskMode ? <Minimize2 className="w-4 h-4 text-[#006B3C]" /> : <Maximize2 className="w-4 h-4 text-[#66706A]" />}
              </button>
            )}

            {onOpenAdmin && !isKioskMode && (
              <button
                onClick={onOpenAdmin}
                className="p-1 text-[#66706A] hover:text-[#17201B] rounded-lg active:scale-90 transition-transform cursor-pointer"
                aria-label="Admin"
                title="Event Admin"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Flow Stage */}
      <div className="flex-1 relative overflow-hidden flex flex-col">
        {currentStep === 'home' && (
          <BoothHome
            event={event}
            onStartCamera={() => setCurrentStep('camera')}
            onPhotoSelected={(dataUrl) => handlePhotoCaptured(dataUrl, 'upload')}
          />
        )}

        {currentStep === 'camera' && (
          <CameraCapture
            eventName={event.name}
            onPhotoCaptured={(dataUrl) => handlePhotoCaptured(dataUrl, 'camera')}
            onBack={() => setCurrentStep('home')}
          />
        )}

        {/* Step: CHOOSE YOUR FRAME (immediately after photo capture/upload) */}
        {currentStep === 'frame' && (
          <TemplateSelector
            templates={templates}
            categories={categories}
            selectedTemplateId={selectedTemplate?.id || null}
            onSelectTemplate={(tmpl) => setSelectedTemplate(tmpl)}
            onConfirm={handleConfirmTemplate}
            onBack={() => {
              if (photoSource === 'upload') setCurrentStep('home');
              else setCurrentStep('camera');
            }}
            previewPhotoUrl={originalPhoto || undefined}
          />
        )}

        {/* Step: CROP / ALIGN PHOTO with live PNG overlay & dynamic aspect ratio */}
        {currentStep === 'adjust' && originalPhoto && selectedTemplate && (
          <PhotoEditor
            photoSrc={originalPhoto}
            template={selectedTemplate}
            transform={transform}
            onChangeTransform={setTransform}
            onContinue={handleAdjustContinue}
            onBack={() => {
              if (event.allowFrameSelection === false) {
                if (photoSource === 'upload') setCurrentStep('home');
                else setCurrentStep('camera');
              } else {
                setCurrentStep('frame');
              }
            }}
          />
        )}

        {/* Step: PREVIEW */}
        {currentStep === 'preview' && compositeResult && (
          <PhotoPreview
            compositeDataUrl={compositeResult.dataUrl}
            onConfirm={handlePreviewConfirm}
            onEdit={() => setCurrentStep('adjust')}
            onChangeFrame={
              event.allowFrameSelection !== false
                ? () => setCurrentStep('frame')
                : undefined
            }
            onBack={() => setCurrentStep('adjust')}
          />
        )}

        {currentStep === 'processing' && (
          <ProcessingModal
            currentStage={processingStage}
            progressPercent={progressPercent}
          />
        )}

        {/* Step: SOUVENIR READY (QR + Download + Email Delivery) */}
        {currentStep === 'ready' && savedPhotoRecord && (
          <SuccessScreen
            photoRecord={savedPhotoRecord}
            onSendEmail={handleSendEmail}
            onNextVisitor={handleNextVisitor}
            isEmailSending={isEmailSending}
          />
        )}
      </div>

      {/* Confirmation Guard Dialog */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-[#FFFFFF] border border-[#E5E9E6] rounded-2xl p-6 max-w-xs w-full text-center space-y-4 shadow-xl">
            <div className="w-10 h-10 mx-auto rounded-full bg-[#EAF4EE] text-[#006B3C] flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#17201B]">Confirm Reset</h3>
              <p className="text-xs text-[#66706A] mt-1 leading-relaxed">
                {discardMessage || 'Proceed to the next visitor?'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => setShowDiscardConfirm(false)}
                className="h-10 rounded-xl bg-[#FAFAF7] hover:bg-[#E5E9E6] text-xs font-semibold text-[#17201B] active:scale-95 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowDiscardConfirm(false);
                  executeReset();
                }}
                className="h-10 rounded-xl bg-[#006B3C] hover:bg-[#004D2C] text-white text-xs font-semibold active:scale-95 transition-all cursor-pointer"
              >
                Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
