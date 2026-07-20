/**
 * Mobile / iOS helpers for Lancet & Linen.
 */

export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // iPadOS may report as Mac with touch
    (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
  );
}

export function isNarrowScreen(): boolean {
  if (typeof window === 'undefined') return false;
  return Math.min(window.innerWidth, window.innerHeight) < 700;
}

export function isPortrait(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerHeight > window.innerWidth;
}

/** Minimum comfortable touch target (Apple HIG ~44pt) */
export const TOUCH_MIN = 48;

export function installMobileDomGuards(container: HTMLElement): void {
  // Stop rubber-band scroll / pull-to-refresh stealing gestures
  const prevent = (e: Event) => {
    e.preventDefault();
  };
  document.body.addEventListener('touchmove', prevent, { passive: false });
  document.documentElement.addEventListener('touchmove', prevent, { passive: false });

  // Double-tap zoom prevention on container
  let lastTouchEnd = 0;
  container.addEventListener(
    'touchend',
    (e) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) e.preventDefault();
      lastTouchEnd = now;
    },
    { passive: false },
  );

  // Keep visual viewport full on iOS keyboard / notch
  const setVh = () => {
    const h = window.visualViewport?.height ?? window.innerHeight;
    document.documentElement.style.setProperty('--app-height', `${h}px`);
  };
  setVh();
  window.addEventListener('resize', setVh);
  window.visualViewport?.addEventListener('resize', setVh);
  window.addEventListener('orientationchange', () => setTimeout(setVh, 150));
}

/** Preferred button height on touch devices */
export function buttonHeight(desktop = 44): number {
  return isTouchDevice() ? Math.max(desktop, TOUCH_MIN) : desktop;
}

export function buttonWidth(desktop: number): number {
  if (!isTouchDevice()) return desktop;
  // Slightly wider for fat fingers
  return Math.max(desktop, 160);
}
