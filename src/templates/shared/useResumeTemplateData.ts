// author: Bob
import { computed, reactive, type CSSProperties } from 'vue'
import {
  useResumeStore,
  type AwardEntry,
  type BasicInfo,
  type EducationEntry,
  type ProjectEntry,
  type WorkEntry,
} from '@/stores/resume'
import type { MetaIconKey } from './metaIcons'
import { toHref } from './metaIcons'
import { createLayoutStyle, useInjectedResumeTemplateRuntime } from './resumeTemplateRuntime'
import { awardContentHtml, awardHasContent, htmlToPlainText } from '@/utils/awardContent'

function hasText(value: string): boolean {
  return value.trim().length > 0
}

function hasRichText(value: string): boolean {
  return htmlToPlainText(value).trim().length > 0
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

export function useResumeTemplateData() {
  const injectedRuntime = useInjectedResumeTemplateRuntime()
  const rawStore = injectedRuntime?.store ?? useResumeStore()

  const previewBasicInfo = computed<BasicInfo>(() => ({
    ...rawStore.basicInfo,
    website: {
      text: rawStore.basicInfo.website.text || rawStore.basicInfo.website.url,
      url: rawStore.basicInfo.website.url,
    },
    github: {
      text: rawStore.basicInfo.github.text || rawStore.basicInfo.github.url,
      url: rawStore.basicInfo.github.url,
    },
    blog: {
      text: rawStore.basicInfo.blog.text || rawStore.basicInfo.blog.url,
      url: rawStore.basicInfo.blog.url,
    },
    customItems: rawStore.basicInfo.customItems.filter((item) => hasCustomBasicItemContent(item)),
  }))

  const previewEducationList = computed<EducationEntry[]>(() =>
    rawStore.educationList.filter((entry) => hasEducationContent(entry))
  )

  const previewSkills = computed(() => (hasRichText(rawStore.skills) ? rawStore.skills : ''))

  const previewWorkList = computed<WorkEntry[]>(() =>
    rawStore.workList.filter((entry) => hasWorkContent(entry))
  )

  const previewProjectList = computed<ProjectEntry[]>(() =>
    rawStore.projectList.filter((entry) => hasProjectContent(entry))
  )

  const previewAwardList = computed<AwardEntry[]>(() =>
    rawStore.awardList.filter((entry) => awardHasContent(entry))
  )

  const previewSelfIntro = computed(() => (hasRichText(rawStore.selfIntro) ? rawStore.selfIntro : ''))

  const hasBasicInfo = computed(() => {
    const basicInfo = previewBasicInfo.value
    return Boolean(
      basicInfo.name ||
        basicInfo.phone ||
        basicInfo.email ||
        basicInfo.age ||
        basicInfo.gender ||
        basicInfo.location ||
        basicInfo.jobTitle ||
        basicInfo.educationLevel ||
        basicInfo.avatar ||
        basicInfo.workYears ||
        basicInfo.currentStatus ||
        basicInfo.expectedLocation ||
        basicInfo.expectedSalary ||
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
    isModuleVisible(key: string) {
      if (key === 'basicInfo') return rawStore.isModuleVisible(key) && hasBasicInfo.value
      return rawStore.isModuleVisible(key)
    },
  })

  const lineOneMeta = computed(() => [
    { key: 'phone', icon: 'phone' as MetaIconKey, text: store.basicInfo.phone },
    { key: 'mail', icon: 'mail' as MetaIconKey, text: store.basicInfo.email },
    { key: 'user', icon: 'user' as MetaIconKey, text: store.basicInfo.age },
    { key: 'gender', icon: 'gender' as MetaIconKey, text: store.basicInfo.gender },
    { key: 'workYears', icon: 'workYears' as MetaIconKey, text: store.basicInfo.workYears },
  ].filter((item) => item.text.trim()))

  const lineTwoMeta = computed(() => [
    { key: 'status', icon: 'status' as MetaIconKey, text: store.basicInfo.currentStatus },
    { key: 'job', icon: 'job' as MetaIconKey, text: store.basicInfo.jobTitle },
    { key: 'location', icon: 'location' as MetaIconKey, text: store.basicInfo.expectedLocation },
    { key: 'salary', icon: 'salary' as MetaIconKey, text: store.basicInfo.expectedSalary },
    { key: 'education', icon: 'education' as MetaIconKey, text: store.basicInfo.educationLevel },
  ].filter((item) => item.text.trim()))

  const simpleContactMeta = computed(() => [
    { key: 'phone', icon: 'phone' as MetaIconKey, text: store.basicInfo.phone },
    { key: 'mail', icon: 'mail' as MetaIconKey, text: store.basicInfo.email },
  ].filter((item) => item.text.trim()))

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
    () => injectedRuntime?.layoutStyle ?? createLayoutStyle(rawStore.layoutSettings)
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
