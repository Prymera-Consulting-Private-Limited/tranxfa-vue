<template>
  <div class="text-sm font-medium text-gray-900">
    <div class="focus:outline-hidden xl:mb-4">
      <span class="absolute inset-0" aria-hidden="true" />
      <span>{{ index+1 }}. {{ task.title }}</span>
      <span class="xl:hidden" aria-hidden="true"> &rarr;</span>
    </div>
  </div>
  <p class="mt-1 text-sm text-gray-500 leading-6">{{ task.description }}</p>
</template>

<script setup>
defineProps({
  task: {
    type: Object,
    required: true,
  },
  index: {
    type: Number,
    required: true,
  }
})
</script>