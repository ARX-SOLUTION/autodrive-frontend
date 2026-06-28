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
