import { useState } from 'react';

const EXIT_MS = 150;

/**
 * Gives a div-based dialog a real exit transition instead of unmounting
 * instantly on close. Exit is faster than the ~200ms entry (asymmetric
 * timing: deliberate in, snappy out) and skips the delay entirely under
 * `prefers-reduced-motion`.
 *
 * Usage: spread `dialogExitProps` onto the backdrop/panel `className`
 * (append `leaving ? 'exit classes' : ''`), and call `close(onClose)`
 * instead of `onClose` directly from every dismiss path.
 */
export const useDialogExit = () => {
  const [leaving, setLeaving] = useState(false);

  const close = (onClose: () => void) => {
    if (leaving) return;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      onClose();
      return;
    }
    setLeaving(true);
    setTimeout(onClose, EXIT_MS);
  };

  return { leaving, close };
};
