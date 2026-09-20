/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FLEET_MAP_TILE_URL?: string;
  readonly VITE_FLEET_MAP_TILE_ATTRIBUTION?: string;
  readonly VITE_UMAMI_SRC?: string;
  readonly VITE_UMAMI_WEBSITE_ID?: string;
}

interface Window {
  umami?: {
    track: (event: string, data?: Record<string, unknown>) => void;
  };
}
