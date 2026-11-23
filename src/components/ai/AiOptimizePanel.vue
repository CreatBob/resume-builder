<!-- author: Bob -->
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import AiConfigDialog from '@/components/ai/AiConfigDialog.vue'
import AiDiffPreview from '@/components/ai/AiDiffPreview.vue'
import { useAiConfigStore } from '@/stores/aiConfig'
import { useResumeStore } from '@/stores/resume'
import {
  getModuleLabel,
  parseAiResponse,
  type ModuleData,
} from '@/services/aiService'
import {
  optimizeResumeModule,
  resolveActiveAiChannel,
} from '@/services/aiOptimizeRouterService'
import {
  APPLY_SUPPORTED_MODULES,
  applyOptimizedModuleContent,
  buildBeforePreviewText,
  computeLineDiff,
  extractSelectableEntries,
  renderMarkdownHtml,
  restoreAppliedModuleSnapshot,
  type ApplyUndoSnapshot,
} from '@/services/aiOptimizeApplyService'
import { AI_OPTIMIZE_SCENARIOS, type AiOptimizeScenario } from '@/services/prompts'

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'open-prompt-helper'): void
}>()

const resumeStore = useResumeStore()
const aiConfigStore = useAiConfigStore()

const selectedModule = ref('')
const targetEntryIndex = ref<number | null>(null)
const selectedScenario = ref<AiOptimizeScenario>('star-quantify')
const showJdContext = ref(false)
const targetJd = ref('')
const customInstruction = ref('')
const followUpInput = ref('')

const isLoading = ref(false)
const streamText = ref('')
const errorMsg = ref('')
const isDone = ref(false)
const showConfigDialog = ref(false)
const appliedModules = ref<Set<string>>(new Set())
const applyHistory = ref<Record<string, ApplyUndoSnapshot[]>>({})
const selectedEntryIndexes = ref<number[]>([])

let abortController: AbortController | null = null

const visibleModules = computed(() => resumeStore.modules.filter((m) => m.visible))

const activeChannel = computed(() => resolveActiveAiChannel())
const channelBadgeLabel = computed(() => {
  if (activeChannel.value === 'byok') {
    return aiConfigStore.isConfigured
      ? `自带 Key · ${aiConfigStore.modelName}`
      : '自带 Key · 未配置'
  }
  return '后端 AI 服务'
})
const needsByokSetup = computed(() => activeChannel.value === 'byok' && !aiConfigStore.isConfigured)

const entryOptions = computed(() => {
  if (selectedModule.value === 'workExperience') {
    return resumeStore.workList.map((w, idx) => ({
      index: idx,
      label: [w.company.trim(), w.position.trim()].filter(Boolean).join(' · ') || `工作经历 ${idx + 1}`,
    }))
  }
  if (selectedModule.value === 'projectExperience') {
    return resumeStore.projectList.map((p, idx) => ({
      index: idx,
      label: p.name.trim() || `项目经历 ${idx + 1}`,
    }))
  }
  return []
})

function jdStorageKey(resumeId: string): string {
  return `resume-builder-target-jd:${resumeId || 'default'}`
}

watch(
  () => resumeStore.currentResumeId,
  (id, prevId) => {
    targetJd.value = localStorage.getItem(jdStorageKey(id)) ?? ''
    if (prevId !== undefined && id !== prevId) {
      abortController?.abort()
      abortController = null
      isLoading.value = false
      applyHistory.value = {}
      appliedModules.value.clear()
    }
  },
  { immediate: true },
)

watch(targetJd, (val) => {
  localStorage.setItem(jdStorageKey(resumeStore.currentResumeId), val)
})

watch(selectedModule, () => {
  targetEntryIndex.value = null
})

const parsed = computed(() => parseAiResponse(streamText.value))
const renderedSuggestions = computed(() => renderMarkdownHtml(parsed.value.suggestions))
const renderedMissingInfo = computed(() => renderMarkdownHtml(parsed.value.missingInfo))
const showMissingInfoCard = computed(() => {
  const raw = parsed.value.missingInfo.trim()
  return Boolean(raw) && !raw.startsWith('信息较完整')
})

const resolvedOptimizedContent = computed(() => parsed.value.optimizedContent.trim())

const renderedOptimizedHtml = computed(() => renderMarkdownHtml(resolvedOptimizedContent.value))

const selectableEntries = computed(() =>
  extractSelectableEntries(
    selectedModule.value,
    resolvedOptimizedContent.value,
    resumeStore,
    targetEntryIndex.value,
  ),
)

