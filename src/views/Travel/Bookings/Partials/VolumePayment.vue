<script setup>
import {onMounted, ref} from 'vue';
import OrderPayment from '@/models/travel/orders/order_payment.js';
import Spinner from '@/components/Spinner.vue';

const props = defineProps({
  payment: {
    type: OrderPayment,
    required: true,
  },
});

const emit = defineEmits(['initiated', 'failed']);

const isOpening = ref(true);

/**
 * Which Volume to talk to. The transfer flow hardcodes SANDBOX, which is fine
 * until the day it is not — so this reads config and only falls back to sandbox,
 * because a payment that quietly goes nowhere is better than one that quietly
 * takes real money in a test.
 */
const ENVIRONMENT = import.meta.env.VITE_VOLUME_PAYMENT_ENVIRONMENT || 'SANDBOX';

/**
 * The container the sdk injects itself into. Named for travel so it cannot
 * collide with the transfer modal's own container if both ever mount.
 */
const CONTAINER_ID = 'travel-volume-element-container';

/**
 * Volume takes the customer to their bank from inside this page rather than
 * redirecting, so there is no url to follow and nothing to come back from. The
 * script is loaded globally in index.html.
 *
 * Three values, and none of them is guessed: the amount as money rather than
 * minor units, our own id for the payment, and the reference that reconciles it
 * with the provider afterwards.
 */
onMounted(() => {
  const amount = props.payment.majorAmount;

  // Every one of these is the api not sending something rather than the customer
  // doing anything wrong, so they are logged as ours and reported as a failure to
  // start rather than a failure to pay.
  if (typeof window.Volume !== 'function') {
    console.error('[travel payment: volume] the sdk did not load, so the payment cannot be opened');
    emit('failed');

    return;
  }

  if (amount === null || !props.payment.id || !props.payment.sharedReference) {
    console.error('[travel payment: volume] the payment is missing what the sdk needs', {
      hasAmount: amount !== null,
      hasId: Boolean(props.payment.id),
      hasSharedReference: Boolean(props.payment.sharedReference),
    });
    emit('failed');

    return;
  }

  const volume = new window.Volume({
    environment: ENVIRONMENT,
    applicationId: import.meta.env.VITE_VOLUME_PAYMENT_MERCHANT_ID,
    eventConsumer: (event) => {
      // Their handover has happened; the payment settles from their webhook
      // whether or not this tab is still open.
      if (event === 'payment_initiated') {
        emit('initiated');
      }
    },
    errorConsumer: (error) => {
      console.error('[travel payment: volume] the sdk reported an error', error);
      emit('failed');
    },
  });

  volume.createPayment({
    amount,
    merchantPaymentId: props.payment.id,
    paymentReference: props.payment.sharedReference,
  });

  volume.injectComponent(CONTAINER_ID);
  volume.openInstitutionSelection();

  isOpening.value = false;
});
</script>

<template>
  <section class="overflow-hidden rounded-3xl bg-white ring-1 ring-gray-200">
    <header class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-gray-100 px-5 py-4">
      <h1 class="text-sm font-semibold text-gray-900">Choose your bank</h1>
      <p class="text-base font-semibold text-gray-900 tabular-nums">{{ payment.amount.currencyPrefixed }}</p>
    </header>
    <div class="px-5 py-5">
      <div v-if="isOpening" class="flex items-center justify-center gap-2 py-8 text-sm text-gray-500">
        <Spinner class="size-4" />
        Opening your bank list…
      </div>
      <!-- The sdk builds its own ui in here -->
      <div :id="CONTAINER_ID"></div>
      <p class="mt-4 text-center text-xs text-gray-400">You'll approve this in your own banking app. We never see your bank details.</p>
    </div>
  </section>
</template>
