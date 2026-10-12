<script setup>
import {ref} from 'vue';
import {useI18n} from 'vue-i18n';
import Spinner from '@/components/Spinner.vue';
import OrderPayment from '@/models/travel/orders/order_payment.js';
import OrderPaymentRefusalType from '@/enums/order_payment_refusal_type.js';
import {getCustomerMessage, reportUnexpectedError} from '@/composables/api_utils.js';
import {useOrderUtils} from '@/composables/travel/order_utils.js';
import {ExclamationTriangleIcon} from '@heroicons/vue/24/outline';

const {t} = useI18n();

/**
 * Lets the customer let go of a payment they have not made (SD-1261). A PayID
 * or bank transfer payment holds their deposit account until it is paid or
 * cancelled, so without this one abandoned payment blocks every other.
 *
 * It renders nothing for a payment that is not open, which is also the only
 * time the api would accept the cancel. It renders nothing without the
 * payment's id either: the endpoint takes the id and not the reference, and an
 * offer that can only answer 404 is worse than none.
 */
const props = defineProps({
  orderId: {
    type: String,
    required: true,
  },

  payment: {
    type: OrderPayment,
    required: true,
  },
});

/**
 * cancelled: the payment as the api answered it, CANCELLED. The account is free.
 * refused: it was too late. Carries the api's message, because whoever owns the
 * order re-reads it and this partial is gone by the time that lands.
 */
const emit = defineEmits(['cancelled', 'refused']);

const {cancelPayment} = useOrderUtils();

// Money already sent for a cancelled payment is no longer matched to the order,
// and support has to place it by hand. So this is confirmed in place, with that
// said, rather than fired off the first click.
const isConfirming = ref(false);
const isCancelling = ref(false);
const failureMessage = ref(null);

async function cancel() {
  isCancelling.value = true;
  failureMessage.value = null;

  await cancelPayment(props.orderId, props.payment.id).then((response) => {
    isConfirming.value = false;
    emit('cancelled', OrderPayment.getInstance(response.data));
  }).catch((error) => {
    if (error.response?.status === 409 && error.response.data?.type === OrderPaymentRefusalType.PAYMENT_NOT_OPEN) {
      isConfirming.value = false;
      emit('refused', error.response.data.message ?? t('travel.thisPaymentCanNoLonger'));

      return;
    }

    // Anything else leaves the payment as it was, and they can try again. A 404
    // answers "Not Found", which tells a customer nothing, so it gets our words.
    reportUnexpectedError(error, t('travel.cancelThisPayment'));
    failureMessage.value = (error.response?.status === 404 ? null : getCustomerMessage(error))
        ?? t('travel.weCouldNotCancelThatPayment');
  }).finally(() => {
    isCancelling.value = false;
  });
}
</script>

<template>
  <div v-if="payment.isOpen && payment.id">
    <div v-if="failureMessage" class="mb-3 flex items-start gap-2 rounded-xl border border-danger-200 bg-danger-50 p-3 text-sm/6 text-danger-700">
      <ExclamationTriangleIcon class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{{ failureMessage }}</span>
    </div>
    <div v-if="isConfirming" class="rounded-xl border border-gray-200 bg-gray-50 p-4 text-left">
      <p class="text-sm/6 font-medium text-gray-900">{{ $t('travel.cancelThisPaymentQuestion') }}</p>
      <p class="mt-1 text-sm/6 text-gray-600">{{ $t('travel.onlyIfYouHaventSentTheMoney') }}</p>
      <div class="mt-3 flex flex-col gap-2 sm:flex-row-reverse">
        <button
            type="button"
            :disabled="isCancelling"
            @click="cancel"
            class="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-danger-600 px-4 py-2.5 text-sm/6 font-semibold text-white transition hover:bg-danger-700 focus-visible:outline-0 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
        >
          <Spinner v-if="isCancelling" class="size-4" />
          {{ isCancelling ? $t('travel.cancellingThisPayment') : $t('travel.yesCancelThisPayment') }}
        </button>
        <button
            type="button"
            :disabled="isCancelling"
            @click="isConfirming = false"
            class="cursor-pointer rounded-xl px-4 py-2.5 text-sm/6 font-medium text-gray-600 transition hover:text-gray-900 focus-visible:outline-0"
        >{{ $t('travel.keepThisPayment') }}</button>
      </div>
    </div>
    <button
        v-else
        type="button"
        @click="isConfirming = true"
        class="cursor-pointer text-sm/6 font-medium text-gray-500 underline-offset-4 transition hover:text-danger-600 hover:underline focus-visible:outline-0"
    >{{ $t('travel.cancelThisPayment') }}</button>
  </div>
</template>
