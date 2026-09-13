<script setup>
import {useI18n} from "vue-i18n";

const {t} = useI18n();

import InlineFailure from "@/components/InlineFailure.vue";
import Transaction from "@/models/transaction.js";
import {computed, onMounted, onUnmounted, reactive, ref} from "vue";
import PaymentState from "@/enums/payment_state.js";
import PaymentCompleted from "@/components/Payment/State/PaymentCompleted.vue";
import Processing from "@/components/Payment/State/Processing.vue";
import AwaitingPending from "@/components/Payment/State/AwaitingPending.vue";
import Failed from "@/components/Payment/State/Failed.vue";
import {usePaymentWatch} from "@/composables/payment_watch.js";
import router from "@/router/index.js";
import {useTransactionUtils} from "@/composables/transaction_utils.js";
import {failureMessage, reportUnexpectedError} from "@/composables/api_utils.js";

const FINAL_STATES = [
  PaymentState.AUTHORIZED, PaymentState.CAPTURED, PaymentState.FAILED,
  PaymentState.TIMED_OUT, PaymentState.CANCELLED, PaymentState.REFUNDED, PaymentState.PART_REFUNDED,
];

const props = defineProps({
  transaction: {
    type: Object(Transaction),
    required: true
  },
  showViewTransfer: {
    type: Boolean,
    required: false,
    default: true,
  },
  retryFormErrors: {
    type: Object,
    required: false,
    default: null,
  }
})

const transactionUtils = useTransactionUtils();

// Cleared on unmount: a customer who closed the modal was pulled to the
// transaction page seconds later.
let onStateRedirectId = null;

const {stopPolling, isSlow} = usePaymentWatch(props.transaction, {
  isReady: () => isReadyToPay(),
  isFinal: () => FINAL_STATES.includes(props.transaction.payment.state.code),
  onState: (code) => {
    if (code === PaymentState.AUTHORIZED || code === PaymentState.CAPTURED) {
      stopPolling();
      onStateRedirectId = setTimeout(() => {
        router.push({name: 'viewTransaction', params: {transactionId: props.transaction.id}});
      }, 1500);
    }
  },
});





// PENDING alone is not payable - the hosted payment URL can arrive later than
// the state, so the payment is only ready when both are here.
const isReadyToPay = () => {
  return props.transaction.payment.state.code === PaymentState.PENDING && !! props.transaction.payment.paymentUrl;
}

const status = computed(() => {
  if (
      (
        props.transaction.payment.state.code === PaymentState.PENDING ||
        props.transaction.payment.state.code === PaymentState.INITIALIZED ||
        props.transaction.payment.state.code === PaymentState.CREATED
      )
  ) {
    return 'pending';
  } else if (props.transaction.payment.state.code === PaymentState.REDIRECTED) {
    return 'processing';
  } else if (props.transaction.payment.state.code === PaymentState.AUTHORIZED || props.transaction.payment.state.code === PaymentState.CAPTURED) {
    return 'completed';
  } else if (props.transaction.payment.state.code === PaymentState.FAILED) {
    return 'failed';
  }
})

const emits = defineEmits(['retryPayment']);

const retryPayment = async () => {
  let paymentDataAttributes = {};
  if (paymentData.data) {
    for (const paymentDataAttribute of Object.entries(paymentData.data)) {
      paymentDataAttributes[paymentDataAttribute[0]] = paymentDataAttribute[1].value;
    }
  }
  emits('retryPayment', paymentDataAttributes);
}

function redirectToPaymentUrl() {
  props.transaction.payment.state.code = PaymentState.REDIRECTED;
}

const isConfirmingPayment = ref(false);
const confirmFailure = ref(null);

// Tell the server the customer has paid before hiding the button, so a failed
// request leaves them a way to try again.
const iHaveMadePayment = async () => {
  if (isConfirmingPayment.value) return;
  isConfirmingPayment.value = true;
  confirmFailure.value = null;
  try {
    await transactionUtils.iHaveMadePayment(props.transaction.payment.id);
    props.transaction.payment.customerConfirmedPayment = true;
    router.push({name: 'viewTransaction', params: {transactionId: props.transaction.id}});
  } catch (e) {
    reportUnexpectedError(e, 'payment-sent');
    confirmFailure.value = failureMessage(e, t('payment.provider.weCouldntRecordThat'));
  } finally {
    isConfirmingPayment.value = false;
  }
}

const paymentData = reactive({
  data: {},
});

if (props.transaction?.payment.paymentProvider?.paymentDataAttributes?.length > 0) {
  props.transaction.payment.paymentProvider.paymentDataAttributes.forEach(function (attribute) {
    paymentData.data[attribute.attribute] = attribute;
  });
}
onUnmounted(() => clearTimeout(onStateRedirectId));
</script>

