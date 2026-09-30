import React, { useState, useEffect } from 'react';
import { PhotoTemplate, EventCategory } from '../../types';
import { ArrowLeft, Check, ArrowRight, Camera } from 'lucide-react';

interface TemplateSelectorProps {
  templates: PhotoTemplate[];
  categories: EventCategory[];
  selectedTemplateId: string | null;
  onSelectTemplate: (template: PhotoTemplate) => void;
  onConfirm: (template: PhotoTemplate) => void;
  onBack: () => void;
  previewPhotoUrl?: string;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  templates,
  categories,
  selectedTemplateId,
  onSelectTemplate,
  onConfirm,
  onBack,
  previewPhotoUrl,
}) => {
  const [selectedCatId, setSelectedCatId] = useState<string>('all');
  const [activeTemplate, setActiveTemplate] = useState<PhotoTemplate | null>(() => {
    if (selectedTemplateId) {
      const found = templates.find((t) => t.id === selectedTemplateId && t.active);
      if (found) return found;
    }
    return templates.find((t) => t.active) || null;
  });

  // Keep activeTemplate in sync if templates change or selectedTemplateId updates
  useEffect(() => {
    if (selectedTemplateId) {
      const match = templates.find((t) => t.id === selectedTemplateId && t.active);
      if (match) {
        setActiveTemplate(match);
        return;
      }
    }
    if (!activeTemplate && templates.length > 0) {
      const firstActive = templates.find((t) => t.active);
      if (firstActive) {
        setActiveTemplate(firstActive);
        onSelectTemplate(firstActive);
      }
    }
  }, [selectedTemplateId, templates, activeTemplate, onSelectTemplate]);

  // Clean category tab names matching the user specification: All | Cultural | Food | Special
  const formatCategoryTab = (name: string): string => {
    const lower = name.toLowerCase();
    if (lower.includes('all')) return 'All';
    if (lower.includes('islamic') || lower.includes('cultural')) return 'Cultural';
    if (lower.includes('food') || lower.includes('flavor')) return 'Food';
    if (lower.includes('special') || lower.includes('gala')) return 'Special';
    return name;
  };

  const filteredTemplates = templates.filter((t) => {
    if (!t.active) return false;
    if (selectedCatId === 'all') return true;
    return t.categoryId === selectedCatId;
  });

  const handleCardClick = (template: PhotoTemplate) => {
    setActiveTemplate(template);
    onSelectTemplate(template);
  };

  const handleContinue = () => {
    if (activeTemplate) {
      onConfirm(activeTemplate);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#FAFAF7] text-[#17201B] overflow-hidden select-none">
      {/* Top Header Bar */}
      <div className="sticky top-0 z-20 bg-[#FAFAF7]/95 backdrop-blur-sm border-b border-[#E5E9E6] px-4 py-3 flex items-center justify-between">
        <button
          onClick={onBack}
          className="min-h-[44px] min-w-[44px] -ml-2 flex items-center justify-center text-[#66706A] hover:text-[#17201B] active:scale-95 transition-transform cursor-pointer"
          aria-label="Back to camera"
          title="Retake photo"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <h2 className="text-base font-semibold tracking-tight text-[#17201B] font-['Manrope']">
            Choose Your Frame
          </h2>
          <p className="text-[11px] text-[#66706A] font-normal">
            Theme determines the aspect ratio automatically
          </p>
        </div>

        <button
          onClick={onBack}
          className="min-h-[44px] px-2 flex items-center justify-center text-[11px] font-medium text-[#66706A] hover:text-[#006B3C] active:scale-95 transition-transform cursor-pointer"
          title="Retake photo"
        >
          <Camera className="w-3.5 h-3.5 mr-1" />
          Retake
        </button>
      </div>

      {/* Helper notice */}
      <div className="px-5 pt-3 pb-2 text-center bg-[#FAFAF7]">
        <p className="text-xs text-[#66706A] leading-relaxed max-w-xs mx-auto">
          Select a frame for your photo. The photo will automatically fit the selected frame.
        </p>
      </div>

      {/* Category Navigation with Underlined Active State (Zero-Pill Discipline) */}
      <div className="px-5 border-b border-[#E5E9E6] bg-[#FAFAF7]">
        <div className="flex items-center justify-center gap-6 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setSelectedCatId('all')}
            className={`min-h-[40px] text-xs font-medium relative whitespace-nowrap transition-colors cursor-pointer ${
              selectedCatId === 'all'
                ? 'text-[#006B3C] font-semibold'
                : 'text-[#66706A] hover:text-[#17201B]'
            }`}
          >
            <span>All</span>
            {selectedCatId === 'all' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#006B3C] rounded-full" />
            )}
          </button>

          {categories.map((cat) => {
            const isCatActive = selectedCatId === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCatId(cat.id)}
                className={`min-h-[40px] text-xs font-medium relative whitespace-nowrap transition-colors cursor-pointer ${
                  isCatActive
                    ? 'text-[#006B3C] font-semibold'
                    : 'text-[#66706A] hover:text-[#17201B]'
                }`}
              >
                <span>{formatCategoryTab(cat.name)}</span>
                {isCatActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#006B3C] rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Template Cards Grid */}
      <div className="flex-1 overflow-y-auto p-4 pb-28">
        <div className="grid grid-cols-2 gap-3.5 max-w-md mx-auto">
          {filteredTemplates.map((template) => {
            const isSelected = activeTemplate?.id === template.id;

            const ratioStyle =
              template.aspectRatio === '1:1'
                ? 'aspect-square'
                : template.aspectRatio === '4:3'
                ? 'aspect-[4/3]'
                : template.aspectRatio === '3:4'
                ? 'aspect-[3/4]'
                : template.aspectRatio === '16:9'
                ? 'aspect-[16/9]'
                : 'aspect-[9/16]';

            return (
              <button
                key={template.id}
                onClick={() => handleCardClick(template)}
                className={`group relative flex flex-col rounded-2xl p-2.5 text-left transition-all active:scale-[0.98] bg-[#FFFFFF] cursor-pointer ${
                  isSelected
                    ? 'border-2 border-[#006B3C] shadow-sm'
                    : 'border border-[#E5E9E6] hover:border-[#66706A]'
                }`}
              >
                {/* Selected check badge with subtle gold micro-accent */}
                {isSelected && (
                  <div className="absolute top-3.5 right-3.5 z-20 w-6 h-6 rounded-full bg-[#006B3C] text-white flex items-center justify-center shadow-md">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}

                {/* Frame Preview Container */}
                <div
                  className={`relative w-full ${ratioStyle} rounded-xl overflow-hidden bg-[#F2F4F2] border border-[#E5E9E6]/80 flex items-center justify-center`}
                >
                  {/* Visitor's captured photo underneath aperture */}
                  {previewPhotoUrl && (
                    <img
                      src={previewPhotoUrl}
                      alt="Captured photo preview"
                      className="absolute inset-0 w-full h-full object-cover opacity-90"
                      referrerPolicy="no-referrer"
                    />
                  )}

                  {/* PNG Frame overlay */}
                  <img
                    src={template.imageUrl}
                    alt={template.name}
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none drop-shadow-sm z-10"
                    referrerPolicy="no-referrer"
                  />
                </div>

                {/* Typography below card: Frame Name + Ratio */}
                <div className="mt-2.5 px-0.5">
                  <p className="text-xs font-semibold text-[#17201B] line-clamp-1 group-hover:text-[#006B3C] transition-colors">
                    {template.name}
                  </p>
                  <p className="text-[11px] text-[#66706A] mt-0.5 font-medium">
                    {template.aspectRatio}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sticky Bottom Confirmation Bar */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-30 bg-[#FFFFFF] border-t border-[#E5E9E6] px-5 py-3 pb-6 flex flex-col gap-2.5 shadow-lg">
        {activeTemplate ? (
          <div className="flex items-center justify-between px-1 text-xs">
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-[#006B3C] font-bold text-sm">✓</span>
              <span className="font-semibold text-[#17201B] truncate">
                {activeTemplate.name}
              </span>
            </div>
            <div className="text-[#66706A] font-medium whitespace-nowrap ml-2">
              Aspect ratio:{' '}
              <span className="font-semibold text-[#006B3C]">{activeTemplate.aspectRatio}</span>
            </div>
          </div>
        ) : (
          <div className="text-center text-xs text-[#66706A]">
            Tap a frame above to proceed
          </div>
        )}

        <button
          disabled={!activeTemplate}
          onClick={handleContinue}
          className="w-full h-[52px] rounded-xl bg-[#006B3C] hover:bg-[#004D2C] disabled:bg-[#E5E9E6] disabled:text-[#66706A] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-all cursor-pointer"
        >
          <span>Continue</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
