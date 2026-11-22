// author: Bob
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getAiProxyPath } from '@/config/aiProviderMode'

export type AiChannelPreference = 'auto' | 'backend' | 'byok'
export type TokenStorageScope = 'session' | 'local'

export interface AiConfig {
  providerPreset: string
  apiUrl: string
  apiToken: string
  modelName: string
  preferredChannel: AiChannelPreference
  tokenStorageScope: TokenStorageScope
  useCorsProxy: boolean
  useBackendSpeech: boolean
  backendSpeechAutoDisabled: boolean
}

const STORAGE_KEY = 'resume-builder-ai-config'
const SESSION_TOKEN_KEY = 'resume-builder-ai-session-token'

export const useAiConfigStore = defineStore('aiConfig', () => {
  const providerPreset = ref('deepseek')
  const apiUrl = ref('https://api.deepseek.com')
  const apiToken = ref('')
  const modelName = ref('deepseek-chat')
  const preferredChannel = ref<AiChannelPreference>('auto')
  const tokenStorageScope = ref<TokenStorageScope>('local')
  const useCorsProxy = ref(false)
  const useBackendSpeech = ref(true)
  const backendSpeechAutoDisabled = ref(false)

  const isConfigured = computed(
    () => apiUrl.value.trim() !== '' && apiToken.value.trim() !== '' && modelName.value.trim() !== '',
  )
  const shouldRequestBackendSpeech = computed(
    () => useBackendSpeech.value && !backendSpeechAutoDisabled.value,
  )

  function loadFromStorage() {
    const raw = localStorage.getItem(STORAGE_KEY)
    const sessionToken = sessionStorage.getItem(SESSION_TOKEN_KEY) ?? ''
    if (!raw) {
      if (sessionToken) apiToken.value = sessionToken
      return
    }
    try {
      const data = JSON.parse(raw) as Partial<AiConfig>
      if (typeof data.providerPreset === 'string' && data.providerPreset) {
        providerPreset.value = data.providerPreset
      }
      if (typeof data.apiUrl === 'string') apiUrl.value = data.apiUrl
      if (typeof data.modelName === 'string') modelName.value = data.modelName
      if (
        data.preferredChannel === 'auto'
        || data.preferredChannel === 'backend'
        || data.preferredChannel === 'byok'
      ) {
        preferredChannel.value = data.preferredChannel
      }
      if (data.tokenStorageScope === 'session' || data.tokenStorageScope === 'local') {
        tokenStorageScope.value = data.tokenStorageScope
      }
      if (typeof data.useCorsProxy === 'boolean') useCorsProxy.value = data.useCorsProxy
      if (typeof data.useBackendSpeech === 'boolean') useBackendSpeech.value = data.useBackendSpeech
      if (typeof data.backendSpeechAutoDisabled === 'boolean') {
        backendSpeechAutoDisabled.value = data.backendSpeechAutoDisabled
      }

      if (tokenStorageScope.value === 'session') {
        apiToken.value = sessionToken || (typeof data.apiToken === 'string' ? data.apiToken : '')
      } else {
        apiToken.value = (typeof data.apiToken === 'string' && data.apiToken) || sessionToken
      }
    } catch {
      console.warn('从本地缓存读取 AI 配置失败')
    }
  }

  function saveToStorage() {
    const persistLocalToken = tokenStorageScope.value === 'local'
    const data: AiConfig = {
      providerPreset: providerPreset.value,
      apiUrl: apiUrl.value,
      apiToken: persistLocalToken ? apiToken.value : '',
      modelName: modelName.value,
      preferredChannel: preferredChannel.value,
      tokenStorageScope: tokenStorageScope.value,
      useCorsProxy: useCorsProxy.value,
      useBackendSpeech: useBackendSpeech.value,
      backendSpeechAutoDisabled: backendSpeechAutoDisabled.value,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))

    if (tokenStorageScope.value === 'session') {
      if (apiToken.value) {
        sessionStorage.setItem(SESSION_TOKEN_KEY, apiToken.value)
      } else {
        sessionStorage.removeItem(SESSION_TOKEN_KEY)
      }
    } else {
      sessionStorage.removeItem(SESSION_TOKEN_KEY)
    }
  }

  function updateConfig(
    config: Pick<AiConfig, 'apiUrl' | 'apiToken' | 'modelName'> &
      Partial<Pick<AiConfig, 'providerPreset' | 'preferredChannel' | 'tokenStorageScope' | 'useCorsProxy' | 'useBackendSpeech'>>,
  ) {
    if (typeof config.providerPreset === 'string') providerPreset.value = config.providerPreset
    apiUrl.value = config.apiUrl.trim()
    apiToken.value = config.apiToken.trim()
    modelName.value = config.modelName.trim()
    if (config.preferredChannel) preferredChannel.value = config.preferredChannel
    if (config.tokenStorageScope) tokenStorageScope.value = config.tokenStorageScope
    if (typeof config.useCorsProxy === 'boolean') useCorsProxy.value = config.useCorsProxy
    if (typeof config.useBackendSpeech === 'boolean') {
      useBackendSpeech.value = config.useBackendSpeech
      if (config.useBackendSpeech) {
        backendSpeechAutoDisabled.value = false
      }
    }
    saveToStorage()
  }

  function setUseBackendSpeech(enabled: boolean) {
    useBackendSpeech.value = enabled
    if (enabled) {
      backendSpeechAutoDisabled.value = false
    }
    saveToStorage()
  }

  function markBackendSpeechUnavailable() {
    if (!useBackendSpeech.value) return
    backendSpeechAutoDisabled.value = true
    saveToStorage()
  }

  function clearBackendSpeechUnavailable() {
    backendSpeechAutoDisabled.value = false
    saveToStorage()
  }

  function clearConfig() {
    providerPreset.value = 'deepseek'
    apiUrl.value = 'https://api.deepseek.com'
    apiToken.value = ''
    modelName.value = 'deepseek-chat'
    preferredChannel.value = 'auto'
    tokenStorageScope.value = 'local'
    useCorsProxy.value = false
    useBackendSpeech.value = true
    backendSpeechAutoDisabled.value = false
    localStorage.removeItem(STORAGE_KEY)
    sessionStorage.removeItem(SESSION_TOKEN_KEY)
  }

  loadFromStorage()

  return {
    providerPreset,
    apiUrl,
    apiToken,
    modelName,
    preferredChannel,
    tokenStorageScope,
    useCorsProxy,
    corsProxyPath: computed(() => getAiProxyPath()),
    useBackendSpeech,
    backendSpeechAutoDisabled,
    shouldRequestBackendSpeech,
    isConfigured,
    updateConfig,
    setUseBackendSpeech,
    markBackendSpeechUnavailable,
    clearBackendSpeechUnavailable,
    clearConfig,
  }
})
