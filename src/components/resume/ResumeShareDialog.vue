<!-- author: Bob -->
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { CloudflareShareUnavailableError } from '@/api/cloudflareShareApi'
import { copyTextToClipboard } from '@/services/clipboardService'
import {
  getLocalCloudflareShare,
  publishLocalCloudflareShare,
  revokeLocalCloudflareShare,
  type LocalCloudflareShareRecord,
} from '@/services/localResumeShareService'
import { encodeOfflineSharePayload } from '@/services/offlineShareService'
import { useResumeStore } from '@/stores/resume'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const store = useResumeStore()

const activeLocalTab = ref<'cloudflare' | 'offline'>('cloudflare')
const ttlDays = ref<number>(30)
const stripLargeAvatar = ref(true)
const loading = ref(false)
const revoking = ref(false)
const statusText = ref('')
const statusType = ref<'success' | 'warning' | 'error' | ''>('')
const shareUrlInput = ref('')
const offlineLengthTip = ref('')
const localRecord = ref<LocalCloudflareShareRecord | null>(null)
const cloudflareUnavailableHint = ref('')

const isRemoteMode = computed(() => store.resolvedStorageKind === 'remote')
const currentDocSnapshot = computed(() => store.snapshotCurrentResumeForShare())

function closeDialog() {
  emit('update:modelValue', false)
}

function syncInitialState() {
  statusText.value = ''
  statusType.value = ''
  cloudflareUnavailableHint.value = ''
  offlineLengthTip.value = ''
  if (isRemoteMode.value) {
    shareUrlInput.value = store.currentResumeShare?.shareUrl ?? ''
    return
  }
  const existing = getLocalCloudflareShare(currentDocSnapshot.value.documentId)
  localRecord.value = existing
  if (existing) {
    ttlDays.value = existing.ttlDays
    shareUrlInput.value = activeLocalTab.value === 'cloudflare' ? existing.shareUrl : ''
  } else {
    ttlDays.value = 30
    shareUrlInput.value = ''
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) syncInitialState()
  },
)

watch(activeLocalTab, () => {
  statusText.value = ''
  statusType.value = ''
  if (activeLocalTab.value === 'cloudflare') {
    shareUrlInput.value = localRecord.value?.shareUrl ?? ''
    offlineLengthTip.value = ''
  } else {
    shareUrlInput.value = ''
  }
})

async function tryCopyUrl(url: string, successLabel: string) {
  try {
    await copyTextToClipboard(url)
    statusText.value = successLabel
    statusType.value = 'success'
  } catch {
    statusText.value = '链接已生成，如未自动复制请点击输入框手工复制。'
    statusType.value = 'warning'
  }
}

async function handleRemoteShare() {
  if (loading.value) return
  loading.value = true
  statusText.value = ''
  try {
    const info = await store.shareCurrentResume()
    if (!info) {
      statusText.value = '分享链接生成失败，请检查简历保存状态。'
      statusType.value = 'error'
      return
    }
    shareUrlInput.value = info.shareUrl
    await tryCopyUrl(info.shareUrl, '分享链接已生成并复制到剪贴板')
  } catch (err) {
    statusText.value = err instanceof Error ? err.message : '分享链接生成失败'
    statusType.value = 'error'
  } finally {
    loading.value = false
  }
}

async function handlePublishCloudflareShare() {
  if (loading.value) return
  loading.value = true
  statusText.value = ''
  cloudflareUnavailableHint.value = ''
  try {
    await store.saveToStorage('manual')
    const snap = store.snapshotCurrentResumeForShare()
    const record = await publishLocalCloudflareShare({
      documentId: snap.documentId,
      title: snap.title,
      content: snap.content,
      version: snap.version,
      ttlDays: ttlDays.value,
    })
    localRecord.value = record
    shareUrlInput.value = record.shareUrl
    await tryCopyUrl(record.shareUrl, '短链已发布并复制到剪贴板')
  } catch (err) {
    if (err instanceof CloudflareShareUnavailableError) {
      cloudflareUnavailableHint.value = err.message
      statusText.value = '当前环境未开启 KV 短链服务，建议切换右侧“离线压缩链接”。'
      statusType.value = 'warning'
    } else {
      statusText.value = err instanceof Error ? err.message : '云端短链发布失败'
      statusType.value = 'error'
    }
  } finally {
    loading.value = false
  }
}

async function handleRevokeCloudflareShare() {
  if (revoking.value || !localRecord.value) return
  revoking.value = true
  statusText.value = ''
  try {
    await revokeLocalCloudflareShare(currentDocSnapshot.value.documentId)
    localRecord.value = null
    shareUrlInput.value = ''
    statusText.value = '已撤回该云端短链，原链接将立即失效。'
    statusType.value = 'success'
  } catch (err) {
    statusText.value = err instanceof Error ? err.message : '撤回失败'
    statusType.value = 'error'
  } finally {
    revoking.value = false
  }
}

