<!-- author: Bob -->
<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import {
  parseResumeFromJsonText,
  parseResumeFromShareLink,
  type ParsedResumeImportResult,
  type ResumeImportSourceType,
} from '@/services/resumeImportService'
import { useResumeStore } from '@/stores/resume'

export type ImportDialogTab = 'text' | 'link' | 'file'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    initialTab?: ImportDialogTab
  }>(),
  {
    initialTab: 'text',
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'imported', payload: { mode: 'create' | 'overwrite'; title: string }): void
  (e: 'open-prompt'): void
}>()

const store = useResumeStore()

const activeTab = ref<ImportDialogTab>('text')
const jsonTextInput = ref('')
const shareLinkInput = ref('')
const selectedFileName = ref('')
const isDragOver = ref(false)
const parsing = ref(false)
const importing = ref(false)
const errorText = ref('')
const clipboardHint = ref('')
const parsedResult = ref<ParsedResumeImportResult | null>(null)
const importMode = ref<'create' | 'overwrite'>('create')
const targetTitle = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)

const sourceLabelMap: Record<ResumeImportSourceType, string> = {
  'json-text': '粘贴 JSON 文本',
  'json-file': '本地 JSON 文件',
  'offline-link': '离线压缩长链',
  'share-link': '在线分享短链',
}

const currentResumeTitle = computed(() => store.currentResume?.title || '我的简历')

function closeDialog() {
  emit('update:modelValue', false)
}

function resetState() {
  activeTab.value = props.initialTab
  jsonTextInput.value = ''
  shareLinkInput.value = ''
  selectedFileName.value = ''
  isDragOver.value = false
  parsing.value = false
  importing.value = false
  errorText.value = ''
  clipboardHint.value = ''
  parsedResult.value = null
  importMode.value = 'create'
  targetTitle.value = ''
}

function clearParsedResult() {
  parsedResult.value = null
  errorText.value = ''
}

function applyParsedResult(result: ParsedResumeImportResult) {
  parsedResult.value = result
  targetTitle.value = result.suggestedTitle
  errorText.value = ''
  clipboardHint.value = ''
}

function handleParseJsonText() {
  errorText.value = ''
  clipboardHint.value = ''
  try {
    const result = parseResumeFromJsonText(jsonTextInput.value, { sourceType: 'json-text' })
    applyParsedResult(result)
  } catch (err) {
    parsedResult.value = null
    errorText.value = err instanceof Error ? err.message : 'JSON 解析失败，请检查输入格式。'
  }
}

async function handleParseLink() {
  if (parsing.value) return
  parsing.value = true
  errorText.value = ''
  clipboardHint.value = ''
  try {
    const result = await parseResumeFromShareLink(shareLinkInput.value)
    applyParsedResult(result)
  } catch (err) {
    parsedResult.value = null
    errorText.value = err instanceof Error ? err.message : '链接解析失败，请检查分享链接是否完整。'
  } finally {
    parsing.value = false
  }
}

async function handlePasteFromClipboard(target: 'text' | 'link') {
  errorText.value = ''
  clipboardHint.value = ''
  if (!navigator.clipboard?.readText) {
    clipboardHint.value = '当前浏览器不支持一键读取剪贴板，请在输入框中按 Ctrl+V 手动粘贴。'
    return
  }
  try {
    const text = await navigator.clipboard.readText()
    if (!text.trim()) {
      clipboardHint.value = '剪贴板为空，请先复制 JSON 文本或分享链接。'
      return
    }
    if (target === 'text') {
      jsonTextInput.value = text
      handleParseJsonText()
    } else {
      shareLinkInput.value = text.trim()
      await handleParseLink()
    }
  } catch {
    clipboardHint.value = '未获取剪贴板读取权限，请点击输入框后按 Ctrl+V 手动粘贴。'
  }
}

function triggerFileSelect() {
  fileInputRef.value?.click()
}

async function parseSelectedFile(file: File) {
  errorText.value = ''
  clipboardHint.value = ''
  selectedFileName.value = file.name
  try {
    const raw = await file.text()
    const fallbackTitle = file.name.replace(/\.json$/i, '').trim()
    const result = parseResumeFromJsonText(raw, {
      sourceType: 'json-file',
      fallbackTitle,
    })
    applyParsedResult(result)
  } catch (err) {
    parsedResult.value = null
    errorText.value = err instanceof Error ? `解析文件失败：${err.message}` : '解析 JSON 文件失败。'
  }
}

