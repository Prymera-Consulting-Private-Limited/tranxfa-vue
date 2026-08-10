<script setup>
import {computed} from 'vue';
import {prettifyLabel} from "@/composables/travel/hotels/hotel_utils.js";

const props = defineProps({
  meal: {
    type: String,
    default: null,
  },

  /**
   * The response's code-to-display-text dictionary.
   */
  labels: {
    type: Object,
    default: () => ({}),
  },
});

// Only for the hotel, quote and booking pages, which still carry the supplier's
// own lowercase strings. Search meals are our codes and always in labels, so
// this goes when those endpoints are rebuilt.
const LEGACY_LABELS = {
  'nomeal': 'Room only',
  'breakfast': 'Breakfast included',
  'breakfast-buffet': 'Buffet breakfast',
  'breakfast-for-1': 'Breakfast for 1',
  'half-board': 'Half board',
  'full-board': 'Full board',
  'all-inclusive': 'All inclusive',
};

// A meal the api could not recognise arrives null rather than as a guess, so
// there is nothing to say. Saying "room only" would be the same mistake in the
// other direction — a customer told there is no breakfast when nobody knows.
const label = computed(() => {
  if (!props.meal) {
    return null;
  }

  return props.labels[props.meal] ?? LEGACY_LABELS[props.meal.toLowerCase()] ?? prettifyLabel(props.meal);
});

// Anything past room-only includes at least breakfast, so it is the one case
// worth calling out with the emphasised colour. Both spellings are checked while
// the other pages still send the supplier's.
const isRoomOnly = computed(() => {
  return props.meal !== null && props.meal.toLowerCase().replace(/-/g, '') === 'nomeal';
});

const classes = computed(() => {
  return isRoomOnly.value
      ? 'bg-gray-50 text-gray-600 ring-gray-200'
      : 'bg-emerald-50 text-emerald-700 ring-emerald-200';
});
</script>

<template>
  <span v-if="label" :class="[classes, 'inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium ring-1 ring-inset']">{{ label }}</span>
</template>
