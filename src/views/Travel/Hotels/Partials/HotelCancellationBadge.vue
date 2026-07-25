<script setup>
import {computed} from 'vue';
import moment from "moment";

const props = defineProps({
  payment: {
    type: Object,
    default: null,
  },
});

const penalties = computed(() => props.payment?.cancellationPenalties ?? null);

const policies = computed(() => penalties.value?.policies ?? []);

const freeUntil = computed(() => penalties.value?.freeCancellationBefore ?? null);

/**
 * amount_charge is a decimal string, so a zero-charge policy means at least part
 * of the stay is refundable. Without any policy data we stay silent rather than
 * promise a refund we cannot honour.
 */
const status = computed(() => {
  if (freeUntil.value) {
    return 'free';
  }

  if (policies.value.length === 0) {
    return null;
  }

  const refundable = policies.value.some(policy => Number(policy.amountCharge ?? 0) === 0);

  return refundable ? 'partial' : 'non-refundable';
});

const label = computed(() => {
  switch (status.value) {
    case 'free':
      return `Free cancellation until ${moment(freeUntil.value).format('D MMM')}`;

    case 'partial':
      return 'Partly refundable';

    case 'non-refundable':
      return 'Non-refundable';

    default:
      return null;
  }
});

const classes = computed(() => {
  switch (status.value) {
    case 'free':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-200';

    case 'partial':
      return 'bg-amber-50 text-amber-700 ring-amber-200';

    default:
      return 'bg-gray-50 text-gray-600 ring-gray-200';
  }
});
</script>

<template>
  <span v-if="label" :class="[classes, 'inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium ring-1 ring-inset']">{{ label }}</span>
</template>