async function handleFileInputChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  await parseSelectedFile(file)
}

async function handleFileDrop(event: DragEvent) {
  isDragOver.value = false
  const file = event.dataTransfer?.files?.[0]
  if (!file) return
  await parseSelectedFile(file)
}

async function handleConfirmImport() {
  if (!parsedResult.value || importing.value) return
  importing.value = true
  errorText.value = ''
  try {
    const finalTitle =
      importMode.value === 'create'
        ? targetTitle.value.trim() || parsedResult.value.suggestedTitle || '导入的简历'
        : currentResumeTitle.value

    const savedDoc = await store.importResumeContent({
      content: parsedResult.value.data,
      title: importMode.value === 'create' ? finalTitle : undefined,
      mode: importMode.value,
      preserveTemplateIfMissing: true,
      preserveLayoutIfMissing: true,
    })

    if (!savedDoc) {
      errorText.value = store.workspaceError || '导入保存失败，请检查当前存储状态后重试。'
      return
    }

    emit('imported', {
      mode: importMode.value,
      title: savedDoc.title,
    })
    closeDialog()
  } catch (err) {
    errorText.value = err instanceof Error ? err.message : '导入简历失败，请重试。'
  } finally {
    importing.value = false
  }
}

function handleOpenPromptDialog() {
  closeDialog()
  emit('open-prompt')
}

function handleKeydown(event: KeyboardEvent) {
  if (props.modelValue && event.key === 'Escape') {
    closeDialog()
  }
}

