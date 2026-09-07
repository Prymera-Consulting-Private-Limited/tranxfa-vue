<script setup>
import {computed} from 'vue';
import moment from "moment";
import {CANCELLATION_STATUS} from "@/composables/travel/hotels/hotel_utils.js";

const props = defineProps({
  /**
   * @type {RateCancellation|null}
   */
  cancellation: {
    type: Object,
    default: null,
  },
});

const status = computed(() => props.cancellation?.status ?? null);

// The backend resolves the supplier's ladder against the clock before sending
// it, so the window is never evaluated here. The one thing still worth checking
// is the date itself: a free_until that has already passed would print a promise
// with an expired date on it, which is the defect we spent two commits removing.
// Dropping the date leaves the status it came with intact.
const freeUntil = computed(() => {
  const value = props.cancellation?.freeUntil ?? null;

  return value && moment(value).isAfter(moment()) ? value : null;
});

const label = computed(() => {
  switch (status.value) {
    case CANCELLATION_STATUS.free:
      return freeUntil.value
          ? `Free cancellation until ${moment(freeUntil.value).format('D MMM')}`
          : 'Free cancellation';

    case CANCELLATION_STATUS.partial:
      return 'Partly refundable';

    case CANCELLATION_STATUS.nonRefundable:
      return 'Non-refundable';

    // Some supplier rates state no terms at all. Saying where they will be
    // answered is the only honest thing to put here — hiding the rate loses a
    // real result, and guessing either way is a promise we cannot keep.
    case CANCELLATION_STATUS.unknown:
      return 'Cancellation terms at the next step';

    default:
      return null;
  }
});

const classes = computed(() => {
  switch (status.value) {
    case CANCELLATION_STATUS.free:
      return 'bg-emerald-50 text-emerald-700 ring-emerald-200';

    case CANCELLATION_STATUS.partial:
      return 'bg-amber-50 text-amber-700 ring-amber-200';

    default:
      return 'bg-gray-50 text-gray-600 ring-gray-200';
  }
});
</script>

<template>
  <span v-if="label" :class="[classes, 'inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium ring-1 ring-inset']">{{ label }}</span>
</template>
