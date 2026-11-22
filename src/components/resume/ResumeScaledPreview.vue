<!-- author: Bob -->
<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    watchKey?: string
    showZoomControls?: boolean
    initialMode?: 'fit' | 'actual'
    horizontalPadding?: number
  }>(),
  {
    watchKey: '',
    showZoomControls: true,
    initialMode: 'fit',
    horizontalPadding: 16,
  },
)

const A4_WIDTH = 794
const A4_RATIO = 297 / 210
const A4_HEIGHT = Math.round(A4_WIDTH * A4_RATIO)
const PAGE_BREAK_TOLERANCE = 1

const scrollContainerRef = ref<HTMLElement | null>(null)
const paperRef = ref<HTMLElement | null>(null)
const scaleMode = ref<'fit' | 'actual' | 'custom'>(props.initialMode)
const customScale = ref(1)
const containerWidth = ref(0)
const rawHeight = ref(A4_HEIGHT)
const pageBreaks = ref<number[]>([])

const fitScale = computed(() => {
  if (containerWidth.value <= 0) return 1
  const usableWidth = Math.max(240, containerWidth.value - props.horizontalPadding)
  return Math.min(1, Math.max(0.32, usableWidth / A4_WIDTH))
})

const activeScale = computed(() => {
  if (scaleMode.value === 'actual') return 1
  if (scaleMode.value === 'custom') return customScale.value
  return fitScale.value
})

const needsHorizontalScroll = computed(() => activeScale.value > fitScale.value + 0.01)
const scaledWidthPx = computed(() => Math.round(A4_WIDTH * activeScale.value))
const scaledHeightPx = computed(() => Math.round(rawHeight.value * activeScale.value))
const scalePercentLabel = computed(() => `${Math.round(activeScale.value * 100)}%`)

function updateContainerMetrics() {
  const scrollEl = scrollContainerRef.value
  if (scrollEl && scrollEl.clientWidth > 0) {
    containerWidth.value = scrollEl.clientWidth
  }
}

function updatePaperMetrics() {
  const paperEl = paperRef.value
  if (!paperEl) return
  const contentHeight = Math.max(A4_HEIGHT, paperEl.scrollHeight)
  rawHeight.value = contentHeight

  const overflowHeight = contentHeight - A4_HEIGHT
  if (overflowHeight <= PAGE_BREAK_TOLERANCE) {
    pageBreaks.value = []
    return
  }

  const breaks: number[] = []
  const totalPages = 1 + Math.ceil((overflowHeight - PAGE_BREAK_TOLERANCE) / A4_HEIGHT)
  for (let i = 1; i < totalPages; i += 1) {
    breaks.push(Math.round(i * A4_HEIGHT))
  }
  pageBreaks.value = breaks
}

function recalculate() {
  updateContainerMetrics()
  updatePaperMetrics()
}

function setFitMode() {
  scaleMode.value = 'fit'
}

function setActualMode() {
  scaleMode.value = 'actual'
}

function adjustScale(delta: number) {
  const nextScale = Math.min(1.2, Math.max(0.35, Number((activeScale.value + delta).toFixed(2))))
  customScale.value = nextScale
  scaleMode.value = 'custom'
}

let containerObserver: ResizeObserver | null = null
let paperObserver: ResizeObserver | null = null
let pendingMetricFrame: number | null = null

function scheduleContainerMetrics() {
  if (pendingMetricFrame !== null) return
  pendingMetricFrame = requestAnimationFrame(() => {
    pendingMetricFrame = null
    updateContainerMetrics()
  })
}

onMounted(() => {
  nextTick(() => {
    recalculate()
    if (scrollContainerRef.value) {
      containerObserver = new ResizeObserver(() => scheduleContainerMetrics())
      containerObserver.observe(scrollContainerRef.value)
    }
    if (paperRef.value) {
      paperObserver = new ResizeObserver(() => updatePaperMetrics())
      paperObserver.observe(paperRef.value)
    }
  })
})

watch(
  () => props.watchKey,
  () => {
    nextTick(() => updatePaperMetrics())
  },
)

onUnmounted(() => {
  if (pendingMetricFrame !== null) {
    cancelAnimationFrame(pendingMetricFrame)
  }
  containerObserver?.disconnect()
  paperObserver?.disconnect()
})

defineExpose({
  getPaperElement: () => paperRef.value,
  recalculate,
})
</script>