watch(activeTab, () => {
  errorText.value = ''
  clipboardHint.value = ''
})

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      resetState()
      window.addEventListener('keydown', handleKeydown)
    } else {
      window.removeEventListener('keydown', handleKeydown)
    }
  },
  { immediate: true },
)

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <teleport to="body">
    <div
      v-if="props.modelValue"
      class="import-dialog-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="导入简历"
      @click.self="closeDialog"
    >
      <div class="import-dialog-card">
        <div class="import-dialog-header">
          <div>
            <h3 class="import-dialog-title">导入简历数据</h3>
            <p class="import-dialog-subtitle">
              支持直接粘贴 AI 生成的 JSON 文本、通过分享长链/短链导入，或上传本地 <code>.json</code> 文件。
            </p>
          </div>
          <button class="import-close-btn" type="button" aria-label="关闭" @click="closeDialog">✕</button>
        </div>

        <div class="import-dialog-body">
          <div class="import-tabs" role="tablist" aria-label="导入方式">
            <button
              class="import-tab"
              type="button"
              role="tab"
              :aria-selected="activeTab === 'text'"
              :class="{ active: activeTab === 'text' }"
              @click="activeTab = 'text'"
            >
              粘贴 JSON 文本
            </button>
            <button
              class="import-tab"
              type="button"
              role="tab"
              :aria-selected="activeTab === 'link'"
              :class="{ active: activeTab === 'link' }"
              @click="activeTab = 'link'"
            >
              通过链接导入
            </button>
            <button
              class="import-tab"
              type="button"
              role="tab"
              :aria-selected="activeTab === 'file'"
              :class="{ active: activeTab === 'file' }"
              @click="activeTab = 'file'"
            >
              上传 JSON 文件
            </button>
          </div>

          <div v-if="activeTab === 'text'" class="import-pane">
            <div class="pane-head-row">
              <label class="pane-label" for="import-json-textarea">粘贴 JSON 内容或 AI 回复代码块</label>
              <div class="pane-inline-actions">
                <button class="btn-mini" type="button" @click="handlePasteFromClipboard('text')">从剪贴板粘贴</button>
                <button
                  v-if="jsonTextInput"
                  class="btn-mini"
                  type="button"
                  @click="jsonTextInput = ''; clearParsedResult()"
                >
                  清空
                </button>
              </div>
            </div>
            <textarea
              id="import-json-textarea"
              v-model="jsonTextInput"
              class="import-textarea"
              rows="7"
              placeholder='可以直接粘贴纯 JSON，或直接复制外部 AI 回复里的 ```json ... ``` 整段文本'
            />
            <button class="btn-parse-action" type="button" @click="handleParseJsonText">
              解析 JSON 并预览
            </button>
          </div>

          <div v-else-if="activeTab === 'link'" class="import-pane">
            <div class="pane-head-row">
              <label class="pane-label" for="import-link-input">粘贴分享长链或短链</label>
              <button class="btn-mini" type="button" @click="handlePasteFromClipboard('link')">从剪贴板粘贴</button>
            </div>
            <textarea
              id="import-link-input"
              v-model="shareLinkInput"
              class="import-link-textarea"
              rows="3"
              placeholder="支持 /share#d=... 离线压缩长链，或本站 /share/cf_xxx 短链"
            />
            <button class="btn-parse-action" type="button" :disabled="parsing" @click="handleParseLink">
              {{ parsing ? '正在解析链接...' : '解析链接并预览' }}
            </button>
          </div>

          <div v-else class="import-pane">
            <div
              class="file-dropzone"
              :class="{ 'drag-over': isDragOver }"
              @dragover.prevent="isDragOver = true"
              @dragleave="isDragOver = false"
              @drop.prevent="handleFileDrop"
            >
              <p class="dropzone-title">将 <code>.json</code> 简历文件拖拽到此处</p>
              <p class="dropzone-desc">
                {{ selectedFileName ? `已选择文件：${selectedFileName}` : '支持由本系统导出的 JSON 文件，或外部整理好的标准结构文件' }}
              </p>
              <button class="btn-select-file" type="button" @click="triggerFileSelect">
                选择本地 JSON 文件
              </button>
              <input
                ref="fileInputRef"
                type="file"
                accept=".json,application/json"
                style="display: none"
                @change="handleFileInputChange"
              />
            </div>
          </div>

          <p v-if="clipboardHint" class="import-feedback warning">{{ clipboardHint }}</p>
          <p v-if="errorText" class="import-feedback error">{{ errorText }}</p>

          <div v-if="parsedResult" class="parsed-preview-card">
            <div class="parsed-head">
              <div class="parsed-head-left">
                <span class="source-badge">{{ sourceLabelMap[parsedResult.sourceType] }}</span>
                <strong class="parsed-title">已识别简历内容</strong>
              </div>
              <button class="btn-mini" type="button" @click="clearParsedResult">重新解析</button>
            </div>

            <div class="parsed-summary-grid">
              <div class="summary-item">
                <span class="summary-key">姓名</span>
                <strong class="summary-val">{{ parsedResult.summary.name || '未填写' }}</strong>
              </div>
              <div class="summary-item">
                <span class="summary-key">目标岗位</span>
                <strong class="summary-val">{{ parsedResult.summary.jobTitle || '未填写' }}</strong>
              </div>
              <div class="summary-item">
                <span class="summary-key">应用模板</span>
                <strong class="summary-val">{{ parsedResult.summary.templateName }}</strong>
              </div>
              <div class="summary-item">
                <span class="summary-key">识别模块</span>
                <strong class="summary-val">
                  教育 {{ parsedResult.summary.educationCount }} · 工作 {{ parsedResult.summary.workCount }} · 项目
                  {{ parsedResult.summary.projectCount }} · 奖项 {{ parsedResult.summary.awardCount }}
                </strong>
              </div>
            </div>

            <div v-if="parsedResult.warnings.length" class="parsed-warnings">
              <p v-for="(item, idx) in parsedResult.warnings" :key="`warn-${idx}`" class="warning-line">
                {{ item }}
              </p>
            </div>

            <div class="import-mode-group">
              <span class="pane-label">导入保存方式</span>
              <label class="mode-option" :class="{ active: importMode === 'create' }">
                <input v-model="importMode" type="radio" name="resume-import-mode" value="create" />
                <div class="mode-option-text">
                  <strong>新建为一份新简历（推荐）</strong>
                  <span>在多简历列表新建并切换过去，保留你当前正在编辑的简历</span>
                </div>
              </label>

              <div v-if="importMode === 'create'" class="new-title-row">
                <label class="new-title-label" for="import-new-resume-title">新简历名称</label>
                <input
                  id="import-new-resume-title"
                  v-model="targetTitle"
                  class="new-title-input"
                  type="text"
                  placeholder="请输入新简历名称"
                />
              </div>

              <label class="mode-option" :class="{ active: importMode === 'overwrite' }">
                <input v-model="importMode" type="radio" name="resume-import-mode" value="overwrite" />
                <div class="mode-option-text">
                  <strong>覆盖当前简历（{{ currentResumeTitle }}）</strong>
                  <span>用导入的内容替换当前选中简历，并立即触发保存</span>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div class="import-dialog-footer">
          <button class="btn-footer-link" type="button" @click="handleOpenPromptDialog">
            还没有 JSON？去复制 AI 写简历提示词 →
          </button>
          <div class="footer-right-actions">
            <button class="btn-footer-cancel" type="button" @click="closeDialog">取消</button>
            <button
              class="btn-footer-confirm"
              type="button"
              :disabled="!parsedResult || importing"
              @click="handleConfirmImport"
            >
              {{ importing ? '导入中...' : importMode === 'create' ? '确认新建并导入' : '确认覆盖当前简历' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </teleport>
</template>

<style scoped>
.import-dialog-overlay {
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

.import-dialog-card {
  width: min(640px, 100%);
  max-height: min(90vh, 840px);
  background: var(--color-bg-panel);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.import-dialog-header {
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border-subtle);
}

.import-dialog-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.import-dialog-subtitle {
  margin-top: var(--space-1);
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.import-dialog-subtitle code,
.dropzone-title code {
  color: var(--color-brand-text);
  background: var(--color-brand-subtle);
  padding: 1px 5px;
  border-radius: var(--radius-sm);
}

.import-close-btn {
  width: 32px;
  height: 32px;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-subtle);
  color: var(--color-text-secondary);
  cursor: pointer;
  flex-shrink: 0;
}

.import-close-btn:hover {
  border-color: var(--color-brand);
  color: var(--color-brand);
  background: var(--color-brand-subtle);
}

.import-dialog-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: var(--space-3) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.import-tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  padding: 4px;
  border-radius: var(--radius-md);
  background: var(--color-bg-subtle);
  border: 1px solid var(--color-border-subtle);
}

.import-tab {
  min-height: 30px;
  padding: 0 8px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: 700;
  cursor: pointer;
}

.import-tab.active {
  background: var(--color-bg-panel);
  color: var(--color-brand);
  box-shadow: var(--shadow-xs);
}

.import-pane {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.pane-head-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.pane-label {
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--color-text-primary);
}

.pane-inline-actions {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn-mini {
  height: 28px;
  padding: 0 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border-default);
  background: var(--color-bg-panel);
  color: var(--color-text-secondary);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

.btn-mini:hover {
  border-color: var(--color-brand);
  color: var(--color-brand);
  background: var(--color-brand-subtle);
}

.import-textarea,
.import-link-textarea,
.new-title-input {
  width: 100%;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-panel);
  color: var(--color-text-primary);
  font-size: var(--font-size-xs);
  padding: 10px;
}

.import-textarea {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  line-height: 1.5;
  resize: vertical;
}

.import-link-textarea {
  line-height: 1.5;
  resize: vertical;
}

.new-title-input {
  height: 32px;
  padding: 0 10px;
}

.import-textarea:focus,
.import-link-textarea:focus,
.new-title-input:focus {
  outline: none;
  border-color: var(--color-border-focus);
  box-shadow: 0 0 0 3px var(--state-focus-ring);
}

.btn-parse-action {
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid var(--color-brand);
  border-radius: var(--radius-md);
  background: var(--color-brand-subtle);
  color: var(--color-brand-text);
  font-size: var(--font-size-xs);
  font-weight: 700;
  cursor: pointer;
}

.btn-parse-action:hover:not(:disabled) {
  background: var(--color-brand);
  color: var(--color-text-inverse);
}

.btn-parse-action:disabled {
  opacity: 0.6;
  cursor: wait;
}

.file-dropzone {
  padding: var(--space-6) var(--space-4);
  border: 1.5px dashed var(--color-border-strong);
  border-radius: var(--radius-md);
  background: var(--color-bg-subtle);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--space-2);
}

.file-dropzone.drag-over {
  border-color: var(--color-brand);
  background: var(--color-brand-subtle);
}

.dropzone-title {
  font-size: var(--font-size-sm);
  font-weight: 700;
  color: var(--color-text-primary);
}

.dropzone-desc {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.btn-select-file {
  margin-top: var(--space-1);
  height: 34px;
  padding: 0 14px;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-panel);
  color: var(--color-text-primary);
  font-size: var(--font-size-xs);
  font-weight: 700;
  cursor: pointer;
}

.btn-select-file:hover {
  border-color: var(--color-brand);
  color: var(--color-brand);
  background: var(--color-brand-subtle);
}

.import-feedback {
  padding: 8px 12px;
  border-radius: var(--radius-md);
  font-size: var(--font-size-xs);
  font-weight: 600;
}

.import-feedback.warning {
  background: var(--color-warning-subtle);
  color: var(--color-warning);
}

.import-feedback.error {
  background: var(--color-danger-subtle);
  color: var(--color-danger);
}

.parsed-preview-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-3);
  border: 1px solid var(--color-brand-muted);
  border-radius: var(--radius-md);
  background: var(--color-bg-subtle);
}

