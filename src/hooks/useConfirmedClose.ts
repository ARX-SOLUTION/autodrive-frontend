import { useState } from 'react';

/**
 * Guards a dialog's close (overlay click, Escape, Cancel button) behind a
 * confirm step when the form has unsaved changes (autodrive-6cq.5.15).
 * Pass `shouldConfirm` = form.formState.isDirty (RHF) — or that OR'd with a
 * pending mutation, if closing mid-submit should also warn.
 *
 * Wire `attemptClose` into the dialog's onOpenChange/Cancel button, and
 * render the existing <ConfirmDialog> using the returned confirm state.
 */
export function useConfirmedClose(shouldConfirm: boolean, onClose: () => void) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const attemptClose = () => {
    if (shouldConfirm) setConfirmOpen(true);
    else onClose();
  };

  const confirmDiscard = () => {
    setConfirmOpen(false);
    onClose();
  };

  const cancelDiscard = () => setConfirmOpen(false);

  return { attemptClose, confirmOpen, confirmDiscard, cancelDiscard };
}
