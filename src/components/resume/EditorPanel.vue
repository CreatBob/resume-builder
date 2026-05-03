<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, type Component } from 'vue'
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
// author: jf

const store = useResumeStore()
const showSaved = ref(false)
const searchValue = ref('')
const showAiPanel = ref(false)
const jsonImportInputRef = ref<HTMLInputElement | null>(null)
const nowTick = ref(Date.now())

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

  const firstAward = store.awardList.find((a) => [a.name, a.date].some((value) => value?.trim()))
  const awardsScore = firstAward ? scoreByFilled([firstAward.name, firstAward.date]) : 0

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

function handleSave() {
  store.saveToStorage()
  showSaved.value = true
  setTimeout(() => {
    showSaved.value = false
  }, 1800)
}

function triggerJsonImport() {
  jsonImportInputRef.value?.click()
}

async function handleImportJson(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const raw = await file.text()
  input.value = ''
  store.importResumeData(raw)
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

function toggleExpand(key: string) {
  expanded[key] = !expanded[key]
}

let autoSaveTicker: ReturnType<typeof setInterval> | null = null

onMounted(() => {
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
    <div class="editor-toolbar">
      <input v-model="searchValue" class="search-input" placeholder="搜索模块：基本信息 / 教育经历 / 专业技能" />
      <span
        class="chip"
        :class="{ 'chip-pending': isAutoSavePending, 'chip-saving': store.isSaving }"
        :title="autoSaveChipText"
        :aria-label="autoSaveChipText"
        role="status"
        aria-live="polite"
      >
        <span v-if="store.isSaving" class="chip-loading" aria-hidden="true"></span>
        <svg v-else class="chip-status-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 7v5l3 2" />
          <circle cx="12" cy="12" r="8" />
        </svg>
      </span>
    </div>

    <EditorFloatingTools @open-ai="handleAiClick" />

    <div class="stats-row">
      <div class="stat-card">
        <p class="stat-label">简历完整度</p>
        <p class="stat-value">{{ completionPercent }}%</p>
      </div>
      <div class="stat-card">
        <p class="stat-label">模块已启用</p>
        <p class="stat-value">{{ visibleCount }} / {{ store.modules.length }}</p>
      </div>
    </div>

    <section class="info-editor">
      <div class="info-editor-header">
        <h2 class="editor-title">信息编辑区</h2>
        <div class="editor-header-actions">
          <button class="btn-import" type="button" @click="triggerJsonImport">导入 JSON</button>
          <button class="btn-save" @click="handleSave">保存草稿</button>
        </div>
      </div>
      <p class="editor-subtitle">模块顺序与模块开关一致，点击右侧可展开/收起</p>
      <input
        ref="jsonImportInputRef"
        type="file"
        accept=".json,application/json"
        style="display: none"
        @change="handleImportJson"
      />
      <transition name="fade">
        <p v-if="showSaved" class="save-hint">已保存</p>
      </transition>

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
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
}

.search-input {
  flex: 1;
  min-width: 0;
  height: 40px;
  border: 1px solid #ddd2c6;
  border-radius: 8px;
  padding: 0 12px;
  background: #fff;
  color: #2d2521;
  font-size: 13px;
}

.search-input:focus {
  outline: none;
  border-color: #d97745;
  box-shadow: 0 0 0 3px rgba(217, 119, 69, 0.14);
}

.chip {
  position: relative;
  overflow: hidden;
  width: 40px;
  height: 40px;
  padding: 0;
  border-radius: 8px;
  background: #efe7dc;
  color: #7b6a5b;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  transition: background-color 0.2s ease, color 0.2s ease;
  animation: chip-breath 2.6s ease-in-out infinite;
}

.chip::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    110deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.38) 44%,
    rgba(255, 255, 255, 0) 72%
  );
  transform: translateX(-120%);
  animation: chip-sheen 3.2s ease-in-out infinite;
  pointer-events: none;
}

.chip-pending {
  background: #fae8dc;
  color: #b7633b;
  animation-duration: 1.1s;
}

.chip-saving {
  background: #ffe8d9;
  color: #b54d1f;
  animation: chip-blink 0.72s ease-in-out infinite;
}

.chip-loading {
  flex-shrink: 0;
  width: 15px;
  height: 15px;
  border-radius: 50%;
  border: 2px solid rgba(181, 77, 31, 0.24);
  border-top-color: #b54d1f;
  animation: chip-spin 0.75s linear infinite;
}

.chip-status-icon {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

@keyframes chip-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes chip-breath {
  0%,
  100% {
    opacity: 0.96;
  }

  50% {
    opacity: 0.78;
  }
}

@keyframes chip-sheen {
  0%,
  64%,
  100% {
    transform: translateX(-120%);
  }

  88% {
    transform: translateX(150%);
  }
}

@keyframes chip-blink {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.55;
  }
}

.btn-export {
  height: 40px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid #ddcfbf;
  background: #fff;
  color: #2d2521;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: border-color 0.18s, color 0.18s;
}

.btn-export:hover {
  border-color: #d97745;
  color: #d97745;
}

.stats-row {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.stat-card {
  background: #fff;
  border: 1px solid #e9ded0;
  border-radius: 10px;
  padding: 14px;
}

.stat-label {
  font-size: 11px;
  color: #8a7461;
  margin-bottom: 4px;
}

.stat-value {
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 32px;
  line-height: 1;
  font-weight: 700;
  color: #2d2521;
}

.info-editor {
  background: #fff;
  border: 1px solid #e9ded0;
  border-radius: 12px;
  padding: 16px;
}

.info-editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.editor-header-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.editor-title {
  font-size: 18px;
  font-weight: 700;
  color: #2d2521;
}

.editor-subtitle {
  margin-top: 2px;
  font-size: 12px;
  color: #8a7461;
}

.btn-save {
  border: none;
  height: 36px;
  padding: 0 14px;
  border-radius: 8px;
  background: #2d2521;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.btn-import {
  height: 36px;
  padding: 0 14px;
  border-radius: 8px;
  border: 1px solid #ddcfbf;
  background: #fff;
  color: #2d2521;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.18s ease, color 0.18s ease, background-color 0.18s ease;
}

.btn-import:hover {
  border-color: #d97745;
  color: #d97745;
  background: #fff9f4;
}

.save-hint {
  margin-top: 6px;
  color: #d97745;
  font-size: 12px;
  font-weight: 600;
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
  .chip {
    display: none;
  }

  .stats-row {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .info-editor-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .editor-header-actions {
    width: 100%;
    flex-wrap: wrap;
  }

}

@container (max-width: 420px) {
  .editor-toolbar {
    flex-wrap: wrap;
  }

  .search-input {
    width: 100%;
  }

  .editor-panel {
    padding: 14px;
    gap: 10px;
  }

  .info-editor {
    padding: 12px;
  }

  .stat-value {
    font-size: 26px;
  }
}
</style>
