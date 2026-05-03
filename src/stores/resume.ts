import { defineStore } from 'pinia'
import { reactive, ref, watch } from 'vue'
import { normalizeResumeTemplateKey, type ResumeTemplateKey } from '@/templates/resume'
// author: jf

export interface BasicInfo {
  name: string
  phone: string
  email: string
  age: string
  gender: string
  location: string
  jobTitle: string
  educationLevel: string
  avatar: string
  workYears: string
  currentStatus: string
  expectedLocation: string
  expectedSalary: string
  website: BasicLink
  wechat: string
  currentCity: string
  github: BasicLink
  blog: BasicLink
  customItems: CustomBasicInfoItem[]
}

export interface BasicLink {
  text: string
  url: string
}

export interface CustomBasicInfoItem {
  id: string
  label: string
  value: string
}

export interface EducationEntry {
  id: string
  school: string
  college: string
  major: string
  degree: string
  startDate: string
  endDate: string
  gpa: string
  description: string
  type: string
  location: string
}

export interface WorkEntry {
  id: string
  company: string
  department: string
  position: string
  startDate: string
  endDate: string
  location: string
  description: string
}

export interface ProjectEntry {
  id: string
  name: string
  role: string
  startDate: string
  endDate: string
  link: string
  introduction: string
  mainWork: string
}

export interface AwardEntry {
  id: string
  name: string
  date: string
  description: string
}

export interface ModuleConfig {
  key: string
  label: string
  icon: string
  visible: boolean
}

export interface ResumeLayoutSettings {
  pageMarginTop: number
  pageMarginLeft: number
  pageMarginRight: number
  moduleMarginTop: number
  moduleMarginBottom: number
  sectionTitleContentGap: number
  contentLineHeight: number
}

export type ResumeLayoutSettingKey = keyof ResumeLayoutSettings

type MoveDirection = 'up' | 'down'
const DEFAULT_MODULE_ORDER = [
  'basicInfo',
  'education',
  'skills',
  'workExperience',
  'projectExperience',
  'awards',
  'selfIntro',
] as const

export const DEFAULT_RESUME_LAYOUT_SETTINGS: ResumeLayoutSettings = {
  pageMarginTop: 28,
  pageMarginLeft: 24,
  pageMarginRight: 24,
  moduleMarginTop: 0,
  moduleMarginBottom: 8,
  sectionTitleContentGap: 6,
  contentLineHeight: 1.75,
}

export const RESUME_LAYOUT_LIMITS: Record<ResumeLayoutSettingKey, { min: number; max: number; step: number }> = {
  pageMarginTop: { min: 8, max: 60, step: 1 },
  pageMarginLeft: { min: 8, max: 60, step: 1 },
  pageMarginRight: { min: 8, max: 60, step: 1 },
  moduleMarginTop: { min: 0, max: 32, step: 1 },
  moduleMarginBottom: { min: 0, max: 40, step: 1 },
  sectionTitleContentGap: { min: 0, max: 28, step: 1 },
  contentLineHeight: { min: 1, max: 2.4, step: 0.05 },
}

let _idCounter = 0
function genId(): string {
  return `item_${Date.now()}_${++_idCounter}`
}

function createEmptyBasicLink(): BasicLink {
  return {
    text: '',
    url: '',
  }
}

function normalizeBasicLink(value: unknown): BasicLink {
  if (typeof value === 'string') {
    return {
      text: value,
      url: value,
    }
  }

  if (value && typeof value === 'object') {
    const link = value as Partial<BasicLink>
    return {
      text: typeof link.text === 'string' ? link.text : '',
      url: typeof link.url === 'string' ? link.url : '',
    }
  }

  return createEmptyBasicLink()
}

function normalizeCustomBasicItems(value: unknown): CustomBasicInfoItem[] {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const current = item as Partial<CustomBasicInfoItem>
      return {
        id: typeof current.id === 'string' && current.id ? current.id : genId(),
        label: typeof current.label === 'string' ? current.label : '',
        value: typeof current.value === 'string' ? current.value : '',
      }
    })
    .filter((item): item is CustomBasicInfoItem => Boolean(item))
}

