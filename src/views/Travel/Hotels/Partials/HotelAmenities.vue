<script setup>
import {computed} from 'vue';
import {prettifyLabel} from "@/composables/travel/hotels/hotel_utils.js";

const props = defineProps({
  amenities: {
    type: Array,
    default: () => [],
  },

  /**
   * The response's code-to-display-text dictionary.
   */
  labels: {
    type: Object,
    default: () => ({}),
  },

  limit: {
    type: Number,
    default: 5,
  },
});

// The dictionary is meant to carry every code present, so prettifying is only a
// guard against a code that slipped through it.
const visible = computed(() => {
  return props.amenities.slice(0, props.limit).map(code => props.labels[code] ?? prettifyLabel(code));
});

const remaining = computed(() => Math.max(0, props.amenities.length - props.limit));
</script>

<template>
  <div v-if="amenities.length" class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
    <template v-for="(amenity, index) in visible" :key="amenity">
      <span v-if="index" class="text-gray-300" aria-hidden="true">&middot;</span>
      <span>{{ amenity }}</span>
    </template>
    <span v-if="remaining" class="font-medium text-brand-700">+{{ remaining }} more</span>
  </div>
</template>
