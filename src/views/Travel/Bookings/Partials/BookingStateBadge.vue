<script setup>
import {computed} from 'vue';

const props = defineProps({
  /**
   * @type {Order}
   */
  order: {
    type: Object,
    required: true,
  },
});

// The api writes the words; this only chooses the colour. A state we have not
// met still renders, in neutral, rather than disappearing.
const classes = computed(() => {
  switch (props.order.state) {
    case 'FULFILLED':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-200';

    case 'CONFIRMED':
      return 'bg-brand-50 text-brand-800 ring-brand-200';

    case 'FAILED':
      return 'bg-red-50 text-red-700 ring-red-200';

    case 'CANCELLED':
      return 'bg-gray-100 text-gray-600 ring-gray-300';

    default:
      return 'bg-gray-50 text-gray-600 ring-gray-200';
  }
});
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <span :class="[classes, 'inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium ring-1 ring-inset']">{{ order.stateLabel ?? order.state }}</span>
    <!-- The hotel answers separately and later, so this is the ordinary state of
    a new booking rather than anything having gone wrong. -->
    <span v-if="order.isAwaitingHotel" class="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200 ring-inset">
      <span class="relative flex size-1.5">
        <span class="absolute inline-flex size-full animate-ping rounded-full bg-amber-500 opacity-75" />
        <span class="relative inline-flex size-1.5 rounded-full bg-amber-500" />
      </span>
      Confirming with the hotel
    </span>
  </div>
</template>
