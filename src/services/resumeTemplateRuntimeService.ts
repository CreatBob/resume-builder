// author: Bob
import { reactive } from 'vue'
import {
  DEFAULT_RESUME_LAYOUT_SETTINGS,
  type AwardEntry,
  type BasicInfo,
  type EducationEntry,
  type ModuleConfig,
  type ProjectEntry,
  type ResumeLayoutSettings,
  type WorkEntry,
} from '@/stores/resume'
import {
  sanitizePlainText,
  sanitizeRichHtml,
  sanitizeSafeAvatar,
  sanitizeSafeHref,
} from '@/services/htmlSanitizerService'
import type { ResumeData, SharedResumeDocument } from '@/services/resumeStorageService'
import { createLayoutStyle, type ResumeTemplateRuntimeContext, type ResumeTemplateRuntimeStore } from '@/templates/shared/resumeTemplateRuntime'
import { normalizeResumeTemplateKey } from '@/templates/resume'

const DEFAULT_MODULES: ModuleConfig[] = [
  { key: 'basicInfo', label: '基本信息', icon: '👤', visible: true },
  { key: 'education', label: '教育经历', icon: '🎓', visible: true },
  { key: 'skills', label: '专业技能', icon: '⚡', visible: true },
  { key: 'workExperience', label: '工作经历', icon: '💼', visible: true },
  { key: 'projectExperience', label: '项目经历', icon: '📁', visible: true },
  { key: 'awards', label: '荣誉奖项', icon: '🏆', visible: false },
  { key: 'selfIntro', label: '个人简介', icon: '📝', visible: false },
]

function createEmptyBasicInfo(): BasicInfo {
  return {
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
    website: { text: '', url: '' },
    wechat: '',
    currentCity: '',
    github: { text: '', url: '' },
    blog: { text: '', url: '' },
    customItems: [],
  }
}

function normalizeModules(data: ResumeData): ModuleConfig[] {
  if (!Array.isArray(data.modules)) {
    return DEFAULT_MODULES.map((item) => ({ ...item }))
  }

  const byKey = new Map<string, ModuleConfig>()
  data.modules.forEach((item) => {
    if (item && typeof item === 'object' && 'key' in item && typeof item.key === 'string') {
      const fallback = DEFAULT_MODULES.find((module) => module.key === item.key)
      if (fallback) {
        byKey.set(item.key, { ...fallback, ...(item as Partial<ModuleConfig>) })
      }
    }
  })

  const orderedKeys = [
    'basicInfo',
    ...data.modules
      .map((item) => (item && typeof item === 'object' && 'key' in item ? String(item.key) : ''))
      .filter((key) => key && key !== 'basicInfo'),
  ]

  const seen = new Set<string>()
  const nextModules: ModuleConfig[] = []
  orderedKeys.forEach((key) => {
    if (seen.has(key)) return
    seen.add(key)
    const item = byKey.get(key) ?? DEFAULT_MODULES.find((module) => module.key === key)
    if (item) nextModules.push({ ...item })
  })

  DEFAULT_MODULES.forEach((item) => {
    if (seen.has(item.key)) return
    nextModules.push({ ...item })
  })
  return nextModules
}

function normalizeLayoutSettings(value: ResumeData['layoutSettings']): ResumeLayoutSettings {
  const source = value && typeof value === 'object' ? value : {}
  return {
    pageMarginTop: Number(source?.pageMarginTop ?? DEFAULT_RESUME_LAYOUT_SETTINGS.pageMarginTop),
    pageMarginLeft: Number(source?.pageMarginLeft ?? DEFAULT_RESUME_LAYOUT_SETTINGS.pageMarginLeft),
    pageMarginRight: Number(source?.pageMarginRight ?? DEFAULT_RESUME_LAYOUT_SETTINGS.pageMarginRight),
    moduleMarginTop: Number(source?.moduleMarginTop ?? DEFAULT_RESUME_LAYOUT_SETTINGS.moduleMarginTop),
    moduleMarginBottom: Number(source?.moduleMarginBottom ?? DEFAULT_RESUME_LAYOUT_SETTINGS.moduleMarginBottom),
    sectionTitleContentGap: Number(source?.sectionTitleContentGap ?? DEFAULT_RESUME_LAYOUT_SETTINGS.sectionTitleContentGap),
    contentFontSize: Number(source?.contentFontSize ?? DEFAULT_RESUME_LAYOUT_SETTINGS.contentFontSize),
    contentLineHeight: Number(source?.contentLineHeight ?? DEFAULT_RESUME_LAYOUT_SETTINGS.contentLineHeight),
  }
}

function normalizeLink(raw: unknown): BasicInfo['website'] {
  const src = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const url = sanitizeSafeHref(src.url)
  const text = sanitizePlainText(src.text) || url
  return { text, url }
}

function normalizeCustomItems(raw: unknown): BasicInfo['customItems'] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((item) => item && typeof item === 'object')
    .map((item, idx) => {
      const src = item as Record<string, unknown>
      return {
        id: sanitizePlainText(src.id) || `custom_${idx}`,
        label: sanitizePlainText(src.label),
        value: sanitizePlainText(src.value),
      }
    })
}

