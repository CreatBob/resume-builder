// author: Bob
import { computed, reactive, type CSSProperties } from 'vue'
import {
  useResumeStore,
  type AwardEntry,
  type BasicInfo,
  type BasicLink,
  type EducationEntry,
  type ProjectEntry,
  type WorkEntry,
} from '@/stores/resume'
import type { MetaIconKey } from './metaIcons'
import { toHref } from './metaIcons'
import { awardContentHtml, awardHasContent, htmlToPlainText } from '@/utils/awardContent'

const PREVIEW_AVATAR = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="240" height="300" viewBox="0 0 240 300">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#dbeafe" />
      <stop offset="100%" stop-color="#bfdbfe" />
    </linearGradient>
  </defs>
  <rect width="240" height="300" fill="url(#bg)" />
  <circle cx="120" cy="96" r="52" fill="#ffffff" fill-opacity="0.82" />
  <path d="M52 260c14-54 56-84 108-84s94 30 108 84" fill="#ffffff" fill-opacity="0.82" />
  <text x="120" y="284" text-anchor="middle" font-size="28" font-family="Arial, sans-serif" fill="#1d4ed8">CV</text>
</svg>
`)}` as const

const PREVIEW_BASIC_INFO: BasicInfo = {
  name: '陈一鸣',
  phone: '13818996520',
  email: 'chenyiming@example.com',
  age: '26岁',
  gender: '男',
  location: '深圳',
  jobTitle: '全栈开发工程师',
  educationLevel: '本科',
  avatar: PREVIEW_AVATAR,
  workYears: '4年',
  currentStatus: '离职-随时到岗',
  expectedLocation: '深圳',
  expectedSalary: '25K-35K',
  website: {
    text: '作品集',
    url: 'https://portfolio.example.com',
  },
  wechat: 'chenyiming_cv',
  currentCity: '深圳',
  github: {
    text: 'github.com/chenyiming',
    url: 'https://github.com/chenyiming',
  },
  blog: {
    text: '',
    url: '',
  },
  customItems: [],
}

const PREVIEW_EDUCATION_LIST: EducationEntry[] = [
  {
    id: 'preview-education-1',
    school: '华南理工大学',
    college: '计算机学院',
    major: '软件工程',
    degree: '本科',
    startDate: '2018.09',
    endDate: '2022.06',
    gpa: '',
    description: '<p>主修课程：数据结构、操作系统、计算机网络、数据库系统。</p>',
    type: '统招本科',
    location: '广州',
  },
]

const PREVIEW_WORK_LIST: WorkEntry[] = [
  {
    id: 'preview-work-1',
    company: '星河科技有限公司',
    department: '平台研发部',
    position: '高级前端工程师',
    startDate: '2022.07',
    endDate: '',
    location: '深圳',
    description:
      '<ul><li>负责简历编辑器与 A4 实时预览能力建设，支持 9 套模板切换。</li><li>推动导出与自动保存体验优化，页面渲染性能提升 30%。</li></ul>',
  },
]

const PREVIEW_PROJECT_LIST: ProjectEntry[] = [
  {
    id: 'preview-project-1',
    name: 'AI 简历助手',
    role: '项目负责人',
    startDate: '2024.03',
    endDate: '',
    link: 'https://portfolio.example.com/resume-ai',
    introduction: '<p>面向求职场景的简历编辑、优化与模拟面试一体化平台。</p>',
    mainWork:
      '<ol><li>设计模块化模板渲染方案，实现内容与模板解耦。</li><li>接入 AI 优化能力，支持按模块生成建议并一键应用。</li></ol>',
  },
]

const PREVIEW_AWARD_LIST: AwardEntry[] = [
  {
    id: 'preview-award-1',
    name: '校级优秀毕业生',
    date: '2022.06',
    description: '<p>综合成绩排名前 5%，获评优秀毕业生。</p>',
  },
]

const PREVIEW_SKILLS =
  '<ul><li>熟悉 Vue 3、TypeScript、Pinia、Vite，能够独立完成中后台与内容编辑器开发。</li><li>具备 Node.js / Java 接口协作经验，能够推动前后端契约落地。</li><li>关注性能与交互细节，熟悉 A4 预览、导出链路和富文本展示。</li></ul>'

