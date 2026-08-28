import '@testing-library/jest-dom';
import { vi } from 'vitest';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// jsdom has no ResizeObserver; several Radix primitives (Checkbox, Popover
// size measurement, etc.) call it on mount.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserverStub;

// jsdom has no layout engine, so scrollIntoView is unimplemented — cmdk
// (CommandPalette) calls it when an item becomes selected.
window.HTMLElement.prototype.scrollIntoView = () => {};

// GSAP's ScrollTrigger installs a module-level ~34ms sync timer that can fire
// after a test file's environment is torn down, calling requestAnimationFrame
// once it no longer exists — an unhandled ReferenceError that fails the whole
// run even though every test passed (surfaced via BlogPage, whose pass/fail is
// unaffected). jsdom has no layout or scrolling, so the real
// plugin never fires its callbacks here anyway; only .batch/.create are used.
vi.mock('gsap/ScrollTrigger', () => ({
  ScrollTrigger: { batch: () => {}, create: () => {} },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (str: string) => str,
    i18n: {
      changeLanguage: () => new Promise(() => {}),
    },
  }),
  initReactI18next: {
    type: '3rdParty',
    init: () => {},
  },
}));
