<script setup>
import moment from 'moment';
import {computed} from 'vue';
import ClientPaymentAccount from '@/components/ClientPaymentAccount.vue';
import OrderPayment from '@/models/travel/orders/order_payment.js';
import {ExclamationTriangleIcon} from '@heroicons/vue/24/outline';

/**
 * Where to send the money on a PayID or bank transfer rail. The account is the
 * customer's own, and what it holds differs by rail — a PayID has a name and an
 * address, a bank transfer a name, BSB and account number — so the attributes
 * are rendered in the order the api gives them and no shape is assumed.
 */
const props = defineProps({
  payment: {
    type: OrderPayment,
    required: true,
  },
});

// The customer says they have sent the money. Wherever this is shown, the
// screen that waits for it takes over.
defineEmits(['paid']);

const account = computed(() => props.payment.clientPaymentAccount);

// The real deadline the platform enforces, not the price hold. Null means the
// payment never expires and the line is left out rather than guessed.
const deadline = computed(() => (props.payment.expiresAt ? moment(props.payment.expiresAt).format('lll') : null));
</script>

<template>
  <section class="overflow-hidden rounded-3xl bg-white ring-1 ring-gray-200">
    <header class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-gray-100 px-5 py-4">
      <h2 class="text-sm/6 font-semibold text-gray-900">{{ $t('payment.card.completeYourPayment') }}</h2>
      <p class="text-base font-semibold text-gray-900 tabular-nums">{{ payment.amount.currencyPrefixed }}</p>
    </header>
    <div class="px-5 py-4">
      <p v-if="account.instruction" class="text-sm/6 text-gray-600">{{ account.instruction }}</p>
      <ClientPaymentAccount v-bind:account="account" />
      <div class="mt-4 flex items-start gap-3 rounded-xl border border-warning-200 bg-warning-50 p-3">
        <ExclamationTriangleIcon class="mt-0.5 size-5 shrink-0 text-warning-600" aria-hidden="true" />
        <div class="space-y-2 text-sm/6 text-warning-800">
          <p v-if="account.paymentReference"><i18n-t keypath="travel.putTheReferenceAtYourBank" scope="global"><template #value><strong>{{ $t('account.paymentReference') }}</strong></template></i18n-t></p>
          <p><i18n-t keypath="travel.sendExactlyAmount" scope="global"><template #value><strong>{{ payment.amount.currencyPrefixed }}</strong></template></i18n-t></p>
          <p v-if="deadline"><i18n-t keypath="travel.payByDeadline" scope="global"><template #value><strong>{{ deadline }}</strong></template></i18n-t></p>
        </div>
      </div>
      <button
          type="button"
          @click="$emit('paid')"
          class="mt-5 flex w-full cursor-pointer items-center justify-center rounded-xl bg-brand-700 px-5 py-3.5 text-sm/6 font-semibold text-white shadow-xs transition hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
      >{{ $t('payment.provider.iveMadePayment') }}</button>
    </div>
  </section>
</template>
