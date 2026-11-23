<!-- author: Bob -->
<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { copyTextToClipboard } from '@/services/clipboardService'
import {
  buildPromptReferenceJson,
  buildResumeAiPrompt,
  type PromptCollabMode,
  type PromptSchemaSource,
} from '@/services/resumePromptTemplateService'
import { useResumeStore } from '@/stores/resume'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'open-import'): void
}>()

const store = useResumeStore()

const schemaSource = ref<PromptSchemaSource>('blank')
const collabMode = ref<PromptCollabMode>('conversational')
const onlyVisibleModules = ref(false)
const targetJobTitle = ref('')
const targetJd = ref('')
const rawExperience = ref('')
const extraRequirements = ref('')
const promptText = ref('')
const isPromptCustomized = ref(false)
const copyStatusText = ref('')
const copyStatusType = ref<'success' | 'warning' | ''>('')

const generatedPrompt = computed(() =>
  buildResumeAiPrompt(store.snapshotResumeData(), {
    schemaSource: schemaSource.value,
    collabMode: collabMode.value,
    onlyVisibleModules: onlyVisibleModules.value,
    targetJobTitle: targetJobTitle.value,
    targetJd: targetJd.value,
    rawExperience: rawExperience.value,
    extraRequirements: extraRequirements.value,
  }),
)

const referenceJsonOnly = computed(() =>
  buildPromptReferenceJson(store.snapshotResumeData(), {
    schemaSource: schemaSource.value,
    onlyVisibleModules: onlyVisibleModules.value,
  }),
)

function closeDialog() {
  emit('update:modelValue', false)
}

function handlePromptManualInput() {
  isPromptCustomized.value = true
}

function handleResetGeneratedPrompt() {
  isPromptCustomized.value = false
  promptText.value = generatedPrompt.value
  copyStatusText.value = ''
  copyStatusType.value = ''
}

async function handleCopyFullPrompt() {
  const content = promptText.value.trim()
  if (!content) return
  try {
    await copyTextToClipboard(content)
    copyStatusText.value = '完整提示词已复制到剪贴板，可直接发送给外部 AI 生成简历 JSON。'
    copyStatusType.value = 'success'
  } catch {
    copyStatusText.value = '自动复制失败，请全选下方文本框手工复制。'
    copyStatusType.value = 'warning'
  }
}

async function handleCopyJsonOnly() {
  try {
    await copyTextToClipboard(referenceJsonOnly.value)
    copyStatusText.value = '顶部参考 JSON 结构已复制到剪贴板。'
    copyStatusType.value = 'success'
  } catch {
    copyStatusText.value = '自动复制失败，请在下方预览框复制 JSON 代码块。'
    copyStatusType.value = 'warning'
  }
}

function handleGoToImport() {
  closeDialog()
  emit('open-import')
}

function handleKeydown(event: KeyboardEvent) {
  if (props.modelValue && event.key === 'Escape') {
    closeDialog()
  }
}

