<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch, type Component } from 'vue'
import { useResumeStore } from '@/stores/resume'
import BasicInfoEditor from './editors/BasicInfoEditor.vue'
import EducationEditor from './editors/EducationEditor.vue'
import SkillsEditor from './editors/SkillsEditor.vue'
import WorkExperienceEditor from './editors/WorkExperienceEditor.vue'
import ProjectExperienceEditor from './editors/ProjectExperienceEditor.vue'
import AwardsEditor from './editors/AwardsEditor.vue'
import SelfIntroEditor from './editors/SelfIntroEditor.vue'
import AiOptimizePanel from '@/components/ai/AiOptimizePanel.vue'
import EditorFloatingTools from './EditorFloatingTools.vue'
import EditorModuleList from './EditorModuleList.vue'
import { awardHasContent } from '@/utils/awardContent'
// author: Bob

const store = useResumeStore()
const searchValue = ref('')
const showAiPanel = ref(false)
const jsonImportInputRef = ref<HTMLInputElement | null>(null)
const nowTick = ref(Date.now())
const renameValue = ref('')

function handleAiClick() {
  showAiPanel.value = true
}

const expanded = reactive<Record<string, boolean>>({
  basicInfo: true,
  education: false,
  skills: false,
  workExperience: false,
  projectExperience: false,
  awards: false,
  selfIntro: false,
})

const editorMap: Record<string, Component> = {
  basicInfo: BasicInfoEditor,
  education: EducationEditor,
  skills: SkillsEditor,
  workExperience: WorkExperienceEditor,
  projectExperience: ProjectExperienceEditor,
  awards: AwardsEditor,
  selfIntro: SelfIntroEditor,
}

const visibleCount = computed(() => store.modules.filter((m) => m.visible).length)
const searchKeyword = computed(() => searchValue.value.trim())
const filteredModules = computed(() =>
  store.modules.filter((m) => (searchKeyword.value ? m.label.includes(searchKeyword.value) : true))
)

function hasTextContent(value: string | undefined): boolean {
  if (!value) return false
  const text = value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .trim()
  return text.length > 0
}

function countFilled(values: Array<string | undefined>): number {
  return values.reduce((count, value) => count + (value?.trim() ? 1 : 0), 0)
}

function scoreByFilled(values: Array<string | undefined>): number {
  if (values.length === 0) return 0
  return countFilled(values) / values.length
}

const moduleCompletion = computed<Record<string, number>>(() => {
  const basic = store.basicInfo

  const basicInfoScore = scoreByFilled([
    basic.name,
    basic.phone,
    basic.email,
    basic.jobTitle,
    basic.expectedLocation,
    basic.educationLevel,
  ])

  const firstEducation = store.educationList.find((e) =>
    [e.school, e.major, e.degree, e.startDate].some((value) => value?.trim())
  )
  const educationScore = firstEducation
    ? scoreByFilled([firstEducation.school, firstEducation.major, firstEducation.degree, firstEducation.startDate])
    : 0

  const firstWork = store.workList.find((w) =>
    [w.company, w.position, w.startDate, w.description].some((value) => value?.trim())
  )
  const workScore = firstWork
    ? scoreByFilled([firstWork.company, firstWork.position, firstWork.startDate, firstWork.description])
    : 0

  const firstProject = store.projectList.find((p) =>
    [p.name, p.role, p.startDate, p.mainWork].some((value) => value?.trim())
  )
  const projectScore = firstProject
    ? scoreByFilled([firstProject.name, firstProject.role, firstProject.startDate, firstProject.mainWork])
    : 0

  const firstAward = store.awardList.find((a) => awardHasContent(a))
  const awardsScore = firstAward ? scoreByFilled([firstAward.description || firstAward.name, firstAward.date]) : 0

  return {
    basicInfo: basicInfoScore,
    education: educationScore,
    skills: hasTextContent(store.skills) ? 1 : 0,
    workExperience: workScore,
    projectExperience: projectScore,
    awards: awardsScore,
    selfIntro: hasTextContent(store.selfIntro) ? 1 : 0,
  }
})

