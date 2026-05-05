// author: Bob
export type AppFeatureMode = 'resume-only' | 'full'

const APP_FEATURE_MODE_VALUES = new Set<AppFeatureMode>(['resume-only', 'full'])

export function getAppFeatureMode(): AppFeatureMode {
  const mode = import.meta.env.VITE_APP_FEATURE_MODE
  return APP_FEATURE_MODE_VALUES.has(mode as AppFeatureMode) ? (mode as AppFeatureMode) : 'resume-only'
}
