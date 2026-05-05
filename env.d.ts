/// <reference types="vite/client" />

// author: Bob

declare const __AI_BACKEND_BASE_URL__: string

interface ImportMetaEnv {
  readonly VITE_APP_FEATURE_MODE?: 'resume-only' | 'full'
  readonly VITE_RESUME_STORAGE_MODE?: 'local' | 'remote' | 'auto'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