watch(selectableEntries, (entries) => {
  selectedEntryIndexes.value = entries.map((item) => item.index)
})

const diffLines = computed(() => {
  if (!selectedModule.value || !resolvedOptimizedContent.value) return []
  const before = buildBeforePreviewText(selectedModule.value, resumeStore, targetEntryIndex.value)
  return computeLineDiff(before, resolvedOptimizedContent.value)
})

const canApplySelectedModule = computed(() => APPLY_SUPPORTED_MODULES.has(selectedModule.value))
const canUndoSelectedModule = computed(() => (applyHistory.value[selectedModule.value]?.length ?? 0) > 0)

function getModuleData(): ModuleData {
  return {
    basicInfo: { ...resumeStore.basicInfo },
    educationList: resumeStore.educationList.map((e) => ({ ...e })),
    skills: resumeStore.skills,
    workList: resumeStore.workList.map((w) => ({ ...w })),
    projectList: resumeStore.projectList.map((p) => ({ ...p })),
    awardList: resumeStore.awardList.map((a) => ({ ...a })),
    selfIntro: resumeStore.selfIntro,
  }
}

async function runOptimize(followUpAnswers = '') {
  if (!selectedModule.value) return

  abortController?.abort()
  const controller = new AbortController()
  abortController = controller
  isLoading.value = true
  streamText.value = ''
  errorMsg.value = ''
  isDone.value = false
  appliedModules.value.delete(selectedModule.value)

  await optimizeResumeModule(
    {
      aiConfig: aiConfigStore,
      moduleKey: selectedModule.value,
      moduleData: getModuleData(),
      options: {
        scenario: selectedScenario.value,
        targetJd: targetJd.value,
        customInstruction: customInstruction.value,
        targetEntryIndex: targetEntryIndex.value,
        followUpAnswers,
      },
    },
    {
      onChunk(text) {
        if (abortController !== controller || controller.signal.aborted) return
        streamText.value = text
      },
      onDone(fullText) {
        if (abortController !== controller || controller.signal.aborted) return
        streamText.value = fullText
        isLoading.value = false
        isDone.value = true
      },
      onError(err) {
        if (abortController !== controller || controller.signal.aborted) return
        errorMsg.value = err
        isLoading.value = false
      },
    },
    controller.signal,
  )
}

function handleOptimize() {
  void runOptimize()
}

function handleRefineWithAnswers() {
  if (!followUpInput.value.trim()) return
  const supplement = followUpInput.value.trim()
  followUpInput.value = ''
  void runOptimize(supplement)
}

function handleStop() {
  abortController?.abort()
  abortController = null
  isLoading.value = false
  if (streamText.value) isDone.value = true
}

function handleApply() {
  if (!resolvedOptimizedContent.value || !selectedModule.value) return
  const result = applyOptimizedModuleContent({
    moduleKey: selectedModule.value,
    rawOptimizedText: resolvedOptimizedContent.value,
    resumeStore,
    targetEntryIndex: targetEntryIndex.value,
    selectedEntryIndexes: selectableEntries.value.length > 1 ? selectedEntryIndexes.value : null,
  })
  if (!result.applied) {
    errorMsg.value = result.error ?? `「${getModuleLabel(selectedModule.value)}」暂不支持一键应用。`
    return
  }
  if (result.snapshot) {
    if (!applyHistory.value[selectedModule.value]) applyHistory.value[selectedModule.value] = []
    applyHistory.value[selectedModule.value]!.push(result.snapshot)
  }
  appliedModules.value.add(selectedModule.value)
  errorMsg.value = ''
}

function handleUndoApply() {
  const key = selectedModule.value
  const list = applyHistory.value[key]
  if (!key || !list?.length) return
  const snapshot = list.pop()
  if (!snapshot) return
  const restored = restoreAppliedModuleSnapshot(key, snapshot, resumeStore)
  if (!restored) {
    errorMsg.value = '该撤销快照属于其他简历，无法在当前简历中回退。'
    return
  }
  appliedModules.value.delete(key)
  errorMsg.value = ''
}

function handleReset() {
  streamText.value = ''
  errorMsg.value = ''
  isDone.value = false
  appliedModules.value.delete(selectedModule.value)
}

function handleClose() {
  handleStop()
  emit('close')
}

function handleOpenPromptHelper() {
  handleClose()
  emit('open-prompt-helper')
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && !showConfigDialog.value) {
    handleClose()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  handleStop()
})
</script>

