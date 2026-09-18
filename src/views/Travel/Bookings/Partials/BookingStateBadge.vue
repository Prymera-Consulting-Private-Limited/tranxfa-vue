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
  // FULFILLED only says the hotel confirmed the room. Unpaid, it is waiting on
  // the customer, and green would tell them it is done (SD-1230).
  if (props.order.isPriceLocked) {
    return 'bg-warning-50 text-warning-800 ring-warning-200';
  }

  switch (props.order.state) {
    case 'FULFILLED':
      return 'bg-success-50 text-success-700 ring-success-200';

    case 'CONFIRMED':
      return 'bg-brand-50 text-brand-800 ring-brand-200';

    case 'FAILED':
      return 'bg-danger-50 text-danger-700 ring-danger-200';

    case 'CANCELLED':
      return 'bg-gray-100 text-gray-600 ring-gray-300';

    default:
      return 'bg-gray-50 text-gray-600 ring-gray-200';
  }
});
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <span :class="[classes, 'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs/5 font-medium ring-1 ring-inset']">
      <!-- The hotel answers separately and later, so this is the ordinary state
      of a new booking rather than anything having gone wrong. The console's
      label already says so ("Awaiting Hotel Confirmation"); the dot only shows
      the page is still asking. -->
      <span v-if="order.isAwaitingHotel" class="relative flex size-1.5" aria-hidden="true">
        <span class="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-75" />
        <span class="relative inline-flex size-1.5 rounded-full bg-current" />
      </span>{{ order.stateLabel ?? order.state }}</span>
  </div>
</template>
