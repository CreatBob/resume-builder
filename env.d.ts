/// <reference types="vite/client" />

declare const __AI_BACKEND_BASE_URL__: string

interface ImportMetaEnv {
  readonly VITE_RESUME_STORAGE_MODE?: 'local' | 'remote'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
