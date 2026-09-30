import React, { useState, useEffect, useCallback } from 'react';
import {
  EventConfig,
  PhotoTemplate,
  PhotoRecord,
  EventCategory,
} from '../../types';
import {
  getTemplates,
  getCategories,
  getPhotos,
  getEventStats,
} from '../../services/storage';
import { TemplateManager } from './TemplateManager';
import { PhotoHistory } from './PhotoHistory';
import { EventSettings } from './EventSettings';
import { QAAuditSuite } from './QAAuditSuite';
import {
  Camera,
  Maximize2,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { RiwaqLogo } from '../common/RiwaqLogo';

interface AdminDashboardProps {
  currentEvent: EventConfig;
  allEvents: EventConfig[];
  onSelectEvent: (event: EventConfig) => void;
  onLaunchBooth: (kiosk?: boolean) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentEvent,
  allEvents,
  onSelectEvent,
  onLaunchBooth,
}) => {
  const [activeTab, setActiveTab] = useState<'templates' | 'photos' | 'settings' | 'audit'>('templates');
  const [templates, setTemplates] = useState<PhotoTemplate[]>([]);
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [stats, setStats] = useState<{
    totalPhotosTaken: number;
    totalGenerated: number;
    downloadedCount: number;
    totalDownloads: number;
    emailsAcceptedCount: number;
    emailsDeliveredCount: number;
    emailsFailedCount: number;
    emailsNotRequestedCount: number;
    totalTemplates: number;
    activeTemplates: number;
    deliveryRate: number;
    templateBreakdown: Array<{ name: string; ratio: string; count: number }>;
  }>({
    totalPhotosTaken: 0,
    totalGenerated: 0,
    downloadedCount: 0,
    totalDownloads: 0,
    emailsAcceptedCount: 0,
    emailsDeliveredCount: 0,
    emailsFailedCount: 0,
    emailsNotRequestedCount: 0,
    totalTemplates: 0,
    activeTemplates: 0,
    deliveryRate: 100,
    templateBreakdown: [],
  });

  const loadData = useCallback(async () => {
    try {
      const [tmpls, cats, phs, st] = await Promise.all([
        getTemplates(currentEvent.id),
        getCategories(currentEvent.id),
        getPhotos(currentEvent.id),
        getEventStats(currentEvent.id),
      ]);
      setTemplates(tmpls);
      setCategories(cats);
      setPhotos(phs);
      setStats(st);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    }
  }, [currentEvent.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="flex-1 flex flex-col bg-[#FAFAF7] text-[#17201B] min-h-screen">
      {/* Top Bar: Brand | Clean Navigation Links | Actions */}
      <header className="sticky top-0 z-30 bg-[#FFFFFF] border-b border-[#E5E9E6] px-4 sm:px-6 py-3 flex items-center justify-between">
        {/* Brand with Official Logo */}
        <div className="flex items-center gap-3">
          <RiwaqLogo variant="horizontal" size="sm" showSubtitle={true} />
          <span className="text-[11px] text-[#66706A] font-medium hidden md:inline px-2 py-0.5 rounded-md bg-[#FAFAF7] border border-[#E5E9E6]">
            Admin Control
          </span>
        </div>

        {/* Clean text navigation tabs with underline */}
        <nav className="flex items-center gap-6">
          <button
            onClick={() => setActiveTab('templates')}
            className={`min-h-[40px] text-xs font-medium relative transition-colors ${
              activeTab === 'templates'
                ? 'text-[#006B3C] font-semibold'
                : 'text-[#66706A] hover:text-[#17201B]'
            }`}
          >
            <span>Templates</span>
            {activeTab === 'templates' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#006B3C] rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('photos')}
            className={`min-h-[40px] text-xs font-medium relative transition-colors ${
              activeTab === 'photos'
                ? 'text-[#006B3C] font-semibold'
                : 'text-[#66706A] hover:text-[#17201B]'
            }`}
          >
            <span>Photos ({stats.totalGenerated})</span>
            {activeTab === 'photos' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#006B3C] rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`min-h-[40px] text-xs font-medium relative transition-colors ${
              activeTab === 'settings'
                ? 'text-[#006B3C] font-semibold'
                : 'text-[#66706A] hover:text-[#17201B]'
            }`}
          >
            <span>Settings</span>
            {activeTab === 'settings' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#006B3C] rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`min-h-[40px] text-xs font-medium relative transition-colors flex items-center gap-1 ${
              activeTab === 'audit'
                ? 'text-[#006B3C] font-semibold'
                : 'text-[#66706A] hover:text-[#17201B]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#C9A227]" />
            <span>QA Audit</span>
            {activeTab === 'audit' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#006B3C] rounded-full" />
            )}
          </button>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.dispatchEvent(new Event('admin_logout'))}
            className="h-10 px-3.5 bg-[#FAFAF7] hover:bg-[#F3F4F1] text-[#66706A] hover:text-[#B42318] border border-[#E5E9E6] text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
            title="Lock Admin Session"
          >
            <Lock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Lock Admin</span>
          </button>

          <button
            onClick={() => onLaunchBooth(true)}
            className="h-10 px-3.5 bg-[#FAFAF7] hover:bg-[#EAF4EE] text-[#17201B] border border-[#E5E9E6] text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors hidden sm:flex"
            title="Launch Fullscreen Kiosk Mode"
          >
            <Maximize2 className="w-3.5 h-3.5 text-[#006B3C]" />
            <span>Kiosk</span>
          </button>

          <button
            onClick={() => onLaunchBooth(false)}
            className="h-10 px-4 bg-[#006B3C] hover:bg-[#004D2C] text-white font-semibold text-xs rounded-xl shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <Camera className="w-4 h-4 stroke-[2]" />
            <span>Open Booth</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Metric Cards - Minimal whitespace + large typography */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#E5E9E6]">
            <span className="text-[11px] font-medium text-[#66706A] uppercase tracking-wider">
              Photos Taken
            </span>
            <div className="text-3xl font-bold text-[#17201B] font-mono tabular-nums mt-1">
              {stats.totalPhotosTaken}
            </div>
            <span className="text-[11px] text-[#66706A]">Total captures</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#E5E9E6]">
            <span className="text-[11px] font-medium text-[#006B3C] uppercase tracking-wider">
              Generated ✓
            </span>
            <div className="text-3xl font-bold text-[#006B3C] font-mono tabular-nums mt-1">
              {stats.totalGenerated}
            </div>
            <span className="text-[11px] text-[#66706A]">{stats.deliveryRate}% delivery rate</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#E5E9E6]">
            <span className="text-[11px] font-medium text-[#66706A] uppercase tracking-wider">
              Downloads
            </span>
            <div className="text-3xl font-bold text-[#17201B] font-mono tabular-nums mt-1">
              {stats.downloadedCount}
            </div>
            <span className="text-[11px] text-[#66706A]">
              {stats.totalDownloads} total saves via QR & page
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#E5E9E6]">
            <span className="text-[11px] font-medium text-[#66706A] uppercase tracking-wider">
              Emails Accepted
            </span>
            <div className="text-3xl font-bold text-[#17201B] font-mono tabular-nums mt-1">
              {stats.emailsAcceptedCount}
            </div>
            <span className="text-[11px] text-[#66706A]">
              {stats.emailsFailedCount > 0 ? `${stats.emailsFailedCount} failed` : 'Accepted by provider'}
            </span>
          </div>
        </div>

        {/* Templates Used Breakdown */}
        {stats.templateBreakdown.length > 0 && activeTab !== 'audit' && (
          <div className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#E5E9E6] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-[#17201B] uppercase tracking-wider">
                Templates Used
              </h3>
              <span className="text-[11px] text-[#66706A]">
                {stats.activeTemplates} active of {stats.totalTemplates} configured
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {stats.templateBreakdown.map((t) => (
                <div
                  key={t.name}
                  className="p-3 rounded-xl bg-[#FAFAF7] border border-[#E5E9E6] flex items-center justify-between"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-semibold text-[#17201B] truncate">{t.name}</p>
                    <p className="text-[10px] text-[#66706A]">{t.ratio}</p>
                  </div>
                  <span className="text-sm font-bold font-mono text-[#006B3C] px-2 py-0.5 bg-[#EAF4EE] rounded-lg shrink-0">
                    {t.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab Content */}
        <div className="bg-[#FFFFFF] rounded-2xl border border-[#E5E9E6] p-4 sm:p-6">
          {activeTab === 'templates' && (
            <TemplateManager
              eventId={currentEvent.id}
              eventName={currentEvent.name}
              templates={templates}
              categories={categories}
              onRefresh={loadData}
            />
          )}

          {activeTab === 'photos' && (
            <PhotoHistory
              photos={photos}
              eventName={currentEvent.name}
              onRefresh={loadData}
            />
          )}

          {activeTab === 'settings' && (
            <EventSettings
              currentEvent={currentEvent}
              allEvents={allEvents}
              templates={templates}
              categories={categories}
              onSelectEvent={onSelectEvent}
              onRefresh={loadData}
            />
          )}

          {activeTab === 'audit' && (
            <QAAuditSuite
              currentEvent={currentEvent}
              templates={templates}
              onRefresh={loadData}
            />
          )}
        </div>
      </main>
    </div>
  );
};
