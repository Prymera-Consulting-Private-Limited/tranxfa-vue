<script setup>
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CustomerLayout from '@/components/CustomerLayout.vue'
import { DotLottieVue } from '@lottiefiles/dotlottie-vue'
import { RouterLink } from 'vue-router'
import { ArrowLeftIcon } from '@heroicons/vue/24/outline'
import {
  comingSoonByFeature,
  COMING_SOON_FEATURES,
} from '@/config/coming_soon.js'

const props = defineProps({
  feature: {
    type: String,
    default: '',
  },
})

const route = useRoute()
const router = useRouter()

const slug = computed(() => (props.feature || route.params.feature || '').toLowerCase())

const config = computed(() => {
  const key = slug.value
  if (key && comingSoonByFeature[key]) {
    return comingSoonByFeature[key]
  }
  return comingSoonByFeature['rate-alerts']
})

const BadgeIcon = computed(() => config.value.icon)

watch(
  slug,
  (s) => {
    if (s && !COMING_SOON_FEATURES.includes(s)) {
      router.replace({ name: 'dashboard' })
    }
  },
  { immediate: true },
)
</script>

<template>
  <CustomerLayout>
    <main class="relative px-4 sm:px-6 lg:px-8">
      <div
        class="mx-auto max-w-full overflow-hidden rounded-3xl border border-gray-200/90 bg-gradient-to-b from-white via-brand-50/30 to-white px-4 py-10 shadow-sm ring-1 ring-gray-900/[0.04] sm:px-8 sm:py-12 lg:px-10 lg:py-14"
      >
        <div
          class="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl"
          aria-hidden="true"
        >
          <div
            class="absolute -right-24 top-0 h-72 w-72 rounded-full bg-brand-200/25 blur-3xl"
          />
          <div
            class="absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-sky-200/20 blur-3xl"
          />
        </div>

        <div class="relative text-center">
          <p
            class="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50/90 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-800"
          >
            <component :is="BadgeIcon" class="size-3.5 text-brand-600" aria-hidden="true" />
            {{ config.badge }}
          </p>
          <h1 class="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            {{ config.headline }}
            <span
              class="bg-gradient-to-r from-brand-600 via-teal-600 to-brand-500 bg-clip-text text-transparent"
            >
              {{ config.headlineAccent }}
            </span>
          </h1>
          <p class="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-gray-600 sm:text-base">
            {{ config.description }}
          </p>
        </div>

        <div
          class="relative mx-auto mt-8 flex w-full max-w-lg justify-center sm:mt-10"
          role="img"
          :aria-label="config.lottieLabel"
        >
          <DotLottieVue
            class="h-48 w-full max-w-md object-contain sm:h-56 md:h-64 md:max-w-lg"
            autoplay
            loop
            :src="config.lottieSrc"
          />
        </div>

        <div
          class="relative mx-auto mt-10 flex max-w-md flex-col gap-3 sm:mt-12 sm:flex-row sm:justify-center sm:gap-4"
        >
          <RouterLink
            :to="{ name: 'dashboard' }"
            class="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-800 shadow-sm transition hover:border-brand-200 hover:bg-brand-50/80 hover:text-brand-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            <ArrowLeftIcon class="size-5 shrink-0" aria-hidden="true" />
            Back to dashboard
          </RouterLink>
          <RouterLink
            :to="{ name: 'support' }"
            class="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-brand-600/25 transition hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            Contact support
          </RouterLink>
        </div>
      </div>
    </main>
  </CustomerLayout>
</template>
