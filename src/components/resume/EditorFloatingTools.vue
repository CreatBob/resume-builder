<!-- author: Bob -->
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useResumeStore } from '@/stores/resume'
import { getModuleIconPaths, MODULE_ICON_VIEWBOX } from '@/constants/moduleIcons'

const emit = defineEmits<{
  (event: 'open-ai'): void
}>()

const store = useResumeStore()
const moduleMenuOpen = ref(false)
const moduleMenuRef = ref<HTMLElement | null>(null)
const draggingModuleKey = ref<string | null>(null)
const dragOverModuleKey = ref<string | null>(null)

const visibleCount = computed(() => store.modules.filter((m) => m.visible).length)
const isDefaultOrder = computed(() => store.isDefaultModuleOrder())

function toggleModuleMenu() {
  moduleMenuOpen.value = !moduleMenuOpen.value
}

function handleDocumentPointerDown(event: MouseEvent) {
  const target = event.target as Node | null
  if (!target || !moduleMenuRef.value) return
  if (!moduleMenuRef.value.contains(target)) {
    moduleMenuOpen.value = false
  }
}

function handleResetOrder() {
  store.resetModuleOrder()
}

function moduleIconPaths(key: string): string[] {
  return getModuleIconPaths(key)
}

function canMoveUp(key: string): boolean {
  return store.canMoveModule(key, 'up')
}

function canMoveDown(key: string): boolean {
  return store.canMoveModule(key, 'down')
}

function moveUp(key: string) {
  store.moveModule(key, 'up')
}

function moveDown(key: string) {
  store.moveModule(key, 'down')
}

function handleSwitchDragStart(event: DragEvent, key: string) {
  if (key === 'basicInfo') {
    event.preventDefault()
    return
  }
  draggingModuleKey.value = key
  event.dataTransfer?.setData('text/plain', key)
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
  }
}

function handleSwitchDragOver(event: DragEvent, key: string) {
  if (!draggingModuleKey.value || draggingModuleKey.value === key) return
  event.preventDefault()
  dragOverModuleKey.value = key
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

function handleSwitchDrop(targetKey: string) {
  const sourceKey = draggingModuleKey.value
  if (!sourceKey || sourceKey === targetKey) return
  store.reorderModule(sourceKey, targetKey)
  dragOverModuleKey.value = null
}

function handleSwitchDragEnd() {
  draggingModuleKey.value = null
  dragOverModuleKey.value = null
}

onMounted(() => {
  document.addEventListener('mousedown', handleDocumentPointerDown)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleDocumentPointerDown)
})
</script>

<template>
  <div ref="moduleMenuRef" class="floating-tools">
    <div class="floating-tools-stack">
      <div class="module-switch-anchor">
        <button
          class="floating-tool-btn module-tool-btn"
          type="button"
          :aria-expanded="moduleMenuOpen"
          aria-haspopup="menu"
          aria-label="模块开关"
          title="模块开关"
          @click="toggleModuleMenu"
        >
          <span class="btn-module-switch-icon">⚙</span>
          <span class="floating-badge">{{ visibleCount }}</span>
        </button>
        <div v-if="moduleMenuOpen" class="module-switch-popover">
          <div class="module-switch-popover-header">
            <p class="module-switch-popover-title">选择展示模块</p>
            <button
              class="btn-reset-order-icon"
              type="button"
              :disabled="isDefaultOrder"
              aria-label="恢复默认顺序"
              title="恢复默认顺序"
              @click="handleResetOrder"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20 11a8 8 0 1 1-2.34-5.66" />
                <path d="M20 4v7h-7" />
              </svg>
            </button>
          </div>
          <ul class="module-switch-list">
            <li
              v-for="mod in store.modules"
              :key="`switch-${mod.key}`"
              class="module-switch-item"
              :class="{
                active: mod.visible,
                muted: !mod.visible,
                draggable: mod.key !== 'basicInfo',
                dragging: draggingModuleKey === mod.key,
                'drag-over': dragOverModuleKey === mod.key,
              }"
              :draggable="mod.key !== 'basicInfo'"
              @dragstart="handleSwitchDragStart($event, mod.key)"
              @dragover="handleSwitchDragOver($event, mod.key)"
              @drop.prevent="handleSwitchDrop(mod.key)"
              @dragend="handleSwitchDragEnd"
            >
              <div class="module-switch-info">
                <span v-if="mod.key !== 'basicInfo'" class="drag-handle" aria-hidden="true" title="拖拽排序">⋮⋮</span>
                <span class="module-switch-icon" aria-hidden="true">
                  <svg class="module-switch-icon-svg" :viewBox="MODULE_ICON_VIEWBOX">
                    <path v-for="(d, idx) in moduleIconPaths(mod.key)" :key="`switch-${mod.key}-${idx}`" :d="d" />
                  </svg>
                </span>
                <span class="module-switch-label">{{ mod.label }}</span>
              </div>

              <div class="module-switch-actions">
                <div v-if="mod.key !== 'basicInfo' && mod.visible" class="order-actions order-actions-switch">
                  <button class="order-btn" :disabled="!canMoveUp(mod.key)" @click.stop="moveUp(mod.key)">↑</button>
                  <button class="order-btn" :disabled="!canMoveDown(mod.key)" @click.stop="moveDown(mod.key)">↓</button>
                </div>
                <label class="toggle-switch">
                  <input
                    type="checkbox"
                    :checked="mod.visible"
                    :aria-label="`${mod.label}开关`"
                    @change="store.toggleModule(mod.key)"
                  />
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </li>
          </ul>
        </div>
      </div>
      <button
        class="floating-tool-btn ai-tool-btn"
        type="button"
        aria-label="AI优化建议"
        title="AI优化建议"
        @click="emit('open-ai')"
      >
        <span class="ai-tool-text">AI</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.floating-tools {
  position: sticky;
  top: 50%;
  z-index: 30;
  height: 0;
  pointer-events: none;
  align-self: flex-end;
  margin-right: 8px;
}

