<!-- author: Bob -->
<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import {
  AI_PROVIDER_PRESETS,
  findAiProviderPreset,
} from '@/config/aiProviderMode'
import { testByokConnection } from '@/services/aiOptimizeRouterService'
import { useAiConfigStore, type TokenStorageScope } from '@/stores/aiConfig'

const store = useAiConfigStore()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const providerPreset = ref(store.providerPreset || 'deepseek')
const apiUrl = ref(store.apiUrl)
const apiToken = ref(store.apiToken)
const modelName = ref(store.modelName)
const tokenStorageScope = ref<TokenStorageScope>(store.tokenStorageScope)
const useCorsProxy = ref(store.useCorsProxy)

const showToken = ref(false)
const testing = ref(false)
const testFeedback = ref('')
const testOk = ref(false)
const discoveredModels = ref<string[]>([])
let testAbortController: AbortController | null = null

const activePreset = computed(() => findAiProviderPreset(providerPreset.value))
const modelSuggestions = computed(() => {
  const merged = new Set<string>([
    ...discoveredModels.value,
    ...(activePreset.value?.suggestedModels ?? []),
  ])
  return Array.from(merged)
})

function abortActiveTest() {
  if (!testAbortController) return
  testAbortController.abort()
  testAbortController = null
  testing.value = false
}

onUnmounted(() => {
  abortActiveTest()
})

function handlePresetChange() {
  const preset = findAiProviderPreset(providerPreset.value)
  if (!preset) return
  if (preset.baseUrl) {
    apiUrl.value = preset.baseUrl
  }
  if (preset.defaultModel) {
    modelName.value = preset.defaultModel
  }
  if (preset.id === 'custom') {
    useCorsProxy.value = false
  }
  discoveredModels.value = []
  testFeedback.value = ''
}

function selectSuggestedModel(name: string) {
  modelName.value = name
}

async function handleTestConnection() {
  abortActiveTest()
  const controller = new AbortController()
  testAbortController = controller
  testing.value = true
  testFeedback.value = ''
  testOk.value = false
  try {
    const result = await testByokConnection(
      {
        apiUrl: apiUrl.value,
        apiToken: apiToken.value,
        modelName: modelName.value,
        useCorsProxy: useCorsProxy.value,
        proxyPath: store.corsProxyPath,
      },
      controller.signal,
    )
    if (controller.signal.aborted) return
    testOk.value = result.ok
    testFeedback.value = result.message
    if (result.discoveredModels.length > 0) {
      discoveredModels.value = result.discoveredModels
      if (!modelName.value.trim()) {
        modelName.value = result.discoveredModels[0] ?? ''
      }
    }
  } finally {
    if (testAbortController === controller) {
      testAbortController = null
      testing.value = false
    }
  }
}

function handleClearKey() {
  abortActiveTest()
  store.clearConfig()
  providerPreset.value = store.providerPreset
  apiUrl.value = store.apiUrl
  apiToken.value = ''
  modelName.value = store.modelName
  tokenStorageScope.value = store.tokenStorageScope
  useCorsProxy.value = store.useCorsProxy
  discoveredModels.value = []
  testFeedback.value = '已清除本地保存的 API Key 与配置。'
  testOk.value = true
}

function handleSave() {
  abortActiveTest()
  store.updateConfig({
    providerPreset: providerPreset.value,
    apiUrl: apiUrl.value,
    apiToken: apiToken.value,
    modelName: modelName.value,
    tokenStorageScope: tokenStorageScope.value,
    useCorsProxy: useCorsProxy.value,
  })
  emit('close')
}

function handleCancel() {
  abortActiveTest()
  emit('close')
}
</script>