<template>
  <teleport to="body">
    <div class="panel-overlay">
      <aside class="optimize-panel" aria-label="AI 简历优化面板">
        <div class="panel-header">
          <div class="panel-header-left">
            <h3 class="panel-title">AI 优化建议</h3>
            <span class="channel-badge" :class="{ warn: needsByokSetup }">{{ channelBadgeLabel }}</span>
          </div>
          <div class="panel-header-right">
            <button class="config-trigger-btn" type="button" @click="handleOpenPromptHelper">
              写简历提示词
            </button>
            <button class="config-trigger-btn" type="button" @click="showConfigDialog = true">
              模型配置
            </button>
            <button class="close-btn" type="button" aria-label="关闭" @click="handleClose">
              ✕
            </button>
          </div>
        </div>

        <div v-if="needsByokSetup" class="setup-banner">
          <p class="setup-banner-text">
            当前为纯前端直连模式，填写任意 OpenAI 兼容 API Key 即可立即体验 AI 简历优化。
          </p>
          <div class="setup-banner-actions">
            <button class="btn-setup" type="button" @click="showConfigDialog = true">
              立即配置 API Key
            </button>
            <button class="btn-setup-secondary" type="button" @click="handleOpenPromptHelper">
              写简历提示词
            </button>
          </div>
        </div>

        <div class="selector-section">
          <div class="selector-grid">
            <div>
              <label class="selector-label" for="ai-module-select">优化模块</label>
              <select id="ai-module-select" v-model="selectedModule" class="module-select">
                <option value="" disabled>请选择模块...</option>
                <option v-for="mod in visibleModules" :key="mod.key" :value="mod.key">
                  {{ mod.label }}
                </option>
              </select>
            </div>

            <div v-if="entryOptions.length > 1">
              <label class="selector-label" for="ai-entry-select">优化范围</label>
              <select id="ai-entry-select" v-model="targetEntryIndex" class="module-select">
                <option :value="null">全部条目（{{ entryOptions.length }} 段）</option>
                <option v-for="opt in entryOptions" :key="opt.index" :value="opt.index">
                  仅优化：{{ opt.label }}
                </option>
              </select>
            </div>
          </div>

          <div class="scenario-row" role="group" aria-label="优化策略选择">
            <button
              v-for="item in AI_OPTIMIZE_SCENARIOS"
              :key="item.key"
              type="button"
              class="scenario-chip"
              :class="{ active: selectedScenario === item.key }"
              :title="item.description"
              @click="selectedScenario = item.key"
            >
              {{ item.label }}
            </button>
          </div>

          <button class="jd-toggle-btn" type="button" @click="showJdContext = !showJdContext">
            <span>{{ showJdContext ? '收起目标岗位 JD 与定制要求' : '填写目标岗位 JD / 自定义指令（可选）' }}</span>
            <span>{{ showJdContext ? '▴' : '▾' }}</span>
          </button>

          <div v-if="showJdContext" class="jd-context-box">
            <label class="selector-label" for="ai-target-jd">目标岗位 JD（按当前简历本地保存）</label>
            <textarea
              id="ai-target-jd"
              v-model="targetJd"
              class="context-textarea"
              rows="3"
              placeholder="粘贴岗位职责或任职要求，AI 将自动对齐关键词..."
            ></textarea>
            <label class="selector-label" for="ai-custom-instruction">额外定制要求</label>
            <input
              id="ai-custom-instruction"
              v-model="customInstruction"
              class="context-input"
              placeholder="例如：突出高并发缓存优化、或改写为英文要点"
            />
          </div>

          <div class="action-row">
            <button
              v-if="!isLoading"
              class="btn-optimize"
              type="button"
              :disabled="!selectedModule"
              @click="handleOptimize"
            >
              开始优化
            </button>
            <button v-else class="btn-stop" type="button" @click="handleStop">
              停止生成
            </button>
            <button v-if="isDone" class="btn-reset" type="button" @click="handleReset">
              清空结果
            </button>
          </div>
        </div>

        <div class="results-area">
          <div v-if="errorMsg" class="error-card">
            <p class="error-text">{{ errorMsg }}</p>
          </div>

          <div v-if="isLoading && !streamText" class="loading-card">
            <div class="loading-dots"><span></span><span></span><span></span></div>
            <p class="loading-text">AI 正在分析简历与岗位匹配度...</p>
          </div>

          <div v-if="parsed.suggestions" class="result-card suggestions-card">
            <h4 class="result-card-title">优化建议</h4>
            <div class="result-content markdown-content" v-html="renderedSuggestions"></div>
          </div>

          <div v-if="showMissingInfoCard" class="result-card missing-info-card">
            <h4 class="result-card-title">待补充量化数据（防编造追问）</h4>
            <div class="result-content markdown-content" v-html="renderedMissingInfo"></div>
            <div v-if="isDone" class="followup-box">
              <textarea
                v-model="followUpInput"
                class="context-textarea"
                rows="2"
                placeholder="补充真实数字或细节（如：QPS 从 120 提升到 680，耗时降至 45ms），AI 将重新融入内容..."
              ></textarea>
              <button
                class="btn-refine"
                type="button"
                :disabled="isLoading || !followUpInput.trim()"
                @click="handleRefineWithAnswers"
              >
                携带补充信息二次精修
              </button>
            </div>
          </div>

          <AiDiffPreview
            v-if="resolvedOptimizedContent"
            :rendered-html="renderedOptimizedHtml"
            :diff-lines="diffLines"
            :selectable-entries="selectableEntries"
            :selected-indexes="selectedEntryIndexes"
            :is-done="isDone"
            :can-apply="canApplySelectedModule"
            :is-applied="appliedModules.has(selectedModule)"
            :can-undo="canUndoSelectedModule"
            @update:selected-indexes="selectedEntryIndexes = $event"
            @apply="handleApply"
            @undo="handleUndoApply"
          />

          <span v-if="isLoading && streamText" class="stream-cursor">▌</span>
        </div>
      </aside>
    </div>

    <AiConfigDialog v-if="showConfigDialog" @close="showConfigDialog = false" />
  </teleport>
