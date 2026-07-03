// ponytail: NO-OP when VITE_YM_ID unset — dev/preview stays clean
const YM_ID = import.meta.env.VITE_YM_ID ? Number(import.meta.env.VITE_YM_ID) : null;

export function initMetrica(): void {
  if (!YM_ID) return;
  window.ym =
    window.ym ||
    (function (...args: Parameters<typeof window.ym>) {
      (window.ym.a = window.ym.a || []).push(args);
    } as typeof window.ym);
  window.ym.l = Date.now();
  const src = 'https://mc.yandex.ru/metrika/tag.js';
  if (!document.querySelector(`script[src="${src}"]`)) {
    const s = document.createElement('script');
    s.defer = true;
    s.src = src;
    document.head.appendChild(s);
  }
  window.ym(YM_ID, 'init', {
    defer: true,
    clickmap: true,
    trackLinks: true,
    accurateTrackBounce: true,
    webvisor: true,
  });
}

export function ymHit(url: string): void {
  if (!YM_ID || typeof window.ym !== 'function') return;
  window.ym(YM_ID, 'hit', url);
}

export function ymGoal(name: string): void {
  if (!YM_ID || typeof window.ym !== 'function') return;
  window.ym(YM_ID, 'reachGoal', name);
}
