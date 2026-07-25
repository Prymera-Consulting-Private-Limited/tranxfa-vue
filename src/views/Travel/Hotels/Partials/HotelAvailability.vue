<script setup>
import {computed} from 'vue';
import {ExclamationTriangleIcon} from "@heroicons/vue/24/outline";

const props = defineProps({
  allotment: {
    type: Number,
    default: null,
  },
});

/**
 * Suppliers cap allotment low across the board, so anything other than genuine
 * scarcity would put an urgency badge on every result.
 */
const label = computed(() => {
  if (props.allotment === null || props.allotment === undefined) {
    return null;
  }

  if (props.allotment <= 0) {
    return 'Sold out';
  }

  return props.allotment === 1 ? 'Last room' : null;
});

const classes = computed(() => {
  return props.allotment <= 0
      ? 'bg-red-50 text-red-700 ring-red-200'
      : 'bg-amber-50 text-amber-700 ring-amber-200';
});
</script>

<template>
  <span v-if="label" :class="[classes, 'inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium ring-1 ring-inset']">
    <ExclamationTriangleIcon class="size-3.5" aria-hidden="true" />
    {{ label }}
  </span>
</template>