</template>

<style scoped>
.panel-overlay {
  position: fixed;
  inset: 0;
  background: transparent;
  z-index: 900;
  pointer-events: none;
}

.optimize-panel {
  --preview-panel-width: 812px;
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: calc(100vw - var(--preview-panel-width));
  min-width: 540px;
  max-width: 100vw;
  height: 100dvh;
  background: var(--color-bg-app);
  border-right: 1px solid var(--color-border-default);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
  pointer-events: auto;
  box-shadow: var(--shadow-lg);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--color-border-default);
  background: var(--color-bg-panel);
  flex-shrink: 0;
}

.panel-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex-wrap: wrap;
}

.panel-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.channel-badge {
  height: 24px;
  padding: 0 9px;
  border-radius: var(--radius-full);
  background: var(--color-brand-subtle);
  border: 1px solid var(--color-brand-muted);
  color: var(--color-brand-text);
  font-size: 11px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  max-width: 210px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.channel-badge.warn {
  background: var(--color-warning-subtle);
  border-color: var(--color-border-default);
  color: var(--color-warning);
}

.panel-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.config-trigger-btn {
  height: 30px;
  padding: 0 10px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-default);
  background: var(--color-bg-subtle);
  color: var(--color-text-primary);
  font-size: var(--font-size-xs);
  font-weight: 700;
  cursor: pointer;
}

.config-trigger-btn:hover {
  border-color: var(--color-brand);
  color: var(--color-brand);
  background: var(--color-brand-subtle);
}

.close-btn {
  width: 32px;
  height: 32px;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-subtle);
  color: var(--color-text-secondary);
  font-size: 14px;
  cursor: pointer;
}

.setup-banner {
  margin: 12px 18px 0;
  padding: 12px 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-brand-muted);
  background: var(--color-brand-subtle);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.setup-banner-text {
  font-size: var(--font-size-xs);
  color: var(--color-brand-text);
  font-weight: 600;
  flex: 1;
  min-width: 200px;
}

.setup-banner-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.btn-setup {
  height: 30px;
  padding: 0 12px;
  border: none;
  border-radius: var(--radius-md);
  background: var(--color-brand);
  color: var(--color-text-inverse);
  font-size: var(--font-size-xs);
  font-weight: 700;
  cursor: pointer;
}

.btn-setup-secondary {
  height: 30px;
  padding: 0 10px;
  border: 1px solid var(--color-brand);
  border-radius: var(--radius-md);
  background: var(--color-bg-panel);
  color: var(--color-brand-text);
  font-size: var(--font-size-xs);
  font-weight: 700;
  cursor: pointer;
}

.selector-section {
  padding: 14px 18px;
  border-bottom: 1px solid var(--color-border-default);
  background: var(--color-bg-panel);
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex-shrink: 0;
}