.parsed-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.parsed-head-left {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.source-badge {
  padding: 2px 8px;
  border-radius: var(--radius-full);
  background: var(--color-brand-subtle);
  color: var(--color-brand-text);
  font-size: 11px;
  font-weight: 700;
}

.parsed-title {
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
}

.parsed-summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-2);
}

.summary-item {
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border-subtle);
  background: var(--color-bg-panel);
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.summary-key {
  font-size: 11px;
  color: var(--color-text-tertiary);
}

.summary-val {
  font-size: var(--font-size-xs);
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.parsed-warnings {
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  background: var(--color-warning-subtle);
  color: var(--color-warning);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.warning-line {
  font-size: 11px;
  font-weight: 600;
}

.import-mode-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.mode-option {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  padding: 10px 12px;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-panel);
  cursor: pointer;
}

.mode-option.active {
  border-color: var(--state-selected-border);
  background: var(--state-selected-bg);
}

.mode-option input {
  margin-top: 3px;
  accent-color: var(--color-brand);
}

.mode-option-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.mode-option-text strong {
  font-size: var(--font-size-xs);
  color: var(--color-text-primary);
}

.mode-option-text span {
  font-size: 11px;
  color: var(--color-text-secondary);
}

.new-title-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-left: var(--space-4);
}

