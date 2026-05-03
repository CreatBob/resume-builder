<!-- author: jf -->
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
  border: 1px solid #2d2521;
  background: #2d2521;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 18px rgba(45, 37, 33, 0.22);
  transition: transform 0.16s ease, box-shadow 0.16s ease, background-color 0.16s ease;
  position: relative;
}

.floating-tool-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 24px rgba(45, 37, 33, 0.26);
  background: #1f1916;
}

.module-switch-anchor {
  position: relative;
}

.ai-tool-btn {
  background: #d97745;
  border-color: #d97745;
}

.ai-tool-btn:hover {
  background: #c96a3b;
}

.btn-module-switch-icon {
  font-size: 16px;
  line-height: 1;
}

.floating-badge {
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 999px;
  background: #d97745;
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  position: absolute;
  right: -4px;
  top: -4px;
  border: 2px solid #f7f2ec;
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
  border: 1px solid #e9ded0;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 16px 30px rgba(45, 37, 33, 0.16);
  z-index: 20;
}

.module-switch-popover-title {
  color: #8a7461;
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
  border: 1px solid #ddcfbf;
  border-radius: 8px;
  background: #fff;
  color: #8a7461;
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
  border-color: #d97745;
  color: #d97745;
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
  background: #f2ece5;
  transition: all 0.18s ease;
}

.module-switch-item.draggable {
  cursor: grab;
}

.module-switch-item.draggable:active {
  cursor: grabbing;
}

.module-switch-item.active {
  background: #ffffff;
  border-color: #e9ded0;
}

.module-switch-item.muted {
  opacity: 0.9;
}

.module-switch-item.dragging {
  opacity: 0.5;
}

.module-switch-item.drag-over {
  border-color: #d97745;
  box-shadow: 0 0 0 1px rgba(217, 119, 69, 0.2) inset;
}

.module-switch-info {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.drag-handle {
  color: #a08c7b;
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
  stroke: #8a7461;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.module-switch-item.active .module-switch-icon-svg {
  stroke: #d97745;
}

.module-switch-label {
  color: #2d2521;
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
  width: 22px;
  height: 22px;
  border: 1px solid #ddcfbf;
  border-radius: 6px;
  background: #fff;
  color: #8a7461;
  font-size: 12px;
  line-height: 1;
  font-weight: 700;
  cursor: pointer;
}

.order-btn:hover:not(:disabled) {
  border-color: #d97745;
  color: #d97745;
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
  background: #b8afa6;
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
  background: #ffffff;
  transition: 0.2s ease;
}

.toggle-switch input:checked + .toggle-slider {
  background: #d97745;
}

.toggle-switch input:checked + .toggle-slider::before {
  transform: translateX(18px);
}

@container (max-width: 560px) {
  .module-switch-popover {
    right: 0;
    top: auto;
    bottom: calc(100% + 10px);
    width: min(280px, calc(100vw - 24px));
    max-width: none;
  }
}
</style>
