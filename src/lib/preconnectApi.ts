const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

let started = false;

/** Start the API handshake only once a request is about to be made. */
export const preconnectApi = () => {
  if (started || typeof document === 'undefined') return;

  let origin: string;
  try {
    origin = new URL(API_BASE_URL).origin;
  } catch {
    return;
  }

  started = true;
  const link = document.createElement('link');
  link.rel = 'preconnect';
  link.href = origin;
  link.crossOrigin = 'anonymous';
  document.head.appendChild(link);
};
