<script setup>
import {computed, ref} from 'vue';
import {useI18n} from 'vue-i18n';
import Spinner from '@/components/Spinner.vue';
import DepositHolder from '@/models/deposit_holder.js';
import {getCustomerMessage, reportUnexpectedError} from '@/composables/api_utils.js';
import {useHeldPaymentUtils} from '@/composables/held_payment_utils.js';

const {t} = useI18n();

/**
 * Cancels the payment holding the customer's deposit account, so the one they
 * are making can go ahead (SD-1423). HeldByAction takes them to that payment;
 * this does the cancel from where they are, and the owner then tries again.
 * The account is free the moment the cancel answers.
 *
 * It renders nothing for a holder it cannot cancel: an unknown kind, or an order
 * without the payment's id, which the cancel needs.
 */
const props = defineProps({
  holder: {
    type: DepositHolder,
    default: null,
  },
});

/**
 * released: the other payment is cancelled; try again.
 */
const emit = defineEmits(['released']);

const {canCancel, cancelHeldPayment} = useHeldPaymentUtils();

const isOffered = computed(() => canCancel(props.holder));

// The other payment may be one they have already paid by bank, and money sent
// for a cancelled payment has to be placed by hand, so this is confirmed first.
const isConfirming = ref(false);
const isCancelling = ref(false);
const failureMessage = ref(null);

async function release() {
  isCancelling.value = true;
  failureMessage.value = null;

  try {
    await cancelHeldPayment(props.holder);
    isConfirming.value = false;
    emit('released');
  } catch (error) {
    // A refusal (409: paid, failed, already cancelled, or not cancellable) comes
    // with a message for the customer. The link to the payment stays beside
    // this, so they can go and look.
    reportUnexpectedError(error, 'release-held-payment');
    failureMessage.value = (error.response?.status === 404 ? null : getCustomerMessage(error))
        ?? t('payment.heldBy.weCouldNotCancelIt');
    isConfirming.value = false;
  } finally {
    isCancelling.value = false;
  }
}
</script>

<template>
  <div v-if="isOffered">
    <p v-if="failureMessage" role="alert" class="mb-2 text-sm/6 text-danger-700">{{ failureMessage }}</p>
    <div v-if="isConfirming" class="rounded-xl border border-gray-200 bg-white p-4 text-left">
      <p class="text-sm/6 font-medium text-gray-900">{{ holder.reference ? $t('payment.heldBy.yourPaymentForIsStillOpen', {reference: holder.reference}) : $t('payment.heldBy.yourOtherPaymentIsStillOpen') }}</p>
      <p class="mt-1 text-sm/6 text-gray-600">{{ $t('payment.heldBy.dontCancelIfYouveSentTheMoney') }}</p>
      <div class="mt-3 flex flex-col gap-2 sm:flex-row-reverse sm:justify-end">
        <button
            type="button"
            :disabled="isCancelling"
            @click="release"
            class="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 text-sm/6 font-semibold text-white transition hover:bg-brand-800 focus-visible:outline-0 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
        >
          <Spinner v-if="isCancelling" class="size-4" />
          {{ isCancelling ? $t('payment.heldBy.cancelling') : $t('payment.heldBy.yesCancelItAndContinue') }}
        </button>
        <button
            type="button"
            :disabled="isCancelling"
            @click="isConfirming = false"
            class="min-h-11 cursor-pointer rounded-xl px-4 text-sm/6 font-medium text-gray-600 transition hover:text-gray-900 focus-visible:outline-0"
        >{{ $t('payment.heldBy.keepIt') }}</button>
      </div>
    </div>
    <button
        v-else
        type="button"
        @click="isConfirming = true"
        class="inline-flex min-h-11 cursor-pointer items-center rounded-xl bg-brand-700 px-4 text-sm/6 font-semibold text-white transition hover:bg-brand-800 focus-visible:outline-0"
    >{{ $t('payment.heldBy.cancelItAndContinue') }}</button>
  </div>
</template>
