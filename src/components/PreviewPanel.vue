<script setup lang="ts">
import { useResumeStore } from '@/stores/resume'
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'

const store = useResumeStore()
const resumeRef = ref<HTMLElement | null>(null)
const exporting = ref(false)

const skillLines = computed(() => {
  if (!store.skills) return []
  return store.skills.split('\n').filter((l) => l.trim())
})

const hasBasicInfo = computed(() => {
  const b = store.basicInfo
  return b.name || b.phone || b.email || b.jobTitle
})

async function exportPDF() {
  if (!resumeRef.value) return
  exporting.value = true

  try {
    // @ts-ignore
    const html2pdf = (await import('html2pdf.js')).default

    const el = resumeRef.value
    const opt = {
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
    }

    await html2pdf().set(opt).from(el).save()
  } catch (err) {
    console.error('PDF export failed:', err)
  } finally {
    exporting.value = false
  }
}

// --- Page break indicators ---
const A4_HEIGHT = 1122 // A4 proportional height
const pageBreaks = ref<number[]>([])

function updatePageBreaks() {
  if (!resumeRef.value) return
  const contentHeight = resumeRef.value.scrollHeight
  const breaks: number[] = []
  let y = A4_HEIGHT
  while (y < contentHeight) {
    breaks.push(y)
    y += A4_HEIGHT
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
</script>

<template>
  <aside class="preview-panel">
    <div class="preview-toolbar">
      <span class="toolbar-label">简历预览</span>
      <button class="btn-export" :disabled="exporting" @click="exportPDF">
        <svg v-if="!exporting" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M2 11V13C2 13.5523 2.44772 14 3 14H13C13.5523 14 14 13.5523 14 13V11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          <path d="M8 2V10M8 10L5 7M8 10L11 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span v-if="exporting" class="loading-spinner"></span>
        {{ exporting ? '导出中...' : '导出 PDF' }}
      </button>
    </div>

    <div class="preview-scroll">
      <div class="a4-page-wrapper">
        <div class="a4-page" ref="resumeRef">
        <!-- Header / Basic Info -->
        <div v-if="store.isModuleVisible('basicInfo')" class="resume-header">
          <div class="header-main">
            <h1 class="resume-name">{{ store.basicInfo.name || '您的姓名' }}</h1>
            <div class="contact-row">
              <span v-if="store.basicInfo.phone" class="contact-item">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3.654 1.328a.678.678 0 00-1.015-.063L1.605 2.3c-.483.484-.661 1.169-.45 1.77a17.568 17.568 0 004.168 6.608 17.569 17.569 0 006.608 4.168c.601.211 1.286.033 1.77-.45l1.034-1.034a.678.678 0 00-.063-1.015l-2.307-1.794a.678.678 0 00-.58-.122l-2.19.547a1.745 1.745 0 01-1.657-.459L5.482 8.062a1.745 1.745 0 01-.46-1.657l.548-2.19a.678.678 0 00-.122-.58L3.654 1.328z" stroke="currentColor" stroke-width="1.2"/></svg>
                {{ store.basicInfo.phone }}
              </span>
              <span v-if="store.basicInfo.email" class="contact-item">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M2 4L8 9L14 4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><rect x="1" y="3" width="14" height="10" rx="1" stroke="currentColor" stroke-width="1.2"/></svg>
                {{ store.basicInfo.email }}
              </span>
              <span v-if="store.basicInfo.age" class="contact-item">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="3" stroke="currentColor" stroke-width="1.2"/><path d="M2 14c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
                {{ store.basicInfo.age }}岁
              </span>
              <span v-if="store.basicInfo.gender" class="contact-item">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="7" r="4" stroke="currentColor" stroke-width="1.2"/><path d="M8 11v4M6 13h4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
                {{ store.basicInfo.gender }}
              </span>
              <span v-if="store.basicInfo.workYears" class="contact-item">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><rect x="1" y="4" width="14" height="10" rx="1" stroke="currentColor" stroke-width="1.2"/><path d="M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1" stroke="currentColor" stroke-width="1.2"/></svg>
                {{ store.basicInfo.workYears }}
              </span>
              <span v-if="store.basicInfo.currentCity" class="contact-item">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 1C5.24 1 3 3.24 3 6C3 9.75 8 15 8 15C8 15 13 9.75 13 6C13 3.24 10.76 1 8 1ZM8 7.5C7.17 7.5 6.5 6.83 6.5 6C6.5 5.17 7.17 4.5 8 4.5C8.83 4.5 9.5 5.17 9.5 6C9.5 6.83 8.83 7.5 8 7.5Z" stroke="currentColor" stroke-width="1"/></svg>
                {{ store.basicInfo.currentCity }}
              </span>
            </div>
            <div class="contact-row" v-if="store.basicInfo.currentStatus || store.basicInfo.jobTitle || store.basicInfo.expectedLocation || store.basicInfo.expectedSalary || store.basicInfo.educationLevel">
              <span v-if="store.basicInfo.currentStatus" class="contact-item">
                <!-- diamond status icon -->
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 1L15 8L8 15L1 8L8 1Z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>
                {{ store.basicInfo.currentStatus }}
              </span>
              <span v-if="store.basicInfo.jobTitle" class="contact-item">
                <!-- id card / position icon -->
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="14" height="10" rx="1" stroke="currentColor" stroke-width="1.2"/><circle cx="5" cy="8" r="1.5" stroke="currentColor" stroke-width="1"/><path d="M8 6h5M8 8h4M8 10h3" stroke="currentColor" stroke-width="1" stroke-linecap="round"/></svg>
                {{ store.basicInfo.jobTitle }}
              </span>
              <span v-if="store.basicInfo.expectedLocation" class="contact-item">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 1C5.24 1 3 3.24 3 6C3 9.75 8 15 8 15C8 15 13 9.75 13 6C13 3.24 10.76 1 8 1ZM8 7.5C7.17 7.5 6.5 6.83 6.5 6C6.5 5.17 7.17 4.5 8 4.5C8.83 4.5 9.5 5.17 9.5 6C9.5 6.83 8.83 7.5 8 7.5Z" stroke="currentColor" stroke-width="1"/></svg>
                {{ store.basicInfo.expectedLocation }}
              </span>
              <span v-if="store.basicInfo.expectedSalary" class="contact-item">
                <!-- yuan/money icon -->
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3 3l5 5 5-5M3 8h10M8 8v6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                {{ store.basicInfo.expectedSalary }}
              </span>
              <span v-if="store.basicInfo.educationLevel" class="contact-item">
                <!-- graduation cap icon -->
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 2L1 6l7 4 7-4-7-4z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><path d="M1 6v5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><path d="M4 8.5v3.5a4 4 0 008 0V8.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
                {{ store.basicInfo.educationLevel }}
              </span>
            </div>
            <div class="contact-row" v-if="store.basicInfo.website || store.basicInfo.github || store.basicInfo.wechat" style="margin-top: 4px;">
              <span v-if="store.basicInfo.website" class="contact-item">🔗 {{ store.basicInfo.website }}</span>
              <span v-if="store.basicInfo.github" class="contact-item">💻 {{ store.basicInfo.github }}</span>
              <span v-if="store.basicInfo.wechat" class="contact-item">💬 {{ store.basicInfo.wechat }}</span>
            </div>
          </div>
          <div v-if="store.basicInfo.avatar" class="header-avatar">
            <img :src="store.basicInfo.avatar" alt="头像" />
          </div>
        </div>

        <!-- Education -->
        <div v-if="store.isModuleVisible('education') && store.educationList.some(e => e.school)" class="resume-section">
          <h2 class="section-title">教育经历</h2>
          <div v-for="edu in store.educationList" :key="edu.id" class="experience-item">
            <template v-if="edu.school">
              <div class="exp-header">
                <div class="exp-title">
                  <strong>{{ edu.school }}</strong>
                  <span class="exp-subtitle">{{ edu.major }} · {{ edu.degree }}</span>
                </div>
                <span class="exp-date" v-if="edu.startDate">{{ edu.startDate }} ~ {{ edu.endDate || '至今' }}</span>
              </div>
              <div class="exp-meta" v-if="edu.type || edu.location || edu.gpa || edu.college">
                <span v-if="edu.type">{{ edu.type }}</span>
                <span v-if="edu.college">{{ edu.college }}</span>
                <span v-if="edu.location">{{ edu.location }}</span>
                <span v-if="edu.gpa">GPA: {{ edu.gpa }}</span>
              </div>
              <div v-if="edu.description" class="exp-desc" v-html="edu.description"></div>
            </template>
          </div>
        </div>

        <!-- Skills -->
        <div v-if="store.isModuleVisible('skills') && store.skills" class="resume-section">
          <h2 class="section-title">专业技能</h2>
          <div class="exp-desc" v-html="store.skills"></div>
        </div>

        <!-- Work Experience -->
        <div v-if="store.isModuleVisible('workExperience') && store.workList.some(w => w.company)" class="resume-section">
          <h2 class="section-title">工作经历</h2>
          <div v-for="work in store.workList" :key="work.id" class="experience-item">
            <template v-if="work.company">
              <div class="exp-header">
                <div class="exp-title">
                  <strong>{{ work.company }}</strong>
                  <span class="exp-subtitle">{{ [work.department, work.position, work.location].filter(Boolean).join(' · ') }}</span>
                </div>
                <span class="exp-date" v-if="work.startDate">{{ work.startDate }} ~ {{ work.endDate || '至今' }}</span>
              </div>
              <div v-if="work.description" class="exp-desc" v-html="work.description"></div>
            </template>
          </div>
        </div>

        <!-- Project Experience -->
        <div v-if="store.isModuleVisible('projectExperience') && store.projectList.some(p => p.name)" class="resume-section">
          <h2 class="section-title">项目经历</h2>
          <div v-for="proj in store.projectList" :key="proj.id" class="experience-item">
            <template v-if="proj.name">
              <div class="exp-header">
                <div class="exp-title">
                  <strong>{{ proj.name }}</strong>
                  <span class="exp-subtitle">{{ proj.role }}</span>
                </div>
                <span class="exp-date" v-if="proj.startDate">{{ proj.startDate }} ~ {{ proj.endDate || '至今' }}</span>
              </div>
              <div v-if="proj.link" style="margin-bottom: 4px;">
                <a :href="proj.link" target="_blank" class="proj-link">{{ proj.link }}</a>
              </div>
              <div v-if="proj.introduction" class="proj-sub-section">
                <div class="proj-sub-title">项目介绍</div>
                <div class="exp-desc" v-html="proj.introduction"></div>
              </div>
              <div v-if="proj.mainWork" class="proj-sub-section">
                <div class="proj-sub-title">主要工作</div>
                <div class="exp-desc" v-html="proj.mainWork"></div>
              </div>
            </template>
          </div>
        </div>

        <!-- Awards -->
        <div v-if="store.isModuleVisible('awards') && store.awardList.length > 0" class="resume-section">
          <h2 class="section-title">荣誉奖项</h2>
          <div v-for="award in store.awardList" :key="award.id" class="experience-item">
            <div class="exp-header">
              <strong>{{ award.name }}</strong>
              <span class="exp-date" v-if="award.date">{{ award.date }}</span>
            </div>
            <div v-if="award.description" class="exp-desc" v-html="award.description"></div>
          </div>
        </div>

        <!-- Self Intro -->
        <div v-if="store.isModuleVisible('selfIntro') && store.selfIntro" class="resume-section">
          <h2 class="section-title">个人简介</h2>
          <div class="exp-desc" v-html="store.selfIntro"></div>
        </div>

        <!-- Empty placeholder -->
        <div v-if="!hasBasicInfo && !store.skills && !store.selfIntro" class="preview-empty">
          <div class="empty-placeholder-icon">📄</div>
          <p>在左侧填写信息，这里将实时预览您的简历</p>
        </div>
      </div>
      <!-- Page break indicators -->
      <div
        v-for="(pos, idx) in pageBreaks"
        :key="idx"
        class="page-break-line"
        :style="{ top: pos + 'px' }"
      >
        <span class="page-break-label">第 {{ idx + 1 }} 页 / 第 {{ idx + 2 }} 页</span>
      </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.preview-panel {
  width: 830px;
  flex-shrink: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: var(--bg-preview);
}

.preview-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md) var(--spacing-xl);
  background: white;
  border-bottom: 1px solid var(--border-color);
}

