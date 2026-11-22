<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import type { SharedResumeDocument } from '@/services/resumeStorageService'
import { type ResumeTemplateDefinition, getResumeTemplateByKey, normalizeResumeTemplateKey } from '@/templates/resume'
import { provideResumeTemplateRuntime } from '@/templates/shared/resumeTemplateRuntime'
import { createResumeTemplateRuntimeFromSharedDocument } from '@/services/resumeTemplateRuntimeService'
import { exportResumePdf } from '@/services/resumePdfExportService'
import { copyTextToClipboard } from '@/services/clipboardService'
import ResumeScaledPreview from '@/components/resume/ResumeScaledPreview.vue'
// author: Bob

const props = withDefaults(
  defineProps<{
    document: SharedResumeDocument
    shareUrl: string
    shareSource?: 'backend' | 'cloudflare' | 'offline'
  }>(),
  {
    shareSource: 'backend',
  },
)

const scaledPreviewRef = ref<{ getPaperElement: () => HTMLElement | null; recalculate: () => void } | null>(null)
const exporting = ref(false)
const exportProgress = ref(0)
const exportProgressText = ref('')
const actionFeedback = ref('')
const actionFeedbackType = ref<'success' | 'error' | ''>('')

const runtime = createResumeTemplateRuntimeFromSharedDocument(props.document)
provideResumeTemplateRuntime(runtime)

const currentTemplate = computed<ResumeTemplateDefinition>(() =>
  getResumeTemplateByKey(normalizeResumeTemplateKey(runtime.store.selectedTemplateKey))
)
const currentTemplateComponent = computed(() => currentTemplate.value.component)
const displayResumeTitle = computed(() => props.document.title || runtime.store.basicInfo.name || '简历预览')
const shareBadgeText = computed(() => {
  if (props.shareSource === 'offline') return '离线快照简历'
  if (props.shareSource === 'cloudflare') return '在线分享简历'
  return '匿名分享简历'
})
const shareHintText = computed(() => {
  if (props.shareSource === 'offline') {
    return '当前链接为纯前端压缩编码快照（仅编码压缩，未加密），数据直接解码自链接本身，不依赖后端服务器。'
  }
  return '当前链接为公开只读分享链接，打开即可查看已保存内容。'
})
const previewWatchKey = computed(() =>
  `${props.document.id}:${props.document.version}:${currentTemplate.value.key}`,
)

let feedbackTimer: ReturnType<typeof window.setTimeout> | null = null

function notifyAction(message: string, type: 'success' | 'error') {
  if (feedbackTimer !== null) {
    window.clearTimeout(feedbackTimer)
    feedbackTimer = null
  }
  actionFeedback.value = message
  actionFeedbackType.value = type
  feedbackTimer = window.setTimeout(() => {
    feedbackTimer = null
    actionFeedback.value = ''
    actionFeedbackType.value = ''
  }, 2400)
}

onUnmounted(() => {
  if (feedbackTimer !== null) {
    window.clearTimeout(feedbackTimer)
    feedbackTimer = null
  }
})

async function setExportProgress(percent: number, text: string) {
  exportProgress.value = Math.max(0, Math.min(100, Math.round(percent)))
  exportProgressText.value = text
}

async function handleDownloadPdf() {
  const paperEl = scaledPreviewRef.value?.getPaperElement()
  if (!paperEl || exporting.value) return
  exporting.value = true
  exportProgress.value = 0
  exportProgressText.value = '准备导出...'
  try {
    await exportResumePdf({
      sourceNode: paperEl,
      filename: `${runtime.store.basicInfo.name || props.document.title || '简历'}_resume.pdf`,
      mode: 'hd',
      onProgress: setExportProgress,
    })
    notifyAction('PDF 下载完成', 'success')
  } catch (error) {
    notifyAction(error instanceof Error ? error.message : 'PDF 下载失败', 'error')
  } finally {
    exporting.value = false
    exportProgress.value = 0
    exportProgressText.value = ''
  }
}

async function handleCopyShareUrl() {
  try {
    await copyTextToClipboard(props.shareUrl)
    notifyAction('分享链接已复制', 'success')
  } catch (error) {
    notifyAction(error instanceof Error ? error.message : '复制分享链接失败', 'error')
  }
}

