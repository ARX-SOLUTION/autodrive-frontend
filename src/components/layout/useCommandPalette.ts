import { useEffect, useState } from 'react';
import { useCan } from '@/hooks/useCan';

/** Owns open state + binds cmd+k / ctrl+k globally. */
export const useCommandPalette = () => {
  const [open, setOpen] = useState(false);
  const canAccessOperations = useCan('accessOperations');

  useEffect(() => {
    if (!canAccessOperations) {
      return;
    }

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [canAccessOperations]);

  return {
    open: canAccessOperations && open,
    setOpen: (next: boolean) => {
      if (canAccessOperations) setOpen(next);
    },
  };
};