<template>
  <teleport to="body">
    <div class="dialog-overlay" role="dialog" aria-modal="true" aria-label="AI 模型配置" @click.self="handleCancel">
      <div class="dialog-card">
        <div class="dialog-header">
          <h3 class="dialog-title">
            <svg class="dialog-title-icon" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            AI 模型配置
          </h3>
          <button class="dialog-close" type="button" aria-label="关闭" @click="handleCancel">
            <svg class="icon-sm" viewBox="0 0 24 24"><path d="M18 6L6 18" /><path d="M6 6l12 12" /></svg>
          </button>
        </div>

        <p class="dialog-desc">
          纯前端部署支持直接填写您的 OpenAI 兼容 API Key、接口 URL 与模型名。密钥仅保存在本地浏览器，不上传业务数据库。
        </p>

        <div class="dialog-body">
          <div class="form-group">
            <label class="form-label" for="ai-provider-preset">模型服务商预设</label>
            <select id="ai-provider-preset" v-model="providerPreset" class="form-control" @change="handlePresetChange">
              <option v-for="preset in AI_PROVIDER_PRESETS" :key="preset.id" :value="preset.id">
                {{ preset.label }}
              </option>
            </select>
            <span v-if="activePreset?.hint" class="form-hint">{{ activePreset.hint }}</span>
          </div>

          <div class="form-group">
            <label class="form-label" for="ai-base-url">接口 Base URL</label>
            <input
              id="ai-base-url"
              v-model="apiUrl"
              class="form-control"
              type="url"
              placeholder="例如：https://api.deepseek.com"
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="ai-api-token">API Key</label>
            <div class="token-input-row">
              <input
                id="ai-api-token"
                v-model="apiToken"
                class="form-control"
                :type="showToken ? 'text' : 'password'"
                autocomplete="off"
                placeholder="sk-..."
              />
              <button class="btn-inline" type="button" @click="showToken = !showToken">
                {{ showToken ? '隐藏' : '显示' }}
              </button>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="ai-model-name">模型名称</label>
            <input
              id="ai-model-name"
              v-model="modelName"
              class="form-control"
              list="ai-model-suggestions"
              placeholder="例如：deepseek-chat / qwen-plus / gpt-4o-mini"
            />
            <datalist id="ai-model-suggestions">
              <option v-for="m in modelSuggestions" :key="m" :value="m" />
            </datalist>
            <div v-if="modelSuggestions.length > 0" class="model-chips">
              <button
                v-for="m in modelSuggestions.slice(0, 6)"
                :key="m"
                type="button"
                class="model-chip"
                :class="{ active: modelName.trim() === m }"
                @click="selectSuggestedModel(m)"
              >
                {{ m }}
              </button>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">密钥保存策略与跨域</label>
            <div class="scope-row">
              <label class="radio-pill">
                <input v-model="tokenStorageScope" type="radio" value="local" />
                <span>本机浏览器记住</span>
              </label>
              <label class="radio-pill">
                <input v-model="tokenStorageScope" type="radio" value="session" />
                <span>仅本次会话（关网页即清空）</span>
              </label>
            </div>
            <label class="switch-row">
              <input v-model="useCorsProxy" type="checkbox" />
              <span>通过同源 Cloudflare 边缘代理转发（解决中转站跨域 CORS）</span>
            </label>
          </div>

          <div class="test-row">
            <button class="btn-test" type="button" :disabled="testing" @click="handleTestConnection">
              {{ testing ? '测试中...' : '测试连接 / 拉取模型' }}
            </button>
            <button class="btn-clear" type="button" @click="handleClearKey">清空本地密钥</button>
          </div>

          <p v-if="testFeedback" class="test-feedback" :class="testOk ? 'ok' : 'err'">
            {{ testFeedback }}
          </p>
        </div>

        <div class="dialog-footer">
          <button class="btn-cancel" type="button" @click="handleCancel">取消</button>
          <button class="btn-save" type="button" @click="handleSave">保存配置</button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: var(--color-bg-overlay);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-3);
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.dialog-card {
  background: var(--color-bg-panel);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-lg);
  width: 520px;
  max-width: 100%;
  max-height: 90dvh;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px 0;
}

.dialog-title {
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
}

.dialog-title-icon {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: var(--color-brand);
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
  flex-shrink: 0;
}

.icon-sm {
  width: 15px;
  height: 15px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.dialog-close {
  width: 32px;
  height: 32px;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-subtle);
  color: var(--color-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dialog-close:hover {
  border-color: var(--color-brand);
  background: var(--color-brand-subtle);
  color: var(--color-brand);
}

.dialog-desc {
  padding: 8px 20px 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  line-height: 1.55;
}

.dialog-body {
  padding: 14px 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--color-text-primary);
}

.form-control {
  width: 100%;
  min-width: 0;
  height: 38px;
  padding: 0 12px;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-panel);
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
}

.form-control:focus {
  outline: none;
  border-color: var(--color-border-focus);
  box-shadow: 0 0 0 3px var(--state-focus-ring);
}

.token-input-row {
  display: flex;
  gap: 8px;
}

.btn-inline {
  min-width: 58px;
  height: 38px;
  padding: 0 12px;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-subtle);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: 600;
  cursor: pointer;
}

.form-hint {
  font-size: 11px;
  color: var(--color-text-tertiary);
  line-height: 1.45;
}

.model-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.model-chip {
  height: 26px;
  padding: 0 10px;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border-default);
  background: var(--color-bg-subtle);
  color: var(--color-text-secondary);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}

.model-chip.active {
  border-color: var(--color-brand);
  background: var(--color-brand-subtle);
  color: var(--color-brand-text);
}

.scope-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.radio-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-default);
  background: var(--color-bg-subtle);
  font-size: var(--font-size-xs);
  color: var(--color-text-primary);
  cursor: pointer;
}

.switch-row {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  user-select: none;
  cursor: pointer;
}

.switch-row input[type='checkbox'] {
  width: 15px;
  height: 15px;
  accent-color: var(--color-brand);
}

.test-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn-test,
.btn-clear {
  height: 34px;
  padding: 0 12px;
  border-radius: var(--radius-md);
  font-size: var(--font-size-xs);
  font-weight: 600;
  cursor: pointer;
}

.btn-test {
  border: 1px solid var(--color-brand);
  background: var(--color-brand-subtle);
  color: var(--color-brand-text);
}

.btn-test:disabled {
  opacity: 0.6;
  cursor: wait;
}

.btn-clear {
  border: 1px solid var(--color-border-default);
  background: var(--color-bg-panel);
  color: var(--color-danger);
}

.test-feedback {
  padding: 8px 12px;
  border-radius: var(--radius-md);
  font-size: var(--font-size-xs);
  font-weight: 600;
  line-height: 1.5;
}

.test-feedback.ok {
  background: var(--color-success-subtle);
  color: var(--color-success);
}

.test-feedback.err {
  background: var(--color-danger-subtle);
  color: var(--color-danger);
}

.dialog-footer {
  padding: 12px 20px 16px;
  border-top: 1px solid var(--color-border-subtle);
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn-cancel {
  height: 38px;
  padding: 0 18px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-default);
  background: var(--color-bg-panel);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  font-weight: 600;
  cursor: pointer;
}

.btn-save {
  height: 38px;
  padding: 0 20px;
  border-radius: var(--radius-md);
  border: none;
  background: var(--color-brand);
  color: var(--color-text-inverse);
  font-size: var(--font-size-sm);
  font-weight: 600;
  cursor: pointer;
}

.btn-save:hover {
  background: var(--color-brand-hover);
}
</style>
