// author: jf
import { computed, type CSSProperties } from 'vue'
import { useResumeStore } from '@/stores/resume'
import type { MetaIconKey } from './metaIcons'
import { toHref } from './metaIcons'

export function useResumeTemplateData() {
  const store = useResumeStore()

  const hasBasicInfo = computed(() => {
    const b = store.basicInfo
    return Boolean(
      b.name ||
        b.phone ||
        b.email ||
        b.jobTitle ||
        b.wechat ||
        b.currentCity ||
        b.website.text ||
        b.website.url ||
        b.github.text ||
        b.github.url ||
        b.blog.text ||
        b.blog.url ||
        b.customItems.some((item) => item.label.trim() || item.value.trim())
    )
  })

  const hasAnyContent = computed(
    () =>
      hasBasicInfo.value ||
      store.educationList.some((e) => e.school) ||
      Boolean(store.skills) ||
      store.workList.some((w) => w.company) ||
      store.projectList.some((p) => p.name) ||
      store.awardList.some((a) => a.name) ||
      Boolean(store.selfIntro)
  )

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
    store.modules.forEach((mod) => {
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
        '--resume-page-margin-top': `${store.layoutSettings.pageMarginTop}px`,
        '--resume-page-margin-left': `${store.layoutSettings.pageMarginLeft}px`,
        '--resume-page-margin-right': `${store.layoutSettings.pageMarginRight}px`,
        '--resume-module-margin-top': `${store.layoutSettings.moduleMarginTop}px`,
        '--resume-module-margin-bottom': `${store.layoutSettings.moduleMarginBottom}px`,
        '--resume-section-title-content-gap': `${store.layoutSettings.sectionTitleContentGap}px`,
        '--resume-content-line-height': String(store.layoutSettings.contentLineHeight),
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
  }
}
