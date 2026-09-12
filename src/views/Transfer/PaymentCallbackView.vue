<script setup>
import {failureMessage, logRequestFailure} from "@/composables/api_utils.js";
import InlineFailure from "@/components/InlineFailure.vue";
import CustomerLayout from "@/components/CustomerLayout.vue";
import {customerChannel, leaveCustomerChannel} from "@/realtime.js";
import { useTransactionUtils } from "@/composables/transaction_utils.js";
import {computed, onMounted, onUnmounted, ref, watchEffect} from "vue";
import { Dialog, DialogPanel, TransitionChild, TransitionRoot } from '@headlessui/vue'
import Transaction from "@/models/transaction.js";
import PaymentState from "@/enums/payment_state.js";
import PaymentTransactionState from "@/models/payment_transaction_state.js";
import Failed from "@/components/Payment/State/Failed.vue";
import Processing from "@/components/Payment/State/Processing.vue";
import PaymentCompleted from "@/components/Payment/State/PaymentCompleted.vue";
import router from "@/router/index.js";
import ModalCloseButton from "@/components/ModalCloseButton.vue";

const transactionUtils = useTransactionUtils();

const props = defineProps({
  id: {
    type: String,
    required: true
  }
});

const transaction = ref(null);

const isLoading = ref(true);
const loadFailed = ref(false);

// The state at return is not necessarily final — the provider confirms to us
// separately. The websocket is the fast path; the poll is the floor under it.
const settledStates = [
  PaymentState.AUTHORIZED,
  PaymentState.CAPTURED,
  PaymentState.FAILED,
  PaymentState.TIMED_OUT,
  PaymentState.CANCELLED,
  PaymentState.REFUNDED,
  PaymentState.PART_REFUNDED,
];

let intervalId = null;

const clearPullInterval = () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

const refreshTransaction = async () => {
  transactionUtils.getTransaction(props.id).then((response) => {
    const fresh = Transaction.getInstance(response.data);
    transaction.value.payment = fresh.payment;
    if (settledStates.includes(transaction.value.payment.state.code)) {
      clearPullInterval();
    }
  }).catch(() => {});
}

onMounted(async () => {
  await transactionUtils.getTransaction(props.id).then((response) => {
    transaction.value = Transaction.getInstance(response.data);
  }).catch(() => {
    loadFailed.value = true;
  }).finally(() => {
    isLoading.value = false;
  });

  if (! transaction.value) {
    return;
  }

  customerChannel(`client-payment.${transaction.value.payment.id}`)
      .listen('PaymentTransactionStateUpdated', (e) => {
        transaction.value.payment.state = PaymentTransactionState.getInstance(e.state);
        transaction.value.payment.sharedReference = e.shared_reference;
        transaction.value.payment.paymentUrl = e.payment_url;
        if (settledStates.includes(transaction.value.payment.state.code)) {
          clearPullInterval();
        }
      });

  if (! settledStates.includes(transaction.value.payment.state.code)) {
    intervalId = setInterval(refreshTransaction, 10000);
  }
})

let redirectTimeoutId = null;

watchEffect(() => {
  if (transaction.value) {
    if (transaction.value.payment.state.code === PaymentState.AUTHORIZED ||  transaction.value.payment.state.code === PaymentState.CAPTURED) {
      if (! redirectTimeoutId) {
        redirectTimeoutId = setTimeout(async () => {
          await router.push({ name: 'viewTransaction', params: { transactionId: transaction.value.id } });
        }, 1500);
      }
    }
  }
})

const status = computed(() => {
  if (! transaction.value) {
    return undefined;
  }
  if (transaction.value.payment.state.code === PaymentState.PENDING || transaction.value.payment.state.code === PaymentState.INITIALIZED || transaction.value.payment.state.code === PaymentState.CREATED) {
    return 'pending';
  } else if (transaction.value.payment.state.code === PaymentState.REDIRECTED) {
    return 'processing';
  } else if (transaction.value.payment.state.code === PaymentState.AUTHORIZED || transaction.value.payment.state.code === PaymentState.CAPTURED) {
    return 'completed';
  } else if (transaction.value.payment.state.code === PaymentState.FAILED) {
    return 'failed';
  } else if (transaction.value.payment.state.code === PaymentState.TIMED_OUT || transaction.value.payment.state.code === PaymentState.CANCELLED) {
    return 'cancelled';
  } else if (transaction.value.payment.state.code === PaymentState.REFUNDED || transaction.value.payment.state.code === PaymentState.PART_REFUNDED) {
    return 'refunded';
  }
})

onUnmounted(async () => {
  if (transaction.value?.payment?.id) {
    leaveCustomerChannel(`client-payment.${transaction.value.payment.id}`);
  }
  clearPullInterval();
  if (redirectTimeoutId) {
    clearTimeout(redirectTimeoutId);
    redirectTimeoutId = null;
  }
})

const retryFailure = ref(null);

