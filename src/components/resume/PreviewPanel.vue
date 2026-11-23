<!-- author: Bob -->
<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useResumeStore } from '@/stores/resume'
import LayoutSettingsPanel from '@/components/resume/LayoutSettingsPanel.vue'
import MobileBottomSheet from '@/components/resume/MobileBottomSheet.vue'
import ResumeScaledPreview from '@/components/resume/ResumeScaledPreview.vue'
import ResumeShareDialog from '@/components/resume/ResumeShareDialog.vue'
import TemplatePickerDialog from '@/components/resume/TemplatePickerDialog.vue'
import {
  RESUME_TEMPLATES,
  getResumeTemplateByKey,
  type ResumeTemplateDefinition,
  type ResumeTemplateKey,
} from '@/templates/resume'
import { generateResumeMarkdown, downloadMarkdown } from '@/services/exportMarkdown'
import { copyTextToClipboard } from '@/services/clipboardService'
import { encodeOfflineSharePayload } from '@/services/offlineShareService'
import { buildPortableResumeJsonText } from '@/services/resumeImportService'
import {
  buildResumePdfFilename,
  exportResumePdf,
  type ExportQualityMode,
} from '@/services/resumePdfExportService'

const store = useResumeStore()
const scaledPreviewRef = ref<{ getPaperElement: () => HTMLElement | null; recalculate: () => void } | null>(null)
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
const shareDialogOpen = ref(false)
const mobileTypographyOpen = ref(false)
const mobileExportOpen = ref(false)
const exportFeedback = ref('')
const exportFeedbackType = ref<'success' | 'warning' | 'error' | ''>('')
let exportFeedbackTimer: ReturnType<typeof setTimeout> | null = null

const fallbackTemplate: ResumeTemplateDefinition = getResumeTemplateByKey('default')
const currentTemplate = computed<ResumeTemplateDefinition>(
  () => getResumeTemplateByKey(store.selectedTemplateKey) ?? fallbackTemplate,
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

const previewWatchKey = computed(() => {
  const { avatar, ...basicRest } = store.basicInfo
  const avatarSig = avatar ? `${avatar.length}:${avatar.slice(0, 32)}` : ''
  return JSON.stringify([
    store.modules,
    basicRest,
    avatarSig,
    store.educationList,
    store.skills,
    store.workList,
    store.projectList,
    store.awardList,
    store.selfIntro,
    store.selectedTemplateKey,
    store.layoutSettings,
  ])
})

function waitNextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()))
}

async function setExportProgress(percent: number, text: string) {
  exportProgress.value = Math.max(0, Math.min(100, Math.round(percent)))
  exportProgressText.value = text
  await nextTick()
  await waitNextFrame()
}

function closeDesktopDropdowns() {
  exportMenuOpen.value = false
  layoutMenuOpen.value = false
  fontSizeMenuOpen.value = false
  lineHeightMenuOpen.value = false
}

function openTemplatePicker() {
  templatePickerOpen.value = true
  closeDesktopDropdowns()
}

function chooseTemplate(key: ResumeTemplateKey) {
  store.setTemplate(key)
  templatePickerOpen.value = false
}

function handleDocumentPointerDown(event: MouseEvent) {
  const target = event.target as Node | null
  if (!target) return
  if (exportMenuRef.value && !exportMenuRef.value.contains(target)) exportMenuOpen.value = false
  if (layoutMenuRef.value && !layoutMenuRef.value.contains(target)) layoutMenuOpen.value = false
  if (fontSizeMenuRef.value && !fontSizeMenuRef.value.contains(target)) fontSizeMenuOpen.value = false
  if (lineHeightMenuRef.value && !lineHeightMenuRef.value.contains(target)) lineHeightMenuOpen.value = false
}

onMounted(() => {
  document.addEventListener('mousedown', handleDocumentPointerDown)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleDocumentPointerDown)
  if (exportFeedbackTimer) {
    clearTimeout(exportFeedbackTimer)
    exportFeedbackTimer = null
  }
})

