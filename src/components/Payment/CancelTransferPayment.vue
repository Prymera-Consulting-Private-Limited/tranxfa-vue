<script setup>
import {ref} from 'vue';
import {useI18n} from 'vue-i18n';
import Spinner from '@/components/Spinner.vue';
import Transaction from '@/models/transaction.js';
import PaymentTransaction from '@/models/payment_transaction.js';
import PaymentCancelRefusalType from '@/enums/payment_cancel_refusal_type.js';
import {getCustomerMessage, reportUnexpectedError} from '@/composables/api_utils.js';
import {useTransactionUtils} from '@/composables/transaction_utils.js';
import {ExclamationTriangleIcon} from '@heroicons/vue/24/outline';

const {t} = useI18n();

/**
 * Lets the customer let go of a transfer payment they no longer mean to make
 * (SD-1418). A bank transfer or PayID payment holds their deposit account until
 * it is paid or cancelled, so one abandoned transfer blocks every other payment.
 * The transfer stays open and can be paid again.
 *
 * It renders nothing unless the transfer offers the cancel: see
 * Transaction.canCancelPayment for why that is never after "I've paid".
 */
const props = defineProps({
  transaction: {
    type: Transaction,
    required: true,
  },
});

/**
 * cancelled: the payment as the api answered it, CANCELLED. The account is free.
 * refused: it was too late, or the gateway cannot withdraw it. Carries the api's
 * message, because whoever owns the transfer re-reads it and this component is
 * gone by the time that lands.
 */
const emit = defineEmits(['cancelled', 'refused']);

const {cancelPayment} = useTransactionUtils();

// Money already sent for a cancelled payment is not matched to the transfer and
// support has to place it by hand, so this is confirmed in place, with that said.
const isConfirming = ref(false);
const isCancelling = ref(false);
const failureMessage = ref(null);

const REFUSALS = Object.values(PaymentCancelRefusalType);

async function cancel() {
  isCancelling.value = true;
  failureMessage.value = null;

  await cancelPayment(props.transaction.id).then((response) => {
    isConfirming.value = false;
    emit('cancelled', PaymentTransaction.getInstance(response.data));
  }).catch((error) => {
    if (error.response?.status === 409 && REFUSALS.includes(error.response.data?.type)) {
      isConfirming.value = false;
      emit('refused', error.response.data.message ?? t('transfer.payment.thisPaymentCanNoLongerBeCancelled'));

      return;
    }

    // Anything else leaves the payment as it was, and they can try again. A 404
    // answers "Not Found", which tells a customer nothing, so it gets our words.
    reportUnexpectedError(error, 'cancel-transfer-payment');
    failureMessage.value = (error.response?.status === 404 ? null : getCustomerMessage(error))
        ?? t('transfer.payment.weCouldNotCancelThePayment');
  }).finally(() => {
    isCancelling.value = false;
  });
}
</script>

<template>
  <div v-if="transaction.canCancelPayment">
    <div v-if="failureMessage" role="alert" class="mb-3 flex items-start gap-2 rounded-xl border border-danger-200 bg-danger-50 p-3 text-left text-sm/6 text-danger-700">
      <ExclamationTriangleIcon class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{{ failureMessage }}</span>
    </div>
    <div v-if="isConfirming" class="rounded-xl border border-gray-200 bg-gray-50 p-4 text-left">
      <p class="text-sm/6 font-medium text-gray-900">{{ $t('transfer.payment.cancelThisPaymentQuestion') }}</p>
      <p class="mt-1 text-sm/6 text-gray-600">{{ $t('transfer.payment.yourTransferStaysSaved') }}</p>
      <div class="mt-3 flex flex-col gap-2 sm:flex-row-reverse">
        <button
            type="button"
            :disabled="isCancelling"
            @click="cancel"
            class="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-danger-600 px-4 py-2.5 text-sm/6 font-semibold text-white transition hover:bg-danger-700 focus-visible:outline-0 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
        >
          <Spinner v-if="isCancelling" class="size-4" />
          {{ isCancelling ? $t('transfer.payment.cancelling') : $t('transfer.payment.yesCancelPayment') }}
        </button>
        <button
            type="button"
            :disabled="isCancelling"
            @click="isConfirming = false"
            class="cursor-pointer rounded-xl px-4 py-2.5 text-sm/6 font-medium text-gray-600 transition hover:text-gray-900 focus-visible:outline-0"
        >{{ $t('transfer.payment.keepThisPayment') }}</button>
      </div>
    </div>
    <button
        v-else
        type="button"
        @click="isConfirming = true"
        class="min-h-11 cursor-pointer text-sm/6 font-medium text-gray-500 underline-offset-4 transition hover:text-danger-600 hover:underline focus-visible:outline-0"
    >{{ $t('transfer.payment.cancelPayment') }}</button>
  </div>
</template>
