<script setup>
const props = defineProps({
  rateCount: {
    type: Number,
    default: 0,
  },
});

const emit = defineEmits([
  'select',
]);
</script>

<template>
  <div>
    <button @click="$emit('select')" type="button" class="w-full cursor-pointer rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-brand-800 focus-visible:outline-0">Select room</button>
    <p v-if="rateCount > 1" class="mt-2 text-center text-xs text-gray-500">{{ rateCount }} room options</p>
  </div>
</template>
