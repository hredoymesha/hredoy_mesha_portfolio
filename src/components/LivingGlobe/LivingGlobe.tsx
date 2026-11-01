// LivingGlobe — Main React component
// Orchestrates the globe renderer, tab state, and UI

import { useRef, useEffect, useState, useCallback } from 'react';
import { GlobeRenderer, setEarthTexturesAvailable } from './core/GlobeRenderer';
import { CITIES } from './data/cities';
import { GlobeTab, DEFAULT_TAB } from './data/types';
import { dayNightStatus, formatShortTime } from './astronomy/sunPosition';

// Check WebGL support (the 3D library needs WebGL 2)
function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!canvas.getContext('webgl2');
  } catch {
    return false;
  }
}

// Are the real Earth images present? Decided at build time, so the page never requests files that do not exist.
function earthTexturesPresent(): Promise<boolean> {
  return Promise.resolve(__EARTH_TEXTURES__);
}

function statusClass(status: 'day' | 'night' | 'twilight'): string {
  return status === 'day' ? 'st-day' : status === 'night' ? 'st-night' : 'st-twilight';
}

function statusLabel(status: 'day' | 'night' | 'twilight'): string {
  return status === 'day' ? 'Day' : status === 'night' ? 'Night' : 'Twilight';
}

export function LivingGlobe() {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<GlobeRenderer | null>(null);
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const autoRotateTimeoutRef = useRef<number>(0);

  const [activeTab, setActiveTab] = useState<GlobeTab>(DEFAULT_TAB);
  const wheelActiveRef = useRef(false); // mouse-wheel zoom is switched on by clicking the globe
  const hintTimerRef = useRef<number>(0);
  const [wheelHint, setWheelHint] = useState(false);
  const [ready, setReady] = useState(false); // true once the 3D globe exists, so the mouse and touch handlers can attach
  const [currentTime, setCurrentTime] = useState(new Date());
  const [webGLAvailable, setWebGLAvailable] = useState(() => isWebGLAvailable());
  const hintCountRef = useRef(0);
  // The texture credit is shown only when the real Earth images are present (otherwise the globe uses a drawn Earth).
  const [texturesPresent, setTexturesPresent] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void earthTexturesPresent().then((present) => {
      if (!cancelled) setTexturesPresent(present);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Clock update — uses ref-based approach to avoid re-rendering the globe
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      // Update sun direction directly via ref (no React re-render needed)
      globeRef.current?.updateSunDirection(now);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTab]);

  // Initialize globe renderer
  useEffect(() => {
    if (!webGLAvailable || !containerRef.current) return;

    let disposed = false;
    let cleanup: (() => void) | undefined;

    void earthTexturesPresent().then((present) => {
      if (disposed || !containerRef.current) return;
      setEarthTexturesAvailable(present);
        const container = containerRef.current;
        let globe: GlobeRenderer;
        try {
          globe = new GlobeRenderer(container);
        } catch {
          setWebGLAvailable(false); // the graphics card refused: show the plain message instead of an empty box
          return;
        }
        globeRef.current = globe;
        setReady(true);
        const onContextLost = (event: Event) => {
          event.preventDefault();
          setWebGLAvailable(false);
        };
        globe.getCanvas().addEventListener('webglcontextlost', onContextLost);

        // Draw only while the globe is on screen (saves battery and keeps the rest of the page smooth)
        globe.start();
        const visibility = new IntersectionObserver(([entry]) => {
          if (entry?.isIntersecting) globe.start();
          else globe.stop();
        });
        visibility.observe(container);

        // Resize observer
        const resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            const { width, height } = entry.contentRect;
            globe.resize(width, height);
          }
        });
        resizeObserver.observe(container);

        // Pause when page is hidden
        const handleVisibility = () => {
          if (document.hidden) {
            globe.setAutoRotate(false);
          }
        };
        document.addEventListener('visibilitychange', handleVisibility);


      cleanup = () => {
        resizeObserver.disconnect();
        visibility.disconnect();
        document.removeEventListener('visibilitychange', handleVisibility);
        globe.dispose();
        globeRef.current = null;
      };
    });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [webGLAvailable]);

  // Update visualization mode on tab change
  useEffect(() => {
    if (globeRef.current) {
      globeRef.current.setMode(activeTab);
      globeRef.current.updateSunDirection(currentTime);
    }
  }, [activeTab, currentTime]);

  // Mouse/touch interaction handlers
  useEffect(() => {
    if (!webGLAvailable) return;

    const canvas = globeRef.current?.getCanvas();
    if (!canvas) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0 || e.ctrlKey) return; // left button only (a right-click or Ctrl+click must not start a drag)
      wheelActiveRef.current = true;
      setWheelHint(false);
      canvas.focus({ preventScroll: true });
      isDraggingRef.current = true;
      globeRef.current?.setAutoRotate(false);
      if (autoRotateTimeoutRef.current) {
        clearTimeout(autoRotateTimeoutRef.current);
        autoRotateTimeoutRef.current = 0;
      }
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - lastMouseRef.current.x;
      const dy = e.clientY - lastMouseRef.current.y;
      globeRef.current?.rotate(dx, dy);
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    const handleWheel = (e: WheelEvent) => {
      // Plain scrolling keeps scrolling the page, until the visitor clicks the globe (or holds Ctrl / Cmd).
      if (!wheelActiveRef.current && !e.ctrlKey && !e.metaKey) {
        if (hintCountRef.current >= 3) return; // do not nag (or re-announce to screen readers) on every scroll past
        hintCountRef.current += 1;
        setWheelHint(true);
        window.clearTimeout(hintTimerRef.current);
        hintTimerRef.current = window.setTimeout(() => setWheelHint(false), 2600);
        return;
      }
      if (e.deltaY === 0) return; // a sideways swipe is not a zoom
      e.preventDefault();
      if (e.deltaY > 0) {
        globeRef.current?.zoomOut(0.2);
      } else {
        globeRef.current?.zoomIn(0.2);
      }
    };

    // Touch support
    let lastTouchDist = 0;
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDraggingRef.current = true;
        globeRef.current?.setAutoRotate(false);
        if (autoRotateTimeoutRef.current) {
          clearTimeout(autoRotateTimeoutRef.current);
          autoRotateTimeoutRef.current = 0;
        }
        lastMouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastTouchDist = Math.sqrt(dx * dx + dy * dy);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1 && isDraggingRef.current) {
        const dx = e.touches[0].clientX - lastMouseRef.current.x;
        const dy = e.touches[0].clientY - lastMouseRef.current.y;
        // A sideways drag turns the globe; an up or down drag is left alone so the page can scroll.
        if (Math.abs(dx) > Math.abs(dy)) {
          if (e.cancelable) e.preventDefault();
          globeRef.current?.rotate(dx, 0);
        }
        lastMouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2) {
        if (e.cancelable) e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const delta = dist - lastTouchDist; // fingers moving apart = zoom in
        if (delta > 0) {
          globeRef.current?.zoomIn(delta * 0.01);
        } else {
          globeRef.current?.zoomOut(Math.abs(delta) * 0.01);
        }
        lastTouchDist = dist;
      }
    };

    const handleTouchEnd = () => {
      isDraggingRef.current = false;
    };

    const switchWheelOff = () => {
      wheelActiveRef.current = false;
    };
    const stopDrag = () => {
      isDraggingRef.current = false;
    };
    // Keyboard: arrows turn the globe, + and - zoom, 0 resets (also makes the globe reachable without a mouse)
    const handleKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return; // keep browser shortcuts (zoom, Back) working
      const g = globeRef.current;
      if (!g) return;
      const keys: Record<string, () => void> = {
        ArrowLeft: () => g.rotate(-30, 0),
        ArrowRight: () => g.rotate(30, 0),
        ArrowUp: () => g.rotate(0, -30),
        ArrowDown: () => g.rotate(0, 30),
        '+': () => g.zoomIn(0.4),
        '=': () => g.zoomIn(0.4),
        '-': () => g.zoomOut(0.4),
        '0': () => g.resetView()
      };
      const action = keys[e.key];
      if (action) {
        e.preventDefault();
        action();
      }
    };
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Interactive globe showing day and night. Arrow keys turn it, plus and minus zoom, 0 resets.');
    canvas.addEventListener('contextmenu', stopDrag);
    canvas.addEventListener('touchcancel', stopDrag);
    window.addEventListener('blur', stopDrag);
    canvas.addEventListener('mouseleave', switchWheelOff);
    canvas.addEventListener('blur', switchWheelOff);
    canvas.addEventListener('keydown', handleKey);
    canvas.style.touchAction = 'pan-y'; // vertical swipes scroll the page; sideways drags and pinches go to the globe
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('contextmenu', stopDrag);
      canvas.removeEventListener('touchcancel', stopDrag);
      window.removeEventListener('blur', stopDrag);
      canvas.removeEventListener('mouseleave', switchWheelOff);
      canvas.removeEventListener('blur', switchWheelOff);
      canvas.removeEventListener('keydown', handleKey);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      window.clearTimeout(hintTimerRef.current);
      if (autoRotateTimeoutRef.current) {
        clearTimeout(autoRotateTimeoutRef.current);
      }
    };
  }, [webGLAvailable, ready]);

  // Reset view handler
  const handleResetView = useCallback(() => {
    globeRef.current?.resetView();
  }, []);

  // Tab definitions
  const tabs: { id: GlobeTab; label: string }[] = [
    { id: 'living-globe', label: 'Living Globe' },
    { id: 'day-night', label: 'Day & Night' },
  ];

  // Fallback if no WebGL
  if (!webGLAvailable) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-lg font-bold text-[var(--ink)]">The Living Globe</h3>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-8 text-center">
          <h3 className="text-lg font-bold text-[var(--ink)] mb-2">WebGL Not Available</h3>
          <p className="text-sm text-[var(--muted)]">
            The interactive globe requires WebGL support. Please try a different browser or device.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Title */}
      <div>
        <h3 className="text-lg font-bold text-[var(--ink)]">The Living Globe</h3>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Globe view">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            aria-pressed={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-[var(--accent)] text-[var(--on-accent)] shadow-sm'
                : 'bg-[var(--panel-2)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--line)]'
            }`}
          >
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Globe Container */}
      <div
        ref={containerRef}
        className="relative w-full rounded-2xl overflow-hidden border border-[var(--line)] bg-[var(--panel)]"
        style={{ height: 'clamp(300px, 58vw, 480px)', minHeight: '22rem' }}
      >
        {wheelHint && (
          <div role="status" className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 rounded-full bg-[var(--panel)] border border-[var(--line)] px-3.5 py-1.5 text-xs font-semibold text-[var(--ink)] shadow-md pointer-events-none">
            Click the globe to zoom with the mouse wheel
          </div>
        )}

        {/* View controls */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => globeRef.current?.zoomIn(0.5)}
            aria-label="Zoom in"
            className="globe-ctl w-8 h-8 rounded-lg bg-[var(--panel)] border border-[var(--line)] text-base font-bold text-[var(--muted)] hover:text-[var(--ink)] transition-colors cursor-pointer"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => globeRef.current?.zoomOut(0.5)}
            aria-label="Zoom out"
            className="globe-ctl w-8 h-8 rounded-lg bg-[var(--panel)] border border-[var(--line)] text-base font-bold text-[var(--muted)] hover:text-[var(--ink)] transition-colors cursor-pointer"
          >
            −
          </button>
          <button
            type="button"
            onClick={handleResetView}
            aria-label="Reset view"
            className="px-2.5 h-8 rounded-lg bg-[var(--panel)] border border-[var(--line)] text-[11px] font-semibold text-[var(--muted)] hover:text-[var(--ink)] transition-colors cursor-pointer"
          >
            <span aria-hidden="true" className="sm:hidden">↺</span>
            <span className="hidden sm:inline">Reset view</span>
          </button>
        </div>

        {/* Day & Night overlay — show day/night status only */}
        {activeTab === 'day-night' && (
          <div className="absolute left-3 bottom-3 sm:top-3 sm:bottom-auto z-10 max-w-[160px] rounded-xl bg-[var(--panel)] border border-[var(--line)] p-3 space-y-1.5">
            {CITIES.map((city) => {
              const status = dayNightStatus(city.lat, city.lon, currentTime);
              return (
                <div key={city.id} className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[var(--ink)]">{city.name}</span>
                  <span className={`text-[10px] font-bold uppercase ${statusClass(status)}`}>
                    {statusLabel(status)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info Panel below globe */}
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-6">
        {activeTab === 'living-globe' && (
          <div className="space-y-3">
            <div>
              <h4 className="text-base font-bold text-[var(--ink)]">Two Cities, One Globe</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {CITIES.map((city) => (
                <div key={city.id} className="rounded-xl bg-[var(--panel-2)] p-4 border border-[var(--line)]">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`w-3 h-3 rounded-full ${
                        city.id === 'dhaka' ? 'bg-amber-500' : 'bg-blue-500'
                      }`}
                    />
                    <span className="text-sm font-bold text-[var(--ink)]">{city.name}</span>
                  </div>
                  <p className="text-xs text-[var(--faint)] font-mono">
                    {city.lat.toFixed(2)}°N, {city.lon.toFixed(2)}°E
                  </p>
                  <p className="text-xs text-[var(--muted)] mt-1">{city.label}</p>
                  <p className="text-xs text-[var(--ink)] mt-2 font-semibold">
                    Local time {formatShortTime(currentTime, city.timeZone)} · {statusLabel(dayNightStatus(city.lat, city.lon, currentTime))}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'day-night' && (
          <div className="space-y-3">
            <div>
              <h4 className="text-base font-bold text-[var(--ink)]">Day & Night Boundary</h4>
              <p className="text-xs text-[var(--faint)] mt-1">
                The illuminated side of Earth faces the Sun. The dark side is in night.
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm text-[var(--muted)]">
              {CITIES.map((city) => {
                const status = dayNightStatus(city.lat, city.lon, currentTime);
                return (
                  <span key={city.id}>
                    {city.name}:{' '}
                    <span className={`font-semibold ${statusClass(status)}`}>
                      {statusLabel(status)}
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <p className="text-xs text-[var(--faint)]">
        Drag to turn the globe. Click it, then use the mouse wheel to zoom; or use the + and − buttons or the keyboard (arrow keys, + and −). On a phone, drag sideways and pinch. White outlines mark Bangladesh and Finland. Day and night follow the real time.
      </p>
      {texturesPresent && (
        <p className="text-xs text-[var(--faint)]">Textures: Solar System Scope (CC BY 4.0), based on NASA Blue Marble.</p>
      )}
    </div>
  );
}
