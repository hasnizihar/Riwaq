import React, { useState } from 'react';
import { EventConfig, PhotoTemplate, EventCategory } from '../../types';
import { saveEvent, syncPendingUploads, getSyncQueueStatus } from '../../services/storage';
import {
  getCloudinaryConfig,
  setCloudinaryConfig,
  testCloudinaryConnection,
  CloudinaryTestResult,
} from '../../services/cloudinaryService';
import { Globe, Copy, Check, Sliders, Cloud, AlertCircle, RefreshCw, Sparkles } from 'lucide-react';
import { RiwaqLogo } from '../common/RiwaqLogo';

interface EventSettingsProps {
  currentEvent: EventConfig;
  allEvents: EventConfig[];
  templates?: PhotoTemplate[];
  categories?: EventCategory[];
  onSelectEvent: (event: EventConfig) => void;
  onRefresh: () => void;
}

export const EventSettings: React.FC<EventSettingsProps> = ({
  currentEvent,
  allEvents,
  templates = [],
  categories = [],
  onSelectEvent,
  onRefresh,
}) => {
  const [name, setName] = useState(currentEvent.name);
  const [slug, setSlug] = useState(currentEvent.slug);
  const [date, setDate] = useState(currentEvent.date);
  const [location, setLocation] = useState(currentEvent.location || '');
  const [organizerEmail, setOrganizerEmail] = useState(currentEvent.organizerEmail || '');
  const [tagline, setTagline] = useState(currentEvent.tagline || '');
  const [defaultTemplateId, setDefaultTemplateId] = useState(
    currentEvent.defaultTemplateId || (templates[0]?.id ?? '')
  );
  const [allowFrameSelection, setAllowFrameSelection] = useState<boolean>(
    currentEvent.allowFrameSelection !== false
  );
  const [defaultCategoryId, setDefaultCategoryId] = useState(
    currentEvent.defaultCategoryId || (categories[0]?.id ?? '')
  );
  const [photoRetentionDays, setPhotoRetentionDays] = useState<number>(
    currentEvent.photoRetentionDays ?? 30
  );
  const [status, setStatus] = useState<EventConfig['status']>(currentEvent.status);

  // Cloudinary & Storage Configuration State
  const initialCloudConfig = getCloudinaryConfig();
  const [cloudName, setCloudName] = useState(initialCloudConfig.cloudName);
  const [uploadPreset, setUploadPreset] = useState(initialCloudConfig.uploadPreset);
  const [isTestingCloudinary, setIsTestingCloudinary] = useState(false);
  const [cloudinaryTestResult, setCloudinaryTestResult] = useState<CloudinaryTestResult | null>(null);
  const [cloudinarySavedSuccess, setCloudinarySavedSuccess] = useState(false);
  const [isSyncingQueue, setIsSyncingQueue] = useState(false);
  const [syncQueueNotice, setSyncQueueNotice] = useState<string | null>(null);

  // New Event Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newDate, setNewDate] = useState('30 September 2026');

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedBoothUrl, setCopiedBoothUrl] = useState(false);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated: EventConfig = {
      ...currentEvent,
      name: name.trim(),
      slug: slug.trim().toLowerCase().replace(/\s+/g, '-'),
      date: date.trim(),
      location: location.trim(),
      organizerEmail: organizerEmail.trim(),
      tagline: tagline.trim(),
      defaultTemplateId: defaultTemplateId || undefined,
      allowFrameSelection,
      defaultCategoryId: defaultCategoryId || undefined,
      photoRetentionDays,
      status,
    };

    await saveEvent(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
    onRefresh();
  };

  const handleCreateNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const cleanSlug = (newSlug || newName)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-');

    const created: EventConfig = {
      id: `event_${Date.now()}`,
      name: newName.trim(),
      slug: cleanSlug,
      date: newDate.trim(),
      status: 'active',
      allowFrameSelection: true,
      photoRetentionDays: 30,
      createdAt: new Date().toISOString(),
    };

    await saveEvent(created);
    setIsCreateModalOpen(false);
    setNewName('');
    setNewSlug('');
    onRefresh();
    onSelectEvent(created);
  };

  const boothUrl = `${window.location.origin}/e/${currentEvent.slug}/booth`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(boothUrl);
    setCopiedBoothUrl(true);
    setTimeout(() => setCopiedBoothUrl(false), 2000);
  };

  const handleTestCloudinary = async () => {
    setIsTestingCloudinary(true);
    setCloudinaryTestResult(null);
    try {
      const res = await testCloudinaryConnection({ cloudName, uploadPreset });
      setCloudinaryTestResult(res);
    } finally {
      setIsTestingCloudinary(false);
    }
  };

  const handleSaveCloudinary = (e: React.FormEvent) => {
    e.preventDefault();
    setCloudinaryConfig({ cloudName, uploadPreset });
    setCloudinarySavedSuccess(true);
    setTimeout(() => setCloudinarySavedSuccess(false), 2500);
  };

  const handleSyncPending = async () => {
    setIsSyncingQueue(true);
    setSyncQueueNotice(null);
    try {
      const res = await syncPendingUploads();
      setSyncQueueNotice(`Sync complete: ${res.synced} photo(s) synced to cloud CDN, ${res.failed} pending/failed.`);
    } catch {
      setSyncQueueNotice('Sync encountered an error.');
    } finally {
      setIsSyncingQueue(false);
      setTimeout(() => setSyncQueueNotice(null), 4000);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl select-none">
      {/* Event Switcher & Quick Launch Card */}
      <div className="p-4 rounded-2xl bg-[#EAF4EE] border border-[#006B3C]/20 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <RiwaqLogo variant="icon" size="sm" />
            <div>
              <span className="text-[10px] font-bold text-[#006B3C] uppercase tracking-wider block">
                ACTIVE EVENT
              </span>
              <h3 className="text-base font-bold text-[#17201B] font-['Manrope']">{currentEvent.name}</h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={currentEvent.id}
              onChange={(e) => {
                const target = allEvents.find((ev) => ev.id === e.target.value);
                if (target) onSelectEvent(target);
              }}
              className="h-10 px-3 rounded-xl bg-white border border-[#E5E9E6] text-xs text-[#17201B] focus:outline-none focus:border-[#006B3C] cursor-pointer"
            >
              {allEvents.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} ({ev.slug})
                </option>
              ))}
            </select>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="h-10 px-3.5 rounded-xl bg-[#006B3C] hover:bg-[#004D2C] text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              + New Event
            </button>
          </div>
        </div>

        {/* Booth URL share link */}
        <div className="pt-2 border-t border-[#006B3C]/10 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-[#17201B] truncate">
            <Globe className="w-3.5 h-3.5 text-[#006B3C] shrink-0" />
            <span className="truncate font-mono text-[11px]">{boothUrl}</span>
          </div>
          <button
            onClick={copyToClipboard}
            className="px-2.5 py-1 rounded-lg bg-white border border-[#E5E9E6] hover:bg-[#FAFAF7] text-[#006B3C] font-semibold text-[11px] flex items-center gap-1 shrink-0 cursor-pointer"
          >
            {copiedBoothUrl ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            <span>{copiedBoothUrl ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleUpdate} className="space-y-4">
        <div className="space-y-4 bg-white p-5 rounded-2xl border border-[#E5E9E6]">
          <h3 className="text-sm font-bold text-[#17201B] font-['Manrope']">
            General Event Profile
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#17201B]">Event Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-[#FAFAF7] border border-[#E5E9E6] text-xs text-[#17201B] focus:outline-none focus:border-[#006B3C]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#17201B]">URL Slug</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-[#FAFAF7] border border-[#E5E9E6] text-xs font-mono text-[#17201B] focus:outline-none focus:border-[#006B3C]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#17201B]">Event Date</label>
              <input
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="e.g. 30 September 2026"
                className="w-full h-11 px-3.5 rounded-xl bg-[#FAFAF7] border border-[#E5E9E6] text-xs text-[#17201B] focus:outline-none focus:border-[#006B3C]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#17201B]">Tagline</label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="e.g. Bridging heritage, flavors, and moments"
                className="w-full h-11 px-3.5 rounded-xl bg-[#FAFAF7] border border-[#E5E9E6] text-xs text-[#17201B] focus:outline-none focus:border-[#006B3C]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#17201B]">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Pavilion & Artisan Plaza"
                className="w-full h-11 px-3.5 rounded-xl bg-[#FAFAF7] border border-[#E5E9E6] text-xs text-[#17201B] focus:outline-none focus:border-[#006B3C]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#17201B]">Organizer Email</label>
              <input
                type="email"
                value={organizerEmail}
                onChange={(e) => setOrganizerEmail(e.target.value)}
                placeholder="organizer@event.org"
                className="w-full h-11 px-3.5 rounded-xl bg-[#FAFAF7] border border-[#E5E9E6] text-xs text-[#17201B] focus:outline-none focus:border-[#006B3C]"
              />
            </div>
          </div>

          {/* Booth Frame Configuration (Default Frame & Flow Selector) */}
          <div className="p-4 rounded-xl bg-[#FAFAF7] border border-[#E5E9E6] space-y-3.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#17201B] font-['Manrope'] uppercase tracking-wider">
              <Sliders className="w-3.5 h-3.5 text-[#006B3C]" />
              <span>Booth Frame Configuration</span>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#17201B]">Default Frame</label>
              <select
                value={defaultTemplateId}
                onChange={(e) => setDefaultTemplateId(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-white border border-[#E5E9E6] text-xs text-[#17201B] focus:outline-none focus:border-[#006B3C] cursor-pointer"
              >
                <option value="">Select a default frame...</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.aspectRatio} · {t.categoryName})
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-0.5">
              <label className="flex items-center gap-2.5 text-xs font-semibold text-[#17201B] cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowFrameSelection}
                  onChange={(e) => setAllowFrameSelection(e.target.checked)}
                  className="w-4 h-4 accent-[#006B3C] rounded cursor-pointer"
                />
                <span>Allow frame selection in booth</span>
              </label>
              <p className="text-[11px] text-[#66706A] ml-6 mt-0.5">
                When checked: Photo → Choose Frame → Adjust. When unchecked: Photo immediately uses default frame and proceeds directly to Adjust.
              </p>
            </div>

            {categories.length > 0 && (
              <div className="space-y-1 pt-1">
                <label className="text-xs font-semibold text-[#17201B]">Default Category</label>
                <select
                  value={defaultCategoryId}
                  onChange={(e) => setDefaultCategoryId(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-white border border-[#E5E9E6] text-xs text-[#17201B] focus:outline-none focus:border-[#006B3C] cursor-pointer"
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Photo Retention Policy */}
          <div className="space-y-2">
            <div>
              <label className="text-xs font-semibold text-[#17201B]">Photo Retention Policy</label>
              <p className="text-[11px] text-[#66706A]">
                Controls how long public QR links and dedicated /photo/:token souvenir pages remain valid.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {[
                { days: 7, label: '7 days' },
                { days: 30, label: '30 days (Recommended)' },
                { days: 90, label: '90 days' },
                { days: 0, label: 'Never expire' },
              ].map((opt) => (
                <button
                  key={opt.days}
                  type="button"
                  onClick={() => setPhotoRetentionDays(opt.days)}
                  className={`h-10 px-3 rounded-xl text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                    photoRetentionDays === opt.days
                      ? 'bg-[#006B3C] text-white shadow-sm'
                      : 'bg-[#FAFAF7] text-[#66706A] border border-[#E5E9E6] hover:text-[#17201B]'
                  }`}
                >
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#17201B]">Event Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as EventConfig['status'])}
              className="w-full h-11 px-3.5 rounded-xl bg-[#FAFAF7] border border-[#E5E9E6] text-xs text-[#17201B] focus:outline-none focus:border-[#006B3C] cursor-pointer"
            >
              <option value="active">Active (Open to Public & Booth)</option>
              <option value="archived">Archived (Read Only)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between">
          {savedSuccess && (
            <span className="text-xs text-[#006B3C] font-semibold flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Event settings saved successfully
            </span>
          )}
          <button
            type="submit"
            className="ml-auto h-11 px-6 rounded-xl bg-[#006B3C] hover:bg-[#004D2C] text-white font-semibold text-xs shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            Save Settings
          </button>
        </div>
      </form>

      {/* Cloud Storage & Cloudinary Configuration Card */}
      <div className="bg-[#FFFFFF] border border-[#E5E9E6] rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#EAF4EE] text-[#006B3C] flex items-center justify-center">
                <Cloud className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-[#17201B] font-['Manrope']">
                Cloud Storage & Cloudinary Settings
              </h3>
            </div>
            <p className="text-xs text-[#66706A] leading-relaxed">
              Manages CDN storage for participant original photos and composited souvenir cards.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSyncPending}
            disabled={isSyncingQueue}
            className="h-9 px-3 rounded-xl bg-[#FAFAF7] hover:bg-[#EAF4EE] text-[#006B3C] border border-[#E5E9E6] text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
            title="Upload any photos stored locally in IndexedDB while offline"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingQueue ? 'animate-spin' : ''}`} />
            <span>{isSyncingQueue ? 'Syncing...' : 'Sync Local Queue'}</span>
          </button>
        </div>

        {syncQueueNotice && (
          <div className="p-3 bg-[#EAF4EE] border border-[#006B3C]/20 rounded-xl text-xs text-[#006B3C] flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{syncQueueNotice}</span>
          </div>
        )}

        <form onSubmit={handleSaveCloudinary} className="space-y-3.5 pt-1">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#17201B]">
                Cloudinary Cloud Name
              </label>
              <span className="text-[10px] text-[#66706A]">
                Case-sensitive identifier (e.g. <span className="font-mono text-[#006B3C]">dcgnjhjkp</span> or lowercase)
              </span>
            </div>
            <input
              type="text"
              value={cloudName}
              onChange={(e) => setCloudName(e.target.value.trim())}
              placeholder="e.g. dcgnjhjkp"
              className="w-full h-11 px-3.5 rounded-xl bg-[#FAFAF7] border border-[#E5E9E6] text-xs font-mono text-[#17201B] focus:outline-none focus:border-[#006B3C]"
            />
            <p className="text-[11px] text-[#66706A] leading-relaxed">
              ⚠️ <strong>Note:</strong> Make sure this is your actual Cloud Name used in URLs (<code className="text-[#006B3C]">res.cloudinary.com/&lt;cloud_name&gt;/</code>), NOT your account display username or organization title.
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#17201B]">
                Unsigned Upload Preset
              </label>
              <span className="text-[10px] text-[#66706A]">
                Settings → Upload → Upload presets (Mode: Unsigned)
              </span>
            </div>
            <input
              type="text"
              value={uploadPreset}
              onChange={(e) => setUploadPreset(e.target.value.trim())}
              placeholder="e.g. 2im-5GQw2-Is0ofiVfSeJChTlAA"
              className="w-full h-11 px-3.5 rounded-xl bg-[#FAFAF7] border border-[#E5E9E6] text-xs font-mono text-[#17201B] focus:outline-none focus:border-[#006B3C]"
            />
          </div>

          {/* Test results banner */}
          {cloudinaryTestResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs leading-relaxed space-y-1.5 ${
                cloudinaryTestResult.success
                  ? 'bg-[#EAF4EE] border-[#006B3C]/30 text-[#004D2C]'
                  : 'bg-[#FEF3F2] border-[#B42318]/30 text-[#912018]'
              }`}
            >
              <div className="flex items-center gap-1.5 font-semibold">
                {cloudinaryTestResult.success ? (
                  <>
                    <Check className="w-4 h-4 text-[#006B3C]" />
                    <span>Connection Successful</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-[#B42318]" />
                    <span>Connection Issue Detected</span>
                  </>
                )}
              </div>
              <p className="text-[11px]">{cloudinaryTestResult.message}</p>
              {cloudinaryTestResult.details && (
                <p className="text-[10.5px] opacity-90">{cloudinaryTestResult.details}</p>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleTestCloudinary}
              disabled={isTestingCloudinary}
              className="h-10 px-4 rounded-xl bg-[#FAFAF7] hover:bg-[#EAF4EE] text-[#17201B] border border-[#E5E9E6] font-semibold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isTestingCloudinary ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#006B3C]" />
                  <span>Verifying API...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-[#C9A227]" />
                  <span>Test Cloudinary Connection</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-2">
              {cloudinarySavedSuccess && (
                <span className="text-xs text-[#006B3C] font-semibold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Credentials saved
                </span>
              )}
              <button
                type="submit"
                className="h-10 px-5 rounded-xl bg-[#006B3C] hover:bg-[#004D2C] text-white font-semibold text-xs shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                Save Cloud Credentials
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#FFFFFF] border border-[#E5E9E6] rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-[#17201B] font-['Manrope']">Create New Event</h3>
            <form onSubmit={handleCreateNew} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#17201B]">Event Name</label>
                <input
                  type="text"
                  placeholder="e.g. Autumn Artisan Fair"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-[#FAFAF7] border border-[#E5E9E6] text-xs text-[#17201B] focus:outline-none focus:border-[#006B3C]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#17201B]">Slug (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. autumn-fair-2026"
                  value={newSlug}
                  onChange={(e) => setNewSlug(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-[#FAFAF7] border border-[#E5E9E6] text-xs font-mono text-[#17201B] focus:outline-none focus:border-[#006B3C]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#17201B]">Date</label>
                <input
                  type="text"
                  placeholder="e.g. 15 October 2026"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-[#FAFAF7] border border-[#E5E9E6] text-xs text-[#17201B] focus:outline-none focus:border-[#006B3C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="h-10 rounded-xl bg-[#FAFAF7] border border-[#E5E9E6] text-xs font-semibold text-[#17201B] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-10 rounded-xl bg-[#006B3C] text-white text-xs font-semibold shadow-sm cursor-pointer"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