const completionPercent = computed(() => {
  const enabledModules = store.modules.filter((m) => m.visible)
  if (enabledModules.length === 0) return 0
  const total = enabledModules.reduce((sum, mod) => sum + (moduleCompletion.value[mod.key] ?? 0), 0)
  return Math.round((total / enabledModules.length) * 100)
})

async function handleCreateResume() {
  await store.createResume()
  renameValue.value = store.currentResume?.title ?? ''
}

async function handleSwitchResume(event: Event) {
  const select = event.target as HTMLSelectElement
  const nextTitle = renameValue.value.trim()
  if (nextTitle && nextTitle !== store.currentResume?.title) {
    await store.renameCurrentResume(nextTitle)
  }
  await store.switchResume(select.value)
  renameValue.value = store.currentResume?.title ?? ''
}

async function handleRenameResume() {
  const title = renameValue.value.trim()
  if (!title) return
  await store.renameCurrentResume(title)
}

async function handleDeleteResume() {
  if (store.resumeDocuments.length <= 1) return
  const confirmed = window.confirm('确认删除当前简历？')
  if (!confirmed) return
  await store.deleteCurrentResume()
  renameValue.value = store.currentResume?.title ?? ''
}

function triggerJsonImport() {
  jsonImportInputRef.value?.click()
}

async function handleImportJson(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  try {
    const raw = await file.text()
    input.value = ''
    await store.importResumeData(raw)
  } catch (error) {
    store.workspaceError = error instanceof Error ? `导入 JSON 失败：${error.message}` : '导入 JSON 失败'
  }
}

const isAutoSavePending = computed(() => store.nextAutoSaveAt !== null)
const autoSaveChipText = computed(() => {
  if (store.isSaving) {
    return '自动保存中...'
  }

  const nextAt = store.nextAutoSaveAt
  if (nextAt) {
    const remainMs = Math.max(nextAt - nowTick.value, 0)
    const remainSec = Math.max(remainMs / 1000, 0.1)
    return `${remainSec.toFixed(1)}秒后自动保存`
  }

  const savedAt = store.lastSavedAt
  if (!savedAt) {
    return `自动保存间隔 ${Math.max(store.autoSaveDelayMs / 1000, 0.1).toFixed(1)}秒`
  }

  const elapsedMs = Math.max(nowTick.value - savedAt, 0)
  const label = store.lastSaveMode === 'manual' ? '手动保存' : '自动保存'
  if (elapsedMs < 2_000) return `刚刚${label}`
  if (elapsedMs < 60_000) return `${Math.floor(elapsedMs / 1000)}秒前${label}`
  return `${Math.floor(elapsedMs / 60_000)}分钟前${label}`
})

watch(
  () => store.currentResume?.title,
  (title) => {
    renameValue.value = title ?? ''
  },
  { immediate: true }
)

function toggleExpand(key: string) {
  expanded[key] = !expanded[key]
}

let autoSaveTicker: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  renameValue.value = store.currentResume?.title ?? ''
  autoSaveTicker = setInterval(() => {
    nowTick.value = Date.now()
  }, 200)
})

onUnmounted(() => {
  if (autoSaveTicker) {
    clearInterval(autoSaveTicker)
    autoSaveTicker = null
  }
})
</script>

