/// <reference types="vite/client" />

// author: Bob

declare const __AI_BACKEND_BASE_URL__: string

interface ImportMetaEnv {
  readonly VITE_APP_FEATURE_MODE?: 'resume-only' | 'full'
  readonly VITE_RESUME_STORAGE_MODE?: 'local' | 'remote' | 'auto'
  readonly VITE_AI_PROVIDER_MODE?: 'auto' | 'backend' | 'byok'
  readonly VITE_AI_PROXY_PATH?: string
  readonly VITE_CLOUDFLARE_SHARE_API?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
