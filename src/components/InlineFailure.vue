<script setup>
/**
 * A failure the customer can act on, next to the control that failed.
 *
 * Toasts disappear and sit at the top of the page; on a phone the button
 * the customer just pressed is usually at the bottom. The message renders
 * only when there is one, so it can be left in the template permanently.
 */
defineProps({
  message: {type: String, default: null},
  retryLabel: {type: String, default: null},
});
defineEmits(['retry']);
</script>

<template>
  <div v-if="message" role="alert" class="mt-3 rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-left text-sm/6 text-danger-700">
    <p>{{ message }}</p>
    <button v-if="retryLabel" type="button" @click="$emit('retry')" class="mt-1 inline-flex min-h-11 items-center font-semibold text-danger-800 underline underline-offset-2 hover:text-danger-900">{{ retryLabel }}</button>
  </div>
</template>
