<script setup>
import moment from 'moment';

const props = defineProps({
  /**
   * @type {OrderPayment[]}
   */
  payments: {
    type: Array,
    default: () => [],
  },
});

/**
 * The api sends no reason a payment failed, on purpose — gateway wording is
 * written for integrators and reads as either gibberish or an accusation. Our
 * own words, keyed off the state.
 *
 * @param {OrderPayment} payment
 * @returns {string|null}
 */
function note(payment) {
  switch (payment.state) {
    case 'FAILED':
      return "This attempt didn't go through. You haven't been charged for it.";

    case 'TIMED-OUT':
      return 'This attempt timed out before it completed.';

    case 'CANCELLED':
      return 'This attempt was cancelled.';

    case 'REFUNDED':
      return 'This payment has been refunded in full.';

    case 'PART-REFUNDED':
      return 'Part of this payment has been refunded.';

    default:
      return null;
  }
}

/**
 * @param {OrderPayment} payment
 * @returns {string}
 */
function classes(payment) {
  switch (payment.state) {
    case 'CAPTURED':
    case 'AUTHORIZED':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-200';

    case 'FAILED':
    case 'TIMED-OUT':
      return 'bg-red-50 text-red-700 ring-red-200';

    case 'REFUNDED':
    case 'PART-REFUNDED':
      return 'bg-brand-50 text-brand-800 ring-brand-200';

    case 'CANCELLED':
      return 'bg-gray-100 text-gray-600 ring-gray-300';

    default:
      return 'bg-amber-50 text-amber-700 ring-amber-200';
  }
}
</script>

<template>
  <section v-if="payments.length" class="overflow-hidden rounded-2xl border border-gray-200 bg-white">
    <header class="border-b border-gray-100 px-5 py-4">
      <h2 class="text-sm font-semibold text-gray-900">Payments</h2>
      <!-- Failed attempts are listed too: somebody declined once who paid on the
      second try should see both rather than wonder if they paid twice. -->
      <p class="mt-0.5 text-xs text-gray-500">Every attempt on this booking, including any that didn't go through.</p>
    </header>
    <ul class="divide-y divide-gray-100">
      <li v-for="payment in payments" :key="payment.reference" class="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 py-4">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <span :class="[classes(payment), 'inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium ring-1 ring-inset']">{{ payment.stateLabel ?? payment.state }}</span>
            <span v-if="payment.method" class="text-sm text-gray-600">{{ payment.method }}</span>
          </div>
          <p v-if="note(payment)" class="mt-1.5 text-xs text-gray-500">{{ note(payment) }}</p>
          <p v-if="payment.attemptedAt" class="mt-1 text-xs text-gray-400">{{ moment(payment.attemptedAt).format('D MMM YYYY, HH:mm') }}</p>
        </div>
        <p class="shrink-0 text-sm font-medium text-gray-900 tabular-nums">{{ payment.amount.currencyPrefixed }}</p>
      </li>
    </ul>
  </section>
</template>