.floating-tools-stack {
  width: fit-content;
  display: inline-flex;
  flex-direction: column;
  gap: 12px;
  transform: translateY(-50%);
  pointer-events: auto;
}

.floating-tool-btn {
  width: 52px;
  height: 52px;
  padding: 0;
  border-radius: 50%;
  border: 1px solid var(--color-border-default);
  background: var(--color-bg-panel);
  color: var(--color-brand);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-md);
  transition: transform 0.16s ease, box-shadow 0.16s ease, background-color 0.16s ease;
  position: relative;
}

.floating-tool-btn:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-lg);
  background: var(--color-brand-subtle);
}

.module-switch-anchor {
  position: relative;
}

.ai-tool-btn {
  background: var(--color-brand);
  border-color: var(--color-brand);
  color: var(--color-text-inverse);
}

.ai-tool-btn:hover {
  background: var(--color-brand-hover);
  border-color: var(--color-brand-hover);
}

.btn-module-switch-icon {
  font-size: 16px;
  line-height: 1;
}

.floating-badge {
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: var(--radius-full);
  background: var(--color-brand);
  color: var(--color-text-inverse);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  position: absolute;
  right: -4px;
  top: -4px;
  border: 2px solid var(--color-bg-app);
}

.ai-tool-text {
  font-size: 14px;
  line-height: 1;
  font-weight: 800;
}

.module-switch-popover {
  position: absolute;
  top: -4px;
  right: calc(100% + 12px);
  width: 288px;
  max-width: min(288px, calc(100vw - 96px));
  padding: 10px;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: var(--color-bg-panel);
  box-shadow: var(--shadow-lg);
  z-index: 20;
}

.module-switch-popover-title {
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 700;
}

.module-switch-popover-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.btn-reset-order-icon {
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-panel);
  color: var(--color-text-secondary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.btn-reset-order-icon svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.btn-reset-order-icon:hover:not(:disabled) {
  border-color: var(--color-brand);
  color: var(--color-brand);
  background: var(--color-brand-subtle);
}

.btn-reset-order-icon:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.module-switch-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.module-switch-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border-radius: 10px;
  padding: 10px 12px;
  border: 1px solid transparent;
  background: var(--color-bg-subtle);
  transition: all 0.18s ease;
}

.module-switch-item.draggable {
  cursor: grab;
}

.module-switch-item.draggable:active {
  cursor: grabbing;
}

.module-switch-item.active {
  background: var(--color-bg-panel);
  border-color: var(--color-border-default);
}

.module-switch-item.muted {
  opacity: 0.9;
}

.module-switch-item.dragging {
  opacity: 0.5;
}

.module-switch-item.drag-over {
  border-color: var(--color-brand);
  box-shadow: 0 0 0 1px var(--state-focus-ring) inset;
}

.module-switch-info {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.drag-handle {
  color: var(--color-text-tertiary);
  letter-spacing: -1px;
  font-size: 13px;
  line-height: 1;
  flex-shrink: 0;
}

.module-switch-icon {
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.module-switch-icon-svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: var(--color-text-secondary);
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.module-switch-item.active .module-switch-icon-svg {
  stroke: var(--color-brand);
}

.module-switch-label {
  color: var(--color-text-primary);
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.module-switch-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.order-actions {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.order-actions-switch {
  margin-right: 2px;
}

.order-btn {
  width: 24px;
  height: 24px;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-sm);
  background: var(--color-bg-panel);
  color: var(--color-text-secondary);
  font-size: 12px;
  line-height: 1;
  font-weight: 700;
  cursor: pointer;
}

.order-btn:hover:not(:disabled) {
  border-color: var(--color-brand);
  color: var(--color-brand);
  background: var(--color-brand-subtle);
}

.order-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.toggle-switch {
  position: relative;
  width: 42px;
  height: 24px;
  flex-shrink: 0;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  background: var(--color-border-strong);
  transition: 0.2s ease;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  left: 3px;
  top: 3px;
  border-radius: 50%;
  background: var(--color-text-inverse);
  transition: 0.2s ease;
}

.toggle-switch input:checked + .toggle-slider {
  background: var(--color-brand);
}

.toggle-switch input:checked + .toggle-slider::before {
  transform: translateX(18px);
}

@container (max-width: 560px) {
  .module-switch-popover {
    right: auto;
    left: 0;
    top: auto;
    bottom: calc(100% + 10px);
    width: min(280px, calc(100vw - 24px));
    max-width: none;
  }
}

@media (max-width: 760px) {
  .floating-tools {
    display: none;
  }
}
</style>
