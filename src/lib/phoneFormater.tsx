// --- Uzbekistan phone input & validation (single source of truth) ---
// A valid UZ number is +998 followed by exactly 9 digits (e.g.
// +998 90 123 45 67). We deliberately do NOT enforce the 2-digit operator
// prefix (90/91/93/94/95/97/98/99/33/88/20/...) so new or rare codes are never
// wrongly rejected — length is the reliable invariant.

/** Reduce any input to the 9 local digits (drops an optional 998 country code
 *  and every non-digit), capped at 9 so the mask can't overflow. */
export const uzLocalDigits = (input?: string): string => {
  let d = (input ?? '').replace(/\D/g, '');
  if (d.startsWith('998')) d = d.slice(3);
  return d.slice(0, 9);
};

/** True when the input resolves to exactly 9 local digits. */
export const isValidUzPhone = (input?: string): boolean =>
  uzLocalDigits(input).length === 9;

/** E.164 form for storage/submit: "+998XXXXXXXXX" (empty string if invalid). */
export const uzPhoneE164 = (input?: string): string => {
  const d = uzLocalDigits(input);
  return d.length === 9 ? `+998${d}` : '';
};

/** Masked, human-readable form for a controlled input as the user types:
 *  "+998 90 123 45 67". Always keeps the +998 prefix visible. */
export const formatUzPhoneInput = (input?: string): string => {
  const d = uzLocalDigits(input);
  let out = '+998';
  if (d.length > 0) out += ` ${d.slice(0, 2)}`;
  if (d.length > 2) out += ` ${d.slice(2, 5)}`;
  if (d.length > 5) out += ` ${d.slice(5, 7)}`;
  if (d.length > 7) out += ` ${d.slice(7, 9)}`;
  return out;
};

export const formatPhone = (phone?: string) => {
  if (!phone) return '—';

  let digits = phone.replace(/\D/g, '');

  // If starts with 998 and has more than 12 digits, strip the leading 998
  if (digits.startsWith('998') && digits.length > 12) {
    digits = digits.slice(3);
  }

  // Standard case: starts with 998 and exactly 12 digits
  if (digits.startsWith('998') && digits.length === 12) {
    digits = digits.slice(3);
  }

  // Expect 9 local digits after normalization
  if (digits.length === 9) {
    return `+998${digits.slice(0, 2)}${digits.slice(2, 5)}${digits.slice(5, 7)}${digits.slice(7, 9)}`;
  }

  return phone;
};
