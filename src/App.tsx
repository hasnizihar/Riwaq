import React, { useState, useEffect, useCallback } from 'react';
import { EventConfig } from './types';
import { getEvents, seedInitialDataIfNeeded } from './services/storage';
import { BoothFlow } from './components/booth/BoothFlow';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminAuthGate } from './components/admin/AdminAuthGate';
import { VisitorPhotoPage } from './components/visitor/VisitorPhotoPage';
import {
  Camera,
  Settings,
  Smartphone,
  Maximize2,
  Minimize2,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import { RiwaqLogo } from './components/common/RiwaqLogo';

export default function App() {
  const [events, setEvents] = useState<EventConfig[]>([]);
  const [activeEvent, setActiveEvent] = useState<EventConfig | null>(null);
  const [currentView, setCurrentView] = useState<'booth' | 'admin' | 'visitor'>('booth');
  const [visitorToken, setVisitorToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [phoneFrameMode, setPhoneFrameMode] = useState(false);
  const [isKioskMode, setIsKioskMode] = useState(false);
  const [eventNotFound, setEventNotFound] = useState(false);

  const parseRoute = useCallback((allEvents: EventConfig[]) => {
    const path = window.location.pathname;

    const urlParams = new URLSearchParams(window.location.search);
    const queryToken = urlParams.get('token') || urlParams.get('photo');
    if (queryToken) {
      setVisitorToken(queryToken);
      setCurrentView('visitor');
      setEventNotFound(false);
      return;
    }

    const photoMatch = path.match(/^\/(?:photo|p)\/([a-zA-Z0-9-_]+)/);
    if (photoMatch) {
      setVisitorToken(photoMatch[1]);
      setCurrentView('visitor');
      setEventNotFound(false);
      return;
    }

    const eventMatch = path.match(/^\/e\/([a-zA-Z0-9-_]+)\/(booth|admin)/);
    if (eventMatch) {
      const slug = eventMatch[1];
      const mode = eventMatch[2] as 'booth' | 'admin';
      const ev = allEvents.find((e) => e.slug.toLowerCase() === slug.toLowerCase());
      if (ev) {
        setActiveEvent(ev);
        setCurrentView(mode);
        setEventNotFound(false);
        return;
      } else {
        // Do not silently fallback to another event for an invalid slug
        setEventNotFound(true);
        return;
      }
    }

    if (path.startsWith('/admin')) {
      setCurrentView('admin');
      setEventNotFound(false);
      if (allEvents.length > 0 && !activeEvent) {
        setActiveEvent(allEvents[0]);
      }
      return;
    }

    if (path.startsWith('/booth')) {
      setCurrentView('booth');
      setEventNotFound(false);
      if (allEvents.length > 0 && !activeEvent) {
        setActiveEvent(allEvents[0]);
      }
      return;
    }

    if (allEvents.length > 0) {
      setActiveEvent(allEvents[0]);
      setCurrentView('booth');
      setEventNotFound(false);
    }
  }, [activeEvent]);

  useEffect(() => {
    async function init() {
      try {
        await seedInitialDataIfNeeded();
        const evList = await getEvents();
        setEvents(evList);
        parseRoute(evList);
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        setIsLoading(false);
      }
    }
    init();

    const handlePopState = () => {
      getEvents().then((evList) => {
        setEvents(evList);
        parseRoute(evList);
      });
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [parseRoute]);

  const navigateTo = (view: 'booth' | 'admin', event?: EventConfig) => {
    const targetEvent = event || activeEvent || events[0];
    if (targetEvent) {
      setActiveEvent(targetEvent);
    }
    setCurrentView(view);

    const slug = targetEvent?.slug || 'riwaq';
    let newPath = '/';
    if (view === 'booth') newPath = `/e/${slug}/booth`;
    else if (view === 'admin') newPath = `/e/${slug}/admin`;

    window.history.pushState({}, '', newPath);
  };

  const toggleKioskMode = () => {
    if (!isKioskMode) {
      setIsKioskMode(true);
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } else {
      setIsKioskMode(false);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  if (eventNotFound) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#FAFAF7] text-[#17201B] p-4 select-none">
        <div className="max-w-sm w-full bg-white border border-[#E5E9E6] rounded-2xl p-6 shadow-sm flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#FEF3F2] text-[#B42318] flex items-center justify-center mb-3">
            <AlertCircle className="w-6 h-6 stroke-[2.2]" />
          </div>
          <h2 className="text-lg font-bold text-[#17201B] font-['Manrope']">
            Event Not Found
          </h2>
          <p className="text-xs text-[#66706A] mt-1.5 mb-5 leading-relaxed">
            The event URL you requested does not exist or may have expired.
          </p>
          <button
            onClick={() => {
              const defaultEv = events[0];
              if (defaultEv) {
                setEventNotFound(false);
                setActiveEvent(defaultEv);
                setCurrentView('booth');
                window.history.pushState({}, '', `/e/${defaultEv.slug}/booth`);
              }
            }}
            className="w-full h-11 rounded-xl bg-[#006B3C] hover:bg-[#004D2C] text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Go to Default Event Booth</span>
          </button>
        </div>
      </div>
    );
  }

  if (isLoading || (!activeEvent && currentView !== 'visitor')) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#FAFAF7] text-[#17201B]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#006B3C] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium text-[#66706A]">Loading Photo Booth...</p>
        </div>
      </div>
    );
  }

  // 1. Attendee Public Photo Page
  if (currentView === 'visitor' && visitorToken) {
    return (
      <VisitorPhotoPage
        token={visitorToken}
        onBackToApp={() => {
          window.history.pushState({}, '', '/');
          setCurrentView('booth');
        }}
      />
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-[#FAFAF7] text-[#17201B] flex flex-col antialiased">
      {/* Top persistent mode switcher on desktop (hidden in Kiosk Mode) */}
      {!isKioskMode && (
        <div className="hidden sm:flex items-center justify-between px-6 py-2.5 bg-[#FFFFFF] border-b border-[#E5E9E6] text-xs text-[#66706A] z-40">
          <div className="flex items-center gap-3">
            <RiwaqLogo variant="horizontal" size="xs" showSubtitle={true} />
            <span className="text-[#E5E9E6]">·</span>
            <span className="font-bold text-[#17201B] uppercase tracking-wider text-[11px] font-['Manrope']">
              {activeEvent?.name}
            </span>
            <span>·</span>
            <span className="font-mono text-[11px] text-[#006B3C]">/e/{activeEvent?.slug}/{currentView}</span>
          </div>

          <div className="flex items-center gap-3">
            {currentView === 'booth' && (
              <button
                onClick={() => setPhoneFrameMode(!phoneFrameMode)}
                className="flex items-center gap-1.5 hover:text-[#17201B] px-2.5 py-1 rounded-lg bg-[#FAFAF7] border border-[#E5E9E6] transition-colors"
                title="Toggle simulated mobile frame"
              >
                <Smartphone className="w-3.5 h-3.5 text-[#006B3C]" />
                <span>{phoneFrameMode ? 'Full Viewport' : 'Mobile Frame'}</span>
              </button>
            )}

            <button
              onClick={toggleKioskMode}
              className="flex items-center gap-1 hover:text-[#17201B] px-2.5 py-1 rounded-lg bg-[#FAFAF7] border border-[#E5E9E6] text-[#006B3C] font-semibold transition-colors"
              title="Enter Fullscreen Kiosk Mode for Stall"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Kiosk</span>
            </button>

            <div className="h-3 w-px bg-[#E5E9E6]" />

            {currentView === 'booth' ? (
              <button
                onClick={() => navigateTo('admin')}
                className="flex items-center gap-1.5 text-[#006B3C] hover:text-[#004D2C] font-semibold"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Admin & Templates</span>
              </button>
            ) : (
              <button
                onClick={() => navigateTo('booth')}
                className="flex items-center gap-1.5 text-[#006B3C] hover:text-[#004D2C] font-semibold"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Open Booth Mode</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Discreet Exit Kiosk Floating Button */}
      {isKioskMode && (
        <button
          onClick={toggleKioskMode}
          className="fixed top-3 right-3 z-50 p-2 rounded-full bg-white/70 hover:bg-white text-[#66706A] hover:text-[#17201B] border border-[#E5E9E6] shadow-sm backdrop-blur-sm transition-all"
          title="Exit Kiosk Mode"
          aria-label="Exit Kiosk Mode"
        >
          <Minimize2 className="w-4 h-4 text-[#006B3C]" />
        </button>
      )}

      {/* Main View Router */}
      {currentView === 'booth' && activeEvent ? (
        <div
          className={`flex-1 flex items-center justify-center ${
            phoneFrameMode && !isKioskMode
              ? 'p-4 sm:p-8 bg-[#FAFAF7]'
              : 'p-0'
          }`}
        >
          {phoneFrameMode && !isKioskMode ? (
            /* Minimal simulated mobile frame container */
            <div className="w-full max-w-[400px] h-[820px] max-h-[92vh] rounded-[36px] p-3 bg-white border border-[#E5E9E6] shadow-xl overflow-hidden flex flex-col relative">
              <div className="w-24 h-3.5 bg-[#E5E9E6] rounded-full mx-auto mb-2" />
              <div className="flex-1 rounded-[24px] overflow-hidden flex flex-col bg-[#FAFAF7] border border-[#E5E9E6]">
                <BoothFlow
                  event={activeEvent}
                  onOpenAdmin={() => navigateTo('admin')}
                  isKioskMode={isKioskMode}
                  onToggleKioskMode={toggleKioskMode}
                />
              </div>
            </div>
          ) : (
            /* True mobile-first 100% viewport experience */
            <div className="w-full h-[100dvh] flex flex-col bg-[#FAFAF7]">
              <BoothFlow
                event={activeEvent}
                onOpenAdmin={() => navigateTo('admin')}
                isKioskMode={isKioskMode}
                onToggleKioskMode={toggleKioskMode}
              />
            </div>
          )}
        </div>
      ) : activeEvent ? (
        <AdminAuthGate onExit={() => navigateTo('booth', activeEvent)}>
          <AdminDashboard
            currentEvent={activeEvent}
            allEvents={events}
            onSelectEvent={(ev) => {
              setActiveEvent(ev);
              navigateTo('admin', ev);
            }}
            onLaunchBooth={(kiosk?: boolean) => {
              if (kiosk) {
                setIsKioskMode(true);
                document.documentElement.requestFullscreen().catch(() => {});
              }
              navigateTo('booth');
            }}
          />
        </AdminAuthGate>
      ) : null}
    </div>
  );
}
