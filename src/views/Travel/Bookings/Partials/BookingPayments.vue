<script setup>
import {computed} from 'vue';
import moment from 'moment';
import {useI18n} from "vue-i18n";
import CancelPaymentAction from '@/views/Travel/Bookings/Partials/CancelPaymentAction.vue';

const {t} = useI18n();

const props = defineProps({
  orderId: {
    type: String,
    required: true,
  },

  /**
   * @type {OrderPayment[]}
   */
  payments: {
    type: Array,
    default: () => [],
  },
});

// Passed straight up: the booking page owns the order, and re-reads it.
defineEmits(['paymentCancelled', 'cancelRefused']);

// One payment is enough to say where the money stands: the one that paid for
// the booking, or failing that the latest attempt. Every attempt used to be
// listed, and a booking that took three tries read as a pile of failures above
// the one line the customer came for. The api sends them oldest first.
const shown = computed(() => {
  const paid = props.payments.filter(payment => payment.isSuccessful);

  return paid.length ? paid[paid.length - 1] : (props.payments[props.payments.length - 1] ?? null);
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
      return t('travel.paymentAttemptFailed');

    case 'TIMED-OUT':
      return t('travel.paymentAttemptTimedOut');

    case 'CANCELLED':
      return t('travel.paymentAttemptCancelled');

    case 'REFUNDED':
      return t('travel.paymentRefundedInFull');

    case 'PART-REFUNDED':
      return t('travel.paymentPartlyRefunded');

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
      return 'bg-success-50 text-success-700 ring-success-200';

    case 'FAILED':
    case 'TIMED-OUT':
      return 'bg-danger-50 text-danger-700 ring-danger-200';

    case 'REFUNDED':
    case 'PART-REFUNDED':
      return 'bg-brand-50 text-brand-800 ring-brand-200';

    case 'CANCELLED':
      return 'bg-gray-100 text-gray-600 ring-gray-300';

    default:
      return 'bg-warning-50 text-warning-700 ring-warning-200';
  }
}
</script>

<template>
  <section v-if="shown" class="overflow-hidden rounded-2xl border border-gray-200 bg-white">
    <header class="border-b border-gray-100 px-5 py-4">
      <h2 class="text-sm/6 font-semibold text-gray-900">{{ $t('travel.payment') }}</h2>
    </header>
    <ul class="divide-y divide-gray-100">
      <li v-for="payment in [shown]" :key="payment.reference" class="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 py-4">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <span :class="[classes(payment), 'inline-flex items-center rounded-lg px-2.5 py-1 text-xs/5 font-medium ring-1 ring-inset']">{{ payment.stateLabel ?? payment.state }}</span>
            <span v-if="payment.method" class="text-sm/6 text-gray-600">{{ payment.method }}</span>
          </div>
          <p v-if="note(payment)" class="mt-1.5 text-xs/5 text-gray-500">{{ note(payment) }}</p>
          <p v-if="payment.attemptedAt" class="mt-1 text-xs/5 text-gray-500">{{ moment(payment.attemptedAt).format('lll') }}</p>
        </div>
        <p class="shrink-0 text-sm/6 font-medium text-gray-900 tabular-nums">{{ payment.amount.currencyPrefixed }}</p>
        <!-- A waiting payment holds the customer's deposit account, so it can
        be let go from here. It renders nothing for a payment that is not open. -->
        <CancelPaymentAction
            :order-id="orderId"
            :payment="payment"
            class="w-full"
            @cancelled="$emit('paymentCancelled', $event)"
            @refused="$emit('cancelRefused', $event)"
        />
      </li>
    </ul>
  </section>
</template>