function normalizeEducationList(raw: unknown): EducationEntry[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((item) => item && typeof item === 'object')
    .map((item, idx) => {
      const src = item as Record<string, unknown>
      return {
        id: sanitizePlainText(src.id) || `edu_${idx}`,
        school: sanitizePlainText(src.school),
        college: sanitizePlainText(src.college),
        major: sanitizePlainText(src.major),
        degree: sanitizePlainText(src.degree),
        startDate: sanitizePlainText(src.startDate),
        endDate: sanitizePlainText(src.endDate),
        gpa: sanitizePlainText(src.gpa),
        description: sanitizeRichHtml(src.description),
        type: sanitizePlainText(src.type),
        location: sanitizePlainText(src.location),
      }
    })
}

function normalizeWorkList(raw: unknown): WorkEntry[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((item) => item && typeof item === 'object')
    .map((item, idx) => {
      const src = item as Record<string, unknown>
      return {
        id: sanitizePlainText(src.id) || `work_${idx}`,
        company: sanitizePlainText(src.company),
        department: sanitizePlainText(src.department),
        position: sanitizePlainText(src.position),
        startDate: sanitizePlainText(src.startDate),
        endDate: sanitizePlainText(src.endDate),
        location: sanitizePlainText(src.location),
        description: sanitizeRichHtml(src.description),
      }
    })
}

function normalizeProjectList(raw: unknown): ProjectEntry[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((item) => item && typeof item === 'object')
    .map((item, idx) => {
      const src = item as Record<string, unknown>
      return {
        id: sanitizePlainText(src.id) || `proj_${idx}`,
        name: sanitizePlainText(src.name),
        role: sanitizePlainText(src.role),
        startDate: sanitizePlainText(src.startDate),
        endDate: sanitizePlainText(src.endDate),
        link: sanitizeSafeHref(src.link),
        introduction: sanitizeRichHtml(src.introduction),
        mainWork: sanitizeRichHtml(src.mainWork),
      }
    })
}

function normalizeAwardList(raw: unknown): AwardEntry[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((item) => item && typeof item === 'object')
    .map((item, idx) => {
      const src = item as Record<string, unknown>
      return {
        id: sanitizePlainText(src.id) || `award_${idx}`,
        name: sanitizePlainText(src.name),
        date: sanitizePlainText(src.date),
        description: sanitizeRichHtml(src.description),
      }
    })
}

export function createResumeTemplateRuntimeFromContent(content: ResumeData): ResumeTemplateRuntimeContext {
  const safeContent = content && typeof content === 'object' ? content : ({} as ResumeData)
  const modules = normalizeModules(safeContent)
  const layoutSettings = normalizeLayoutSettings(safeContent.layoutSettings)
  const rawBasic =
    safeContent.basicInfo && typeof safeContent.basicInfo === 'object'
      ? (safeContent.basicInfo as unknown as Record<string, unknown>)
      : {}
  const emptyBasic = createEmptyBasicInfo()
  const basicInfo = reactive<BasicInfo>({
    name: sanitizePlainText(rawBasic.name) || emptyBasic.name,
    phone: sanitizePlainText(rawBasic.phone),
    email: sanitizePlainText(rawBasic.email),
    age: sanitizePlainText(rawBasic.age),
    gender: sanitizePlainText(rawBasic.gender),
    location: sanitizePlainText(rawBasic.location),
    jobTitle: sanitizePlainText(rawBasic.jobTitle),
    educationLevel: sanitizePlainText(rawBasic.educationLevel),
    avatar: sanitizeSafeAvatar(rawBasic.avatar),
    workYears: sanitizePlainText(rawBasic.workYears),
    currentStatus: sanitizePlainText(rawBasic.currentStatus),
    expectedLocation: sanitizePlainText(rawBasic.expectedLocation),
    expectedSalary: sanitizePlainText(rawBasic.expectedSalary),
    website: normalizeLink(rawBasic.website),
    wechat: sanitizePlainText(rawBasic.wechat),
    currentCity: sanitizePlainText(rawBasic.currentCity),
    github: normalizeLink(rawBasic.github),
    blog: normalizeLink(rawBasic.blog),
    customItems: normalizeCustomItems(rawBasic.customItems),
  })

  const store = reactive<ResumeTemplateRuntimeStore>({
    modules,
    selectedTemplateKey: normalizeResumeTemplateKey(safeContent.selectedTemplateKey ?? safeContent.selectedTemplateId),
    layoutSettings,
    basicInfo,
    educationList: normalizeEducationList(safeContent.educationList),
    skills: sanitizeRichHtml(safeContent.skills),
    workList: normalizeWorkList(safeContent.workList),
    projectList: normalizeProjectList(safeContent.projectList),
    awardList: normalizeAwardList(safeContent.awardList),
    selfIntro: sanitizeRichHtml(safeContent.selfIntro),
    isModuleVisible: (key: string) => modules.find((item) => item.key === key)?.visible ?? false,
  })

  return {
    store,
    layoutStyle: createLayoutStyle(layoutSettings),
  }
}

export function createResumeTemplateRuntimeFromSharedDocument(document: SharedResumeDocument): ResumeTemplateRuntimeContext {
  return createResumeTemplateRuntimeFromContent(document.content)
}