.toolbar-label {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text-primary);
}

.btn-export {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-lg);
  background: var(--primary-600);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: 0.82rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-export:hover {
  background: var(--primary-700);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn-export:disabled {
  opacity: 0.7;
  cursor: wait;
  transform: none;
}

.loading-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.preview-scroll {
  flex: 1;
  overflow-y: auto;
  overflow-x: auto;
  padding: var(--spacing-md);
}

/* A4 Page Wrapper */
.a4-page-wrapper {
  position: relative;
}

.page-break-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 0;
  border-top: 2px dashed #ef4444;
  z-index: 10;
  pointer-events: none;
}

.page-break-label {
  position: absolute;
  right: 8px;
  top: -10px;
  background: #ef4444;
  color: white;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 3px;
  white-space: nowrap;
}

/* A4 Page */
.a4-page {
  width: 794px;
  margin: 0 auto;
  background: white;
  box-shadow: var(--shadow-lg);
  border-radius: var(--radius-sm);
  padding: 32px 30px;
  font-size: 14px;
  line-height: 1.65;
  color: rgba(0, 0, 0, 0.85);
  min-height: calc(100vh - 100px);
  overflow: hidden;
  word-break: break-word;
  overflow-wrap: break-word;
}

/* Header */
.resume-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-bottom: 14px;
  border-bottom: none;
}

