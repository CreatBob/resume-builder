<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useResumeStore } from '@/stores/resume'

const store = useResumeStore()
const resumeRef = ref<HTMLElement | null>(null)
const exporting = ref(false)

const A4_WIDTH = 794
const A4_HEIGHT = 1123
const pageBreaks = ref<number[]>([])

const hasBasicInfo = computed(() => {
  const b = store.basicInfo
  return Boolean(b.name || b.phone || b.email || b.jobTitle)
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

type MetaIconKey =
  | 'phone'
  | 'mail'
  | 'user'
  | 'gender'
  | 'workYears'
  | 'status'
  | 'job'
  | 'location'
  | 'salary'
  | 'education'

const lineOneMeta = computed(() => [
  { key: 'phone', icon: 'phone' as MetaIconKey, text: store.basicInfo.phone || '13435548430' },
  { key: 'mail', icon: 'mail' as MetaIconKey, text: store.basicInfo.email || 'example@qq.com' },
  { key: 'user', icon: 'user' as MetaIconKey, text: store.basicInfo.age || '26岁' },
  { key: 'gender', icon: 'gender' as MetaIconKey, text: store.basicInfo.gender || '男' },
  { key: 'workYears', icon: 'workYears' as MetaIconKey, text: store.basicInfo.workYears || '4年' },
])

const lineTwoMeta = computed(() => [
  { key: 'status', icon: 'status' as MetaIconKey, text: store.basicInfo.currentStatus || '离职-随时到岗' },
  { key: 'job', icon: 'job' as MetaIconKey, text: store.basicInfo.jobTitle || '全栈开发工程师（偏后端）' },
  { key: 'location', icon: 'location' as MetaIconKey, text: store.basicInfo.expectedLocation || '深圳' },
  { key: 'salary', icon: 'salary' as MetaIconKey, text: store.basicInfo.expectedSalary || '面议' },
  { key: 'education', icon: 'education' as MetaIconKey, text: store.basicInfo.educationLevel || '本科' },
])

function updatePageBreaks() {
  if (!resumeRef.value) return
  const contentHeight = resumeRef.value.scrollHeight
  const breaks: number[] = []
  const totalPages = Math.max(1, Math.ceil(contentHeight / A4_HEIGHT))
  for (let i = 1; i <= totalPages; i += 1) {
    breaks.push(i * A4_HEIGHT)
  }
  pageBreaks.value = breaks
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  nextTick(() => updatePageBreaks())
  if (resumeRef.value) {
    resizeObserver = new ResizeObserver(() => updatePageBreaks())
    resizeObserver.observe(resumeRef.value)
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})

async function exportPDF() {
  if (!resumeRef.value) return
  exporting.value = true

  try {
    // @ts-ignore
    const html2pdf = (await import('html2pdf.js')).default
    await html2pdf()
      .set({
        margin: 0,
        filename: `${store.basicInfo.name || '简历'}_resume.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait' as const,
        },
      })
      .from(resumeRef.value)
      .save()
  } catch (err) {
    console.error('PDF export failed:', err)
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <aside class="preview-panel">
    <div class="preview-top">
      <div class="preview-title-row">
        <span class="preview-title">实时预览</span>
        <span class="a4-badge">A4 / 标准模板</span>
      </div>
      <button class="btn-export" :disabled="exporting" @click="exportPDF">
        {{ exporting ? '导出中...' : '导出 PDF' }}
      </button>
    </div>

    <div class="preview-scroll">
      <div class="paper-wrapper" :style="{ width: `${A4_WIDTH}px` }">
        <div ref="resumeRef" class="paper" :style="{ width: `${A4_WIDTH}px`, minHeight: `${A4_HEIGHT}px` }">
          <header v-if="store.isModuleVisible('basicInfo')" class="resume-header">
            <div class="header-main">
              <h1 class="name">{{ store.basicInfo.name || '姓名' }}</h1>
              <div class="contact-line">
                <span v-for="item in lineOneMeta" :key="item.key" class="meta-item">
                  <svg class="meta-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <template v-if="item.icon === 'phone'">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </template>
                    <template v-else-if="item.icon === 'mail'">
                      <rect x="2" y="4" width="20" height="16" rx="2"/>
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                    </template>
                    <template v-else-if="item.icon === 'user'">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </template>
                    <template v-else-if="item.icon === 'gender'">
                      <circle cx="12" cy="5" r="3"/>
                      <path d="M12 22v-7m-4-3h8a2 2 0 0 1 2 2v5"/>
                    </template>
                    <template v-else-if="item.icon === 'workYears'">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <path d="M16 2v4M8 2v4M3 10h18"/>
                    </template>
                  </svg>
                  {{ item.text }}
                </span>
              </div>
              <div class="contact-line">
                <span v-for="item in lineTwoMeta" :key="item.key" class="meta-item">
                  <svg class="meta-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <template v-if="item.icon === 'status'">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
                    </template>
                    <template v-else-if="item.icon === 'job'">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                      <path d="M16 3v4M8 3v4"/>
                    </template>
                    <template v-else-if="item.icon === 'location'">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </template>
                    <template v-else-if="item.icon === 'salary'">
                      <line x1="12" y1="1" x2="12" y2="23"/>
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                    </template>
                    <template v-else-if="item.icon === 'education'">
                      <path d="M22 10v6m0 0v6m0-6H2m0 0v6m0-6V4m0 0h20"/>
                      <path d="M2 4l10-3 10 3"/>
                    </template>
                  </svg>
                  {{ item.text }}
                </span>
              </div>
            </div>
            <div v-if="store.basicInfo.avatar" class="avatar-wrap">
              <img :src="store.basicInfo.avatar" alt="头像" />
            </div>
          </header>

          <section
            v-if="store.isModuleVisible('education') && store.educationList.some((e) => e.school)"
            class="resume-section"
          >
            <h2 class="section-title">教育经历</h2>
            <article v-for="edu in store.educationList" :key="edu.id" class="entry" v-show="edu.school">
              <div class="entry-head">
                <p class="entry-main">
                  <strong>{{ edu.school }}</strong>
                  <span>{{ edu.major }} · {{ edu.degree }}</span>
                </p>
                <span class="entry-date">{{ edu.startDate }} ~ {{ edu.endDate || '至今' }}</span>
              </div>
              <p class="entry-meta">{{ edu.type }} {{ edu.college }} {{ edu.location }}</p>
              <div v-if="edu.description" class="entry-rich" v-html="edu.description"></div>
            </article>
          </section>

          <section v-if="store.isModuleVisible('skills') && store.skills" class="resume-section">
            <h2 class="section-title">专业技能</h2>
            <div class="entry-rich" v-html="store.skills"></div>
          </section>

          <section
            v-if="store.isModuleVisible('workExperience') && store.workList.some((w) => w.company)"
            class="resume-section"
          >
            <h2 class="section-title">工作经历</h2>
            <article v-for="work in store.workList" :key="work.id" class="entry" v-show="work.company">
              <div class="entry-head">
                <p class="entry-main">
                  <strong>{{ work.company }}</strong>
                  <span>{{ work.position }}</span>
                </p>
                <span class="entry-date">{{ work.startDate }} ~ {{ work.endDate || '至今' }}</span>
              </div>
              <p class="entry-meta">{{ work.department }} {{ work.location }}</p>
              <div v-if="work.description" class="entry-rich" v-html="work.description"></div>
            </article>
          </section>

          <section
            v-if="store.isModuleVisible('projectExperience') && store.projectList.some((p) => p.name)"
            class="resume-section"
          >
            <h2 class="section-title">项目经历</h2>
            <article v-for="project in store.projectList" :key="project.id" class="entry" v-show="project.name">
              <div class="entry-head">
                <p class="entry-main">
                  <strong>{{ project.name }}</strong>
                  <span>{{ project.role }}</span>
                </p>
                <span class="entry-date">{{ project.startDate }} ~ {{ project.endDate || '至今' }}</span>
              </div>
              <div v-if="project.introduction" class="entry-rich" v-html="project.introduction"></div>
              <div v-if="project.mainWork" class="entry-rich" v-html="project.mainWork"></div>
            </article>
          </section>

          <section v-if="store.isModuleVisible('awards') && store.awardList.some((a) => a.name)" class="resume-section">
            <h2 class="section-title">荣誉奖项</h2>
            <article v-for="award in store.awardList" :key="award.id" class="entry" v-show="award.name">
              <div class="entry-head">
                <p class="entry-main"><strong>{{ award.name }}</strong></p>
                <span class="entry-date">{{ award.date }}</span>
              </div>
              <div v-if="award.description" class="entry-rich" v-html="award.description"></div>
            </article>
          </section>

          <section v-if="store.isModuleVisible('selfIntro') && store.selfIntro" class="resume-section">
            <h2 class="section-title">个人简介</h2>
            <div class="entry-rich" v-html="store.selfIntro"></div>
          </section>

          <div v-if="!hasAnyContent" class="empty">
            <p>在左侧填写信息，这里实时预览</p>
          </div>
        </div>

        <div
          v-for="(pos, idx) in pageBreaks"
          :key="idx"
          class="page-line"
          :style="{ top: `${pos}px` }"
        >
          <span>第{{ idx + 1 }}页</span>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.preview-panel {
  width: clamp(840px, 56vw, 980px);
  min-width: 820px;
  height: 100%;
  border-left: 1px solid #e4d8cb;
  background: #efe7dc;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.preview-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.preview-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.preview-title {
  color: #2d2521;
  font-size: 16px;
  font-weight: 700;
}

.a4-badge {
  height: 24px;
  padding: 0 8px;
  border-radius: 8px;
  background: #fff;
  border: 1px solid #e9ded0;
  color: #7b6a5b;
  font-size: 11px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
}

.btn-export {
  border: none;
  height: 30px;
  padding: 0 10px;
  border-radius: 8px;
  background: #2d2521;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
}

.btn-export:disabled {
  opacity: 0.7;
  cursor: wait;
}

.preview-scroll {
  flex: 1;
  overflow: auto;
  padding: 4px;
}

.paper-wrapper {
  position: relative;
  margin: 0 auto;
  padding-bottom: 24px;
}

.paper {
  background: #fff;
  border: 1px solid #d8dde6;
  border-radius: 4px;
  padding: 28px 34px;
  box-shadow: 0 12px 24px rgba(45, 37, 33, 0.1);
}

.resume-header {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 20px;
}

.header-main {
  flex: 1;
}

.name {
  font-size: 26px;
  line-height: 1.1;
  color: #29303c;
  margin-bottom: 10px;
}

.contact-line {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  color: #4e5969;
  font-size: 14px;
  margin-bottom: 4px;
}

.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.meta-icon-svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: #7f8ea6;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  flex-shrink: 0;
}

.avatar-wrap {
  width: 84px;
  height: 104px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #dbe1ea;
  flex-shrink: 0;
}

.avatar-wrap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.resume-section {
  margin-bottom: 14px;
}

.section-title {
  position: relative;
  height: 28px;
  line-height: 28px;
  margin-bottom: 8px;
  padding-left: 12px;
  font-size: 16px;
  font-weight: 700;
  color: #4d76e1;
  background: #e9eefb;
}

.section-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  width: 4px;
  height: 100%;
  background: #4d76e1;
}

.entry {
  margin-bottom: 10px;
}

.entry-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 16px;
}

.entry-main {
  display: flex;
  gap: 10px;
  color: #2f3847;
  font-size: 16px;
}

.entry-main strong {
  font-size: 17px;
}

.entry-date {
  color: #94a3b8;
  font-size: 13px;
  white-space: nowrap;
}

.entry-meta {
  margin-top: 2px;
  color: #94a3b8;
  font-size: 13px;
}

.entry-rich {
  margin-top: 6px;
  color: #2f3847;
  font-size: 12px;
  line-height: 1.9;
}

.empty {
  margin-top: 40px;
  text-align: center;
  color: #a08c7b;
  font-size: 12px;
}

.page-line {
  position: absolute;
  left: 16px;
  right: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  pointer-events: none;
  z-index: 2;
}

.page-line::before,
.page-line::after {
  content: '';
  flex: 1;
  height: 1px;
  border-top: 1px dashed #d97745;
}

.page-line span {
  color: #d97745;
  font-size: 10px;
  font-weight: 600;
  background: #efe7dc;
  padding: 0 4px;
}
</style>

<style>
.entry-rich ul,
.entry-rich ol {
  margin: 0;
  padding-left: 20px;
}

.entry-rich p {
  margin: 4px 0;
}
</style>
