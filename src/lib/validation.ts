// Same phone regex StudentModal's zod schema uses (src/components/ui/StudentModal.tsx).
const PHONE_REGEX = /^\+?\d{9,15}$/;

export function isValidPhone(phone: string): boolean {
  return PHONE_REGEX.test(phone.trim());
}

// Requires at least one letter (any script) -- rejects names that are only
// symbols/whitespace, e.g. ".".
export function isValidName(name: string): boolean {
  return /\p{L}/u.test(name.trim());
}