const PREVIEW_SELF_INTRO =
  '<p>4 年 Web 与 AI 产品开发经验，擅长 Vue 3、TypeScript、Node.js 与用户体验优化，能够独立完成从需求拆解到上线交付的闭环。</p>'

function hasText(value: string): boolean {
  return value.trim().length > 0
}

function hasRichText(value: string): boolean {
  return htmlToPlainText(value).trim().length > 0
}

function withFallbackText(value: string, fallback: string): string {
  return hasText(value) ? value : fallback
}

function withFallbackRichText(value: string, fallback: string): string {
  return hasRichText(value) ? value : fallback
}

function withFallbackLink(value: BasicLink, fallback: BasicLink): BasicLink {
  const hasAnyInput = hasText(value.text) || hasText(value.url)
  if (!hasAnyInput) {
    return {
      text: fallback.text,
      url: fallback.url,
    }
  }

  const resolvedUrl = hasText(value.url) ? value.url : ''
  const resolvedText = hasText(value.text) ? value.text : resolvedUrl

  return {
    text: resolvedText,
    url: resolvedUrl,
  }
}

function hasCustomBasicItemContent(item: BasicInfo['customItems'][number]): boolean {
  return hasText(item.label) || hasText(item.value)
}

function hasEducationContent(entry: EducationEntry): boolean {
  return Boolean(
    hasText(entry.school) ||
      hasText(entry.college) ||
      hasText(entry.major) ||
      hasText(entry.degree) ||
      hasText(entry.startDate) ||
      hasText(entry.endDate) ||
      hasText(entry.gpa) ||
      hasRichText(entry.description) ||
      hasText(entry.type) ||
      hasText(entry.location)
  )
}

function hasWorkContent(entry: WorkEntry): boolean {
  return Boolean(
    hasText(entry.company) ||
      hasText(entry.department) ||
      hasText(entry.position) ||
      hasText(entry.startDate) ||
      hasText(entry.endDate) ||
      hasText(entry.location) ||
      hasRichText(entry.description)
  )
}

function hasProjectContent(entry: ProjectEntry): boolean {
  return Boolean(
    hasText(entry.name) ||
      hasText(entry.role) ||
      hasText(entry.startDate) ||
      hasText(entry.endDate) ||
      hasText(entry.link) ||
      hasRichText(entry.introduction) ||
      hasRichText(entry.mainWork)
  )
}

function mergeEducationEntry(raw: EducationEntry, fallback: EducationEntry): EducationEntry {
  return {
    ...raw,
    school: withFallbackText(raw.school, fallback.school),
    college: withFallbackText(raw.college, fallback.college),
    major: withFallbackText(raw.major, fallback.major),
    degree: withFallbackText(raw.degree, fallback.degree),
    startDate: withFallbackText(raw.startDate, fallback.startDate),
    endDate: withFallbackText(raw.endDate, fallback.endDate),
    gpa: withFallbackText(raw.gpa, fallback.gpa),
    description: withFallbackRichText(raw.description, fallback.description),
    type: withFallbackText(raw.type, fallback.type),
    location: withFallbackText(raw.location, fallback.location),
  }
}

function mergeWorkEntry(raw: WorkEntry, fallback: WorkEntry): WorkEntry {
  return {
    ...raw,
    company: withFallbackText(raw.company, fallback.company),
    department: withFallbackText(raw.department, fallback.department),
    position: withFallbackText(raw.position, fallback.position),
    startDate: withFallbackText(raw.startDate, fallback.startDate),
    endDate: withFallbackText(raw.endDate, fallback.endDate),
    location: withFallbackText(raw.location, fallback.location),
    description: withFallbackRichText(raw.description, fallback.description),
  }
}

