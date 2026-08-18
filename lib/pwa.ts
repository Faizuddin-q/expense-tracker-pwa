/** Client-side PWA / platform helpers. */

export type PwaPlatform = 'ios' | 'android' | 'desktop';

export const getPwaPlatform = (): PwaPlatform => {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) {
    return 'ios';
  }
  return 'desktop';
};

export const isPwaInstalled = (): boolean => {
  if (typeof window === 'undefined') return false;
  const standaloneMq = window.matchMedia('(display-mode: standalone)').matches;
  const iosStandalone =
    'standalone' in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return standaloneMq || iosStandalone;
};
