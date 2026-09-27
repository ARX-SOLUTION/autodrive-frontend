export const requiredSlots = [
  'front',
  'back',
  'left',
  'right',
  'odometer',
] as const;
export const inspectionManager = (role?: string) =>
  role === 'owner' || role === 'manager';
export const canSubmitInspection = (
  slots: string[],
  role?: string,
  reason = '',
) =>
  requiredSlots.every((slot) => slots.includes(slot)) ||
  (inspectionManager(role) && reason.trim().length > 0);
export const canReviewInspection = (
  row: { status: string; author_id: string; receiver_id: string },
  role?: string,
  id?: string,
) =>
  row.status === 'submitted' &&
  (inspectionManager(role) ||
    (role === 'teacher' && id === row.receiver_id && id !== row.author_id));
