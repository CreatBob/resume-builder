<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useResumeStore } from '@/stores/resume'
import LayoutSettingsPanel from '@/components/resume/LayoutSettingsPanel.vue'
import TemplatePickerDialog from '@/components/resume/TemplatePickerDialog.vue'
import {
  RESUME_TEMPLATES,
  getResumeTemplateByKey,
  type ResumeTemplateDefinition,
  type ResumeTemplateKey,
} from '@/templates/resume'
import { generateResumeMarkdown, downloadMarkdown } from '@/services/exportMarkdown'
import { exportResumePdf, type ExportQualityMode } from '@/services/resumePdfExportService'
import { copyTextToClipboard } from '@/services/clipboardService'
// author: Bob

const store = useResumeStore()
const resumeRef = ref<HTMLElement | null>(null)
const exporting = ref(false)
const exportProgress = ref(0)
const exportProgressText = ref('')
const exportMenuOpen = ref(false)
const exportMenuRef = ref<HTMLElement | null>(null)
const layoutMenuOpen = ref(false)
const layoutMenuRef = ref<HTMLElement | null>(null)
const fontSizeMenuOpen = ref(false)
const fontSizeMenuRef = ref<HTMLElement | null>(null)
const lineHeightMenuOpen = ref(false)
const lineHeightMenuRef = ref<HTMLElement | null>(null)
const templatePickerOpen = ref(false)
const sharing = ref(false)
const shareStatusText = ref('')
const shareStatusType = ref<'success' | 'warning' | 'error' | ''>('')
const shareFallbackUrl = ref('')
let shareStatusTimer: ReturnType<typeof window.setTimeout> | null = null

const A4_WIDTH = 794
const A4_RATIO = 297 / 210
const A4_HEIGHT = Math.round(A4_WIDTH * A4_RATIO)
const pageBreaks = ref<number[]>([])

const fallbackTemplate: ResumeTemplateDefinition = getResumeTemplateByKey('default')
const currentTemplate = computed<ResumeTemplateDefinition>(
  () => getResumeTemplateByKey(store.selectedTemplateKey) ?? fallbackTemplate
)
const currentTemplateComponent = computed(() => currentTemplate.value.component)
const a4TemplateLabel = computed(() => `A4 / ${currentTemplate.value.name}`)
const fontSizePresets = [
  { label: '小号', value: 11 },
  { label: '精简', value: 12 },
  { label: '舒适', value: 13 },
  { label: '默认', value: 14 },
  { label: '大号', value: 15 },
]
const lineHeightPresets = [
  { label: '紧凑', value: 1.2 },
  { label: '标准', value: 1.4 },
  { label: '舒展', value: 1.6 },
  { label: '默认', value: 1.75 },
  { label: '宽松', value: 2 },
  { label: '加宽', value: 2.2 },
]
const currentLineHeightLabel = computed(() => {
  const current = store.layoutSettings.contentLineHeight
  const preset = lineHeightPresets.find((item) => Math.abs(item.value - current) < 0.01)
  return preset ? `行距 ${preset.value.toFixed(2)}` : `行距 ${current.toFixed(2)}`
})
const currentFontSizeLabel = computed(() => `字号 ${store.layoutSettings.contentFontSize}px`)

function waitNextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()))
}

async function setExportProgress(percent: number, text: string) {
  exportProgress.value = Math.max(0, Math.min(100, Math.round(percent)))
  exportProgressText.value = text
  await nextTick()
  await waitNextFrame()
}

function updatePageBreaks() {
  if (!resumeRef.value) return
  const contentHeight = resumeRef.value.scrollHeight
  const pageHeight = Math.round((resumeRef.value.clientWidth || A4_WIDTH) * A4_RATIO)
  const breaks: number[] = []
  const totalPages = Math.max(1, Math.ceil((contentHeight - 1) / pageHeight))
  for (let i = 1; i < totalPages; i += 1) {
    breaks.push(Math.round(i * pageHeight))
  }
  pageBreaks.value = breaks
}