function handleExportTriggerClick() {
  if (exporting.value) return
  const next = !exportMenuOpen.value
  closeDesktopDropdowns()
  exportMenuOpen.value = next
}

function handleExportTriggerEnter() {
  if (exporting.value) return
  closeDesktopDropdowns()
  exportMenuOpen.value = true
}

function handleLayoutTriggerClick() {
  const next = !layoutMenuOpen.value
  closeDesktopDropdowns()
  layoutMenuOpen.value = next
}

function handleFontSizeTriggerClick() {
  const next = !fontSizeMenuOpen.value
  closeDesktopDropdowns()
  fontSizeMenuOpen.value = next
}

function handleLineHeightTriggerClick() {
  const next = !lineHeightMenuOpen.value
  closeDesktopDropdowns()
  lineHeightMenuOpen.value = next
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
  mobileExportOpen.value = false
  const md = generateResumeMarkdown(store)
  const name = store.basicInfo.name?.trim() || '简历'
  downloadMarkdown(`${name}_简历.md`, md)
}

function showExportFeedback(message: string, type: 'success' | 'warning' | 'error') {
  if (exportFeedbackTimer) clearTimeout(exportFeedbackTimer)
  exportFeedback.value = message
  exportFeedbackType.value = type
  exportFeedbackTimer = setTimeout(() => {
    exportFeedback.value = ''
    exportFeedbackType.value = ''
    exportFeedbackTimer = null
  }, 3600)
}

async function handleCopyJsonText() {
  exportMenuOpen.value = false
  mobileExportOpen.value = false
  try {
    const { jsonText, avatarStripped } = buildPortableResumeJsonText(store.snapshotResumeData())
    await copyTextToClipboard(jsonText)
    showExportFeedback(
      avatarStripped
        ? 'JSON 文本已复制到剪贴板（已自动省略本地大图头像，可直接发送或粘贴导入）。'
        : 'JSON 文本已复制到剪贴板，可直接发送或粘贴导入。',
      'success',
    )
  } catch (err) {
    showExportFeedback(err instanceof Error ? err.message : '复制 JSON 文本失败', 'error')
  }
}

async function handleExportImportableLongLink() {
  exportMenuOpen.value = false
  mobileExportOpen.value = false
  try {
    const snap = store.snapshotCurrentResumeForShare()
    const result = await encodeOfflineSharePayload(
      {
        title: snap.title,
        content: snap.content,
        updatedAt: snap.updatedAt,
      },
      { stripLargeAvatar: true },
    )
    await copyTextToClipboard(result.shareUrl)
    const hints = [`可导入长链已复制（${result.urlLength} 字符）`]
    if (result.avatarStripped) hints.push('已省略本地大图头像')
    if (result.isLongUrl) hints.push('链接偏长，建议发文件或复制 JSON 文本防截断')
    showExportFeedback(`${hints.join(' · ')}，对方可打开查看或粘贴导入继续编辑。`, result.isLongUrl ? 'warning' : 'success')
  } catch (err) {
    showExportFeedback(err instanceof Error ? err.message : '生成可导入长链失败', 'error')
  }
}

