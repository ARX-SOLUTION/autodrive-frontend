/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_YM_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  ym: ((id: number, action: string, ...args: unknown[]) => void) & {
    a?: unknown[][];
    l?: number;
  };
}