function openTemplatePicker() {
  templatePickerOpen.value = true
  exportMenuOpen.value = false
  layoutMenuOpen.value = false
  fontSizeMenuOpen.value = false
  lineHeightMenuOpen.value = false
}

function chooseTemplate(key: ResumeTemplateKey) {
  store.setTemplate(key)
  templatePickerOpen.value = false
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  nextTick(() => updatePageBreaks())
  if (resumeRef.value) {
    resizeObserver = new ResizeObserver(() => updatePageBreaks())
    resizeObserver.observe(resumeRef.value)
  }
  document.addEventListener('mousedown', handleDocumentPointerDown)
})

watch(
  () => [
    JSON.stringify(store.modules),
    JSON.stringify(store.basicInfo),
    JSON.stringify(store.educationList),
    store.skills,
    JSON.stringify(store.workList),
    JSON.stringify(store.projectList),
    JSON.stringify(store.awardList),
    store.selfIntro,
    store.selectedTemplateKey,
    JSON.stringify(store.layoutSettings),
  ],
  () => {
    nextTick(() => updatePageBreaks())
  }
)

onUnmounted(() => {
  resizeObserver?.disconnect()
  document.removeEventListener('mousedown', handleDocumentPointerDown)
  if (shareStatusTimer) {
    window.clearTimeout(shareStatusTimer)
  }
})

function handleExportTriggerClick() {
  if (exporting.value) return
  exportMenuOpen.value = !exportMenuOpen.value
  layoutMenuOpen.value = false
  fontSizeMenuOpen.value = false
  lineHeightMenuOpen.value = false
}

function handleExportTriggerEnter() {
  if (exporting.value) return
  exportMenuOpen.value = true
  layoutMenuOpen.value = false
  fontSizeMenuOpen.value = false
  lineHeightMenuOpen.value = false
}

function handleDocumentPointerDown(event: MouseEvent) {
  const target = event.target as Node | null
  if (!target) return
  if (exportMenuRef.value && !exportMenuRef.value.contains(target)) {
    exportMenuOpen.value = false
  }
  if (layoutMenuRef.value && !layoutMenuRef.value.contains(target)) {
    layoutMenuOpen.value = false
  }
  if (fontSizeMenuRef.value && !fontSizeMenuRef.value.contains(target)) {
    fontSizeMenuOpen.value = false
  }
  if (lineHeightMenuRef.value && !lineHeightMenuRef.value.contains(target)) {
    lineHeightMenuOpen.value = false
  }
}

function handleLayoutTriggerClick() {
  layoutMenuOpen.value = !layoutMenuOpen.value
  fontSizeMenuOpen.value = false
  lineHeightMenuOpen.value = false
  exportMenuOpen.value = false
}

function handleFontSizeTriggerClick() {
  fontSizeMenuOpen.value = !fontSizeMenuOpen.value
  layoutMenuOpen.value = false
  lineHeightMenuOpen.value = false
  exportMenuOpen.value = false
}

function handleLineHeightTriggerClick() {
  lineHeightMenuOpen.value = !lineHeightMenuOpen.value
  layoutMenuOpen.value = false
  fontSizeMenuOpen.value = false
  exportMenuOpen.value = false
}

function handleFontSizeSelect(value: number) {
  store.updateLayoutSetting('contentFontSize', value)
  fontSizeMenuOpen.value = false
}

function handleLineHeightSelect(value: number) {
  store.updateLayoutSetting('contentLineHeight', value)
  lineHeightMenuOpen.value = false
}

function handleExportMarkdown() {
  exportMenuOpen.value = false
  const md = generateResumeMarkdown(store)
  const name = store.basicInfo.name?.trim() || '简历'
  downloadMarkdown(`${name}_简历.md`, md)
}

