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

export function createResumeTemplateRuntimeFromContent(content: ResumeData): ResumeTemplateRuntimeContext {
  const modules = normalizeModules(content)
  const layoutSettings = normalizeLayoutSettings(content.layoutSettings)
  const basicInfo = reactive<BasicInfo>({
    ...createEmptyBasicInfo(),
    ...(content.basicInfo && typeof content.basicInfo === 'object' ? (content.basicInfo as Partial<BasicInfo>) : {}),
    website:
      content.basicInfo && typeof content.basicInfo === 'object' && 'website' in content.basicInfo && content.basicInfo.website
        ? (content.basicInfo.website as BasicInfo['website'])
        : { text: '', url: '' },
    github:
      content.basicInfo && typeof content.basicInfo === 'object' && 'github' in content.basicInfo && content.basicInfo.github
        ? (content.basicInfo.github as BasicInfo['github'])
        : { text: '', url: '' },
    blog:
      content.basicInfo && typeof content.basicInfo === 'object' && 'blog' in content.basicInfo && content.basicInfo.blog
        ? (content.basicInfo.blog as BasicInfo['blog'])
        : { text: '', url: '' },
    customItems:
      content.basicInfo && typeof content.basicInfo === 'object' && Array.isArray(content.basicInfo.customItems)
        ? (content.basicInfo.customItems as BasicInfo['customItems'])
        : [],
  })

  const store = reactive<ResumeTemplateRuntimeStore>({
    modules,
    selectedTemplateKey: normalizeResumeTemplateKey(content.selectedTemplateKey ?? content.selectedTemplateId),
    layoutSettings,
    basicInfo,
    educationList: Array.isArray(content.educationList) ? (content.educationList as EducationEntry[]) : [],
    skills: typeof content.skills === 'string' ? content.skills : '',
    workList: Array.isArray(content.workList) ? (content.workList as WorkEntry[]) : [],
    projectList: Array.isArray(content.projectList) ? (content.projectList as ProjectEntry[]) : [],
    awardList: Array.isArray(content.awardList) ? (content.awardList as AwardEntry[]) : [],
    selfIntro: typeof content.selfIntro === 'string' ? content.selfIntro : '',
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
