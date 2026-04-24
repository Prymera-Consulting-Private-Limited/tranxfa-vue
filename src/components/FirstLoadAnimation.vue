<template>
  <div
    v-if="showOverlay"
    :class="[
      'fixed inset-0 z-[100] flex items-center justify-center transition-all duration-700',
      isComplete ? 'pointer-events-none scale-110 opacity-0' : 'scale-100 opacity-100',
      'bg-gradient-to-br from-gray-50 via-purple-50 to-gray-50'
    ]"
  >
    <!-- Animated background grid -->
    <div class="absolute inset-0 opacity-20">
      <div
        class="absolute inset-0"
        :style="{
          backgroundImage: gridBg,
          backgroundSize: '50px 50px',
          animation: 'gridMove 20s linear infinite'
        }"
      />
    </div>

    <!-- Glowing orbs -->
    <div class="absolute left-1/4 top-1/4 h-72 w-72 animate-pulse rounded-full bg-teal-500 opacity-20 blur-3xl"></div>
    <div class="absolute bottom-1/4 right-1/4 h-72 w-72 animate-pulse rounded-full bg-blue-500 opacity-20 blur-3xl"></div>

    <div class="relative flex flex-col items-center gap-12 px-4">
      <!-- Logo -->
      <div class="group relative">
        <div class="absolute inset-0 h-40 w-40 rounded-full bg-gradient-to-r from-teal-600 to-blue-600 opacity-50 blur-2xl"></div>

        <div class="absolute inset-0 h-40 w-40">
          <div class="absolute inset-0 animate-spin rounded-full border-2 border-teal-500/30 border-t-teal-500"></div>
          <div class="reverse absolute inset-2 animate-spin rounded-full border-2 border-blue-500/30 border-b-blue-500"></div>
        </div>

        <div class="relative flex h-40 w-40 items-center justify-center">
          <div
            class="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-gray-50 via-purple-50 to-gray-50 shadow-2xl"
          >
            <img src="/images/logo.png" alt="" width="80" height="80" />
          </div>
        </div>
      </div>

      <!-- Brand Name -->
      <div class="space-y-4 text-center">
        <h1 class="text-6xl font-black tracking-tight md:text-7xl">
          <span class="bg-gradient-to-r from-teal-400 to-blue-400 bg-clip-text text-transparent">
            {{ typedText }}
          </span>
          <span class="animate-pulse text-teal-400">
            {{ typedText.length < brandName.length ? '|' : '' }}
          </span>
        </h1>

        <p class="animate-fadeInUp text-lg font-light tracking-wide text-gray-700 opacity-0 md:text-xl">
          Crafting your payment experience
        </p>
      </div>

      <!-- Progress Bar -->
      <div class="w-80 space-y-3 md:w-96">
        <div class="relative h-3 overflow-hidden rounded-full border bg-gray-200 shadow-inner">
          <div
            class="h-full rounded-full bg-gradient-to-r from-teal-600 to-blue-600 transition-all duration-300"
            :style="{ width: progress + '%' }"
          ></div>
        </div>

        <div class="flex justify-between px-1">
          <span class="text-2xl font-bold text-teal-500">
            {{ Math.round(progress) }}%
          </span>
          <span class="text-sm text-gray-600">
            {{ statusText }}
          </span>
        </div>
      </div>

      <!-- Particles -->
      <div class="pointer-events-none absolute inset-0">
        <div
          v-for="i in 12"
          :key="i"
          class="absolute h-1.5 w-1.5 rounded-full"
          :style="particleStyle(i)"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const showOverlay = ref(true)
const progress = ref(0)
const isComplete = ref(false)
const typedText = ref('')
const brandName = 'Payvel'

let typingIntervalId = null
let progressIntervalId = null

const gridBg = `
linear-gradient(rgba(139, 92, 246, 0.3) 1px, transparent 1px),
linear-gradient(90deg, rgba(139, 92, 246, 0.3) 1px, transparent 1px)
`

const statusText = computed(() => {
  if (progress.value < 30) return 'Initializing...'
  if (progress.value < 60) return 'Loading assets...'
  if (progress.value < 90) return 'Almost there...'
  return 'Ready!'
})

const particleStyle = (i) => ({
  left: `${10 + i * 7}%`,
  top: `${20 + (i % 3) * 25}%`,
  background: i % 2 === 0 ? 'rgb(20,184,166)' : 'rgb(59,130,246)',
  animation: `float ${2 + (i % 3) * 0.5}s ease-in-out infinite`,
  animationDelay: `${i * 0.15}s`,
  opacity: 0.4
})

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function whenWindowLoaded() {
  if (document.readyState === 'complete') return Promise.resolve()
  return new Promise((resolve) => {
    window.addEventListener('load', resolve, { once: true })
  })
}

function clearTimers() {
  if (typingIntervalId != null) {
    clearInterval(typingIntervalId)
    typingIntervalId = null
  }
  if (progressIntervalId != null) {
    clearInterval(progressIntervalId)
    progressIntervalId = null
  }
}

function finishSplash() {
  isComplete.value = true
  setTimeout(() => {
    showOverlay.value = false
  }, 800)
}

onMounted(async () => {
  const startedAt = performance.now()
  const minVisibleMs = 1600
  const progressCapWhileLoading = 88

  let i = 0
  typingIntervalId = setInterval(() => {
    if (i <= brandName.length) {
      typedText.value = brandName.slice(0, i++)
    } else {
      clearInterval(typingIntervalId)
      typingIntervalId = null
    }
  }, 120)

  progressIntervalId = setInterval(() => {
    if (progress.value < progressCapWhileLoading) {
      progress.value = Math.min(
        progressCapWhileLoading,
        progress.value + 2 + Math.random() * 3.5
      )
    }
  }, 100)

  try {
    await Promise.all([router.isReady(), whenWindowLoaded()])
  } catch {
    /* ignore */
  }

  await nextTick()
  await new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve))
  })

  if (progressIntervalId != null) {
    clearInterval(progressIntervalId)
    progressIntervalId = null
  }
  progress.value = 100

  const elapsed = performance.now() - startedAt
  const remaining = Math.max(0, minVisibleMs - elapsed)
  await sleep(remaining + 350)

  clearTimers()
  finishSplash()
})

onBeforeUnmount(() => {
  clearTimers()
})
</script>

<style scoped>
@keyframes gridMove {
  100% {
    transform: translate(50px, 50px);
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fadeInUp {
  animation: fadeInUp 0.8s ease-out 1s forwards;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  50% {
    transform: translateY(-20px);
    opacity: 0.8;
  }
}

.reverse {
  animation-direction: reverse;
}
</style>