async function handleGenerateOfflineShare() {
  if (loading.value) return
  loading.value = true
  statusText.value = ''
  try {
    const snap = store.snapshotCurrentResumeForShare()
    const result = await encodeOfflineSharePayload(
      {
        title: snap.title,
        content: snap.content,
        updatedAt: snap.updatedAt,
      },
      { stripLargeAvatar: stripLargeAvatar.value },
    )
    shareUrlInput.value = result.shareUrl
    const parts = [`当前链接共 ${result.urlLength} 字符`]
    if (result.avatarStripped) parts.push('已省略本地大图头像以精简链接')
    if (result.isLongUrl) parts.push('链接偏长，部分聊天软件可能截断，建议改用短链或导出 PDF')
    offlineLengthTip.value = parts.join(' · ')
    await tryCopyUrl(result.shareUrl, '离线压缩分享链接已复制到剪贴板')
  } catch (err) {
    statusText.value = err instanceof Error ? err.message : '生成离线分享链接失败'
    statusType.value = 'error'
  } finally {
    loading.value = false
  }
}

function selectInputText(event: FocusEvent) {
  if (event.target instanceof HTMLInputElement) {
    event.target.select()
  }
}
</script>

<template>
  <teleport to="body">
    <div v-if="props.modelValue" class="share-dialog-overlay" role="dialog" aria-modal="true" aria-label="分享简历" @click.self="closeDialog">
      <div class="share-dialog-card">
        <div class="share-dialog-header">
          <div>
            <h3 class="share-dialog-title">分享当前简历</h3>
            <p class="share-dialog-subtitle">
              {{ isRemoteMode ? '当前连接后端远程存储，生成公开只读链接。' : '本地数据模式支持 Cloudflare 短链或免服务器离线链接。' }}
            </p>
          </div>
          <button class="share-close-btn" type="button" aria-label="关闭" @click="closeDialog">✕</button>
        </div>

        <div class="share-dialog-body">
          <template v-if="isRemoteMode">
            <button class="btn-primary-share" type="button" :disabled="loading" @click="handleRemoteShare">
              {{ loading ? '生成中...' : shareUrlInput ? '刷新并复制分享链接' : '生成分享链接' }}
            </button>
          </template>

          <template v-else>
            <div class="share-tabs" role="tablist">
              <button
                class="share-tab"
                type="button"
                role="tab"
                :aria-selected="activeLocalTab === 'cloudflare'"
                :class="{ active: activeLocalTab === 'cloudflare' }"
                @click="activeLocalTab = 'cloudflare'"
              >
                Cloudflare 短链（推荐）
              </button>
              <button
                class="share-tab"
                type="button"
                role="tab"
                :aria-selected="activeLocalTab === 'offline'"
                :class="{ active: activeLocalTab === 'offline' }"
                @click="activeLocalTab = 'offline'"
              >
                离线压缩链接（免后端）
              </button>
            </div>

            <div v-if="activeLocalTab === 'cloudflare'" class="share-pane">
              <p class="pane-desc">
                上传当前简历明文 JSON 快照至 Cloudflare KV，生成短链并支持随时同步更新或撤回失效。
              </p>

              <div class="ttl-row">
                <label class="ttl-label" for="share-ttl-select">链接有效期</label>
                <select id="share-ttl-select" v-model.number="ttlDays" class="ttl-select">
                  <option :value="7">7 天有效</option>
                  <option :value="30">30 天有效（推荐）</option>
                  <option :value="0">长期有效</option>
                </select>
              </div>

              <div class="action-row">
                <button class="btn-primary-share" type="button" :disabled="loading" @click="handlePublishCloudflareShare">
                  {{ loading ? '发布中...' : localRecord ? '同步最新内容到短链' : '生成短链分享' }}
                </button>
                <button
                  v-if="localRecord"
                  class="btn-danger-share"
                  type="button"
                  :disabled="revoking"
                  @click="handleRevokeCloudflareShare"
                >
                  {{ revoking ? '撤回中...' : '撤回短链' }}
                </button>
              </div>

              <div v-if="cloudflareUnavailableHint" class="fallback-tip">
                <span>{{ cloudflareUnavailableHint }}</span>
                <button class="btn-switch-offline" type="button" @click="activeLocalTab = 'offline'">
                  切到离线压缩链接
                </button>
              </div>
            </div>

            <div v-else class="share-pane">
              <p class="pane-desc">
                不经过任何服务器，直接将简历压缩进 URL Hash，发给对方点击即可在浏览器本地解压渲染。
              </p>
              <label class="checkbox-row">
                <input v-model="stripLargeAvatar" type="checkbox" />
                <span>自动省略本地 Base64 大图头像（大幅缩短链接长度）</span>
              </label>
              <button class="btn-primary-share" type="button" :disabled="loading" @click="handleGenerateOfflineShare">
                {{ loading ? '编码中...' : '生成并复制离线链接' }}
              </button>
              <p v-if="offlineLengthTip" class="length-tip">{{ offlineLengthTip }}</p>
            </div>
          </template>

          <div v-if="shareUrlInput" class="result-url-box">
            <div class="result-url-head">
              <span>当前分享链接</span>
              <button class="btn-copy-url" type="button" @click="tryCopyUrl(shareUrlInput, '链接已复制')">
                复制链接
              </button>
            </div>
            <input
              class="share-url-input"
              type="text"
              readonly
              :value="shareUrlInput"
              @focus="selectInputText"
            />
          </div>

          <p v-if="statusText" class="share-feedback" :class="statusType">
            {{ statusText }}
          </p>
        </div>
      </div>
    </div>
  </teleport>