<template>
  <template v-if="transaction.payment.state.code === PaymentState.PENDING">
    <div>
      <h2 class="text-lg font-semibold text-gray-900 mb-5 pr-10 text-left">{{ $t('payment.provider.completeYourInteracPayment') }}</h2>
      <p class="text-sm/6 text-gray-600 mb-6 text-left">{{ $t('payment.provider.yourTransferIsAwaitingPayment') }}</p>
      <a :href="transaction.payment.paymentUrl" @click="redirectToPaymentUrl" target="_blank" class="block w-full px-4 md:px-6 lg:px-8 bg-success-700 text-white text-center py-3 rounded-md font-medium hover:bg-success-800 transition cursor-pointer text-sm/6 outline-none ring-0 tracking-wider focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700">Pay {{ transaction.payment.totalPaymentAmountCurrencyPrefixed }}</a>
      <p class="text-sm/6 text-gray-600 mt-4 text-left">{{ $t('payment.provider.youWillBeRedirectedTo') }}</p>
    </div>
  </template>

  <template v-else-if="status === 'pending'">
    <AwaitingPending class="-mt-10" />
    <h2 class="text-xl font-semibold text-gray-900 mb-5 -mt-10">{{ $t('transfer.payment.pleaseWait') }}</h2>
    <p class="text-base text-gray-600 mb-6">{{ $t('payment.card.pleaseWaitWhileWeAre') }}</p>
    <p v-if="isSlow" role="status" class="mt-2 rounded-lg border border-warning-200 bg-warning-50 px-4 py-3 text-left text-sm/6 text-warning-800"><i18n-t keypath="payment.provider.thisIsTakingLongerThan" scope="global"><template #value><router-link :to="{name: 'viewTransaction', params: {transactionId: transaction.id}}" class="font-semibold underline underline-offset-2">{{ $t('payment.card.goToYourTransfer') }}</router-link></template></i18n-t></p>
  </template>

  <template v-else-if="status === 'processing'">
    <Processing class="-mt-10" />
    <h2 class="text-xl font-semibold text-gray-900 mb-5 -mt-10">{{ $t('transfer.payment.wereWatchingForYourPayment') }}</h2>
    <p class="text-base/6 text-gray-600 mb-6"><i18n-t keypath="payment.provider.onceYouveSentTheInterac2" scope="global"><template #value><strong>{{ $t('payment.provider.upToMinutes') }}</strong></template></i18n-t></p>
    <div v-if="!transaction.payment.customerConfirmedPayment" class="my-6">
      <button @click="iHaveMadePayment" :disabled="isConfirmingPayment" type="button" class="rounded-xl w-full bg-brand-700 px-6 py-2.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 cursor-pointer">{{ $t('payment.provider.iveMadePayment') }}</button>
          <InlineFailure :message="confirmFailure" />
    </div>
  </template>

  <template v-else-if="status === 'completed'">
    <PaymentCompleted class="-mt-10" />
    <h2 class="text-xl font-semibold text-success-700 mb-5 -mt-10">{{ $t('transfer.payment.paymentReceived') }}</h2>
    <p class="text-lg text-gray-600 mb-6">{{ $t('transfer.payment.yourPaymentHasBeenSuccessfully') }}</p>
  </template>

  <template v-else-if="status === 'failed'">
    <Failed class="-mt-20" />
    <h2 class="text-2xl font-semibold text-danger-600 mb-3 -mt-15">{{ $t('transfer.payment.paymentFailed') }}</h2>
    <p class="text-base text-danger-600 mb-5">{{ $t('payment.provider.yourPaymentCouldNotBe') }}</p>
    <template v-if="transaction.payment.paymentProvider.paymentDataAttributes?.length > 0">
      <p class="text-sm/6 text-gray-600 mb-2 text-left">{{ $t('payment.provider.pleaseReviewOrUpdateThe') }}</p>
      <template v-for="attribute in transaction.payment.paymentProvider.paymentDataAttributes">
        <div class="mb-3 text-left">
          <label :class="[retryFormErrors[`${attribute.attribute}`]?.length > 0 ? 'text-danger-600' : 'text-gray-900']" :for="`payment-data-${attribute.attribute}`" class="text-sm/6 font-semibold">{{ attribute.label }} <span class="text-danger-600" v-if="attribute.isRequired">*</span></label>
          <p v-if="attribute.info" class="mb-4 text-sm/6 text-gray-500">{{ attribute.info }}</p>
          <input v-if="attribute.type === 'text'" v-model="paymentData.data[attribute.attribute].value" :inputmode="attribute.inputMode" :required="attribute.isRequired" :id="`payment-data-${attribute.attribute}`" type="text" class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-2 focus:-outline-offset-2 focus:outline-brand-600" />
          <input v-else-if="attribute.type === 'email'" v-model="paymentData.data[attribute.attribute].value" :required="attribute.isRequired" :id="`payment-data-${attribute.attribute}`" type="email" class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-2 focus:-outline-offset-2 focus:outline-brand-600" />
          <p v-if="retryFormErrors[`${attribute.attribute}`]?.length > 0" class="mt-2 text-sm/6 text-danger-600">{{ retryFormErrors[`${attribute.attribute}`][0] }}</p>
        </div>
      </template>
    </template>
    <button @click="retryPayment" class="mt-5 px-4 md:px-6 block w-full lg:px-8 bg-brand-700 text-white text-center py-3 rounded-xl font-medium hover:bg-brand-800 transition cursor-pointer text-sm/6 outline-none ring-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700">{{ $t('transfer.payment.tryThePaymentAgain') }}</button>
    <p class="text-base text-danger-600 mt-5 text-sm/6">{{ $t('payment.provider.ifTheIssueContinuesPlease') }}</p>
  </template>
</template>