.selector-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
}

.selector-label {
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--color-text-secondary);
  margin-bottom: 4px;
  display: block;
}

.module-select,
.context-input,
.context-textarea {
  width: 100%;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-panel);
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
}

.module-select,
.context-input {
  height: 38px;
  padding: 0 10px;
}

.context-textarea {
  padding: 8px 10px;
  resize: vertical;
  line-height: 1.5;
}

.module-select:focus,
.context-input:focus,
.context-textarea:focus {
  outline: none;
  border-color: var(--color-border-focus);
  box-shadow: 0 0 0 3px var(--state-focus-ring);
}

.scenario-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.scenario-chip {
  height: 28px;
  padding: 0 10px;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border-default);
  background: var(--color-bg-subtle);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: 600;
  cursor: pointer;
}

.scenario-chip.active {
  border-color: var(--color-brand);
  background: var(--color-brand-subtle);
  color: var(--color-brand-text);
}

.jd-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 32px;
  padding: 0 10px;
  border-radius: var(--radius-md);
  border: 1px dashed var(--color-border-strong);
  background: var(--color-bg-subtle);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: 600;
  cursor: pointer;
}

.jd-context-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border-radius: var(--radius-md);
  background: var(--color-bg-subtle);
  border: 1px solid var(--color-border-subtle);
}

.action-row {
  display: flex;
  gap: 8px;
}

.btn-optimize,
.btn-stop,
.btn-reset {
  height: 38px;
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: 700;
  cursor: pointer;
}

.btn-optimize {
  flex: 1;
  border: none;
  background: var(--color-brand);
  color: var(--color-text-inverse);
}

.btn-optimize:hover:not(:disabled) {
  background: var(--color-brand-hover);
}

.btn-optimize:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-stop {
  flex: 1;
  border: 1px solid var(--color-danger);
  background: var(--color-danger-subtle);
  color: var(--color-danger);
}

.btn-reset {
  padding: 0 14px;
  border: 1px solid var(--color-border-default);
  background: var(--color-bg-panel);
  color: var(--color-text-secondary);
}

.results-area {
  flex: 1 0 auto;
  padding: 14px 18px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.error-card {
  padding: 12px 14px;
  border-radius: var(--radius-md);
  background: var(--color-danger-subtle);
  border: 1px solid rgba(220, 38, 38, 0.2);
}

.error-text {
  font-size: var(--font-size-sm);
  color: var(--color-danger);
  line-height: 1.5;
}

.loading-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 28px 16px;
}

.loading-dots {
  display: flex;
  gap: 6px;
}

.loading-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-brand);
  animation: bounce 1.2s infinite ease-in-out;
}

.loading-dots span:nth-child(2) { animation-delay: 0.15s; }
.loading-dots span:nth-child(3) { animation-delay: 0.3s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}

.loading-text {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.result-card {
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-default);
  background: var(--color-bg-panel);
  overflow: hidden;
}

.result-card-title {
  padding: 12px 14px 0;
  font-size: var(--font-size-sm);
  font-weight: 700;
  color: var(--color-text-primary);
}

.missing-info-card {
  border-color: var(--color-brand-muted);
  background: var(--color-brand-subtle);
}

.result-content {
  padding: 10px 14px 14px;
  font-size: var(--font-size-sm);
  color: var(--color-text-primary);
  line-height: 1.7;
  word-break: break-word;
}

.markdown-content :deep(ol),
.markdown-content :deep(ul) {
  padding-left: 20px;
  margin-bottom: 8px;
}

.markdown-content :deep(li) {
  margin-bottom: 4px;
}

.followup-box {
  padding: 0 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.btn-refine {
  align-self: flex-end;
  height: 34px;
  padding: 0 14px;
  border: none;
  border-radius: var(--radius-md);
  background: var(--color-brand);
  color: var(--color-text-inverse);
  font-size: var(--font-size-xs);
  font-weight: 700;
  cursor: pointer;
}

.btn-refine:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.stream-cursor {
  color: var(--color-brand);
  font-weight: 700;
  animation: blink 0.7s steps(2, start) infinite;
}

@keyframes blink {
  to { visibility: hidden; }
}

@media (max-width: 1480px) and (min-width: 761px) {
  .optimize-panel {
    --preview-panel-width: 640px;
    min-width: 420px;
  }
}

@media (max-width: 760px) {
  .optimize-panel {
    width: 100vw;
    max-width: 100vw;
    min-width: 0;
    border-right: none;
  }
}
</style>
