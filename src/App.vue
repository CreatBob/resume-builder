<script setup lang="ts">
import ModuleSidebar from '@/components/ModuleSidebar.vue'
import EditorPanel from '@/components/EditorPanel.vue'
import PreviewPanel from '@/components/PreviewPanel.vue'
</script>

<template>
  <div class="app-layout">
    <ModuleSidebar />
    <div class="main-content">
      <EditorPanel />
      <PreviewPanel />
    </div>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.main-content {
  flex: 1;
  display: flex;
  overflow: auto;
  min-width: 0;
}
</style>