function handleBackHome() {
  window.location.href = '/'
}
</script>

<template>
  <div class="shared-resume-page">
    <div class="shared-resume-shell">
      <section class="shared-resume-main">
        <div class="shared-resume-head">
          <div>
            <p class="shared-kicker">{{ shareBadgeText }}</p>
            <h1 class="shared-mobile-title">{{ displayResumeTitle }}</h1>
            <p class="shared-head-desc">在线查看这份公开分享的简历内容。</p>
          </div>
          <div class="shared-meta">
            <span class="shared-chip">模板 · {{ currentTemplate.name }}</span>
            <span class="shared-chip">最近更新 · {{ document.updatedAt || '刚刚' }}</span>
          </div>
        </div>

        <div v-if="actionFeedback" class="shared-feedback mobile-only-feedback" :class="actionFeedbackType">
          {{ actionFeedback }}
        </div>

        <div v-if="exporting" class="shared-progress mobile-only-progress">
          <div class="shared-progress-head">
            <span>{{ exportProgressText || '导出中...' }}</span>
            <strong>{{ exportProgress }}%</strong>
          </div>
          <div class="shared-progress-track">
            <span class="shared-progress-fill" :style="{ width: `${exportProgress}%` }"></span>
          </div>
        </div>

        <div class="shared-paper-board">
          <ResumeScaledPreview ref="scaledPreviewRef" :watch-key="previewWatchKey" :horizontal-padding="16">
            <component :is="currentTemplateComponent" />
          </ResumeScaledPreview>
        </div>
      </section>

      <aside class="shared-resume-side">
        <div class="shared-action-card hero">
          <p class="action-card-title">{{ displayResumeTitle }}</p>
          <button class="action-primary" type="button" @click="handleBackHome">我也要写</button>
          <button class="action-secondary" type="button" :disabled="exporting" @click="handleDownloadPdf">
            {{ exporting ? '下载中...' : '下载' }}
          </button>
          <button class="action-secondary" type="button" @click="handleCopyShareUrl">分享</button>
        </div>

        <div v-if="actionFeedback" class="shared-feedback" :class="actionFeedbackType">
          {{ actionFeedback }}
        </div>

        <div v-if="exporting" class="shared-progress">
          <div class="shared-progress-head">
            <span>{{ exportProgressText || '导出中...' }}</span>
            <strong>{{ exportProgress }}%</strong>
          </div>
          <div class="shared-progress-track">
            <span class="shared-progress-fill" :style="{ width: `${exportProgress}%` }"></span>
          </div>
        </div>

        <div class="shared-action-card detail">
          <p class="detail-title">分享说明</p>
          <p class="detail-text">{{ shareHintText }}</p>
          <p class="detail-text">下载按钮会导出与当前模板一致的 PDF 版本。</p>
        </div>
      </aside>
    </div>

    <div class="shared-mobile-bottom-bar" aria-label="分享页操作栏">
      <button class="mobile-bar-secondary" type="button" @click="handleCopyShareUrl">复制链接</button>
      <button class="mobile-bar-secondary" type="button" :disabled="exporting" @click="handleDownloadPdf">
        {{ exporting ? '导出中...' : '下载 PDF' }}
      </button>
      <button class="mobile-bar-primary" type="button" @click="handleBackHome">我也要写</button>
    </div>
  </div>
</template>

<style scoped>
.shared-resume-page {
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(219, 234, 254, 0.88), transparent 28%),
    linear-gradient(180deg, #f6f8fc 0%, #eef3f8 100%);
  color: var(--color-text-primary);
}

.shared-resume-shell {
  width: min(1380px, calc(100vw - 48px));
  margin: 0 auto;
  padding: 28px 0 36px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 272px;
  gap: 24px;
  align-items: start;
}

.shared-resume-main {
  min-width: 0;
}

.shared-resume-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 18px;
}

.shared-kicker {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--color-brand-text);
  text-transform: uppercase;
}

.shared-head-desc {
  margin-top: 6px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--color-text-secondary);
}

.shared-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.shared-chip {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0 12px;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.84);
  border: 1px solid rgba(168, 184, 206, 0.55);
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
  box-shadow: var(--shadow-xs);
}