function mergeProjectEntry(raw: ProjectEntry, fallback: ProjectEntry): ProjectEntry {
  return {
    ...raw,
    name: withFallbackText(raw.name, fallback.name),
    role: withFallbackText(raw.role, fallback.role),
    startDate: withFallbackText(raw.startDate, fallback.startDate),
    endDate: withFallbackText(raw.endDate, fallback.endDate),
    link: withFallbackText(raw.link, fallback.link),
    introduction: withFallbackRichText(raw.introduction, fallback.introduction),
    mainWork: withFallbackRichText(raw.mainWork, fallback.mainWork),
  }
}

function mergeAwardEntry(raw: AwardEntry, fallback: AwardEntry): AwardEntry {
  return {
    ...raw,
    name: withFallbackText(raw.name, fallback.name),
    date: withFallbackText(raw.date, fallback.date),
    description: withFallbackRichText(raw.description, fallback.description),
  }
}

function mergePreviewList<T>(
  rawList: T[],
  fallbackList: T[],
  hasContent: (item: T) => boolean,
  mergeItem: (raw: T, fallback: T) => T
): T[] {
  const filledItems = rawList.filter((item) => hasContent(item))
  if (filledItems.length === 0) return fallbackList

  return filledItems.map((item, index) => {
    const fallback = fallbackList[index]
    return fallback ? mergeItem(item, fallback) : item
  })
}

