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
  min-height: 0;
}

.resume-editor-workspace > * {
  min-width: 0;
  min-height: 0;
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
}
</style>
