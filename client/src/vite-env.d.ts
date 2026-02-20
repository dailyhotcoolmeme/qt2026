/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_VERSE_CARD_IMAGE_PRESETS?: string;
  readonly VITE_R2_PUBLIC_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}