.header-main {
  flex: 1;
}

.resume-name {
  font-size: 22px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.85);
  margin-bottom: 6px;
  letter-spacing: 0.02em;
  font-family: var(--font-sans);
}

.contact-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 6px;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: inherit;
  color: inherit;
}

.contact-item svg {
  color: #64748b;
  flex-shrink: 0;
}

.info-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.info-tag {
  display: inline-block;
  padding: 1px 8px;
  background: #eff6ff;
  color: #2563eb;
  border-radius: 3px;
  font-size: inherit;
  font-weight: 500;
}

.tag-status {
  background: #f0fdf4;
  color: #16a34a;
}

.header-avatar {
  width: 72px;
  height: 90px;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  margin-left: 16px;
  flex-shrink: 0;
}

.header-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Sections */
.resume-section {
  margin-bottom: 16px;
}

.section-title {
  margin-top: 0;
  margin-bottom: 12px;
  background: rgba(70, 114, 241, 0.1);
  width: 100%;
  position: relative;
  padding: 0 18px;
  height: 26px;
  line-height: 26px;
  font-weight: bold;
  font-size: 18px;
  color: rgb(70, 114, 241);

}

.section-title::before {
  content: '';
  background: rgb(70, 114, 241);
  position: absolute;
  left: 0;
  bottom: 0;
  width: 6px;
  height: 100%;
}

