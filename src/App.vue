<!-- author: Bob -->
<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import KnowledgeBasePanel from '@/components/ai/knowledge/KnowledgeBasePanel.vue'
import AiInterviewerPanel from '@/components/ai/interview/AiInterviewerPanel.vue'
import ModuleSidebar from '@/components/common/ModuleSidebar.vue'
import type { PrimaryMenuItem, PrimaryMenuKey } from '@/components/common/moduleSidebarTypes'
import EditorPanel from '@/components/resume/EditorPanel.vue'
import PreviewPanel from '@/components/resume/PreviewPanel.vue'
import { getResumeStorageMode } from '@/config/resumeStorageMode'

const sidebarCollapsed = ref(false)
const activeMenu = ref<PrimaryMenuKey>('resume-editor')
const resumeStorageMode = getResumeStorageMode()

const menuMeta: Record<PrimaryMenuKey, { title: string; description: string; badge: string }> = {
  'resume-editor': {
    title: '简历编辑工作台',
    description: '结构化填写、模块控制、模板预览和导出集中在同一个编辑流里。',
    badge: '编辑 / 预览',
  },
  'ai-interviewer': {
    title: 'AI 面试工作台',
    description: '围绕当前简历进行模拟问答、语音输入、历史会话和评分复盘。',
    badge: '面试 / 反馈',
  },
  'knowledge-base': {
    title: '知识库入库工作台',
    description: '上传项目资料、图片和文档，沉淀为 RAG 与面试召回上下文。',
    badge: 'RAG / 上传',
  },
}

const primaryMenus: PrimaryMenuItem[] = [
  {
    key: 'resume-editor',
    label: '简历编辑',
    iconPath:
      'M15 3H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8Zm0 0v5h5M9 13h6M9 17h4',
  },
  {
    key: 'ai-interviewer',
    label: 'AI面试',
    iconPath:
      'M9 3h6M12 3v3m-6 4h12a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-3l-3 2-3-2H6a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2Zm3 3h.01M15 15h.01',
  },
  {
    key: 'knowledge-base',
    label: '知识库',
    iconPath:
      'M6 5.5A2.5 2.5 0 0 1 8.5 3H18v15.5A2.5 2.5 0 0 0 15.5 16H6Zm0 0v11A2.5 2.5 0 0 0 8.5 19H18M10 7h4M10 10h4M10 13h3',
  },
]

const availableMenus = computed(() =>
  resumeStorageMode === 'local' ? primaryMenus.filter((menu) => menu.key === 'resume-editor') : primaryMenus
)
const activeMenuMeta = computed(() => menuMeta[activeMenu.value])

watchEffect(() => {
  if (!availableMenus.value.some((menu) => menu.key === activeMenu.value)) {
    activeMenu.value = 'resume-editor'
  }
})

function handleSelectMenu(key: PrimaryMenuKey) {
  if (!availableMenus.value.some((menu) => menu.key === key)) return
  activeMenu.value = key
}
</script>

<template>
  <div class="app-layout career-theme">
    <ModuleSidebar
      :collapsed="sidebarCollapsed"
      :active-menu="activeMenu"
      :menus="availableMenus"
      @toggle-collapse="sidebarCollapsed = !sidebarCollapsed"
      @select-menu="handleSelectMenu"
    />
    <div class="workbench-shell">
      <header class="workspace-topbar">
        <div class="workspace-copy">
          <span class="workspace-badge">{{ activeMenuMeta.badge }}</span>
          <div>
            <h1>{{ activeMenuMeta.title }}</h1>
            <p>{{ activeMenuMeta.description }}</p>
          </div>
        </div>
      </header>

      <div class="main-content" :class="`${activeMenu}-workspace`">
        <template v-if="activeMenu === 'resume-editor'">
          <EditorPanel />
          <PreviewPanel />
        </template>
        <AiInterviewerPanel v-else-if="activeMenu === 'ai-interviewer'" />
        <KnowledgeBasePanel v-else />
      </div>
    </div>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: var(--color-bg-app);
}

.workbench-shell {
  flex: 1;
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.workspace-topbar {
  min-height: 76px;
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--color-border-subtle);
  background: rgba(255, 255, 255, 0.94);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}

.workspace-copy {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.workspace-badge {
  min-height: 28px;
  border-radius: var(--radius-full);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  font-size: var(--font-size-xs);
  font-weight: 700;
}

.workspace-badge {
  padding: 0 var(--space-3);
  background: var(--color-brand-subtle);
  color: var(--color-brand-text);
  border: 1px solid var(--color-brand-muted);
}

.workspace-copy h1 {
  margin: 0;
  color: var(--color-text-primary);
  font-size: var(--font-size-xl);
  line-height: var(--line-height-tight);
  font-weight: 700;
}

.workspace-copy p {
  margin: var(--space-1) 0 0;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-normal);
}

.main-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  min-width: 0;
  background: var(--color-bg-app);
}

.resume-editor-workspace {
  display: grid;
  grid-template-columns: minmax(420px, 1fr) minmax(560px, 48vw);
}

.ai-interviewer-workspace,
.knowledge-base-workspace {
  display: flex;
}

@media (max-width: 1280px) {
  .resume-editor-workspace {
    grid-template-columns: minmax(360px, 1fr) minmax(460px, 42vw);
  }
}

@media (max-width: 1080px) {
  .workspace-topbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .resume-editor-workspace {
    display: flex;
    flex-direction: column;
    overflow: auto;
  }
}

@media (max-width: 760px) {
  .app-layout {
    flex-direction: column;
  }

  .workspace-topbar {
    min-height: auto;
    padding: var(--space-3);
  }

  .workspace-copy {
    align-items: flex-start;
    flex-direction: column;
    gap: var(--space-2);
  }

  .workspace-copy h1 {
    font-size: var(--font-size-lg);
  }
}
</style>