.new-title-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-secondary);
}

.import-dialog-footer {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--color-border-subtle);
  background: var(--color-bg-panel);
}

.btn-footer-link {
  border: none;
  background: transparent;
  color: var(--color-text-link);
  font-size: var(--font-size-xs);
  font-weight: 600;
  cursor: pointer;
  text-align: left;
}

.footer-right-actions {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.btn-footer-cancel {
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-panel);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: 700;
  cursor: pointer;
}

.btn-footer-confirm {
  min-height: 34px;
  padding: 0 16px;
  border: none;
  border-radius: var(--radius-md);
  background: var(--color-brand);
  color: var(--color-text-inverse);
  font-size: var(--font-size-xs);
  font-weight: 700;
  cursor: pointer;
}

.btn-footer-confirm:hover:not(:disabled) {
  background: var(--color-brand-hover);
}

.btn-footer-confirm:disabled {
  background: var(--state-disabled-bg);
  color: var(--state-disabled-text);
  cursor: not-allowed;
}

@media (max-width: 760px) {
  .import-dialog-overlay {
    align-items: flex-end;
    padding: 0;
  }

  .import-dialog-card {
    width: 100vw;
    max-height: 90dvh;
    border-radius: 16px 16px 0 0;
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }

  .import-dialog-header,
  .import-dialog-body,
  .import-dialog-footer {
    padding-left: var(--space-4);
    padding-right: var(--space-4);
  }

  .parsed-summary-grid {
    grid-template-columns: 1fr;
  }

  .import-dialog-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .footer-right-actions {
    display: grid;
    grid-template-columns: 1fr 1.5fr;
  }
}
</style>
