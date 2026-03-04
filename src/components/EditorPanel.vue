<script setup lang="ts">
import { useResumeStore } from '@/stores/resume'
import { ref } from 'vue'
import BasicInfoEditor from './editors/BasicInfoEditor.vue'
import EducationEditor from './editors/EducationEditor.vue'
import SkillsEditor from './editors/SkillsEditor.vue'
import WorkExperienceEditor from './editors/WorkExperienceEditor.vue'
import ProjectExperienceEditor from './editors/ProjectExperienceEditor.vue'
import AwardsEditor from './editors/AwardsEditor.vue'
import SelfIntroEditor from './editors/SelfIntroEditor.vue'

const store = useResumeStore()
const showSaved = ref(false)

function handleSave() {
  store.saveToStorage()
  showSaved.value = true
  setTimeout(() => { showSaved.value = false }, 2000)
}
</script>

<template>
  <main class="editor-panel">
    <div class="editor-header">
      <div class="editor-header-top">
        <div>
          <h2 class="editor-title">编辑简历</h2>
          <p class="editor-subtitle">填写各模块信息，右侧即时预览</p>
        </div>
        <button class="btn-save" @click="handleSave">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M3 1h8l3 3v9a2 2 0 01-2 2H3a2 2 0 01-2-2V3a2 2 0 012-2z" stroke="currentColor" stroke-width="1.3"/>
            <path d="M5 1v4h5V1" stroke="currentColor" stroke-width="1.3"/>
            <rect x="4" y="9" width="7" height="4" rx="0.5" stroke="currentColor" stroke-width="1.3"/>
          </svg>
          保存
        </button>
      </div>
      <transition name="fade">
        <div v-if="showSaved" class="save-toast">✓ 已保存</div>
      </transition>
    </div>

    <div class="editor-content">
      <BasicInfoEditor v-if="store.isModuleVisible('basicInfo')" />
      <EducationEditor v-if="store.isModuleVisible('education')" />
      <SkillsEditor v-if="store.isModuleVisible('skills')" />
      <WorkExperienceEditor v-if="store.isModuleVisible('workExperience')" />
      <ProjectExperienceEditor v-if="store.isModuleVisible('projectExperience')" />
      <AwardsEditor v-if="store.isModuleVisible('awards')" />
      <SelfIntroEditor v-if="store.isModuleVisible('selfIntro')" />

      <div v-if="!store.modules.some(m => m.visible)" class="empty-state">
        <div class="empty-icon">📋</div>
        <p>请在左侧开启模块开始编辑</p>
      </div>
    </div>
  </main>
</template>

<style scoped>
.editor-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg-editor);
  overflow: hidden;
  border-right: 1px solid var(--border-color);
}

.editor-header {
  padding: var(--spacing-xl) var(--spacing-2xl);
  border-bottom: 1px solid var(--border-color);
  background: white;
}

.editor-header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.editor-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.editor-subtitle {
  font-size: 0.82rem;
  color: var(--text-secondary);
}

.editor-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-xl) var(--spacing-2xl) var(--spacing-3xl);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-3xl);
  color: var(--text-secondary);
  text-align: center;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: var(--spacing-lg);
  opacity: 0.5;
}

.btn-save {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 16px;
  background: var(--primary-500);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.btn-save:hover {
  background: var(--primary-600);
}

.save-toast {
  margin-top: 6px;
  font-size: 0.78rem;
  color: #16a34a;
  font-weight: 500;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