export function useResumeTemplateData() {
  const rawStore = useResumeStore()

  const previewBasicInfo = computed<BasicInfo>(() => ({
    ...rawStore.basicInfo,
    name: withFallbackText(rawStore.basicInfo.name, PREVIEW_BASIC_INFO.name),
    phone: withFallbackText(rawStore.basicInfo.phone, PREVIEW_BASIC_INFO.phone),
    email: withFallbackText(rawStore.basicInfo.email, PREVIEW_BASIC_INFO.email),
    age: withFallbackText(rawStore.basicInfo.age, PREVIEW_BASIC_INFO.age),
    gender: withFallbackText(rawStore.basicInfo.gender, PREVIEW_BASIC_INFO.gender),
    location: withFallbackText(rawStore.basicInfo.location, PREVIEW_BASIC_INFO.location),
    jobTitle: withFallbackText(rawStore.basicInfo.jobTitle, PREVIEW_BASIC_INFO.jobTitle),
    educationLevel: withFallbackText(rawStore.basicInfo.educationLevel, PREVIEW_BASIC_INFO.educationLevel),
    avatar: withFallbackText(rawStore.basicInfo.avatar, PREVIEW_BASIC_INFO.avatar),
    workYears: withFallbackText(rawStore.basicInfo.workYears, PREVIEW_BASIC_INFO.workYears),
    currentStatus: withFallbackText(rawStore.basicInfo.currentStatus, PREVIEW_BASIC_INFO.currentStatus),
    expectedLocation: withFallbackText(rawStore.basicInfo.expectedLocation, PREVIEW_BASIC_INFO.expectedLocation),
    expectedSalary: withFallbackText(rawStore.basicInfo.expectedSalary, PREVIEW_BASIC_INFO.expectedSalary),
    website: withFallbackLink(rawStore.basicInfo.website, PREVIEW_BASIC_INFO.website),
    wechat: withFallbackText(rawStore.basicInfo.wechat, PREVIEW_BASIC_INFO.wechat),
    currentCity: withFallbackText(rawStore.basicInfo.currentCity, PREVIEW_BASIC_INFO.currentCity),
    github: withFallbackLink(rawStore.basicInfo.github, PREVIEW_BASIC_INFO.github),
    blog: withFallbackLink(rawStore.basicInfo.blog, PREVIEW_BASIC_INFO.blog),
    customItems: rawStore.basicInfo.customItems.some((item) => hasCustomBasicItemContent(item))
      ? rawStore.basicInfo.customItems.filter((item) => hasCustomBasicItemContent(item))
      : PREVIEW_BASIC_INFO.customItems,
  }))

  const previewEducationList = computed<EducationEntry[]>(() =>
    mergePreviewList(rawStore.educationList, PREVIEW_EDUCATION_LIST, hasEducationContent, mergeEducationEntry)
  )

  const previewSkills = computed(() => withFallbackRichText(rawStore.skills, PREVIEW_SKILLS))

  const previewWorkList = computed<WorkEntry[]>(() =>
    mergePreviewList(rawStore.workList, PREVIEW_WORK_LIST, hasWorkContent, mergeWorkEntry)
  )

  const previewProjectList = computed<ProjectEntry[]>(() =>
    mergePreviewList(rawStore.projectList, PREVIEW_PROJECT_LIST, hasProjectContent, mergeProjectEntry)
  )

  const previewAwardList = computed<AwardEntry[]>(() =>
    mergePreviewList(rawStore.awardList, PREVIEW_AWARD_LIST, awardHasContent, mergeAwardEntry)
  )

  const previewSelfIntro = computed(() => withFallbackRichText(rawStore.selfIntro, PREVIEW_SELF_INTRO))

  const hasBasicInfo = computed(() => {
    const basicInfo = previewBasicInfo.value
    return Boolean(
      basicInfo.name ||
        basicInfo.phone ||
        basicInfo.email ||
        basicInfo.jobTitle ||
        basicInfo.wechat ||
        basicInfo.currentCity ||
        basicInfo.website.text ||
        basicInfo.website.url ||
        basicInfo.github.text ||
        basicInfo.github.url ||
        basicInfo.blog.text ||
        basicInfo.blog.url ||
        basicInfo.customItems.some((item) => item.label.trim() || item.value.trim())
    )
  })

  const hasAnyContent = computed(
    () =>
      hasBasicInfo.value ||
      previewEducationList.value.some((entry) => entry.school) ||
      Boolean(previewSkills.value) ||
      previewWorkList.value.some((entry) => entry.company) ||
      previewProjectList.value.some((entry) => entry.name) ||
      previewAwardList.value.some((entry) => awardHasContent(entry)) ||
      Boolean(previewSelfIntro.value)
  )

  const store = reactive({
    get modules() {
      return rawStore.modules
    },
    get selectedTemplateKey() {
      return rawStore.selectedTemplateKey
    },
    get layoutSettings() {
      return rawStore.layoutSettings
    },
    get basicInfo() {
      return previewBasicInfo.value
    },
    get educationList() {
      return previewEducationList.value
    },
    get skills() {
      return previewSkills.value
    },
    get workList() {
      return previewWorkList.value
    },
    get projectList() {
      return previewProjectList.value
    },
    get awardList() {
      return previewAwardList.value
    },
    get selfIntro() {
      return previewSelfIntro.value
    },
    isModuleVisible: rawStore.isModuleVisible,
  })

  const lineOneMeta = computed(() => [
    { key: 'phone', icon: 'phone' as MetaIconKey, text: store.basicInfo.phone || '13400009999' },
    { key: 'mail', icon: 'mail' as MetaIconKey, text: store.basicInfo.email || 'example@qq.com' },
    { key: 'user', icon: 'user' as MetaIconKey, text: store.basicInfo.age || '26岁' },
    { key: 'gender', icon: 'gender' as MetaIconKey, text: store.basicInfo.gender || '男' },
    { key: 'workYears', icon: 'workYears' as MetaIconKey, text: store.basicInfo.workYears || '4年' },
  ])

  const lineTwoMeta = computed(() => [
    { key: 'status', icon: 'status' as MetaIconKey, text: store.basicInfo.currentStatus || '离职-随时到岗' },
    { key: 'job', icon: 'job' as MetaIconKey, text: store.basicInfo.jobTitle || '全栈开发工程师' },
    { key: 'location', icon: 'location' as MetaIconKey, text: store.basicInfo.expectedLocation || '深圳' },
    { key: 'salary', icon: 'salary' as MetaIconKey, text: store.basicInfo.expectedSalary || '面议' },
    { key: 'education', icon: 'education' as MetaIconKey, text: store.basicInfo.educationLevel || '本科' },
  ])

  const simpleContactMeta = computed(() => [
    { key: 'phone', icon: 'phone' as MetaIconKey, text: store.basicInfo.phone || '13400009999' },
    { key: 'mail', icon: 'mail' as MetaIconKey, text: store.basicInfo.email || 'example@qq.com' },
  ])

  const lineThreeMeta = computed(() => {
    const items = [
      { key: 'wechat', icon: 'wechat' as MetaIconKey, text: store.basicInfo.wechat || '', isLink: false },
      { key: 'currentCity', icon: 'currentCity' as MetaIconKey, text: store.basicInfo.currentCity || '', isLink: false },
      {
        key: 'website',
        icon: 'website' as MetaIconKey,
        text: store.basicInfo.website.text || '',
        url: store.basicInfo.website.url || '',
        isLink: Boolean(store.basicInfo.website.url),
      },
      {
        key: 'github',
        icon: 'github' as MetaIconKey,
        text: store.basicInfo.github.text || '',
        url: store.basicInfo.github.url || '',
        isLink: Boolean(store.basicInfo.github.url),
      },
      {
        key: 'blog',
        icon: 'blog' as MetaIconKey,
        text: store.basicInfo.blog.text || '',
        url: store.basicInfo.blog.url || '',
        isLink: Boolean(store.basicInfo.blog.url),
      },
      ...store.basicInfo.customItems.map((item) => ({
        key: item.id,
        icon: 'status' as MetaIconKey,
        text: [item.label.trim(), item.value.trim()].filter(Boolean).join(': '),
        isLink: false,
      })),
    ]

    return items
      .filter((item) => item.text.trim())
      .map((item) => ({
        ...item,
        href: item.isLink && 'url' in item && typeof item.url === 'string' ? toHref(item.url) : '',
      }))
  })

  const profileLinks = computed(() =>
    [
      { key: 'website', label: '个人网站', text: store.basicInfo.website.text.trim(), url: store.basicInfo.website.url.trim() },
      { key: 'github', label: 'GitHub', text: store.basicInfo.github.text.trim(), url: store.basicInfo.github.url.trim() },
      { key: 'blog', label: '博客', text: store.basicInfo.blog.text.trim(), url: store.basicInfo.blog.url.trim() },
    ]
      .filter((item) => item.text && item.url)
      .map((item) => ({
        ...item,
        href: item.url ? toHref(item.url) : '',
      }))
  )

  const customBasicMeta = computed(() =>
    store.basicInfo.customItems
      .map((item) => ({
        key: item.id,
        label: item.label.trim(),
        value: item.value.trim(),
        text: [item.label.trim(), item.value.trim()].filter(Boolean).join(': '),
      }))
      .filter((item) => item.text)
  )

  const moduleOrderMap = computed(() => {
    const map: Record<string, number> = {}
    let order = 1
    rawStore.modules.forEach((mod) => {
      if (mod.key === 'basicInfo') return
      map[mod.key] = order
      order += 1
    })
    return map
  })

  function moduleOrderStyle(key: string): { order: number } {
    return { order: moduleOrderMap.value[key] ?? 99 }
  }

  const layoutStyle = computed<CSSProperties>(
    () =>
      ({
        '--resume-page-margin-top': `${rawStore.layoutSettings.pageMarginTop}px`,
        '--resume-page-margin-left': `${rawStore.layoutSettings.pageMarginLeft}px`,
        '--resume-page-margin-right': `${rawStore.layoutSettings.pageMarginRight}px`,
        '--resume-module-margin-top': `${rawStore.layoutSettings.moduleMarginTop}px`,
        '--resume-module-margin-bottom': `${rawStore.layoutSettings.moduleMarginBottom}px`,
        '--resume-section-title-content-gap': `${rawStore.layoutSettings.sectionTitleContentGap}px`,
        '--resume-content-line-height': String(rawStore.layoutSettings.contentLineHeight),
      }) as CSSProperties
  )

  return {
    store,
    hasAnyContent,
    lineOneMeta,
    lineTwoMeta,
    simpleContactMeta,
    lineThreeMeta,
    profileLinks,
    customBasicMeta,
    moduleOrderStyle,
    layoutStyle,
    awardContentHtml,
    awardHasContent,
  }
}