function handleExportJson() {
  exportMenuOpen.value = false
  mobileExportOpen.value = false
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

async function exportPDF(mode: ExportQualityMode) {
  const paperEl = scaledPreviewRef.value?.getPaperElement()
  if (!paperEl) return
  exporting.value = true
  exportMenuOpen.value = false
  mobileExportOpen.value = false
  exportProgress.value = 0
  exportProgressText.value = '准备导出...'

  try {
    await exportResumePdf({
      sourceNode: paperEl,
      filename: buildResumePdfFilename(store.basicInfo.name, store.currentResume?.title),
      mode,
      onProgress: setExportProgress,
    })
  } catch (err) {
    console.error('PDF 导出失败:', err)
  } finally {
    exportProgress.value = 0
    exportProgressText.value = ''
    exporting.value = false
  }
}

defineExpose({
  refreshPreviewScale: () => scaledPreviewRef.value?.recalculate(),
})
</script>

<template>
  <aside class="preview-panel">
    <div class="preview-top">
      <div class="preview-title-row">
        <span class="preview-title">实时预览</span>
        <button class="template-trigger" type="button" @click="openTemplatePicker">
          <span class="template-trigger-label">切换模板</span>
          <span class="template-trigger-name">{{ currentTemplate.name }}</span>
          <span class="template-trigger-arrow">▾</span>
        </button>
        <span class="a4-badge">{{ a4TemplateLabel }}</span>
      </div>

      <div class="preview-toolbar desktop-only-toolbar">
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
          <button class="btn-export" type="button" :disabled="exporting" @click="handleExportTriggerClick">
            {{ exporting ? '导出中...' : '导出' }}
          </button>
          <div v-if="exportMenuOpen && !exporting" class="export-menu">
            <button class="export-menu-item" type="button" @click="exportPDF('hd')">导出高清 PDF</button>
            <button class="export-menu-item" type="button" @click="exportPDF('compressed')">导出压缩 PDF</button>
            <button class="export-menu-item" type="button" @click="handleExportMarkdown">导出 Markdown</button>
            <button class="export-menu-item" type="button" @click="handleExportJson">导出 JSON 进度</button>
            <button class="export-menu-item" type="button" @click="handleCopyJsonText">复制 JSON 文本</button>
            <button class="export-menu-item" type="button" @click="handleExportImportableLongLink">导出可导入长链</button>
          </div>
        </div>

        <button
          v-if="store.canUseShare"
          class="toolbar-button toolbar-share-button"
          type="button"
          @click="shareDialogOpen = true"
        >
          分享
        </button>
      </div>

      <div class="mobile-preview-actions" aria-label="移动端预览操作">
        <button class="mobile-action-pill" type="button" @click="openTemplatePicker">模板</button>
        <button class="mobile-action-pill" type="button" @click="mobileTypographyOpen = true">排版</button>
        <button class="mobile-action-pill" type="button" :disabled="exporting" @click="mobileExportOpen = true">
          {{ exporting ? '导出中' : '导出' }}
        </button>
        <button
          v-if="store.canUseShare"
          class="mobile-action-pill primary"
          type="button"
          @click="shareDialogOpen = true"
        >
          分享
        </button>
      </div>
    </div>

    <div v-if="exportFeedback" class="export-feedback" :class="exportFeedbackType" role="status">
      {{ exportFeedback }}
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

    <ResumeScaledPreview ref="scaledPreviewRef" :watch-key="previewWatchKey">
      <component :is="currentTemplateComponent" />
    </ResumeScaledPreview>

    <TemplatePickerDialog
      v-model="templatePickerOpen"
      :templates="RESUME_TEMPLATES"
      :selected-key="store.selectedTemplateKey"
      @select="chooseTemplate"
    />

    <ResumeShareDialog v-model="shareDialogOpen" />

    <MobileBottomSheet v-model="mobileTypographyOpen" title="排版与间距设置" subtitle="即时生效并同步到导出 PDF">
      <div class="mobile-sheet-section">
        <p class="mobile-sheet-label">正文字号</p>
        <div class="mobile-preset-grid">
          <button
            v-for="preset in fontSizePresets"
            :key="`m-fs-${preset.value}`"
            type="button"
            class="mobile-preset-btn"
            :class="{ active: store.layoutSettings.contentFontSize === preset.value }"
            @click="handleFontSizeSelect(preset.value)"
          >
            {{ preset.label }} {{ preset.value }}px
          </button>
        </div>
      </div>

      <div class="mobile-sheet-section">
        <p class="mobile-sheet-label">正文行距</p>
        <div class="mobile-preset-grid">
          <button
            v-for="preset in lineHeightPresets"
            :key="`m-lh-${preset.value}`"
            type="button"
            class="mobile-preset-btn"
            :class="{ active: Math.abs(store.layoutSettings.contentLineHeight - preset.value) < 0.01 }"
            @click="handleLineHeightSelect(preset.value)"
          >
            {{ preset.label }} {{ preset.value.toFixed(2) }}
          </button>
        </div>
      </div>

      <LayoutSettingsPanel />
    </MobileBottomSheet>

    <MobileBottomSheet v-model="mobileExportOpen" title="导出简历" subtitle="PDF 导出始终按标准 A4 高清尺寸生成">
      <div class="mobile-export-list">
        <button class="mobile-export-item primary" type="button" @click="exportPDF('hd')">导出高清 PDF（推荐打印/投递）</button>
        <button class="mobile-export-item" type="button" @click="exportPDF('compressed')">导出压缩 PDF（体积更小）</button>
        <button class="mobile-export-item" type="button" @click="handleExportMarkdown">导出 Markdown 文本</button>
        <button class="mobile-export-item" type="button" @click="handleExportJson">导出 JSON 数据备份</button>
        <button class="mobile-export-item" type="button" @click="handleCopyJsonText">复制 JSON 文本（支持直接粘贴导入）</button>
        <button class="mobile-export-item" type="button" @click="handleExportImportableLongLink">导出可导入长链（支持二次编辑）</button>
      </div>
    </MobileBottomSheet>
  </aside>
</template>

<style scoped>
.preview-panel {
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  flex: 1 1 auto;
  height: 100%;
  overflow: hidden;
  border-left: 1px solid var(--color-border-default);
  background: var(--color-bg-subtle);
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.preview-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 10px;
}

.preview-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex-wrap: wrap;
}