/* Experience Items */
.experience-item {
  margin-bottom: 10px;
  padding-left: 2px;
}

.experience-item:last-child {
  margin-bottom: 0;
}

.exp-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 2px;
}

.exp-title {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.exp-title strong {
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
}

.exp-subtitle {
  font-size: inherit;
  color: #64748b;
}

.exp-date {
  font-size: inherit;
  color: #94a3b8;
  white-space: nowrap;
}

.exp-meta {
  display: flex;
  gap: 10px;
  font-size: inherit;
  color: #94a3b8;
  margin-bottom: 4px;
}

.exp-desc {
  font-size: inherit;
  color: inherit;
  line-height: 1.7;
  word-break: break-word;
  overflow-wrap: break-word;
}


.pre-wrap {
  white-space: pre-wrap;
}

/* Skills */
.skills-list {
  padding-left: 16px;
  margin: 0;
}

.skills-list li {
  font-size: inherit;
  color: #334155;
  line-height: 1.8;
  margin-bottom: 1px;
}

/* Project sub-sections */
.proj-sub-section {
  margin-bottom: 6px;
}

.proj-sub-section .exp-desc {
  padding-left: 5px;
}

.proj-sub-title {
  font-weight: 700;
  font-size: 13px;
  margin-bottom: 2px;
}

.proj-link {
  color: #2563eb;
  font-size: inherit;
  text-decoration: none;
  word-break: break-all;
}

.proj-link:hover {
  text-decoration: underline;
}

.tech-stack {
  font-size: inherit;
  color: inherit;
  margin-bottom: 4px;
}

.tech-label {
  font-weight: 600;
  color: #475569;
}

/* Empty State */
.preview-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  color: var(--gray-400);
}

.empty-placeholder-icon {
  font-size: 3rem;
  margin-bottom: 12px;
  opacity: 0.4;
}

.preview-empty p {
  font-size: 0.85rem;
}
</style>

<!-- Non-scoped styles for v-html content (needed for PDF export) -->
<style>
.exp-desc ul,
.exp-desc ol {
  padding-left: 0;
  margin: 4px 0;
  list-style: none;
}

.exp-desc ol {
  counter-reset: list-counter;
}

.exp-desc li {
  margin-bottom: 2px;
}

.exp-desc ul li {
  position: relative;
  padding-left: 1.2em;
}

.exp-desc ul li::before {
  content: '•';
  position: absolute;
  left: 0;
  font-weight: bold;
  font-size: 1.3em;
  line-height: 1;
}

.exp-desc ol li {
  counter-increment: list-counter;
}

.exp-desc ol li::before {
  content: counter(list-counter) '. ';
}

.exp-desc p {
  margin: 2px 0;
}
</style>
