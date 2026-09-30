import React, { useState } from 'react';
import {
  PhotoTemplate,
  EventCategory,
  AspectRatio,
  ASPECT_RATIOS,
} from '../../types';
import { saveTemplate, deleteTemplate } from '../../services/storage';
import { createThemedFramePNG } from '../../utils/frameGenerator';
import {
  Plus,
  Trash2,
  CheckCircle,
  Eye,
  Upload,
  X,
  AlertCircle,
} from 'lucide-react';

interface TemplateManagerProps {
  eventId: string;
  eventName: string;
  templates: PhotoTemplate[];
  categories: EventCategory[];
  onRefresh: () => void;
}

export const TemplateManager: React.FC<TemplateManagerProps> = ({
  eventId,
  eventName,
  templates,
  categories,
  onRefresh,
}) => {
  const [filterRatio, setFilterRatio] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<PhotoTemplate | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<PhotoTemplate | null>(null);

  // New Template Form State
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || 'cat_food');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('4:3');
  const [pngDataUrl, setPngDataUrl] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [transparencyStatus, setTransparencyStatus] = useState<
    'checking' | 'valid' | 'opaque_warning' | null
  >(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const filteredTemplates = templates.filter((t) => {
    if (filterRatio !== 'all' && t.aspectRatio !== filterRatio) return false;
    return true;
  });

  const handleToggleActive = async (template: PhotoTemplate) => {
    await saveTemplate({
      ...template,
      active: !template.active,
    });
    onRefresh();
  };

  const handleDeleteConfirm = async () => {
    if (!templateToDelete) return;
    
    try {
      await deleteTemplate(templateToDelete.id);
      onRefresh();
    } catch (err) {
      console.error('[TemplateManager] Error during deletion:', err);
      alert(`Deletion failed: ${err}`);
    } finally {
      setTemplateToDelete(null);
    }
  };

  const handleDeleteClick = (template: PhotoTemplate) => {
    setTemplateToDelete(template);
  };

  const analyzeTransparency = (dataUrl: string) => {
    setTransparencyStatus('checking');
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.min(img.width, 300);
      canvas.height = Math.min(img.height, 300);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setTransparencyStatus('valid');
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

      let transparentPixels = 0;
      for (let i = 3; i < imgData.length; i += 4) {
        if (imgData[i] < 240) transparentPixels++;
      }

      const ratio = transparentPixels / (canvas.width * canvas.height);
      setTransparencyStatus(ratio > 0.08 ? 'valid' : 'opaque_warning');
    };
    img.onerror = () => setTransparencyStatus(null);
    img.src = dataUrl;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('png') && !file.type.includes('image')) {
      setFormError('Please upload a transparent PNG image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setPngDataUrl(result);
        analyzeTransparency(result);
        setFormError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateFrame = (theme: 'riwaq' | 'food' | 'gala' | 'minimal') => {
    setIsGenerating(true);
    setTimeout(() => {
      const png = createThemedFramePNG({
        aspectRatio,
        theme,
        eventName,
        eventDate: '30 SEPTEMBER 2026',
        badgeText: theme === 'food' ? 'FOOD FESTIVAL' : 'OFFICIAL SOUVENIR',
      });
      setPngDataUrl(png);
      setTransparencyStatus('valid');
      setIsGenerating(false);
      setFormError(null);
    }, 120);
  };

  const handleSaveNewTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Please enter a template title.');
      return;
    }
    if (!pngDataUrl) {
      setFormError('Please upload or generate a PNG frame.');
      return;
    }

    const ratioMeta = ASPECT_RATIOS[aspectRatio];
    const cat = categories.find((c) => c.id === categoryId);

    const newTemplate: PhotoTemplate = {
      id: `tmpl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      eventId,
      categoryId,
      categoryName: cat?.name || 'Custom',
      name: name.trim(),
      imageUrl: pngDataUrl,
      aspectRatio,
      width: ratioMeta.width,
      height: ratioMeta.height,
      orientation: ratioMeta.orientation,
      active: isActive,
      createdAt: new Date().toISOString(),
    };

    await saveTemplate(newTemplate);
    onRefresh();
    setIsAddModalOpen(false);
    setName('');
    setPngDataUrl('');
    setIsActive(true);
    setTransparencyStatus(null);
    setFormError(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#17201B] font-['Manrope']">
            Templates ({templates.length})
          </h2>
          <p className="text-xs text-[#66706A]">
            PNG overlays with transparent photo apertures
          </p>
        </div>

        <button
          onClick={() => {
            setIsAddModalOpen(true);
            setFormError(null);
          }}
          className="h-10 px-4 rounded-xl bg-[#006B3C] hover:bg-[#004D2C] text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add Template</span>
        </button>
      </div>

      {/* Filter Tabs with Underline */}
      <div className="flex items-center gap-6 border-b border-[#E5E9E6] overflow-x-auto no-scrollbar">
        {['all', '1:1', '4:3', '3:4', '9:16', '16:9'].map((r) => {
          const isActive = filterRatio === r;
          return (
            <button
              key={r}
              onClick={() => setFilterRatio(r)}
              className={`min-h-[38px] text-xs font-medium relative whitespace-nowrap transition-colors ${
                isActive
                  ? 'text-[#006B3C] font-semibold'
                  : 'text-[#66706A] hover:text-[#17201B]'
              }`}
            >
              <span>{r === 'all' ? 'All Ratios' : r}</span>
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#006B3C] rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => {
          const ratioDetails = ASPECT_RATIOS[template.aspectRatio];

          return (
            <div
              key={template.id}
              className={`rounded-2xl border bg-[#FFFFFF] p-3.5 flex flex-col justify-between transition-all ${
                template.active ? 'border-[#E5E9E6]' : 'border-[#E5E9E6]/60 opacity-60'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-[#17201B] truncate">
                    {template.name}
                  </span>
                  <button
                    onClick={() => handleToggleActive(template)}
                    className={`h-7 px-2.5 rounded-lg text-[11px] font-semibold transition-all ${
                      template.active
                        ? 'bg-[#EAF4EE] text-[#006B3C] border border-[#006B3C]/20'
                        : 'bg-[#FAFAF7] text-[#66706A] border border-[#E5E9E6]'
                    }`}
                  >
                    {template.active ? 'Active' : 'Disabled'}
                  </button>
                </div>

                {/* Frame Preview Card */}
                <div
                  onClick={() => setPreviewTemplate(template)}
                  className="relative w-full aspect-[4/3] rounded-xl overflow-hidden cursor-pointer border border-[#E5E9E6] bg-[#FAFAF7] flex items-center justify-center p-2"
                >
                  <img
                    src={template.imageUrl}
                    alt={template.name}
                    className="max-h-full max-w-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] text-[#17201B] font-mono border border-[#E5E9E6]">
                    {template.aspectRatio}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-[#66706A]">
                  <span>{template.categoryName}</span>
                  <span>·</span>
                  <span className="capitalize">{template.orientation}</span>
                  <span>·</span>
                  <span className="font-mono">{ratioDetails.width}×{ratioDetails.height}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 mt-3 border-t border-[#E5E9E6] flex items-center justify-between">
                <button
                  onClick={() => setPreviewTemplate(template)}
                  className="inline-flex items-center gap-1 text-xs text-[#66706A] hover:text-[#006B3C] font-medium"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inspect</span>
                </button>

                <button
                  onClick={() => handleDeleteClick(template)}
                  className="p-1.5 text-[#66706A] hover:text-[#B42318] rounded-lg transition-colors"
                  aria-label="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Template Modal */}
      {/* Add Frame Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#FFFFFF] border border-[#E5E9E6] rounded-2xl p-6 max-w-md w-full shadow-xl relative space-y-4 my-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#17201B] font-['Manrope']">
                  ADD FRAME
                </h3>
                <p className="text-xs text-[#66706A]">
                  Configure frame name, category, PNG, and aspect ratio
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#66706A] hover:text-[#17201B] p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-[#B42318]/10 border border-[#B42318]/20 text-[#B42318] text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveNewTemplate} className="space-y-4">
              {/* Frame Name */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#17201B]">Frame Name</label>
                <input
                  type="text"
                  placeholder="e.g. Food Frame 01"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-[#FAFAF7] border border-[#E5E9E6] text-xs text-[#17201B] focus:outline-none focus:border-[#006B3C]"
                />
              </div>

              {/* Category */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#17201B]">Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-[#FAFAF7] border border-[#E5E9E6] text-xs text-[#17201B] focus:outline-none focus:border-[#006B3C] cursor-pointer"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Upload PNG */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#17201B]">
                  Upload PNG
                </label>

                <label className="h-12 w-full border border-dashed border-[#66706A]/40 hover:border-[#006B3C] rounded-xl flex items-center justify-center gap-2 p-3 cursor-pointer bg-[#FAFAF7] transition-all">
                  <input
                    type="file"
                    accept="image/png,image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Upload className="w-4 h-4 text-[#006B3C]" />
                  <span className="text-xs font-medium text-[#17201B]">
                    {pngDataUrl ? 'Choose Different PNG' : 'food-frame-01.png (Upload Transparent PNG)'}
                  </span>
                </label>

                {/* Instant Theme Presets */}
                <div className="pt-1">
                  <p className="text-[11px] text-[#66706A] mb-1.5">
                    Or generate an instant sample:
                  </p>
                  <div className="grid grid-cols-4 gap-1.5">
                    <button
                      type="button"
                      disabled={isGenerating}
                      onClick={() => handleGenerateFrame('riwaq')}
                      className="h-8 px-2 bg-[#FAFAF7] hover:bg-[#EAF4EE] text-[11px] font-medium text-[#006B3C] rounded-lg transition-colors border border-[#E5E9E6] cursor-pointer"
                    >
                      Heritage
                    </button>
                    <button
                      type="button"
                      disabled={isGenerating}
                      onClick={() => handleGenerateFrame('food')}
                      className="h-8 px-2 bg-[#FAFAF7] hover:bg-[#EAF4EE] text-[11px] font-medium text-[#006B3C] rounded-lg transition-colors border border-[#E5E9E6] cursor-pointer"
                    >
                      Food
                    </button>
                    <button
                      type="button"
                      disabled={isGenerating}
                      onClick={() => handleGenerateFrame('gala')}
                      className="h-8 px-2 bg-[#FAFAF7] hover:bg-[#EAF4EE] text-[11px] font-medium text-[#006B3C] rounded-lg transition-colors border border-[#E5E9E6] cursor-pointer"
                    >
                      Gala
                    </button>
                    <button
                      type="button"
                      disabled={isGenerating}
                      onClick={() => handleGenerateFrame('minimal')}
                      className="h-8 px-2 bg-[#FAFAF7] hover:bg-[#EAF4EE] text-[11px] font-medium text-[#006B3C] rounded-lg transition-colors border border-[#E5E9E6] cursor-pointer"
                    >
                      Minimal
                    </button>
                  </div>
                </div>
              </div>

              {/* Aspect Ratio */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#17201B]">Aspect Ratio</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {(['4:3', '1:1', '3:4', '9:16', '16:9'] as AspectRatio[]).map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => setAspectRatio(ratio)}
                      className={`h-10 rounded-xl text-xs font-semibold flex flex-col items-center justify-center transition-all cursor-pointer ${
                        aspectRatio === ratio
                          ? 'bg-[#006B3C] text-white shadow-sm'
                          : 'bg-[#FAFAF7] text-[#66706A] border border-[#E5E9E6] hover:text-[#17201B]'
                      }`}
                    >
                      <span>{ratio}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#17201B]">Preview ({aspectRatio})</span>
                  {transparencyStatus === 'valid' && (
                    <span className="text-[#006B3C] flex items-center gap-1 text-[11px] font-medium">
                      <CheckCircle className="w-3.5 h-3.5" /> Transparent window detected
                    </span>
                  )}
                </div>

                <div className="w-full bg-[#FAFAF7] border border-[#E5E9E6] rounded-xl flex items-center justify-center p-2 min-h-[140px] max-h-[180px]">
                  {pngDataUrl ? (
                    <div
                      style={{
                        aspectRatio: `${ASPECT_RATIOS[aspectRatio].width} / ${ASPECT_RATIOS[aspectRatio].height}`,
                        maxHeight: '160px',
                      }}
                      className="relative h-full rounded-lg bg-white border border-[#E5E9E6] flex items-center justify-center overflow-hidden p-1 shadow-xs"
                    >
                      <img
                        src={pngDataUrl}
                        alt="Preview"
                        className="max-h-full max-w-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ) : (
                    <div className="text-center py-4 text-xs text-[#66706A]">
                      Upload PNG or generate sample above to preview
                    </div>
                  )}
                </div>
              </div>

              {/* Active Checkbox */}
              <div className="pt-1">
                <label className="flex items-center gap-2.5 text-xs font-semibold text-[#17201B] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 accent-[#006B3C] rounded cursor-pointer"
                  />
                  <span>Active (Immediately available in booth)</span>
                </label>
              </div>

              {/* Save Frame Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full h-12 rounded-xl bg-[#006B3C] hover:bg-[#004D2C] text-white font-semibold text-xs shadow-sm active:scale-[0.98] transition-transform cursor-pointer"
                >
                  Save Frame
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inspect Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#E5E9E6] rounded-2xl p-6 max-w-md w-full shadow-xl relative space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#17201B] font-['Manrope']">{previewTemplate.name}</h3>
                <p className="text-xs text-[#66706A] font-mono">
                  {previewTemplate.aspectRatio} · {previewTemplate.width}×{previewTemplate.height}px
                </p>
              </div>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="text-[#66706A] hover:text-[#17201B] p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="w-full aspect-[3/4] rounded-xl overflow-hidden bg-[#FAFAF7] border border-[#E5E9E6] flex items-center justify-center p-3">
              <img
                src={previewTemplate.imageUrl}
                alt={previewTemplate.name}
                className="max-h-full max-w-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>

            <button
              onClick={() => setPreviewTemplate(null)}
              className="w-full h-11 rounded-xl bg-[#FAFAF7] hover:bg-[#E5E9E6] text-xs font-semibold text-[#17201B]"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {templateToDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#E5E9E6] rounded-2xl p-6 max-w-sm w-full shadow-xl relative space-y-4 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#B42318]/10 text-[#B42318] flex items-center justify-center mb-2">
              <Trash2 className="w-6 h-6" />
            </div>
            
            <h3 className="text-base font-bold text-[#17201B] font-['Manrope']">
              Delete Template?
            </h3>
            
            <p className="text-xs text-[#66706A]">
              Are you sure you want to delete <span className="font-semibold text-[#17201B]">"{templateToDelete.name}"</span>? This action cannot be undone.
            </p>
            
            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                onClick={() => setTemplateToDelete(null)}
                className="h-11 rounded-xl bg-[#FAFAF7] hover:bg-[#E5E9E6] border border-[#E5E9E6] text-[#17201B] text-xs font-semibold active:scale-95 transition-transform"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="h-11 rounded-xl bg-[#B42318] hover:bg-[#911d14] text-white text-xs font-semibold active:scale-95 transition-transform shadow-sm"
              >
                Delete Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
