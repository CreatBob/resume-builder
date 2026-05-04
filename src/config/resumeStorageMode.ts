// author: Bob
export type ResumeStorageMode = 'local' | 'remote' | 'auto'

const RESUME_STORAGE_MODE_VALUES = new Set<ResumeStorageMode>(['local', 'remote', 'auto'])

export function getResumeStorageMode(): ResumeStorageMode {
  const mode = import.meta.env.VITE_RESUME_STORAGE_MODE
  return RESUME_STORAGE_MODE_VALUES.has(mode as ResumeStorageMode) ? (mode as ResumeStorageMode) : 'auto'
}