.preview-title {
  color: var(--color-text-primary);
  font-size: var(--font-size-lg);
  font-weight: 700;
  white-space: nowrap;
}

.template-trigger {
  height: 30px;
  padding: 0 10px 0 8px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-default);
  background: var(--color-bg-panel);
  color: var(--color-text-primary);
  font-size: var(--font-size-xs);
  font-weight: 600;
  cursor: pointer;
}

.template-trigger:hover {
  border-color: var(--color-brand);
  background: var(--color-brand-subtle);
}

.template-trigger-label {
  height: 20px;
  padding: 0 6px;
  border-radius: var(--radius-sm);
  background: var(--color-brand);
  color: var(--color-text-inverse);
  font-size: 11px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
}

.template-trigger-name {
  color: var(--color-text-primary);
  font-size: var(--font-size-xs);
  font-weight: 700;
  max-width: 150px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.template-trigger-arrow {
  color: var(--color-text-secondary);
  font-size: 11px;
  line-height: 1;
}

.a4-badge {
  height: 24px;
  padding: 0 8px;
  border-radius: var(--radius-md);
  background: var(--color-bg-panel);
  border: 1px solid var(--color-border-default);
  color: var(--color-text-secondary);
  font-size: 11px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
}

.btn-export {
  border: none;
  height: 30px;
  padding: 0 12px;
  border-radius: var(--radius-md);
  background: var(--color-brand);
  color: var(--color-text-inverse);
  font-size: var(--font-size-xs);
  font-weight: 700;
  cursor: pointer;
  flex-shrink: 0;
}

.btn-export:hover:not(:disabled) {
  background: var(--color-brand-hover);
}

.btn-export:disabled {
  opacity: 0.7;
  cursor: wait;
}

.preview-toolbar {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  flex: 1 1 auto;
  min-width: 0;
  flex-wrap: wrap;
}

.mobile-preview-actions {
  display: none;
}

.toolbar-share-button {
  min-width: 64px;
}

.toolbar-dropdown {
  position: relative;
  flex-shrink: 0;
}

.toolbar-button {
  height: 30px;
  padding: 0 10px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-default);
  background: var(--color-bg-panel);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}

.toolbar-button:hover,
.toolbar-button[aria-expanded='true'] {
  border-color: var(--color-brand);
  color: var(--color-brand);
  background: var(--color-brand-subtle);
}

.layout-popover,
.line-height-menu,
.font-size-menu,
.export-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-default);
  background: var(--color-bg-panel);
  box-shadow: var(--shadow-lg);
  z-index: 25;
}

.layout-popover {
  width: 390px;
  max-width: min(390px, calc(100vw - 24px));
  padding: 18px 20px;
}