<template>
  <main class="editor-panel">
    <EditorFloatingTools @open-ai="handleAiClick" />

    <section class="info-editor">
      <div class="editor-topbar">
        <div class="editor-topbar-left">
          <div class="editor-status-strip" aria-label="简历编辑状态">
            <span class="status-pill">
              <span class="status-label">完成度</span>
              <strong>{{ completionPercent }}%</strong>
            </span>
            <span class="status-pill">
              <span class="status-label">启用模块</span>
              <strong>{{ visibleCount }} / {{ store.modules.length }}</strong>
            </span>
            <span
              class="status-pill status-save-pill"
              :class="{ 'status-pill-pending': isAutoSavePending, 'status-pill-saving': store.isSaving }"
              :title="autoSaveChipText"
              :aria-label="autoSaveChipText"
              role="status"
              aria-live="polite"
            >
              <span v-if="store.isSaving" class="status-loading" aria-hidden="true"></span>
              <svg v-else class="status-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 7v5l3 2" />
                <circle cx="12" cy="12" r="8" />
              </svg>
              <span class="status-save-text">{{ autoSaveChipText }}</span>
            </span>
          </div>
        </div>

        <div class="editor-topbar-right">
          <div class="editor-header-actions">
            <button class="btn-import" type="button" @click="triggerJsonImport">导入 JSON</button>
          </div>
        </div>
      </div>

      <div class="editor-assist-row">
        <section class="editor-assist-bar editor-assist-bar-search" aria-label="辅助任务-搜索">
          <div class="assist-search">
            <label class="assist-label" for="module-search-input">搜索模块</label>
            <input
              id="module-search-input"
              v-model="searchValue"
              class="search-input"
              placeholder="基本信息 / 教育经历 / 专业技能"
            />
          </div>
        </section>

        <section class="editor-assist-bar editor-assist-bar-switcher" aria-label="辅助任务-切换简历">
          <div class="resume-switcher">
            <div class="resume-switcher-main">
              <label class="assist-label" for="resume-document-select">切换简历</label>
              <select
                id="resume-document-select"
                class="resume-select"
                :value="store.currentResumeId"
                :disabled="!store.isWorkspaceReady"
                @change="handleSwitchResume"
              >
                <option v-for="doc in store.resumeDocuments" :key="doc.id" :value="doc.id">
                  {{ doc.title }}
                </option>
              </select>
            </div>
            <input
              v-model="renameValue"
              class="resume-title-input"
              :disabled="!store.isWorkspaceReady"
              placeholder="简历名称"
              aria-label="简历名称"
              @blur="handleRenameResume"
              @keyup.enter="handleRenameResume"
            />
            <div class="resume-switcher-actions">
              <button
                class="btn-resume-action"
                type="button"
                :disabled="!store.isWorkspaceReady"
                @click="handleCreateResume"
              >
                新建
              </button>
              <button
                class="btn-resume-action btn-resume-danger"
                type="button"
                :disabled="!store.isWorkspaceReady || store.resumeDocuments.length <= 1"
                @click="handleDeleteResume"
              >
                删除
              </button>
            </div>
          </div>
        </section>
      </div>

      <p v-if="store.workspaceError" class="resume-storage-error">{{ store.workspaceError }}</p>

      <input
        ref="jsonImportInputRef"
        type="file"
        accept=".json,application/json"
        style="display: none"
        @change="handleImportJson"
      />
      <p class="module-hint">模块顺序与模块开关一致，点击右侧可展开/收起</p>

      <EditorModuleList
        :filtered-modules="filteredModules"
        :expanded="expanded"
        :editor-map="editorMap"
        @toggle-expand="toggleExpand"
      />
    </section>

    <AiOptimizePanel
      v-if="showAiPanel"
      @close="showAiPanel = false"
    />
  </main>
</template>

<style scoped>
.editor-panel {
  flex: 1;
  min-width: 0;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  container-type: inline-size;
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: var(--space-4);
}

.info-editor {
  width: 100%;
  min-width: 0;
  background: var(--color-bg-panel);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.editor-topbar {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: var(--space-4);
}

.editor-topbar-left {
  min-width: 0;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
}

.editor-topbar-right {
  min-width: 0;
  flex: 0 0 auto;
  display: flex;
  justify-content: flex-end;
}

.editor-header-actions {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  flex-shrink: 0;
}

.editor-status-strip {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--color-border-subtle);
}

.status-pill {
  min-height: 28px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border-subtle);
  background: var(--color-bg-subtle);
  color: var(--color-text-secondary);
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-xs);
  font-weight: 600;
  white-space: nowrap;
}

