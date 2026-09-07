<script setup>
import {computed} from 'vue';
import moment from "moment";

const props = defineProps({
  /**
   * @type {{freeCancellation: boolean, freeCancellationBefore: string|null}|null}
   */
  cancellation: {
    type: Object,
    default: null,
  },
});

// Unlike the raw supplier rate, this endpoint states cancellation as a plain
// free/not-free flag rather than a breakdown of charge policies, so there is
// no partial-refund state to show here.
const label = computed(() => {
  if (!props.cancellation?.freeCancellation) {
    return 'Non-refundable';
  }

  return props.cancellation.freeCancellationBefore
      ? `Free cancellation until ${moment(props.cancellation.freeCancellationBefore).format('D MMM')}`
      : 'Free cancellation';
});

const classes = computed(() => {
  return props.cancellation?.freeCancellation
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
      : 'bg-gray-50 text-gray-600 ring-gray-200';
});
</script>

<template>
  <span :class="[classes, 'inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium ring-1 ring-inset']">{{ label }}</span>
</template>
