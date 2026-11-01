<script setup>
import {useI18n} from "vue-i18n";

const {t} = useI18n();

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
  'nomeal': t('travel.roomOnly'),
  'breakfast': t('travel.breakfastIncluded'),
  'breakfast-buffet': t('travel.buffetBreakfast'),
  'breakfast-for-1': t('travel.breakfastFor'),
  'half-board': t('travel.halfBoard'),
  'full-board': t('travel.fullBoard'),
  'all-inclusive': t('travel.allInclusive'),
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
      : 'bg-success-50 text-success-700 ring-success-200';
});
</script>

<template>
  <span v-if="label" :class="[classes, 'inline-flex items-center rounded-lg px-2.5 py-1 text-xs/5 font-medium ring-1 ring-inset']">{{ label }}</span>
</template>