watch(generatedPrompt, (nextPrompt) => {
  if (!isPromptCustomized.value) {
    promptText.value = nextPrompt
  }
})

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      copyStatusText.value = ''
      copyStatusType.value = ''
      if (!isPromptCustomized.value) {
        promptText.value = generatedPrompt.value
      }
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
      class="prompt-dialog-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="AI 写简历提示词生成器"
      @click.self="closeDialog"
    >
      <div class="prompt-dialog-card">
        <div class="prompt-dialog-header">
          <div>
            <h3 class="prompt-dialog-title">AI 写简历提示词生成器</h3>
            <p class="prompt-dialog-subtitle">
              顶部自动附上纯净 JSON 结构，底部自带全行业通用简历编写原则与格式规范，复制即可让外部 AI 帮你写简历。
            </p>
          </div>
          <button class="prompt-close-btn" type="button" aria-label="关闭" @click="closeDialog">✕</button>
        </div>

        <div class="prompt-dialog-body">
          <div class="prompt-section-grid">
            <div class="prompt-control-group">
              <label class="control-label" for="prompt-job-title">目标岗位（全行业适用，留空保留占位符）</label>
              <input
                id="prompt-job-title"
                v-model="targetJobTitle"
                class="control-input"
                type="text"
                placeholder="例如：酒店前台 / 行政文员 / 资料员 / HR / 运营 / 运维 / 开发"
              />
            </div>

            <div class="prompt-control-group">
              <span class="control-label">顶部 JSON 结构来源</span>
              <div class="segmented-tabs" role="tablist" aria-label="JSON 结构来源">
                <button
                  class="segmented-tab"
                  type="button"
                  role="tab"
                  :aria-selected="schemaSource === 'blank'"
                  :class="{ active: schemaSource === 'blank' }"
                  @click="schemaSource = 'blank'"
                >
                  精简空白结构（推荐）
                </button>
                <button
                  class="segmented-tab"
                  type="button"
                  role="tab"
                  :aria-selected="schemaSource === 'current'"
                  :class="{ active: schemaSource === 'current' }"
                  @click="schemaSource = 'current'"
                >
                  基于当前简历改写
                </button>
              </div>
            </div>
          </div>

          <div class="prompt-option-row">
            <div class="prompt-control-group">
              <span class="control-label">AI 对话协作方式</span>
              <div class="segmented-tabs" role="tablist" aria-label="协作方式">
                <button
                  class="segmented-tab"
                  type="button"
                  role="tab"
                  :aria-selected="collabMode === 'conversational'"
                  :class="{ active: collabMode === 'conversational' }"
                  @click="collabMode = 'conversational'"
                >
                  先确认规则，再发经历（分步）
                </button>
                <button
                  class="segmented-tab"
                  type="button"
                  role="tab"
                  :aria-selected="collabMode === 'direct'"
                  :class="{ active: collabMode === 'direct' }"
                  @click="collabMode = 'direct'"
                >
                  贴入资料，一次直出 JSON
                </button>
              </div>
            </div>

            <label class="checkbox-inline">
              <input v-model="onlyVisibleModules" type="checkbox" />
              <span>仅包含当前已启用的模块</span>
            </label>
          </div>

          <div v-if="collabMode === 'direct'" class="direct-fields-box">
            <div class="prompt-control-group">
              <label class="control-label" for="prompt-raw-exp">我的个人资料 / 工作经历草稿（选填）</label>
              <textarea
                id="prompt-raw-exp"
                v-model="rawExperience"
                class="control-textarea"
                rows="3"
                placeholder="粘贴你的旧简历文字、工作职责要点、证书情况或个人背景..."
              />
            </div>
            <div class="prompt-control-group">
              <label class="control-label" for="prompt-target-jd">目标岗位招聘要求 JD（选填）</label>
              <textarea
                id="prompt-target-jd"
                v-model="targetJd"
                class="control-textarea"
                rows="2"
                placeholder="粘贴招聘信息中的岗位职责与任职要求，AI 会自动对齐关键词..."
              />
            </div>
          </div>

          <div class="prompt-control-group">
            <label class="control-label" for="prompt-extra-req">补充要求（选填）</label>
            <input
              id="prompt-extra-req"
              v-model="extraRequirements"
              class="control-input"
              type="text"
              placeholder="例如：突出夜班协调与外宾接待经验 / 控制在一页 A4 内 / 强调跨部门沟通"
            />
          </div>

          <div class="prompt-preview-card">
            <div class="preview-card-head">
              <div class="preview-head-left">
                <span class="preview-head-title">完整提示词预览（顶部 JSON 结构 + 底部编写规则）</span>
                <span class="preview-char-badge">{{ promptText.length }} 字</span>
              </div>
              <div class="preview-head-actions">
                <button
                  v-if="isPromptCustomized"
                  class="btn-inline-link"
                  type="button"
                  @click="handleResetGeneratedPrompt"
                >
                  恢复自动生成
                </button>
                <button class="btn-inline-secondary" type="button" @click="handleCopyJsonOnly">
                  仅复制 JSON 结构
                </button>
              </div>
            </div>

            <textarea
              v-model="promptText"
              class="prompt-preview-textarea"
              aria-label="完整提示词内容"
              rows="12"
              @input="handlePromptManualInput"
            />
            <p class="preview-tip">
              系统排版字段（<code>selectedTemplateKey</code>、<code>layoutSettings</code>）与头像大图已自动剔除；支持直接微调上方文本。
            </p>
          </div>

          <p v-if="copyStatusText" class="prompt-feedback" :class="copyStatusType">
            {{ copyStatusText }}
          </p>
        </div>

        <div class="prompt-dialog-footer">
          <button class="btn-footer-secondary" type="button" @click="handleGoToImport">
            已拿到 AI 生成的 JSON？去粘贴导入 →
          </button>
          <button class="btn-footer-primary" type="button" @click="handleCopyFullPrompt">
            一键复制完整提示词
          </button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<style scoped>
