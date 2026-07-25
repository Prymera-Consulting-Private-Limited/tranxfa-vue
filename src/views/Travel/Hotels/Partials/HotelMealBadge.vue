<script setup>
import {computed} from 'vue';
import {prettifyLabel} from "@/composables/travel/hotels/hotel_utils.js";

const props = defineProps({
  meal: {
    type: Object,
    default: null,
  },
});

const LABELS = {
  'nomeal': 'Room only',
  'breakfast': 'Breakfast included',
  'breakfast-buffet': 'Buffet breakfast',
  'breakfast-for-1': 'Breakfast for 1',
  'half-board': 'Half board',
  'full-board': 'Full board',
  'all-inclusive': 'All inclusive',
};

const label = computed(() => {
  if (!props.meal?.value) {
    return 'Room only';
  }

  return LABELS[props.meal.value] ?? prettifyLabel(props.meal.value);
});

const classes = computed(() => {
  return props.meal?.hasBreakfast
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
      : 'bg-gray-50 text-gray-600 ring-gray-200';
});
</script>

<template>
  <span :class="[classes, 'inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium ring-1 ring-inset']">{{ label }}</span>
</template>
