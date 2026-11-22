<!-- author: Bob -->
<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import EditorPanel from '@/components/resume/EditorPanel.vue'
import PreviewPanel from '@/components/resume/PreviewPanel.vue'

const mobileActivePane = ref<'editor' | 'preview'>('editor')
const previewPanelRef = ref<{ refreshPreviewScale?: () => void } | null>(null)

watch(mobileActivePane, (pane) => {
  if (pane === 'preview') {
    nextTick(() => {
      previewPanelRef.value?.refreshPreviewScale?.()
    })
  }
})

function switchMobilePane(pane: 'editor' | 'preview') {
  mobileActivePane.value = pane
}
</script>

<template>
  <div class="app-layout career-theme no-sidebar">
    <div class="workbench-shell">
      <div class="main-content resume-editor-workspace">
        <EditorPanel
          :class="{ 'mobile-pane-hidden': mobileActivePane !== 'editor' }"
          @switch-mobile-preview="switchMobilePane('preview')"
        />
        <PreviewPanel
          ref="previewPanelRef"
          :class="{ 'mobile-pane-hidden': mobileActivePane !== 'preview' }"
        />
        <nav class="mobile-workspace-tabs" aria-label="移动端视图切换">
          <button
            class="mobile-workspace-tab"
            type="button"
            :class="{ active: mobileActivePane === 'editor' }"
            :aria-pressed="mobileActivePane === 'editor'"
            @click="switchMobilePane('editor')"
          >
            编辑简历
          </button>
          <button
            class="mobile-workspace-tab"
            type="button"
            :class="{ active: mobileActivePane === 'preview' }"
            :aria-pressed="mobileActivePane === 'preview'"
            @click="switchMobilePane('preview')"
          >
            实时预览
          </button>
        </nav>
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

.app-layout.no-sidebar {
  justify-content: center;
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

.mobile-workspace-tabs {
  display: none;
}

.app-layout.no-sidebar .resume-editor-workspace {
  grid-template-columns: minmax(480px, 1fr) minmax(560px, 860px);
  column-gap: var(--space-5);
  width: min(100%, 1840px);
  margin: 0 auto;
  padding: 0 var(--space-5);
}

@media (max-width: 1440px) {
  .app-layout.no-sidebar .resume-editor-workspace {
    grid-template-columns: minmax(440px, 1fr) minmax(500px, 48vw);
    column-gap: var(--space-4);
    padding: 0 var(--space-3);
  }
}

@media (max-width: 1350px) {
  .app-layout.no-sidebar .resume-editor-workspace {
    display: flex;
    flex-direction: column;
    overflow: auto;
    width: 100%;
    padding: 0;
  }

  .app-layout.no-sidebar .editor-panel,
  .app-layout.no-sidebar .preview-panel {
    flex: 0 0 auto;
  }

  .app-layout.no-sidebar .editor-panel {
    height: 70vh;
    min-height: 520px;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .app-layout.no-sidebar .preview-panel {
    height: 80vh;
    min-height: 620px;
  }
}

@media (max-width: 1080px) {
  .resume-editor-workspace {
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .app-layout.no-sidebar .resume-editor-workspace {
    width: 100%;
    padding: 0;
  }
}

@media (max-width: 760px) {
  .app-layout {
    flex-direction: column;
    height: 100dvh;
  }

  .workbench-shell {
    flex: 1;
    min-height: 0;
  }

  .resume-editor-workspace {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
  }

  .app-layout.no-sidebar .resume-editor-workspace {
    padding-bottom: 0;
  }

  .app-layout.no-sidebar .editor-panel,
  .app-layout.no-sidebar .preview-panel,
  .editor-panel,
  .preview-panel {
    flex: 1;
    height: 100%;
    min-height: 0;
    overflow: hidden;
  }

  .app-layout.no-sidebar .editor-panel,
  .editor-panel {
    overflow-y: auto;
    overflow-x: hidden;
    padding-bottom: calc(74px + env(safe-area-inset-bottom, 0px));
  }

  .mobile-pane-hidden {
    display: none !important;
  }

  .mobile-workspace-tabs {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 45;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-2);
    padding: 8px var(--space-3) calc(8px + env(safe-area-inset-bottom, 0px));
    background: var(--color-bg-panel);
    border-top: 1px solid var(--color-border-default);
    box-shadow: 0 -6px 18px rgba(15, 23, 42, 0.08);
  }

  .mobile-workspace-tab {
    min-height: 40px;
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border-default);
    background: var(--color-bg-subtle);
    color: var(--color-text-secondary);
    font-size: var(--font-size-md);
    font-weight: 700;
    cursor: pointer;
  }

  .mobile-workspace-tab.active {
    border-color: var(--color-brand);
    background: var(--color-brand);
    color: var(--color-text-inverse);
    box-shadow: var(--shadow-xs);
  }
}
</style>
