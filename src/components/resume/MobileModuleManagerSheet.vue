<!-- author: Bob -->
<script setup lang="ts">
import MobileBottomSheet from './MobileBottomSheet.vue'
import { getModuleIconPaths, MODULE_ICON_VIEWBOX } from '@/constants/moduleIcons'
import type { ModuleConfig } from '@/stores/resume'

const props = defineProps<{
  modelValue: boolean
  modules: ModuleConfig[]
  visibleCount: number
  isDefaultOrder: boolean
  canMoveModule: (key: string, direction: 'up' | 'down') => boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'reset-order'): void
  (e: 'move-module', key: string, direction: 'up' | 'down'): void
  (e: 'toggle-module', key: string): void
}>()
</script>

<template>
  <MobileBottomSheet
    :model-value="props.modelValue"
    title="模块开关与排序"
    subtitle="控制模块显隐与简历展示顺序"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="mobile-module-sheet-head">
      <span class="assist-label">已启用 {{ props.visibleCount }} / {{ props.modules.length }}</span>
      <button
        class="btn-resume-action"
        type="button"
        :disabled="props.isDefaultOrder"
        @click="emit('reset-order')"
      >
        恢复默认顺序
      </button>
    </div>

    <ul class="mobile-module-list">
      <li
        v-for="mod in props.modules"
        :key="`mobile-mod-${mod.key}`"
        class="mobile-module-item"
        :class="{ active: mod.visible }"
      >
        <div class="mobile-module-info">
          <svg class="mobile-module-icon" :viewBox="MODULE_ICON_VIEWBOX" aria-hidden="true">
            <path v-for="(d, idx) in getModuleIconPaths(mod.key)" :key="`m-${mod.key}-${idx}`" :d="d" />
          </svg>
          <span class="mobile-module-name">{{ mod.label }}</span>
        </div>
        <div class="mobile-module-controls">
          <button
            v-if="mod.key !== 'basicInfo' && mod.visible"
            class="mobile-order-btn"
            type="button"
            :disabled="!props.canMoveModule(mod.key, 'up')"
            aria-label="上移模块"
            @click="emit('move-module', mod.key, 'up')"
          >
            ↑
          </button>
          <button
            v-if="mod.key !== 'basicInfo' && mod.visible"
            class="mobile-order-btn"
            type="button"
            :disabled="!props.canMoveModule(mod.key, 'down')"
            aria-label="下移模块"
            @click="emit('move-module', mod.key, 'down')"
          >
            ↓
          </button>
          <label class="mobile-toggle-switch">
            <input
              type="checkbox"
              :checked="mod.visible"
              :aria-label="`${mod.label}开关`"
              @change="emit('toggle-module', mod.key)"
            />
            <span class="mobile-toggle-slider"></span>
          </label>
        </div>
      </li>
    </ul>
  </MobileBottomSheet>
</template>

<style scoped>
.mobile-module-sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.assist-label {
  color: var(--color-text-tertiary);
  font-size: 11px;
  font-weight: 700;
}

.btn-resume-action {
  height: 34px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-default);
  background: var(--color-bg-panel);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: 700;
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

.mobile-module-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.mobile-module-item {
  min-height: 48px;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-subtle);
  background: var(--color-bg-subtle);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.mobile-module-item.active {
  border-color: var(--color-border-default);
  background: var(--color-bg-panel);
}

.mobile-module-info {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.mobile-module-icon {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: var(--color-text-secondary);
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
  flex-shrink: 0;
}

.mobile-module-item.active .mobile-module-icon {
  stroke: var(--color-brand);
}

.mobile-module-name {
  color: var(--color-text-primary);
  font-size: var(--font-size-md);
  font-weight: 600;
}

.mobile-module-controls {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.mobile-order-btn {
  width: 34px;
  height: 34px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border-default);
  background: var(--color-bg-panel);
  color: var(--color-text-secondary);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.mobile-order-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.mobile-toggle-switch {
  position: relative;
  width: 44px;
  height: 26px;
  flex-shrink: 0;
}

.mobile-toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.mobile-toggle-slider {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  background: var(--color-border-strong);
  transition: 0.2s ease;
}

.mobile-toggle-slider::before {
  content: '';
  position: absolute;
  width: 20px;
  height: 20px;
  left: 3px;
  top: 3px;
  border-radius: 50%;
  background: var(--color-text-inverse);
  transition: 0.2s ease;
}

.mobile-toggle-switch input:checked + .mobile-toggle-slider {
  background: var(--color-brand);
}

.mobile-toggle-switch input:checked + .mobile-toggle-slider::before {
  transform: translateX(18px);
}
</style>
