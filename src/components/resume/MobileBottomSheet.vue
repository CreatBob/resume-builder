<!-- author: Bob -->
<script lang="ts">
let bodyScrollLockCount = 0
let previousBodyOverflow: string | null = null

function acquireBodyScrollLock() {
  if (typeof document === 'undefined') return
  if (bodyScrollLockCount === 0) {
    previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  bodyScrollLockCount += 1
}

function releaseBodyScrollLock() {
  if (typeof document === 'undefined' || bodyScrollLockCount === 0) return
  bodyScrollLockCount -= 1
  if (bodyScrollLockCount === 0) {
    document.body.style.overflow = previousBodyOverflow ?? ''
    previousBodyOverflow = null
  }
}
</script>

<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title: string
    subtitle?: string
  }>(),
  {
    subtitle: '',
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

let hasAcquiredScrollLock = false

function syncBodyScrollLock(open: boolean) {
  if (open && !hasAcquiredScrollLock) {
    acquireBodyScrollLock()
    hasAcquiredScrollLock = true
  } else if (!open && hasAcquiredScrollLock) {
    releaseBodyScrollLock()
    hasAcquiredScrollLock = false
  }
}

function closeSheet() {
  emit('update:modelValue', false)
}

function handleKeydown(event: KeyboardEvent) {
  if (props.modelValue && event.key === 'Escape') {
    closeSheet()
  }
}

watch(
  () => props.modelValue,
  (open) => {
    syncBodyScrollLock(open)
  },
  { immediate: true },
)

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  syncBodyScrollLock(false)
})
</script>

<template>
  <teleport to="body">
    <div v-if="props.modelValue" class="sheet-overlay" role="dialog" aria-modal="true" :aria-label="props.title" @click.self="closeSheet">
      <div class="sheet-surface">
        <div class="sheet-handle-wrap" aria-hidden="true">
          <span class="sheet-handle"></span>
        </div>
        <div class="sheet-header">
          <div class="sheet-heading">
            <h3 class="sheet-title">{{ props.title }}</h3>
            <p v-if="props.subtitle" class="sheet-subtitle">{{ props.subtitle }}</p>
          </div>
          <button class="sheet-close-btn" type="button" aria-label="关闭抽屉" @click="closeSheet">
            关闭
          </button>
        </div>
        <div class="sheet-body">
          <slot />
        </div>
      </div>
    </div>
  </teleport>
</template>

<style scoped>
.sheet-overlay {
  position: fixed;
  inset: 0;
  z-index: 950;
  background: var(--color-bg-overlay);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  animation: sheet-fade-in 0.18s ease;
}

@keyframes sheet-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.sheet-surface {
  width: min(100vw, 640px);
  max-height: min(84dvh, 680px);
  background: var(--color-bg-panel);
  border-top: 1px solid var(--color-border-default);
  border-radius: 16px 16px 0 0;
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding-bottom: env(safe-area-inset-bottom, 0px);
  animation: sheet-slide-up 0.2s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes sheet-slide-up {
  from { transform: translateY(28px); opacity: 0.7; }
  to { transform: translateY(0); opacity: 1; }
}

.sheet-handle-wrap {
  display: flex;
  justify-content: center;
  padding: 8px 0 2px;
  flex-shrink: 0;
}

.sheet-handle {
  width: 36px;
  height: 4px;
  border-radius: var(--radius-full);
  background: var(--color-border-strong);
}

.sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-4) var(--space-3);
  border-bottom: 1px solid var(--color-border-subtle);
  flex-shrink: 0;
}

.sheet-heading {
  min-width: 0;
}

.sheet-title {
  color: var(--color-text-primary);
  font-size: var(--font-size-lg);
  font-weight: 700;
  line-height: 1.3;
}

.sheet-subtitle {
  margin-top: 2px;
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}

.sheet-close-btn {
  min-width: 56px;
  min-height: 36px;
  padding: 0 var(--space-3);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-subtle);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: 700;
  cursor: pointer;
  flex-shrink: 0;
}

.sheet-close-btn:hover {
  border-color: var(--color-brand);
  color: var(--color-brand);
  background: var(--color-brand-subtle);
}

.sheet-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: var(--space-4);
  -webkit-overflow-scrolling: touch;
}
</style>