function normalizeNumber(value: unknown, fallback: number, key: ResumeLayoutSettingKey): number {
  const numericValue = typeof value === 'number' ? value : Number(value)
  const limits = RESUME_LAYOUT_LIMITS[key]
  if (!Number.isFinite(numericValue)) return fallback
  const steppedValue = Math.round(numericValue / limits.step) * limits.step
  const precision = limits.step < 1 ? 2 : 0
  return Number(Math.min(limits.max, Math.max(limits.min, steppedValue)).toFixed(precision))
}

function normalizeLayoutSettings(value: unknown): ResumeLayoutSettings {
  const incoming = value && typeof value === 'object' ? (value as Partial<ResumeLayoutSettings>) : {}
  return {
    pageMarginTop: normalizeNumber(incoming.pageMarginTop, DEFAULT_RESUME_LAYOUT_SETTINGS.pageMarginTop, 'pageMarginTop'),
    pageMarginLeft: normalizeNumber(incoming.pageMarginLeft, DEFAULT_RESUME_LAYOUT_SETTINGS.pageMarginLeft, 'pageMarginLeft'),
    pageMarginRight: normalizeNumber(incoming.pageMarginRight, DEFAULT_RESUME_LAYOUT_SETTINGS.pageMarginRight, 'pageMarginRight'),
    moduleMarginTop: normalizeNumber(incoming.moduleMarginTop, DEFAULT_RESUME_LAYOUT_SETTINGS.moduleMarginTop, 'moduleMarginTop'),
    moduleMarginBottom: normalizeNumber(
      incoming.moduleMarginBottom,
      DEFAULT_RESUME_LAYOUT_SETTINGS.moduleMarginBottom,
      'moduleMarginBottom'
    ),
    sectionTitleContentGap: normalizeNumber(
      incoming.sectionTitleContentGap,
      DEFAULT_RESUME_LAYOUT_SETTINGS.sectionTitleContentGap,
      'sectionTitleContentGap'
    ),
    contentLineHeight: normalizeNumber(incoming.contentLineHeight, DEFAULT_RESUME_LAYOUT_SETTINGS.contentLineHeight, 'contentLineHeight'),
  }
}

