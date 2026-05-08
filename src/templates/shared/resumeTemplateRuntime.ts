// author: Bob
import { inject, provide, type CSSProperties } from 'vue'
import type {
  AwardEntry,
  BasicInfo,
  EducationEntry,
  ModuleConfig,
  ProjectEntry,
  ResumeLayoutSettings,
  WorkEntry,
} from '@/stores/resume'

export interface ResumeTemplateRuntimeStore {
  modules: ModuleConfig[]
  selectedTemplateKey: string
  layoutSettings: ResumeLayoutSettings
  basicInfo: BasicInfo
  educationList: EducationEntry[]
  skills: string
  workList: WorkEntry[]
  projectList: ProjectEntry[]
  awardList: AwardEntry[]
  selfIntro: string
  isModuleVisible: (key: string) => boolean
}

export interface ResumeTemplateRuntimeContext {
  store: ResumeTemplateRuntimeStore
  layoutStyle: CSSProperties
}

const RESUME_TEMPLATE_RUNTIME_KEY = Symbol('resume-template-runtime')

export function provideResumeTemplateRuntime(context: ResumeTemplateRuntimeContext) {
  provide(RESUME_TEMPLATE_RUNTIME_KEY, context)
}

export function useInjectedResumeTemplateRuntime(): ResumeTemplateRuntimeContext | null {
  return inject<ResumeTemplateRuntimeContext | null>(RESUME_TEMPLATE_RUNTIME_KEY, null)
}

export function createLayoutStyle(layoutSettings: ResumeLayoutSettings): CSSProperties {
  return {
    '--resume-page-margin-top': `${layoutSettings.pageMarginTop}px`,
    '--resume-page-margin-left': `${layoutSettings.pageMarginLeft}px`,
    '--resume-page-margin-right': `${layoutSettings.pageMarginRight}px`,
    '--resume-module-margin-top': `${layoutSettings.moduleMarginTop}px`,
    '--resume-module-margin-bottom': `${layoutSettings.moduleMarginBottom}px`,
    '--resume-section-title-content-gap': `${layoutSettings.sectionTitleContentGap}px`,
    '--resume-content-font-size': `${layoutSettings.contentFontSize}px`,
    '--resume-content-line-height': String(layoutSettings.contentLineHeight),
  } as CSSProperties
}
