<script setup>
import Transaction from "@/models/transaction.js";
import {computed, onMounted, onUnmounted} from "vue";
import PaymentTransactionState from "@/models/payment_transaction_state.js";
import PaymentState from "@/enums/payment_state.js";
import PaymentCompleted from "@/components/Payment/State/PaymentCompleted.vue";
import Processing from "@/components/Payment/State/Processing.vue";
import AwaitingPending from "@/components/Payment/State/AwaitingPending.vue";
import Failed from "@/components/Payment/State/Failed.vue";
import {useTransactionUtils} from "@/composables/transaction_utils.js";
import router from "@/router/index.js";
import ClientPaymentAccount from "@/components/ClientPaymentAccount.vue";
import {ClipboardIcon} from "@heroicons/vue/24/outline/index.js";
import {UseClipboard} from "@vueuse/components";

const props = defineProps({
  transaction: {
    type: Object(Transaction),
    required: true
  },
  showViewTransfer: {
    type: Boolean,
    required: false,
    default: true,
  }
})

const transactionUtils = useTransactionUtils();

const getTransaction = async () => {
  transactionUtils.getTransaction(props.transaction.id).then((response) => {
    const transaction = Transaction.getInstance(response.data);
    props.transaction.payment = transaction.payment;
    if (props.transaction.payment.state.code === PaymentState.PENDING) {
      clearPullInterval();
    }
  });
}

let intervalId = null;

onMounted(async () => {
  Echo.channel(`client-payment.${props.transaction.payment.id}`)
      .listen('PaymentTransactionStateUpdated', (e) => {
        props.transaction.payment.state = PaymentTransactionState.getInstance(e.state);
        props.transaction.payment.sharedReference = e.shared_reference;
        if (props.transaction.payment.state.code === PaymentState.PENDING) {
          clearPullInterval();
        }
      });
  if (props.transaction.payment.state.code !== PaymentState.PENDING) {
    intervalId = setInterval(getTransaction, 5000);
  }
})

const clearPullInterval = async () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

onUnmounted(async () => {
  Echo.leaveChannel(`client-payment.${props.transaction.payment.id}`);
  await clearPullInterval();
})

const iHaveMadePayment = async () => {
  props.transaction.payment.state.code = PaymentState.REDIRECTED;
  await clearPullInterval();
  await transactionUtils.iHaveMadePayment(props.transaction.payment.id);
}

const status = computed(() => {
  if (props.transaction.payment.state.code === PaymentState.PENDING || props.transaction.payment.state.code === PaymentState.INITIALIZED || props.transaction.payment.state.code === PaymentState.CREATED) {
    return 'pending';
  } else if (props.transaction.payment.state.code === PaymentState.REDIRECTED) {
    return 'processing';
  } else if (props.transaction.payment.state.code === PaymentState.AUTHORIZED || props.transaction.payment.state.code === PaymentState.CAPTURED) {
    return 'completed';
  } else if (props.transaction.payment.state.code === PaymentState.FAILED) {
    return 'failed';
  }
})
</script>

<template>
  <template v-if="transaction.payment.state.code === PaymentState.PENDING && !transaction.payment.customerConfirmedPayment">
    <div class="-m-5">
      <h2 class="text-lg font-semibold text-gray-900 mb-5 text-left">Complete Your Payment</h2>
      <p v-if="transaction.payment.clientPaymentAccount" class="text-base font-normal text-sm text-gray-600 mb-6 text-left leading-6">{{ transaction.payment.clientPaymentAccount?.instruction }}</p>
      <template v-if="transaction.payment.clientPaymentAccount">
        <ClientPaymentAccount v-bind:account="transaction.payment.clientPaymentAccount" /><div class="text-left my-5">
        <label :for="`payment-amount`" class="block text-sm/6 font-medium text-gray-900">Payment Amount</label>
        <UseClipboard v-slot="{ copy, copied }" :source="transaction.payment.totalPaymentAmountFormatted">
          <div class="mt-2 flex">
            <div class="-mr-px grid grow grid-cols-1 focus-within:relative">
              <input type="text" readonly :value="transaction.payment.totalPaymentAmountCurrencyPrefixed" :id="`payment-amount`" class="col-start-1 row-start-1 block w-full rounded-l-md bg-gray-50 py-2.5 px-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-purple-600 sm:text-sm/6" />
            </div>
            <button @click="copy()" type="button" class="flex shrink-0 items-center gap-x-1.5 rounded-r-md bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-900 outline-1 -outline-offset-1 outline-gray-300 hover:bg-gray-50 focus:relative focus:outline-2 focus:-outline-offset-2 focus:outline-purple-600 cursor-pointer">
              <ClipboardIcon class="-ml-0.5 size-4 text-gray-400" aria-hidden="true" />
            </button>
          </div>
          <p v-if="copied" class="text-green-600 mt-2 font-normal text-xs">Payment Amount has been copied!</p>
        </UseClipboard>
      </div>
        <div v-if="!transaction.payment.customerConfirmedPayment" class="my-6">
          <button @click="iHaveMadePayment" type="button" class="rounded-md w-full bg-purple-600 px-6 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-purple-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600 cursor-pointer">I've made payment</button>
        </div>
        <div v-if="showViewTransfer" class="mb-6 leading-6 text-center text-gray-900 hover:text-purple-700 font-semibold text-sm">
          <router-link :to="{name: 'viewTransaction', params: {transactionId: transaction.id}}">View Transaction</router-link>
        </div>
      </template>
    </div>
  </template>

  <template v-else-if="status === 'pending'">
    <AwaitingPending class="-mt-10" />
    <h2 class="text-xl font-semibold text-gray-900 mb-5 -mt-10">Please wait...</h2>
    <p class="text-base text-gray-600 mb-6">Please wait while we are setting up the payment.</p>
  </template>

  <template v-else-if="status === 'processing'">
    <Processing class="-mt-10" />
    <h2 class="text-xl font-semibold text-gray-900 mb-5 -mt-10">Awaiting Payment Update</h2>
    <p class="text-base text-gray-600 mb-6">{{ transaction.payment.clientPaymentAccount?.waitTimeMessage }}</p>
    <div v-if="showViewTransfer" class="mb-6 leading-6 text-center text-gray-900 hover:text-purple-700 font-semibold text-sm">
      <router-link :to="{name: 'viewTransaction', params: {transactionId: transaction.id}}">View Transaction</router-link>
    </div>
  </template>

  <template v-else-if="status === 'completed'">
    <PaymentCompleted class="-mt-10" />
    <h2 class="text-xl font-semibold text-green-700 mb-5 -mt-10">Payment Successful</h2>
    <p class="text-lg text-gray-600 mb-6">Your payment has been successfully received.</p>
  </template>

  <template v-else-if="status === 'failed'">
    <Failed class="-mt-20" />
    <h2 class="text-2xl font-semibold text-red-500 mb-5 -mt-10">Payment Failed</h2>
    <p class="text-base text-red-600">Your payment has been failed. Please try again</p>
  </template>
</template>