.shared-paper-board {
  padding: 14px;
  border: 1px solid var(--color-border-default);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: var(--shadow-sm);
  backdrop-filter: blur(10px);
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.shared-mobile-title {
  display: none;
  margin-top: 4px;
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.mobile-only-feedback,
.mobile-only-progress,
.shared-mobile-bottom-bar {
  display: none;
}

.shared-resume-side {
  position: sticky;
  top: 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.shared-action-card {
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(216, 224, 235, 0.9);
  border-radius: 18px;
  box-shadow: var(--shadow-xs);
  backdrop-filter: blur(10px);
}

.shared-action-card.hero {
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.action-card-title {
  font-size: 28px;
  line-height: 1.14;
  font-weight: 700;
  color: var(--color-text-primary);
}

.action-primary,
.action-secondary {
  width: 100%;
  min-height: 46px;
  border-radius: var(--radius-full);
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
}

.action-primary {
  border: none;
  background: linear-gradient(135deg, var(--color-brand) 0%, var(--color-brand-hover) 100%);
  color: #fff;
  box-shadow: 0 14px 28px rgba(29, 78, 216, 0.18);
}

.action-secondary {
  border: 1px solid var(--color-border-default);
  background: #fff;
  color: var(--color-text-primary);
}

.action-secondary:disabled {
  opacity: 0.7;
  cursor: wait;
}

.shared-feedback {
  padding: 10px 12px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 700;
}

.shared-feedback.success {
  background: var(--color-success-subtle);
  color: var(--color-success);
}

.shared-feedback.error {
  background: var(--color-danger-subtle);
  color: var(--color-danger);
}

.shared-progress {
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(216, 224, 235, 0.9);
}

.shared-progress-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.shared-progress-head strong {
  color: var(--color-text-primary);
}

.shared-progress-track {
  margin-top: 8px;
  height: 6px;
  border-radius: var(--radius-full);
  background: var(--color-border-subtle);
  overflow: hidden;
}

.shared-progress-fill {
  display: block;
  height: 100%;
  border-radius: var(--radius-full);
  background: linear-gradient(90deg, var(--color-brand) 0%, var(--color-brand-hover) 100%);
}

.shared-action-card.detail {
  padding: 16px;
}

.detail-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.detail-text {
  margin-top: 10px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--color-text-secondary);
}

@media (max-width: 1180px) {
  .shared-resume-shell {
    grid-template-columns: 1fr;
  }

  .shared-resume-side {
    position: static;
    order: -1;
  }
}

@media (max-width: 820px) {
  .shared-resume-page {
    padding-bottom: calc(74px + env(safe-area-inset-bottom, 0px));
  }

  .shared-resume-shell {
    width: min(100vw - 20px, 100%);
    padding: 14px 0 24px;
    gap: 12px;
  }

  .shared-resume-head {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 10px;
  }

  .shared-mobile-title {
    display: block;
  }

  .shared-head-desc,
  .shared-resume-side {
    display: none;
  }

  .mobile-only-feedback,
  .mobile-only-progress {
    display: block;
    margin-bottom: 10px;
  }

  .shared-meta {
    justify-content: flex-start;
  }

  .shared-paper-board {
    padding: 8px;
    border-radius: 14px;
  }

  .shared-mobile-bottom-bar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 50;
    display: grid;
    grid-template-columns: 1fr 1fr 1.15fr;
    gap: 8px;
    padding: 8px 12px calc(8px + env(safe-area-inset-bottom, 0px));
    background: rgba(255, 255, 255, 0.96);
    border-top: 1px solid var(--color-border-default);
    box-shadow: 0 -6px 20px rgba(15, 23, 42, 0.08);
    backdrop-filter: blur(8px);
  }

  .mobile-bar-primary,
  .mobile-bar-secondary {
    min-height: 42px;
    border-radius: var(--radius-md);
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
  }

  .mobile-bar-primary {
    border: none;
    background: var(--color-brand);
    color: var(--color-text-inverse);
  }

  .mobile-bar-secondary {
    border: 1px solid var(--color-border-default);
    background: var(--color-bg-panel);
    color: var(--color-text-primary);
  }

  .mobile-bar-secondary:disabled {
    opacity: 0.65;
    cursor: wait;
  }
}
</style>