.line-height-menu,
.font-size-menu {
  min-width: 132px;
  padding: 4px;
}

.export-menu {
  min-width: 152px;
  padding: 4px;
}

.font-size-item,
.line-height-item,
.export-menu-item {
  width: 100%;
  min-height: 32px;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--color-bg-panel);
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 9px;
  font-size: var(--font-size-xs);
  font-weight: 600;
  cursor: pointer;
  text-align: left;
}

.font-size-item strong,
.line-height-item strong {
  color: var(--color-text-tertiary);
  font-size: 11px;
  font-weight: 700;
}

.font-size-item:hover,
.font-size-item.active,
.line-height-item:hover,
.line-height-item.active,
.export-menu-item:hover {
  background: var(--color-brand-subtle);
  color: var(--color-brand);
}

.font-size-item.active strong,
.line-height-item.active strong {
  color: var(--color-brand);
}

.export-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  position: relative;
}

.export-feedback {
  padding: 8px 10px;
  border-radius: var(--radius-md);
  font-size: var(--font-size-xs);
  font-weight: 600;
}

.export-feedback.success {
  background: var(--color-success-subtle);
  color: var(--color-success);
}

.export-feedback.warning {
  background: var(--color-warning-subtle);
  color: var(--color-warning);
}

.export-feedback.error {
  background: var(--color-danger-subtle);
  color: var(--color-danger);
}

.export-progress {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 10px;
  border: 1px solid var(--color-brand-muted);
  border-radius: var(--radius-md);
  background: var(--color-info-subtle);
}

.export-progress-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.export-progress-text {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  font-weight: 600;
}

.export-progress-percent {
  font-size: var(--font-size-xs);
  color: var(--color-text-primary);
  font-weight: 700;
}

.export-progress-track {
  position: relative;
  width: 100%;
  height: 6px;
  border-radius: var(--radius-full);
  background: var(--color-border-subtle);
  overflow: hidden;
}

.export-progress-fill {
  display: block;
  height: 100%;
  border-radius: var(--radius-full);
  background: var(--color-brand);
  transition: width 0.18s ease;
}

.mobile-sheet-section {
  margin-bottom: var(--space-4);
}

.mobile-sheet-label {
  margin-bottom: var(--space-2);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: 700;
}

.mobile-preset-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.mobile-preset-btn {
  min-height: 38px;
  padding: 0 8px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-default);
  background: var(--color-bg-subtle);
  color: var(--color-text-primary);
  font-size: var(--font-size-xs);
  font-weight: 600;
  cursor: pointer;
}

.mobile-preset-btn.active {
  border-color: var(--color-brand);
  background: var(--color-brand-subtle);
  color: var(--color-brand-text);
}

.mobile-export-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mobile-export-item {
  min-height: 46px;
  padding: 0 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-default);
  background: var(--color-bg-panel);
  color: var(--color-text-primary);
  font-size: var(--font-size-md);
  font-weight: 700;
  text-align: left;
  cursor: pointer;
}

.mobile-export-item.primary {
  border-color: var(--color-brand);
  background: var(--color-brand);
  color: var(--color-text-inverse);
}

@media (max-width: 760px) {
  .preview-panel {
    width: 100%;
    max-width: none;
    flex: 1;
    overflow: hidden;
    border-left: none;
    padding: 10px 8px calc(74px + env(safe-area-inset-bottom, 0px));
    gap: 8px;
  }

  .preview-top {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
    padding: 0 4px;
  }

  .desktop-only-toolbar,
  .a4-badge {
    display: none;
  }

  .mobile-preview-actions {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 6px;
  }

  .mobile-action-pill {
    min-height: 38px;
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border-default);
    background: var(--color-bg-panel);
    color: var(--color-text-primary);
    font-size: var(--font-size-xs);
    font-weight: 700;
    cursor: pointer;
  }

  .mobile-action-pill.primary {
    border-color: var(--color-brand);
    background: var(--color-brand);
    color: var(--color-text-inverse);
  }
}
</style>
