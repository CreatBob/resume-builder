<!-- author: Bob -->
<script setup lang="ts">
import MobileBottomSheet from './MobileBottomSheet.vue'
import type { ResumeDocument } from '@/services/resumeStorageService'

const props = defineProps<{
  modelValue: boolean
  currentResumeId: string
  resumeDocuments: ResumeDocument[]
  isWorkspaceReady: boolean
  renameValue: string
  searchValue: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'update:renameValue', value: string): void
  (e: 'update:searchValue', value: string): void
  (e: 'switch-resume', nextId: string): void
  (e: 'rename-resume'): void
  (e: 'create-resume'): void
  (e: 'delete-resume'): void
  (e: 'import-json'): void
  (e: 'switch-mobile-preview'): void
}>()

function handleSwitchChange(event: Event) {
  const select = event.target as HTMLSelectElement
  emit('switch-resume', select.value)
}

function handleOpenPreview() {
  emit('update:modelValue', false)
  emit('switch-mobile-preview')
}

function handleOpenImport() {
  emit('update:modelValue', false)
  emit('import-json')
}
</script>

<template>
  <MobileBottomSheet
    :model-value="props.modelValue"
    title="简历与搜索"
    subtitle="管理多份简历、搜索模块或导入简历"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="mobile-sheet-stack">
      <div class="mobile-sheet-block">
        <label class="assist-label" for="mobile-resume-select">切换简历</label>
        <select
          id="mobile-resume-select"
          class="resume-select"
          :value="props.currentResumeId"
          :disabled="!props.isWorkspaceReady"
          @change="handleSwitchChange"
        >
          <option v-for="doc in props.resumeDocuments" :key="doc.id" :value="doc.id">
            {{ doc.title }}
          </option>
        </select>
      </div>

      <div class="mobile-sheet-block">
        <label class="assist-label" for="mobile-resume-name-input">重命名当前简历</label>
        <div class="mobile-inline-row">
          <input
            id="mobile-resume-name-input"
            :value="props.renameValue"
            class="resume-title-input"
            :disabled="!props.isWorkspaceReady"
            placeholder="简历名称"
            @input="emit('update:renameValue', ($event.target as HTMLInputElement).value)"
            @blur="emit('rename-resume')"
            @keyup.enter="emit('rename-resume')"
          />
          <button
            class="btn-resume-action"
            type="button"
            :disabled="!props.isWorkspaceReady"
            @click="emit('rename-resume')"
          >
            保存
          </button>
        </div>
      </div>

      <div class="mobile-sheet-actions">
        <button
          class="btn-resume-action"
          type="button"
          :disabled="!props.isWorkspaceReady"
          @click="emit('create-resume')"
        >
          新建简历
        </button>
        <button
          class="btn-resume-action btn-resume-danger"
          type="button"
          :disabled="!props.isWorkspaceReady || props.resumeDocuments.length <= 1"
          @click="emit('delete-resume')"
        >
          删除当前
        </button>
        <button class="btn-resume-action" type="button" @click="handleOpenImport">
          导入
        </button>
      </div>

      <div class="mobile-sheet-block">
        <label class="assist-label" for="mobile-module-search-input">搜索模块</label>
        <input
          id="mobile-module-search-input"
          :value="props.searchValue"
          class="search-input"
          placeholder="基本信息 / 教育经历 / 专业技能"
          @input="emit('update:searchValue', ($event.target as HTMLInputElement).value)"
        />
      </div>

      <button class="mobile-preview-jump-btn" type="button" @click="handleOpenPreview">
        查看实时排版预览
      </button>
    </div>
  </MobileBottomSheet>
</template>

<style scoped>
.mobile-sheet-stack {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.mobile-sheet-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.assist-label {
  color: var(--color-text-tertiary);
  font-size: 11px;
  font-weight: 700;
}

.resume-select,
.resume-title-input,
.search-input {
  width: 100%;
  min-width: 0;
  height: 36px;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-panel);
  color: var(--color-text-primary);
  font-size: var(--font-size-xs);
  font-weight: 600;
  padding: 0 10px;
}

.resume-select:focus,
.resume-title-input:focus,
.search-input:focus {
  outline: none;
  border-color: var(--color-border-focus);
  box-shadow: 0 0 0 3px var(--state-focus-ring);
}

.mobile-inline-row {
  display: flex;
  gap: var(--space-2);
}

.mobile-sheet-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-2);
}

.btn-resume-action {
  min-height: 40px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-default);
  background: var(--color-bg-panel);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: 700;
  white-space: nowrap;
  flex-shrink: 0;
  cursor: pointer;
}

.btn-resume-action:hover:not(:disabled) {
  border-color: var(--color-border-strong);
  color: var(--color-text-primary);
  background: var(--state-hover-bg);
}

.btn-resume-action:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.btn-resume-danger {
  color: var(--color-danger);
}

.mobile-preview-jump-btn {
  width: 100%;
  min-height: 44px;
  border: none;
  border-radius: var(--radius-md);
  background: var(--color-brand);
  color: var(--color-text-inverse);
  font-size: var(--font-size-md);
  font-weight: 700;
  cursor: pointer;
}
</style>
