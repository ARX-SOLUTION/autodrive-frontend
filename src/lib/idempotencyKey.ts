// Idempotency keys travel to the backend as UUID columns, so the value must be
// UUID-shaped even when the CSPRNG is unavailable.
//
// `crypto.randomUUID` is `[SecureContext]`: on plain http over a LAN address
// (dev server binds `host: '::'`) it is undefined, and an unguarded call threw
// during render and took the whole route down. The fallback is not
// cryptographic — these keys only need to be unique per submit attempt, not
// unguessable.
export const newRequestId = (): string => {
  const random = globalThis.crypto?.randomUUID;
  if (random) return random.call(globalThis.crypto);
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const rand = Math.floor(Math.random() * 16);
    const value = char === 'x' ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
};