<template>
  <div class="scaled-preview-shell">
    <div v-if="props.showZoomControls" class="zoom-bar" aria-label="预览缩放控制">
      <div class="zoom-mode-group">
        <button
          class="zoom-chip"
          type="button"
          :class="{ active: scaleMode === 'fit' }"
          @click="setFitMode"
        >
          适应屏幕
        </button>
        <button
          class="zoom-chip"
          type="button"
          :class="{ active: scaleMode === 'actual' }"
          @click="setActualMode"
        >
          100% 原始
        </button>
      </div>
      <div class="zoom-step-group">
        <button class="zoom-step-btn" type="button" aria-label="缩小预览" @click="adjustScale(-0.1)">
          −
        </button>
        <span class="zoom-percent">{{ scalePercentLabel }}</span>
        <button class="zoom-step-btn" type="button" aria-label="放大预览" @click="adjustScale(0.1)">
          +
        </button>
      </div>
    </div>

    <div
      ref="scrollContainerRef"
      class="scaled-preview-scroll"
      :class="{ 'allow-x-scroll': needsHorizontalScroll }"
    >
      <div
        class="paper-scale-frame"
        :style="{
          width: `${scaledWidthPx}px`,
          height: `${scaledHeightPx}px`,
        }"
      >
        <div
          class="paper-scale-stage"
          :style="{
            width: `${A4_WIDTH}px`,
            transform: `scale(${activeScale})`,
          }"
        >
          <div
            ref="paperRef"
            class="paper"
            :style="{
              width: `${A4_WIDTH}px`,
              minHeight: `${A4_HEIGHT}px`,
            }"
          >
            <slot />
          </div>

          <div
            v-for="(pos, idx) in pageBreaks"
            :key="idx"
            class="page-line"
            :style="{ top: `${pos}px` }"
          >
            <span>第{{ idx + 2 }}页</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scaled-preview-shell {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.zoom-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding: 0 var(--space-1);
  flex-wrap: wrap;
}

.zoom-mode-group,
.zoom-step-group {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.zoom-chip {
  height: 28px;
  padding: 0 10px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-default);
  background: var(--color-bg-panel);
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
  font-weight: 600;
  cursor: pointer;
}

.zoom-chip:hover {
  border-color: var(--color-brand);
  color: var(--color-brand);
  background: var(--color-brand-subtle);
}

.zoom-chip.active {
  border-color: var(--color-brand);
  background: var(--color-brand-subtle);
  color: var(--color-brand-text);
}

.zoom-step-btn {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border-default);
  background: var(--color-bg-panel);
  color: var(--color-text-primary);
  font-size: var(--font-size-md);
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.zoom-step-btn:hover {
  border-color: var(--color-brand);
  color: var(--color-brand);
  background: var(--color-brand-subtle);
}

.zoom-percent {
  min-width: 44px;
  text-align: center;
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--color-text-secondary);
}

.scaled-preview-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: var(--space-1) var(--space-2) var(--space-4);
  -webkit-overflow-scrolling: touch;
}

.scaled-preview-scroll.allow-x-scroll {
  overflow-x: auto;
}

.paper-scale-frame {
  position: relative;
  margin: 0 auto;
  flex-shrink: 0;
}

.paper-scale-stage {
  position: relative;
  transform-origin: top left;
}

.paper {
  box-sizing: border-box;
  background: #ffffff;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-xs);
  color: #000000;
  box-shadow: var(--shadow-md);
}

.paper > :deep(*) {
  min-height: inherit;
}

.paper.pdf-exporting {
  box-shadow: none;
  border: none;
  border-radius: 0;
  min-height: 0 !important;
}

.page-line {
  position: absolute;
  left: 16px;
  right: 16px;
  transform: translateY(-6px);
  display: flex;
  align-items: center;
  gap: 8px;
  pointer-events: none;
  z-index: 2;
}

.page-line::before,
.page-line::after {
  content: '';
  flex: 1;
  height: 1px;
  border-top: 1px dashed var(--color-brand);
}

.page-line span {
  color: var(--color-brand);
  font-size: 10px;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.94);
  padding: 0 6px;
  border-radius: var(--radius-full);
}

@media (max-width: 760px) {
  .scaled-preview-scroll {
    padding: 4px 4px 16px;
  }

  .zoom-chip,
  .zoom-step-btn {
    min-height: 34px;
  }

  .zoom-step-btn {
    width: 34px;
  }
}
</style>