.status-pill strong {
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
  font-weight: 700;
}

.status-label {
  color: var(--color-text-tertiary);
}

.status-save-pill {
  min-width: 156px;
  max-width: 100%;
  color: var(--color-brand-text);
  background: var(--color-brand-subtle);
  border-color: var(--color-brand-muted);
}

.status-pill-pending {
  background: var(--color-warning-subtle);
  border-color: var(--color-border-default);
  color: var(--color-warning);
}

.status-pill-saving {
  background: var(--color-info-subtle);
  border-color: var(--color-brand-muted);
  color: var(--color-info);
}

.status-save-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-loading {
  flex-shrink: 0;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid var(--color-brand-muted);
  border-top-color: currentColor;
  animation: status-spin 0.75s linear infinite;
}

.status-icon {
  flex-shrink: 0;
  width: 15px;
  height: 15px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

@keyframes status-spin {
  to {
    transform: rotate(360deg);
  }
}

.editor-assist-bar {
  width: 100%;
  display: flex;
  align-items: end;
  padding: var(--space-3);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-bg-subtle);
}

.editor-assist-row {
  display: grid;
  grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.58fr);
  gap: var(--space-3);
}

.assist-search,
.resume-switcher-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.assist-label {
  color: var(--color-text-tertiary);
  font-size: 11px;
  font-weight: 700;
}

.search-input {
  width: 100%;
  min-width: 0;
  height: 34px;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  padding: 0 12px;
  background: var(--color-bg-panel);
  color: var(--color-text-primary);
  font-size: var(--font-size-sm);
}

.search-input:focus {
  outline: none;
  border-color: var(--color-border-focus);
  box-shadow: 0 0 0 3px var(--state-focus-ring);
}

.resume-switcher {
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr) auto;
  gap: var(--space-2);
  align-items: end;
  min-width: 0;
}

.resume-select,
.resume-title-input {
  width: 100%;
  height: 34px;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-panel);
  color: var(--color-text-primary);
  font-size: var(--font-size-xs);
  font-weight: 600;
  padding: 0 10px;
}

.resume-select:focus,
.resume-title-input:focus {
  outline: none;
  border-color: var(--color-border-focus);
  box-shadow: 0 0 0 3px var(--state-focus-ring);
}

.resume-switcher-actions {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.btn-resume-action {
  height: 34px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-default);
  background: var(--color-bg-panel);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: 700;
  cursor: pointer;
}

.btn-resume-action:hover:not(:disabled) {
  border-color: var(--color-border-strong);
  color: var(--color-text-primary);
  background: var(--state-hover-bg);
}

.btn-resume-action:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.btn-resume-danger {
  color: var(--color-danger);
}

.resume-storage-error {
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  background: var(--color-danger-subtle);
  color: var(--color-danger);
  font-size: var(--font-size-xs);
  font-weight: 600;
}

.btn-import {
  height: 36px;
  padding: 0 var(--space-4);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-default);
  background: var(--color-bg-panel);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.18s ease, color 0.18s ease, background-color 0.18s ease;
}

.btn-import:hover {
  border-color: var(--color-border-strong);
  color: var(--color-text-primary);
  background: var(--state-hover-bg);
}

.module-hint {
  color: var(--color-text-tertiary);
  font-size: var(--font-size-xs);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@container (max-width: 560px) {
  .editor-topbar {
    flex-direction: column;
  }

  .editor-topbar-right {
    width: 100%;
    justify-content: stretch;
  }

  .editor-assist-row {
    grid-template-columns: 1fr;
  }

  .resume-switcher {
    grid-template-columns: 1fr;
    align-items: stretch;
  }
}

@container (max-width: 420px) {
  .editor-panel {
    padding: 14px;
    gap: 10px;
  }

  .info-editor {
    padding: 12px;
  }

  .btn-import {
    width: 100%;
  }
}
</style>