const retryPayment = async () => {
  isLoading.value = true;
  retryFailure.value = null;
  transactionUtils.retryPayment(props.id).then(() => {
    router.push({ name: 'makePayment', params: { transactionId: transaction.value.id } });
  }).catch((e) => {
    logRequestFailure(e, 'retry-payment');
    retryFailure.value = failureMessage(e, "We couldn't start a new payment. Nothing has been charged. Please try again.");
  }).finally(() => {
    isLoading.value = false;
  });
}

function closePaymentModal() {
  router.push({ name: 'viewTransaction', params: { transactionId: props.id } });
}
</script>

<template>
  <CustomerLayout>
    <div>
      <div class="mx-auto max-w-3xl lg:max-w-full">
        <h1 class="sr-only">{{ $t('transfer.payment.processingPayment') }}</h1>
        <div class="flex items-center justify-center gap-4 lg:gap-8 bg-white rounded-t-lg p-4 md:px-6 md:py-8 min-h-148">
          <div class="text-center" v-if="isLoading">
            <span class="text-6xl pi pi-spinner-dotted pi-spin text-gray-500"></span>
            <h2 class="text-2xl font-semibold text-gray-600 mb-5 mt-5">{{ $t('transfer.payment.pleaseWait') }}</h2>
          </div>
        </div>
      </div>
    </div>
  </CustomerLayout>
  <TransitionRoot as="template" :show="isLoading === false">
    <Dialog class="relative z-50" @close="closePaymentModal">
      <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0" enter-to="opacity-100" leave="ease-in duration-200" leave-from="opacity-100" leave-to="opacity-0">
        <div class="fixed inset-0 bg-gray-500/75 transition-opacity" />
      </TransitionChild>
      <div class="fixed inset-0 z-50 w-screen overflow-y-auto">
        <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95" enter-to="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-200" leave-from="opacity-100 translate-y-0 sm:scale-100" leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
            <DialogPanel class="relative w-full transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-sm sm:p-6">
              <ModalCloseButton @close="closePaymentModal" />
              <div class="p-8 sm:pb-6">
                <div class="mt-3 text-center sm:mt-5">
                  <template v-if="status === 'pending' || status === 'processing'">
                    <Processing class="-mt-10" />
                    <h2 class="text-xl font-semibold text-gray-900 mb-5 -mt-10">{{ $t('transfer.payment.wereWatchingForYourPayment') }}</h2>
                    <p class="text-base text-gray-600 mb-6">{{ $t('transfer.payment.yourPaymentIsBeingProcessed') }}</p>
                  </template>

                  <template v-else-if="status === 'completed'">
                    <PaymentCompleted class="-mt-10" />
                    <h2 class="text-xl font-semibold text-success-700 mb-5 -mt-10">{{ $t('transfer.payment.paymentReceived') }}</h2>
                    <p class="text-lg text-gray-600 mb-6">{{ $t('transfer.payment.yourPaymentHasBeenSuccessfully') }}</p>
                  </template>

                  <template v-else-if="status === 'failed'">
                    <Failed class="-mt-20" />
                    <h2 class="text-2xl font-semibold text-danger-600 mb-5 -mt-10">{{ $t('transfer.payment.paymentFailed') }}</h2>
                    <p class="text-base text-danger-600">{{ $t('transfer.payment.weCouldntTakeYourPayment') }}</p>
                    <button @click="retryPayment" class="mt-5 px-4 md:px-6 lg:px-8 bg-brand-700 text-white text-center py-2.5 rounded-xl font-medium hover:bg-brand-800 transition cursor-pointer text-sm/6 outline-none ring-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700">{{ $t('transfer.payment.tryThePaymentAgain') }}</button>
                    <InlineFailure :message="retryFailure" />
                  </template>

                  <template v-else-if="status === 'cancelled'">
                    <Failed class="-mt-20" />
                    <h2 class="text-2xl font-semibold text-gray-900 mb-5 -mt-10">{{ transaction.payment.state.code === PaymentState.TIMED_OUT ? $t('payment.provider.thisPaymentHasExpired') : $t('payment.provider.thisPaymentWasCancelled') }}</h2>
                    <p class="text-base text-gray-600 mb-6">{{ $t('transfer.payment.noMoneyHasMovedYou') }}</p>
                  </template>

                  <template v-else-if="status === 'refunded'">
                    <h2 class="text-xl font-semibold text-gray-900 mb-5">{{ $t('transfer.payment.paymentRefunded') }}</h2>
                    <p class="text-base text-gray-600 mb-6">{{ $t('transfer.payment.thisPaymentWasReturnedTo') }}</p>
                  </template>

                  <template v-else-if="loadFailed">
                    <h2 class="text-xl font-semibold text-gray-900 mb-5">{{ $t('transfer.payment.weCouldntCheckYourPayment') }}</h2>
                    <p class="text-base text-gray-600 mb-6">{{ $t('transfer.payment.pleaseCheckYourConnectionAnd') }}</p>
                    <button @click="router.go(0)" class="mt-2 px-4 md:px-6 lg:px-8 bg-brand-700 text-white text-center py-2.5 rounded-xl font-medium hover:bg-brand-800 transition cursor-pointer text-sm/6 outline-none ring-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700">{{ $t('common.tryAgain') }}</button>
                  </template>
                </div>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>