</template>

<style scoped>
.share-dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: var(--color-bg-overlay);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-3);
}

.share-dialog-card {
  width: 500px;
  max-width: 100%;
  background: var(--color-bg-panel);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.share-dialog-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px 12px;
  border-bottom: 1px solid var(--color-border-subtle);
}

.share-dialog-title {
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--color-text-primary);
}

.share-dialog-subtitle {
  margin-top: 4px;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.share-close-btn {
  width: 32px;
  height: 32px;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-subtle);
  color: var(--color-text-secondary);
  cursor: pointer;
  flex-shrink: 0;
}

.share-dialog-body {
  padding: 16px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.share-tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  padding: 4px;
  border-radius: var(--radius-md);
  background: var(--color-bg-subtle);
  border: 1px solid var(--color-border-subtle);
}

.share-tab {
  min-height: 34px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: 700;
  cursor: pointer;
}

.share-tab.active {
  background: var(--color-bg-panel);
  color: var(--color-brand);
  box-shadow: var(--shadow-xs);
}

.share-pane {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pane-desc {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  line-height: 1.55;
}

.ttl-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.ttl-label {
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--color-text-primary);
}

.ttl-select {
  height: 36px;
  padding: 0 10px;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-panel);
  color: var(--color-text-primary);
  font-size: var(--font-size-xs);
}

.checkbox-row {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  cursor: pointer;
}

.checkbox-row input {
  accent-color: var(--color-brand);
}

.action-row {
  display: flex;
  gap: 8px;
}

.btn-primary-share {
  flex: 1;
  min-height: 40px;
  padding: 0 14px;
  border: none;
  border-radius: var(--radius-md);
  background: var(--color-brand);
  color: var(--color-text-inverse);
  font-size: var(--font-size-sm);
  font-weight: 700;
  cursor: pointer;
}

.btn-primary-share:hover:not(:disabled) {
  background: var(--color-brand-hover);
}

.btn-primary-share:disabled {
  opacity: 0.6;
  cursor: wait;
}

.btn-danger-share {
  min-height: 40px;
  padding: 0 14px;
  border: 1px solid var(--color-danger);
  border-radius: var(--radius-md);
  background: var(--color-danger-subtle);
  color: var(--color-danger);
  font-size: var(--font-size-xs);
  font-weight: 700;
  cursor: pointer;
}

.fallback-tip {
  padding: 10px 12px;
  border-radius: var(--radius-md);
  background: var(--color-warning-subtle);
  color: var(--color-warning);
  font-size: var(--font-size-xs);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.btn-switch-offline {
  align-self: flex-start;
  height: 30px;
  padding: 0 12px;
  border: 1px solid var(--color-warning);
  border-radius: var(--radius-sm);
  background: var(--color-bg-panel);
  color: var(--color-warning);
  font-size: var(--font-size-xs);
  font-weight: 700;
  cursor: pointer;
}

.length-tip {
  font-size: 11px;
  color: var(--color-text-tertiary);
}

.result-url-box {
  padding: 10px 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-default);
  background: var(--color-bg-subtle);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.result-url-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--color-text-primary);
}

.btn-copy-url {
  height: 28px;
  padding: 0 10px;
  border: 1px solid var(--color-brand);
  border-radius: var(--radius-sm);
  background: var(--color-brand-subtle);
  color: var(--color-brand-text);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

.share-url-input {
  width: 100%;
  height: 34px;
  padding: 0 10px;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-sm);
  background: var(--color-bg-panel);
  color: var(--color-text-primary);
  font-size: 12px;
}

.share-feedback {
  padding: 8px 12px;
  border-radius: var(--radius-md);
  font-size: var(--font-size-xs);
  font-weight: 700;
}

.share-feedback.success {
  background: var(--color-success-subtle);
  color: var(--color-success);
}

.share-feedback.warning {
  background: var(--color-warning-subtle);
  color: var(--color-warning);
}

.share-feedback.error {
  background: var(--color-danger-subtle);
  color: var(--color-danger);
}

@media (max-width: 760px) {
  .share-dialog-overlay {
    align-items: flex-end;
    padding: 0;
  }

  .share-dialog-card {
    width: 100vw;
    border-radius: 16px 16px 0 0;
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
}
</style>
