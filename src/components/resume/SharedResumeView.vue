<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import type { SharedResumeDocument } from '@/services/resumeStorageService'
import { type ResumeTemplateDefinition, getResumeTemplateByKey, normalizeResumeTemplateKey } from '@/templates/resume'
import { provideResumeTemplateRuntime } from '@/templates/shared/resumeTemplateRuntime'
import { createResumeTemplateRuntimeFromSharedDocument } from '@/services/resumeTemplateRuntimeService'
import { exportResumePdf } from '@/services/resumePdfExportService'
import { copyTextToClipboard } from '@/services/clipboardService'
// author: Bob

const props = defineProps<{
  document: SharedResumeDocument
  shareUrl: string
}>()

const resumeRef = ref<HTMLElement | null>(null)
const exporting = ref(false)
const exportProgress = ref(0)
const exportProgressText = ref('')
const actionFeedback = ref('')
const actionFeedbackType = ref<'success' | 'error' | ''>('')
const pageBreaks = ref<number[]>([])

const A4_WIDTH = 794
const A4_RATIO = 297 / 210
const A4_HEIGHT = Math.round(A4_WIDTH * A4_RATIO)
const PAGE_BREAK_TOLERANCE = 1

const runtime = createResumeTemplateRuntimeFromSharedDocument(props.document)
provideResumeTemplateRuntime(runtime)

const currentTemplate = computed<ResumeTemplateDefinition>(() =>
  getResumeTemplateByKey(normalizeResumeTemplateKey(runtime.store.selectedTemplateKey))
)
const currentTemplateComponent = computed(() => currentTemplate.value.component)

function updatePageBreaks() {
  if (!resumeRef.value) return
  const contentHeight = resumeRef.value.scrollHeight
  const pageHeight = A4_HEIGHT
  const overflowHeight = contentHeight - pageHeight
  if (overflowHeight <= PAGE_BREAK_TOLERANCE) {
    pageBreaks.value = []
    return
  }
  const breaks: number[] = []
  const totalPages = 1 + Math.ceil((overflowHeight - PAGE_BREAK_TOLERANCE) / pageHeight)
  for (let i = 1; i < totalPages; i += 1) {
    breaks.push(Math.round(i * pageHeight))
  }
  pageBreaks.value = breaks
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  nextTick(() => {
    updatePageBreaks()
    if (!resumeRef.value) return
    resizeObserver = new ResizeObserver(() => updatePageBreaks())
    resizeObserver.observe(resumeRef.value)
  })
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})

function notifyAction(message: string, type: 'success' | 'error') {
  actionFeedback.value = message
  actionFeedbackType.value = type
  window.setTimeout(() => {
    actionFeedback.value = ''
    actionFeedbackType.value = ''
  }, 2400)
}

async function setExportProgress(percent: number, text: string) {
  exportProgress.value = Math.max(0, Math.min(100, Math.round(percent)))
  exportProgressText.value = text
}

async function handleDownloadPdf() {
  if (!resumeRef.value || exporting.value) return
  exporting.value = true
  exportProgress.value = 0
  exportProgressText.value = '准备导出...'
  try {
    await exportResumePdf({
      sourceNode: resumeRef.value,
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
            <p class="shared-kicker">匿名分享简历</p>
            <h1 class="shared-title">{{ document.title || runtime.store.basicInfo.name || '简历预览' }}</h1>
          </div>
          <div class="shared-meta">
            <span class="shared-chip">模板 · {{ currentTemplate.name }}</span>
            <span class="shared-chip">最近更新 · {{ document.updatedAt || '刚刚' }}</span>
          </div>
        </div>

        <div class="shared-paper-board">
          <div class="shared-paper-wrapper" :style="{ width: `${A4_WIDTH}px` }">
            <div ref="resumeRef" class="shared-paper" :style="{ width: `${A4_WIDTH}px`, minHeight: `${A4_HEIGHT}px` }">
              <component :is="currentTemplateComponent" />
            </div>
            <div
              v-for="(pos, idx) in pageBreaks"
              :key="idx"
              class="shared-page-line"
              :style="{ top: `${pos}px` }"
            >
              <span>第{{ idx + 2 }}页</span>
            </div>
          </div>
        </div>
      </section>

      <aside class="shared-resume-side">
        <div class="shared-action-card hero">
          <p class="action-card-title">美观整齐简历模板</p>
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
          <p class="detail-text">当前链接为匿名公开访问链接，打开即可查看当前简历的最新保存内容。</p>
          <p class="detail-text">下载按钮会导出与当前模板一致的 PDF 版本。</p>
        </div>
      </aside>
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

.shared-title {
  margin-top: 6px;
  font-size: clamp(28px, 3vw, 38px);
  line-height: 1.08;
  font-weight: 700;
  color: var(--color-text-primary);
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
  padding: 18px;
  border: 1px solid rgba(216, 224, 235, 0.9);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.62);
  box-shadow: var(--shadow-sm);
  backdrop-filter: blur(10px);
  overflow-x: auto;
  overflow-y: hidden;
}

.shared-paper-wrapper {
  position: relative;
  margin: 0 auto;
  padding-bottom: 8px;
}

.shared-paper {
  box-sizing: border-box;
  background: #fff;
  border: 1px solid var(--color-border-strong);
  border-radius: 4px;
  color: #000;
  box-shadow: var(--shadow-md);
}

.shared-paper > :deep(*) {
  min-height: inherit;
}

.shared-paper.pdf-exporting {
  box-shadow: none;
  border: none;
  border-radius: 0;
  min-height: 0 !important;
}

.shared-page-line {
  position: absolute;
  left: 16px;
  right: 16px;
  transform: translateY(-6px);
  display: flex;
  align-items: center;
  gap: 8px;
  pointer-events: none;
  z-index: 2;
}

.shared-page-line::before,
.shared-page-line::after {
  content: '';
  flex: 1;
  height: 1px;
  border-top: 1px dashed #d97745;
}

.shared-page-line span {
  color: #d97745;
  font-size: 10px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.92);
  padding: 0 4px;
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
  .shared-resume-shell {
    width: min(100vw - 24px, 100%);
    padding: 18px 0 28px;
    gap: 16px;
  }

  .shared-resume-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .shared-meta {
    justify-content: flex-start;
  }

  .shared-paper-board {
    padding: 10px;
  }

  .action-card-title {
    font-size: 24px;
  }

  .action-primary,
  .action-secondary {
    font-size: 16px;
  }
}
</style>
