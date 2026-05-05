<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import SharedResumeView from '@/components/resume/SharedResumeView.vue'
import { getSharedResumeDocument, toAbsoluteResumeShareUrl, type SharedResumeDocument } from '@/services/resumeStorageService'
// author: Bob

const props = defineProps<{
  shareToken: string
}>()

const loading = ref(true)
const errorMessage = ref('')
const document = ref<SharedResumeDocument | null>(null)

const shareUrl = computed(() => toAbsoluteResumeShareUrl(`/share/${props.shareToken}`))

async function loadSharedResume() {
  loading.value = true
  errorMessage.value = ''
  try {
    document.value = await getSharedResumeDocument(props.shareToken)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '分享简历加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadSharedResume()
})
</script>

<template>
  <div v-if="loading" class="share-loading-page">
    <div class="share-loading-card">
      <p class="share-loading-kicker">简历分享页</p>
      <h1 class="share-loading-title">正在加载分享简历</h1>
      <p class="share-loading-desc">请稍候，我们正在准备当前分享内容。</p>
    </div>
  </div>

  <div v-else-if="errorMessage" class="share-error-page">
    <div class="share-error-card">
      <p class="share-loading-kicker">分享链接不可用</p>
      <h1 class="share-loading-title">未能打开这份简历</h1>
      <p class="share-loading-desc">{{ errorMessage }}</p>
      <button class="share-error-button" type="button" @click="loadSharedResume">重新加载</button>
    </div>
  </div>

  <SharedResumeView v-else-if="document" :document="document" :share-url="shareUrl" />
</template>

<style scoped>
.share-loading-page,
.share-error-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(circle at top left, rgba(219, 234, 254, 0.88), transparent 30%),
    linear-gradient(180deg, #f6f8fc 0%, #eef3f8 100%);
  padding: 24px;
}

.share-loading-card,
.share-error-card {
  width: min(520px, 100%);
  padding: 28px;
  border-radius: 24px;
  border: 1px solid rgba(216, 224, 235, 0.9);
  background: rgba(255, 255, 255, 0.88);
  box-shadow: var(--shadow-md);
  backdrop-filter: blur(14px);
}

.share-loading-kicker {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--color-brand-text);
  text-transform: uppercase;
}

.share-loading-title {
  margin-top: 10px;
  font-size: clamp(26px, 4vw, 38px);
  line-height: 1.08;
  color: var(--color-text-primary);
}

.share-loading-desc {
  margin-top: 14px;
  font-size: 14px;
  line-height: 1.8;
  color: var(--color-text-secondary);
}

.share-error-button {
  margin-top: 18px;
  min-height: 44px;
  padding: 0 18px;
  border: none;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, var(--color-brand) 0%, var(--color-brand-hover) 100%);
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
}
</style>
