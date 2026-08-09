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

export const BACK_TAP_PREF_KEY = 'pocket-back-tap-pref';

export const getBackTapPref = (): boolean => {
  try {
    return localStorage.getItem(BACK_TAP_PREF_KEY) === '1';
  } catch {
    return false;
  }
};

export const setBackTapPref = (on: boolean): void => {
  try {
    localStorage.setItem(BACK_TAP_PREF_KEY, on ? '1' : '0');
  } catch {
    /* ignore */
  }
};

/**
 * Jump to the closest system Settings screen for back / quick tap.
 * Browsers often block deep prefs URLs — returns whether navigation was attempted.
 */
export const openSystemBackTapSettings = (): boolean => {
  const platform = getPwaPlatform();
  if (typeof window === 'undefined') return false;

  if (platform === 'ios') {
    // Best-effort; iOS frequently ignores prefs: URLs from web content
    const targets = [
      'App-prefs:root=ACCESSIBILITY&path=TOUCH',
      'prefs:root=ACCESSIBILITY&path=TOUCH',
      'App-prefs:ACCESSIBILITY',
    ];
    for (const href of targets) {
      try {
        window.location.href = href;
        return true;
      } catch {
        /* try next */
      }
    }
    return false;
  }

  if (platform === 'android') {
    const intents = [
      // Generic settings — most reliable from Chrome / TWA
      'intent:#Intent;action=android.settings.SETTINGS;end',
      'intent:#Intent;action=android.settings.ACCESSIBILITY_SETTINGS;end',
    ];
    for (const href of intents) {
      try {
        window.location.href = href;
        return true;
      } catch {
        /* try next */
      }
    }
    return false;
  }

  return false;
};
