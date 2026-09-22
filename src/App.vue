<script setup>
import {onErrorCaptured, ref} from 'vue'
import {RouterView} from 'vue-router'
import {isStaleChunkError, reportError} from '@/error_handling.js'

// A render or lifecycle error anywhere below used to leave whatever had
// painted so far, or nothing, with no message. This is the fallback the
// customer sees instead.
const failed = ref(false)

onErrorCaptured((error, instance, info) => {
  reportError(error, `app:${info}`)
  // A stale chunk is handled by the router (a single reload); everything
  // else stops here.
  if (! isStaleChunkError(error)) {
    failed.value = true
  }
  return false
})

function reload() {
  window.location.reload()
}
</script>

<template>
  <main v-if="failed" class="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6 py-16 text-center">
    <p class="text-xs/5 font-semibold tracking-wide text-brand-700 uppercase">{{ $t('appError.eyebrow') }}</p>
    <h1 class="mt-2 text-2xl font-bold text-gray-900">{{ $t('appError.title') }}</h1>
    <p class="mt-3 max-w-md text-sm/6 text-gray-600">{{ $t('appError.body') }}</p>
    <button type="button" @click="reload" class="mt-8 inline-flex items-center rounded-xl bg-brand-700 px-4 py-2.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700">{{ $t('appError.reload') }}</button>
  </main>
  <RouterView v-else />
</template>
