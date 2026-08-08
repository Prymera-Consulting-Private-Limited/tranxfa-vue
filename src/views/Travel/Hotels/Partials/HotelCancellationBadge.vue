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

// The supplier leaves free_cancellation_before in place once it passes, so a
// date being present says nothing about whether the window is still open. It
// has to be checked against now, or a card promises free cancellation until a
// date that has already gone while the hotel page calls the same rate
// non-refundable.
const isFreeWindowOpen = computed(() => {
  return freeUntil.value !== null && moment(freeUntil.value).isAfter(moment());
});

/**
 * A policy whose window has already closed says nothing about cancelling now.
 * Both bounds null covers the whole stay, so it always applies — whether that
 * means free or non-refundable is decided by the amount, never by the nulls.
 *
 * @param {{endAt: string|null}} policy
 * @returns {boolean}
 */
function isPolicyCurrent(policy) {
  return !policy.endAt || moment(policy.endAt).isAfter(moment());
}

const currentPolicies = computed(() => policies.value.filter(isPolicyCurrent));

/**
 * amount_charge is a decimal string, so a zero-charge policy means at least part
 * of the stay is refundable. Without any policy data we stay silent rather than
 * promise a refund we cannot honour, and once every policy has expired we say
 * non-refundable rather than infer a refund from a window that has closed.
 */
const status = computed(() => {
  if (isFreeWindowOpen.value) {
    return 'free';
  }

  if (policies.value.length === 0) {
    return null;
  }

  const refundable = currentPolicies.value.some(policy => Number(policy.amountCharge ?? 0) === 0);

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