function handleExportJson() {
  exportMenuOpen.value = false
  const name = store.basicInfo.name?.trim() || '简历'
  const blob = new Blob([store.exportResumeData()], {
    type: 'application/json;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${name}_简历.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function clearShareStatusSoon() {
  if (shareStatusTimer) {
    window.clearTimeout(shareStatusTimer)
  }
  shareStatusTimer = window.setTimeout(() => {
    shareStatusText.value = ''
    shareStatusType.value = ''
    shareStatusTimer = null
  }, 2400)
}

function handleShareLinkFocus(event: FocusEvent) {
  const target = event.target
  if (target instanceof HTMLInputElement) {
    target.select()
  }
}

async function handleCopyShareUrl() {
  const shareUrl = shareFallbackUrl.value || store.currentResumeShare?.shareUrl
  if (!shareUrl) return
  try {
    await copyTextToClipboard(shareUrl)
    shareFallbackUrl.value = ''
    shareStatusText.value = '分享链接已复制'
    shareStatusType.value = 'success'
  } catch (error) {
    shareFallbackUrl.value = shareUrl
    shareStatusText.value = error instanceof Error ? error.message : '复制失败，请手动复制下方链接'
    shareStatusType.value = 'warning'
  }
  clearShareStatusSoon()
}

async function handleShareResume() {
  if (!store.canUseShare || sharing.value) return
  sharing.value = true
  shareFallbackUrl.value = ''
  shareStatusText.value = ''
  shareStatusType.value = ''
  try {
    const shareInfo = await store.shareCurrentResume()
    if (!shareInfo) {
      shareStatusText.value = '分享链接生成失败'
      shareStatusType.value = 'error'
      clearShareStatusSoon()
      return
    }
    try {
      await copyTextToClipboard(shareInfo.shareUrl)
      shareFallbackUrl.value = ''
      shareStatusText.value = '分享链接已复制'
      shareStatusType.value = 'success'
    } catch {
      shareFallbackUrl.value = shareInfo.shareUrl
      shareStatusText.value = '分享链接已生成，请手动复制下方链接'
      shareStatusType.value = 'warning'
    }
    clearShareStatusSoon()
  } catch (error) {
    shareStatusText.value = error instanceof Error ? error.message : '分享链接生成失败'
    shareStatusType.value = 'error'
    clearShareStatusSoon()
  } finally {
    sharing.value = false
  }
}

async function exportPDF(mode: ExportQualityMode) {
  if (!resumeRef.value) return
  exporting.value = true
  exportMenuOpen.value = false
  exportProgress.value = 0
  exportProgressText.value = '准备导出...'

  try {
    await exportResumePdf({
      sourceNode: resumeRef.value,
      filename: `${store.basicInfo.name || '简历'}_resume.pdf`,
      mode,
      onProgress: setExportProgress,
    })
  } catch (err) {
    console.error('PDF export failed:', err)
  } finally {
    exportProgress.value = 0
    exportProgressText.value = ''
    exporting.value = false
  }
}
</script>

<template>
  <aside class="preview-panel">
    <div class="preview-top">
      <div class="preview-title-row">
        <span class="preview-title">实时预览</span>
        <button class="template-trigger" @click="openTemplatePicker">
          <span class="template-trigger-label">切换模板</span>
          <span class="template-trigger-name">{{ currentTemplate.name }}</span>
          <span class="template-trigger-arrow">▾</span>
        </button>
        <span class="a4-badge">{{ a4TemplateLabel }}</span>
      </div>
      <div class="preview-toolbar">
        <div ref="layoutMenuRef" class="toolbar-dropdown">
          <button class="toolbar-button" type="button" :aria-expanded="layoutMenuOpen" @click="handleLayoutTriggerClick">
            间距配置
          </button>
          <div v-if="layoutMenuOpen" class="layout-popover">
            <LayoutSettingsPanel />
          </div>
        </div>

        <div ref="fontSizeMenuRef" class="toolbar-dropdown">
          <button
            class="toolbar-button"
            type="button"
            :aria-expanded="fontSizeMenuOpen"
            @click="handleFontSizeTriggerClick"
          >
            {{ currentFontSizeLabel }}
          </button>
          <div v-if="fontSizeMenuOpen" class="font-size-menu">
            <button
              v-for="preset in fontSizePresets"
              :key="preset.value"
              class="font-size-item"
              :class="{ active: store.layoutSettings.contentFontSize === preset.value }"
              type="button"
              @click="handleFontSizeSelect(preset.value)"
            >
              <span>{{ preset.label }}</span>
              <strong>{{ preset.value }}px</strong>
            </button>
          </div>
        </div>

        <div ref="lineHeightMenuRef" class="toolbar-dropdown">
          <button
            class="toolbar-button"
            type="button"
            :aria-expanded="lineHeightMenuOpen"
            @click="handleLineHeightTriggerClick"
          >
            {{ currentLineHeightLabel }}
          </button>
          <div v-if="lineHeightMenuOpen" class="line-height-menu">
            <button
              v-for="preset in lineHeightPresets"
              :key="preset.value"
              class="line-height-item"
              :class="{ active: Math.abs(store.layoutSettings.contentLineHeight - preset.value) < 0.01 }"
              type="button"
              @click="handleLineHeightSelect(preset.value)"
            >
              <span>{{ preset.label }}</span>
              <strong>{{ preset.value.toFixed(2) }}</strong>
            </button>
          </div>
        </div>

        <div
          ref="exportMenuRef"
          class="export-actions export-dropdown"
          @mouseenter="handleExportTriggerEnter"
        >
          <button class="btn-export" :disabled="exporting" @click="handleExportTriggerClick">
            {{ exporting ? '导出中...' : '导出' }}
          </button>
          <div v-if="exportMenuOpen && !exporting" class="export-menu">
            <button class="export-menu-item" @click="exportPDF('hd')">导出高清 PDF</button>
            <button class="export-menu-item" @click="exportPDF('compressed')">导出压缩 PDF</button>
            <button class="export-menu-item" @click="handleExportMarkdown">导出 Markdown</button>
            <button class="export-menu-item" @click="handleExportJson">导出 JSON 进度</button>
          </div>
        </div>

        <button
          v-if="store.canUseShare"
          class="toolbar-button toolbar-share-button"
          type="button"
          :disabled="sharing"
          @click="handleShareResume"
        >
          {{ sharing ? '分享中...' : '分享' }}
        </button>
      </div>
    </div>
    <div v-if="shareStatusText" class="share-status" :class="shareStatusType">
      {{ shareStatusText }}
    </div>
    <div v-if="shareFallbackUrl" class="share-link-panel">
      <div class="share-link-head">
        <span class="share-link-title">分享链接</span>
        <button class="toolbar-button share-link-copy-button" type="button" @click="handleCopyShareUrl">
          再试复制
        </button>
      </div>
      <input
        class="share-link-input"
        type="text"
        readonly
        :value="shareFallbackUrl"
        @focus="handleShareLinkFocus"
      />
    </div>
    <div v-if="exporting" class="export-progress">
      <div class="export-progress-head">
        <span class="export-progress-text">{{ exportProgressText || '导出中...' }}</span>
        <span class="export-progress-percent">{{ exportProgress }}%</span>
      </div>
      <div class="export-progress-track">
        <span class="export-progress-fill" :style="{ width: `${exportProgress}%` }"></span>
      </div>
    </div>

    <TemplatePickerDialog
      v-model="templatePickerOpen"
      :templates="RESUME_TEMPLATES"
      :selected-key="store.selectedTemplateKey"
      @select="chooseTemplate"
    />

    <div class="preview-scroll">
      <div class="paper-wrapper" :style="{ width: `${A4_WIDTH}px` }">
        <div ref="resumeRef" class="paper" :style="{ width: `${A4_WIDTH}px`, minHeight: `${A4_HEIGHT}px` }">
          <component :is="currentTemplateComponent" />
        </div>

        <div v-for="(pos, idx) in pageBreaks" :key="idx" class="page-line" :style="{ top: `${pos}px` }">
          <span>第{{ idx + 2 }}页</span>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.preview-panel {
  box-sizing: border-box;
  width: 812px;
  max-width: 812px;
  min-width: 0;
  flex: 0 0 812px;
  height: 100%;
  border-left: 1px solid #e4d8cb;
  background: #efe7dc;
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.preview-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.preview-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.preview-title {
  color: #2d2521;
  font-size: 16px;
  font-weight: 700;
}

.template-trigger {
  height: 30px;
  padding: 0 10px 0 8px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border-radius: 8px;
  border: 1px solid #e0d2c1;
  background: #fff;
  color: #2d2521;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  outline: none;
  box-shadow: 0 1px 0 rgba(45, 37, 33, 0.06);
  transition: background-color 0.12s ease, border-color 0.12s ease, box-shadow 0.12s ease;
}

.template-trigger:hover {
  border-color: #cdbba7;
  background: #faf6f0;
  box-shadow: 0 4px 12px rgba(45, 37, 33, 0.1);
}

.template-trigger-label {
  height: 20px;
  padding: 0 6px;
  border-radius: 6px;
  background: #2d2521;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
}

.template-trigger-name {
  color: #2d2521;
  font-size: 12px;
  font-weight: 700;
  max-width: 180px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.template-trigger-arrow {
  color: #7b6a5b;
  font-size: 11px;
  line-height: 1;
}

.a4-badge {
  height: 24px;
  padding: 0 8px;
  border-radius: 8px;
  background: #fff;
  border: 1px solid #e9ded0;
  color: #7b6a5b;
  font-size: 11px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
}

.btn-export {
  border: none;
  height: 30px;
  padding: 0 10px;
  border-radius: 8px;
  background: #2d2521;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
}

.preview-toolbar {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.toolbar-share-button {
  min-width: 72px;
}

.toolbar-dropdown {
  position: relative;
  flex-shrink: 0;
}

.toolbar-button {
  height: 30px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid #ddcfbf;
  background: #fff;
  color: #2d2521;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: border-color 0.18s ease, color 0.18s ease, background-color 0.18s ease;
}

.toolbar-button:hover,
.toolbar-button[aria-expanded='true'] {
  border-color: #d97745;
  color: #d97745;
  background: #fff9f4;
}

.layout-popover {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 390px;
  max-width: min(390px, calc(100vw - 24px));
  padding: 18px 20px;
  border-radius: 8px;
  border: 1px solid #e9ded0;
  background: #fff;
  box-shadow: 0 18px 34px rgba(45, 37, 33, 0.16);
  z-index: 18;
}

.line-height-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 132px;
  padding: 4px;
  border-radius: 8px;
  border: 1px solid #e9ded0;
  background: #fff;
  box-shadow: 0 12px 24px rgba(45, 37, 33, 0.14);
  z-index: 18;
}

.font-size-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 132px;
  padding: 4px;
  border-radius: 8px;
  border: 1px solid #e9ded0;
  background: #fff;
  box-shadow: 0 12px 24px rgba(45, 37, 33, 0.14);
  z-index: 18;
}

.font-size-item,
.line-height-item {
  width: 100%;
  min-height: 32px;
  border: none;
  border-radius: 6px;
  background: #fff;
  color: #2d2521;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 9px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.font-size-item strong,
.line-height-item strong {
  color: #8a7461;
  font-size: 11px;
  font-weight: 700;
}

.font-size-item:hover,
.font-size-item.active,
.line-height-item:hover,
.line-height-item.active {
  background: #fff4ec;
  color: #d97745;
}

.font-size-item.active strong,
.line-height-item.active strong {
  color: #d97745;
}

.btn-export:disabled {
  opacity: 0.7;
  cursor: wait;
}

.export-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.export-dropdown {
  position: relative;
}

.export-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 124px;
  padding: 4px;
  border-radius: 8px;
  border: 1px solid #e9ded0;
  background: #fff;
  box-shadow: 0 10px 20px rgba(45, 37, 33, 0.14);
  z-index: 12;
}

.export-menu-item {
  width: 100%;
  border: none;
  border-radius: 6px;
  background: #fff;
  color: #2d2521;
  font-size: 12px;
  font-weight: 600;
  text-align: left;
  padding: 7px 8px;
  cursor: pointer;
  transition: background-color 0.12s ease, color 0.12s ease;
}

.export-menu-item:hover {
  background: #eadccf;
  color: #1f1916;
}

.export-progress {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 10px;
  border: 1px solid #e9ded0;
  border-radius: 8px;
  background: #fff8f2;
}

.share-status {
  padding: 7px 10px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  background: var(--color-brand-subtle);
  color: var(--color-brand-text);
}

.share-status.error {
  background: var(--color-danger-subtle);
  color: var(--color-danger);
}

.share-status.success {
  background: var(--color-success-subtle);
  color: var(--color-success);
}

.share-status.warning {
  background: var(--color-warning-subtle);
  color: var(--color-warning);
}

.share-link-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid #e9ded0;
  border-radius: 8px;
  background: #fff;
}

.share-link-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.share-link-title {
  color: #2d2521;
  font-size: 12px;
  font-weight: 700;
}

.share-link-copy-button {
  padding: 0 9px;
}

.share-link-input {
  width: 100%;
  min-width: 0;
  height: 34px;
  border: 1px solid #ddcfbf;
  border-radius: 8px;
  padding: 0 10px;
  background: #fffaf5;
  color: #2d2521;
  font-size: 12px;
  font-weight: 600;
  outline: none;
}

.share-link-input:focus {
  border-color: #d97745;
  box-shadow: 0 0 0 3px rgba(217, 119, 69, 0.14);
}

.export-progress-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.export-progress-text {
  font-size: 12px;
  color: #7b6a5b;
  font-weight: 600;
}

.export-progress-percent {
  font-size: 12px;
  color: #2d2521;
  font-weight: 700;
}

.export-progress-track {
  position: relative;
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background: #eedfce;
  overflow: hidden;
}

.export-progress-fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #d97745 0%, #c96a3b 100%);
  transition: width 0.18s ease;
}

.preview-scroll {
  flex: 1;
  overflow-y: auto;
  overflow-x: auto;
  padding: 0;
}

.paper-wrapper {
  position: relative;
  margin: 0 auto;
  padding-bottom: 8px;
}

.paper {
  box-sizing: border-box;
  background: #fff;
  border: 1px solid #d8dde6;
  border-radius: 4px;
  color: #000;
  box-shadow: 0 12px 24px rgba(45, 37, 33, 0.1);
}

.paper > :deep(*) {
  min-height: inherit;
}

.paper.pdf-exporting {
  box-shadow: none;
  border: none;
  border-radius: 0;
  min-height: 0 !important;
}

.page-line {
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

.page-line::before,
.page-line::after {
  content: '';
  flex: 1;
  height: 1px;
  border-top: 1px dashed #d97745;
}

.page-line span {
  color: #d97745;
  font-size: 10px;
  font-weight: 600;
  background: #efe7dc;
  padding: 0 4px;
}

@media (max-width: 760px) {
  .preview-panel {
    padding: 12px 0;
    gap: 10px;
  }

  .preview-top {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    padding: 0 12px;
  }

  .preview-title-row {
    flex-wrap: wrap;
    align-items: center;
  }

  .preview-toolbar {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    justify-content: stretch;
    gap: 8px;
    width: 100%;
  }

  .toolbar-dropdown,
  .export-actions,
  .toolbar-share-button,
  .toolbar-button,
  .btn-export {
    width: 100%;
    min-width: 0;
  }

  .toolbar-button,
  .btn-export {
    justify-content: center;
  }

  .export-actions {
    display: flex;
  }

  .preview-scroll {
    padding: 0 12px 12px;
    overflow-y: visible;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .paper-wrapper {
    margin: 0;
  }

  .layout-popover,
  .font-size-menu,
  .line-height-menu,
  .export-menu {
    left: 0;
    right: auto;
    width: min(100%, calc(100vw - 24px));
    max-width: calc(100vw - 24px);
  }

  .export-menu {
    min-width: 0;
  }
}

@media (max-width: 480px) {
  .preview-toolbar {
    grid-template-columns: 1fr;
  }

  .template-trigger {
    flex: 1 1 100%;
    min-width: 0;
    justify-content: flex-start;
  }

  .template-trigger-name {
    max-width: none;
    flex: 1 1 auto;
  }

  .a4-badge {
    order: 3;
  }

  .layout-popover {
    padding: 14px;
  }
}
</style>