export const useResumeStore = defineStore('resume', () => {
  const modules = reactive<ModuleConfig[]>([
    { key: 'basicInfo', label: '基本信息', icon: '👤', visible: true },
    { key: 'education', label: '教育经历', icon: '🎓', visible: true },
    { key: 'skills', label: '专业技能', icon: '⚡', visible: true },
    { key: 'workExperience', label: '工作经历', icon: '💼', visible: true },
    { key: 'projectExperience', label: '项目经历', icon: '📁', visible: true },
    { key: 'awards', label: '荣誉奖项', icon: '🏆', visible: false },
    { key: 'selfIntro', label: '个人简介', icon: '📝', visible: false },
  ])

  const basicInfo = reactive<BasicInfo>({
    name: '',
    phone: '',
    email: '',
    age: '',
    gender: '',
    location: '',
    jobTitle: '',
    educationLevel: '',
    avatar: '',
    workYears: '',
    currentStatus: '',
    expectedLocation: '',
    expectedSalary: '',
    website: createEmptyBasicLink(),
    wechat: '',
    currentCity: '',
    github: createEmptyBasicLink(),
    blog: createEmptyBasicLink(),
    customItems: [],
  })

  const educationList = reactive<EducationEntry[]>([
    {
      id: genId(),
      school: '',
      college: '',
      major: '',
      degree: '',
      startDate: '',
      endDate: '',
      gpa: '',
      description: '',
      type: '',
      location: '',
    },
  ])

  const skills = ref('')

  const workList = reactive<WorkEntry[]>([
    {
      id: genId(),
      company: '',
      department: '',
      position: '',
      startDate: '',
      endDate: '',
      location: '',
      description: '',
    },
  ])

  const projectList = reactive<ProjectEntry[]>([
    {
      id: genId(),
      name: '',
      role: '',
      startDate: '',
      endDate: '',
      link: '',
      introduction: '',
      mainWork: '',
    },
  ])

  const awardList = reactive<AwardEntry[]>([])
  const selfIntro = ref('')
  const selectedTemplateKey = ref<ResumeTemplateKey>('default')
  const layoutSettings = reactive<ResumeLayoutSettings>({ ...DEFAULT_RESUME_LAYOUT_SETTINGS })
  const nextAutoSaveAt = ref<number | null>(null)
  const lastSavedAt = ref<number | null>(null)
  const lastSaveMode = ref<'auto' | 'manual' | null>(null)
  const isSaving = ref(false)

  function toggleModule(key: string) {
    const mod = modules.find((m) => m.key === key)
    if (mod) mod.visible = !mod.visible
  }

  function setTemplate(key: ResumeTemplateKey) {
    selectedTemplateKey.value = key
  }

  function updateLayoutSetting(key: ResumeLayoutSettingKey, value: unknown) {
    layoutSettings[key] = normalizeNumber(value, DEFAULT_RESUME_LAYOUT_SETTINGS[key], key)
  }

  function resetLayoutSettings() {
    Object.assign(layoutSettings, DEFAULT_RESUME_LAYOUT_SETTINGS)
  }

  function isDefaultLayoutSettings(): boolean {
    return (Object.keys(DEFAULT_RESUME_LAYOUT_SETTINGS) as ResumeLayoutSettingKey[]).every(
      (key) => layoutSettings[key] === DEFAULT_RESUME_LAYOUT_SETTINGS[key]
    )
  }

  function canMoveModule(key: string, direction: MoveDirection): boolean {
    if (key === 'basicInfo') return false
    const idx = modules.findIndex((m) => m.key === key)
    if (idx < 0) return false
    const mod = modules[idx]
    if (!mod?.visible) return false
    if (direction === 'up') return idx > 1
    return idx < modules.length - 1
  }

  function moveModule(key: string, direction: MoveDirection) {
    if (!canMoveModule(key, direction)) return
    const idx = modules.findIndex((m) => m.key === key)
    if (idx < 0) return
    const target = direction === 'up' ? idx - 1 : idx + 1
    const current = modules[idx]
    const next = modules[target]
    if (!current || !next) return
    modules[idx] = next
    modules[target] = current
  }

  function reorderModule(sourceKey: string, targetKey: string) {
    if (sourceKey === targetKey || sourceKey === 'basicInfo') return
    const sourceIndex = modules.findIndex((m) => m.key === sourceKey)
    const targetIndex = modules.findIndex((m) => m.key === targetKey)
    if (sourceIndex < 0 || targetIndex < 0) return

    const [sourceModule] = modules.splice(sourceIndex, 1)
    if (!sourceModule) return

    let nextIndex = targetKey === 'basicInfo' ? 1 : targetIndex
    if (sourceIndex < targetIndex) {
      nextIndex -= 1
    }
    nextIndex = Math.max(1, Math.min(nextIndex, modules.length))

    modules.splice(nextIndex, 0, sourceModule)
  }

  function isDefaultModuleOrder(): boolean {
    return modules.every((m, idx) => m.key === DEFAULT_MODULE_ORDER[idx])
  }

  function resetModuleOrder() {
    const indexMap = new Map<string, number>()
    DEFAULT_MODULE_ORDER.forEach((key, idx) => indexMap.set(key, idx))
    const sorted = [...modules].sort((a, b) => {
      const ai = indexMap.get(a.key)
      const bi = indexMap.get(b.key)
      if (ai === undefined && bi === undefined) return 0
      if (ai === undefined) return 1
      if (bi === undefined) return -1
      return ai - bi
    })
    modules.splice(0, modules.length, ...sorted)
  }

  function isModuleVisible(key: string): boolean {
    const mod = modules.find((m) => m.key === key)
    return mod ? mod.visible : false
  }

  function addEducation() {
    educationList.push({
      id: genId(),
      school: '',
      college: '',
      major: '',
      degree: '',
      startDate: '',
      endDate: '',
      gpa: '',
      description: '',
      type: '',
      location: '',
    })
  }

  function removeEducation(id: string) {
    const idx = educationList.findIndex((e) => e.id === id)
    if (idx > -1) educationList.splice(idx, 1)
  }

  function addWork() {
    workList.push({
      id: genId(),
      company: '',
      department: '',
      position: '',
      startDate: '',
      endDate: '',
      location: '',
      description: '',
    })
  }

  function removeWork(id: string) {
    const idx = workList.findIndex((e) => e.id === id)
    if (idx > -1) workList.splice(idx, 1)
  }

  function addProject() {
    projectList.push({
      id: genId(),
      name: '',
      role: '',
      startDate: '',
      endDate: '',
      link: '',
      introduction: '',
      mainWork: '',
    })
  }

  function removeProject(id: string) {
    const idx = projectList.findIndex((e) => e.id === id)
    if (idx > -1) projectList.splice(idx, 1)
  }

  function canMoveProject(id: string, direction: MoveDirection): boolean {
    const idx = projectList.findIndex((e) => e.id === id)
    if (idx < 0) return false
    if (direction === 'up') return idx > 0
    return idx < projectList.length - 1
  }

  function moveProject(id: string, direction: MoveDirection) {
    if (!canMoveProject(id, direction)) return
    const idx = projectList.findIndex((e) => e.id === id)
    if (idx < 0) return
    const target = direction === 'up' ? idx - 1 : idx + 1
    const current = projectList[idx]
    const next = projectList[target]
    if (!current || !next) return
    projectList[idx] = next
    projectList[target] = current
  }

  function addAward() {
    awardList.push({
      id: genId(),
      name: '',
      date: '',
      description: '',
    })
  }

  function removeAward(id: string) {
    const idx = awardList.findIndex((e) => e.id === id)
    if (idx > -1) awardList.splice(idx, 1)
  }

  function addCustomBasicInfoItem() {
    basicInfo.customItems.push({
      id: genId(),
      label: '',
      value: '',
    })
  }

  function removeCustomBasicInfoItem(id: string) {
    const idx = basicInfo.customItems.findIndex((item) => item.id === id)
    if (idx > -1) basicInfo.customItems.splice(idx, 1)
  }

  const STORAGE_KEY = 'resume-builder-data'
  const AUTO_SAVE_DELAY_MS = 500
  const SAVE_LOADING_MIN_MS = 900

  let saveLoadingTimer: ReturnType<typeof setTimeout> | null = null

  function markSavingState() {
    isSaving.value = true
    if (saveLoadingTimer) clearTimeout(saveLoadingTimer)
    saveLoadingTimer = setTimeout(() => {
      isSaving.value = false
      saveLoadingTimer = null
    }, SAVE_LOADING_MIN_MS)
  }

  function exportResumeData(): string {
    return JSON.stringify({
      modules: modules.map((m) => ({ ...m })),
      selectedTemplateKey: selectedTemplateKey.value,
      layoutSettings: { ...layoutSettings },
      basicInfo: { ...basicInfo },
      educationList: educationList.map((e) => ({ ...e })),
      skills: skills.value,
      workList: workList.map((w) => ({ ...w })),
      projectList: projectList.map((p) => ({ ...p })),
      awardList: awardList.map((a) => ({ ...a })),
      selfIntro: selfIntro.value,
    }, null, 2)
  }

  function saveToStorage(mode: 'auto' | 'manual' = 'manual') {
    if (mode === 'manual' && saveTimer) {
      clearTimeout(saveTimer)
      saveTimer = null
    }
    markSavingState()
    const data = {
      modules: modules.map((m) => ({ ...m })),
      selectedTemplateKey: selectedTemplateKey.value,
      layoutSettings: { ...layoutSettings },
      basicInfo: { ...basicInfo },
      educationList: educationList.map((e) => ({ ...e })),
      skills: skills.value,
      workList: workList.map((w) => ({ ...w })),
      projectList: projectList.map((p) => ({ ...p })),
      awardList: awardList.map((a) => ({ ...a })),
      selfIntro: selfIntro.value,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    nextAutoSaveAt.value = null
    lastSavedAt.value = Date.now()
    lastSaveMode.value = mode
  }

  function importResumeData(raw: string) {
    JSON.parse(raw)
    localStorage.setItem(STORAGE_KEY, raw)
    loadFromStorage()
    saveToStorage('manual')
  }

  function loadFromStorage() {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    try {
      const data = JSON.parse(raw)
      if (data.modules) {
        const byKey = new Map<string, ModuleConfig>()
        ;(data.modules as ModuleConfig[]).forEach((m) => {
          if (m?.key) byKey.set(m.key, m)
        })

        const orderedKeys = [
          'basicInfo',
          ...(data.modules as ModuleConfig[]).map((m) => m.key).filter((key) => key && key !== 'basicInfo'),
        ]

        const seen = new Set<string>()
        const nextModules: ModuleConfig[] = []

        orderedKeys.forEach((key) => {
          if (seen.has(key)) return
          seen.add(key)
          const fallback = modules.find((m) => m.key === key)
          if (!fallback) return
          nextModules.push({ ...fallback, ...byKey.get(key) })
        })

        modules.forEach((m) => {
          if (seen.has(m.key)) return
          nextModules.push({ ...m, ...byKey.get(m.key) })
        })

        modules.splice(0, modules.length, ...nextModules)
      }
      selectedTemplateKey.value = normalizeResumeTemplateKey(data.selectedTemplateKey ?? data.selectedTemplateId)
      Object.assign(layoutSettings, normalizeLayoutSettings(data.layoutSettings))
      if (data.basicInfo) {
        const incomingBasicInfo = data.basicInfo as Partial<BasicInfo> & Record<string, unknown>
        Object.assign(basicInfo, incomingBasicInfo, {
          website: normalizeBasicLink(incomingBasicInfo.website),
          github: normalizeBasicLink(incomingBasicInfo.github),
          blog: normalizeBasicLink(incomingBasicInfo.blog),
          customItems: normalizeCustomBasicItems(incomingBasicInfo.customItems),
        })
      }
      if (data.educationList) {
        educationList.splice(0, educationList.length, ...data.educationList)
      }
      if (data.skills !== undefined) skills.value = data.skills
      if (data.workList) {
        workList.splice(0, workList.length, ...data.workList)
      }
      if (data.projectList) {
        projectList.splice(0, projectList.length, ...data.projectList)
      }
      if (data.awardList) {
        awardList.splice(0, awardList.length, ...data.awardList)
      }
      if (data.selfIntro !== undefined) selfIntro.value = data.selfIntro
    } catch (e) {
      console.warn('Failed to load resume data from localStorage', e)
    }
  }

  loadFromStorage()

  let saveTimer: ReturnType<typeof setTimeout> | null = null
  watch(
    [
      () => JSON.stringify(basicInfo),
      () => JSON.stringify(educationList),
      skills,
      () => JSON.stringify(workList),
      () => JSON.stringify(projectList),
      () => JSON.stringify(awardList),
      selfIntro,
      selectedTemplateKey,
      () => JSON.stringify(layoutSettings),
      () => JSON.stringify(modules),
    ],
    () => {
      if (saveTimer) clearTimeout(saveTimer)
      nextAutoSaveAt.value = Date.now() + AUTO_SAVE_DELAY_MS
      saveTimer = setTimeout(() => {
        saveTimer = null
        saveToStorage('auto')
      }, AUTO_SAVE_DELAY_MS)
    },
    { deep: true }
  )

  return {
    modules,
    selectedTemplateKey,
    layoutSettings,
    basicInfo,
    educationList,
    skills,
    workList,
    projectList,
    awardList,
    selfIntro,
    toggleModule,
    setTemplate,
    updateLayoutSetting,
    resetLayoutSettings,
    isDefaultLayoutSettings,
    canMoveModule,
    moveModule,
    reorderModule,
    isDefaultModuleOrder,
    resetModuleOrder,
    isModuleVisible,
    addEducation,
    removeEducation,
    addWork,
    removeWork,
    addProject,
    removeProject,
    canMoveProject,
    moveProject,
    addAward,
    removeAward,
    addCustomBasicInfoItem,
    removeCustomBasicInfoItem,
    exportResumeData,
    importResumeData,
    saveToStorage,
    autoSaveDelayMs: AUTO_SAVE_DELAY_MS,
    nextAutoSaveAt,
    lastSavedAt,
    lastSaveMode,
    isSaving,
  }
})
