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
 * What governs cancelling today is the policy whose window contains now, which
 * is not the same test as "has not ended yet" — a ladder can hold a window that
 * has not started, and charging its penalty early is simply wrong. Both bounds
 * null covers the whole stay, so it is always in force; whether that means free
 * or non-refundable is decided by the amount, never by the nulls.
 *
 * @param {{startAt: string|null, endAt: string|null}} policy
 * @param {moment.Moment} now
 * @returns {boolean}
 */
function isPolicyInForce(policy, now) {
  const started = !policy.startAt || !moment(policy.startAt).isAfter(now);
  const ended = !!policy.endAt && !moment(policy.endAt).isAfter(now);

  return started && !ended;
}

const policiesInForce = computed(() => {
  const now = moment();

  return policies.value.filter(policy => isPolicyInForce(policy, now));
});

// A rate can be free to cancel across its whole window, in which case the
// supplier sends a single policy with both bounds null and nothing to charge.
// That is genuinely free rather than partly refundable, even though it carries
// no date of its own.
const isFreeNow = computed(() => {
  return policiesInForce.value.length > 0
      && policiesInForce.value.every(policy => Number(policy.amountCharge ?? 0) === 0);
});

/**
 * amount_charge is a decimal string, so a zero-charge policy means at least part
 * of the stay is refundable. Without any policy data we stay silent rather than
 * promise a refund we cannot honour, and once every policy has expired we say
 * non-refundable rather than infer a refund from a window that has closed.
 */
const status = computed(() => {
  if (isFreeWindowOpen.value || isFreeNow.value) {
    return 'free';
  }

  if (policies.value.length === 0) {
    return null;
  }

  if (policiesInForce.value.length === 0) {
    return 'non-refundable';
  }

  const refundable = policiesInForce.value.some(policy => Number(policy.amountCharge ?? 0) === 0);

  return refundable ? 'partial' : 'non-refundable';
});

const label = computed(() => {
  switch (status.value) {
    // The supplier's own date is preferred whenever it is still ahead, since a
    // whole-window free policy has no date to name.
    case 'free':
      return isFreeWindowOpen.value
          ? `Free cancellation until ${moment(freeUntil.value).format('D MMM')}`
          : 'Free cancellation';

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