.prompt-dialog-overlay {
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

.prompt-dialog-card {
  width: min(720px, 100%);
  max-height: min(90vh, 860px);
  background: var(--color-bg-panel);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.prompt-dialog-header {
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border-subtle);
}

.prompt-dialog-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.prompt-dialog-subtitle {
  margin-top: var(--space-1);
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.prompt-close-btn {
  width: 32px;
  height: 32px;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-subtle);
  color: var(--color-text-secondary);
  cursor: pointer;
  flex-shrink: 0;
}

.prompt-close-btn:hover {
  border-color: var(--color-brand);
  color: var(--color-brand);
  background: var(--color-brand-subtle);
}

.prompt-dialog-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: var(--space-3) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.prompt-section-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}

.prompt-option-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.prompt-option-row .prompt-control-group {
  flex: 1 1 320px;
}

.prompt-control-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.control-label {
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--color-text-primary);
}

.control-input,
.control-textarea {
  width: 100%;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-panel);
  color: var(--color-text-primary);
  font-size: var(--font-size-xs);
  padding: 8px 10px;
}

.control-input {
  height: 32px;
  padding: 0 10px;
}

.control-textarea {
  resize: vertical;
  line-height: 1.5;
}

.control-input:focus,
.control-textarea:focus,
.prompt-preview-textarea:focus {
  outline: none;
  border-color: var(--color-border-focus);
  box-shadow: 0 0 0 3px var(--state-focus-ring);
}

.segmented-tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px;
  padding: 3px;
  border-radius: var(--radius-md);
  background: var(--color-bg-subtle);
  border: 1px solid var(--color-border-subtle);
}

.segmented-tab {
  min-height: 28px;
  padding: 0 8px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: 600;
  cursor: pointer;
}

.segmented-tab.active {
  background: var(--color-bg-panel);
  color: var(--color-brand);
  box-shadow: var(--shadow-xs);
  font-weight: 700;
}

.checkbox-inline {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 32px;
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-secondary);
  cursor: pointer;
}

.checkbox-inline input {
  accent-color: var(--color-brand);
}

.direct-fields-box {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-subtle);
  background: var(--color-bg-subtle);
}

.prompt-preview-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-default);
  background: var(--color-bg-subtle);
}

.preview-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.preview-head-left,
.preview-head-actions {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.preview-head-title {
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--color-text-primary);
}

.preview-char-badge {
  padding: 2px 8px;
  border-radius: var(--radius-full);
  background: var(--color-brand-subtle);
  color: var(--color-brand-text);
  font-size: 11px;
  font-weight: 700;
}

.btn-inline-link {
  border: none;
  background: transparent;
  color: var(--color-text-link);
  font-size: var(--font-size-xs);
  font-weight: 600;
  cursor: pointer;
}

.btn-inline-secondary {
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

.btn-inline-secondary:hover {
  border-color: var(--color-brand);
  color: var(--color-brand);
  background: var(--color-brand-subtle);
}

.prompt-preview-textarea {
  width: 100%;
  min-height: 210px;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-sm);
  background: var(--color-bg-panel);
  color: var(--color-text-primary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  line-height: 1.5;
  padding: 10px;
  resize: vertical;
}

.preview-tip {
  font-size: 11px;
  color: var(--color-text-tertiary);
}

.preview-tip code {
  color: var(--color-brand-text);
  background: var(--color-brand-subtle);
  padding: 1px 4px;
  border-radius: var(--radius-xs, 4px);
}

.prompt-feedback {
  padding: 8px 12px;
  border-radius: var(--radius-md);
  font-size: var(--font-size-xs);
  font-weight: 700;
}

.prompt-feedback.success {
  background: var(--color-success-subtle);
  color: var(--color-success);
}

.prompt-feedback.warning {
  background: var(--color-warning-subtle);
  color: var(--color-warning);
}

.prompt-dialog-footer {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--color-border-subtle);
  background: var(--color-bg-panel);
}

.btn-footer-secondary {
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

.btn-footer-secondary:hover {
  border-color: var(--color-brand);
  color: var(--color-brand);
  background: var(--color-brand-subtle);
}

.btn-footer-primary {
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

.btn-footer-primary:hover {
  background: var(--color-brand-hover);
}

@media (max-width: 760px) {
  .prompt-dialog-overlay {
    align-items: flex-end;
    padding: 0;
  }

  .prompt-dialog-card {
    width: 100vw;
    max-height: 90dvh;
    border-radius: 16px 16px 0 0;
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }

  .prompt-dialog-header,
  .prompt-dialog-body,
  .prompt-dialog-footer {
    padding-left: var(--space-4);
    padding-right: var(--space-4);
  }

  .prompt-section-grid {
    grid-template-columns: 1fr;
  }

  .prompt-dialog-footer {
    flex-direction: column-reverse;
    align-items: stretch;
  }
}
</style>
