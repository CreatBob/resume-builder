// author: jf
export type ResumeStorageMode = 'local' | 'remote'

const RESUME_STORAGE_MODE_VALUES = new Set<ResumeStorageMode>(['local', 'remote'])

export function getResumeStorageMode(): ResumeStorageMode {
  const mode = import.meta.env.VITE_RESUME_STORAGE_MODE
  return RESUME_STORAGE_MODE_VALUES.has(mode as ResumeStorageMode) ? (mode as ResumeStorageMode) : 'local'
}
