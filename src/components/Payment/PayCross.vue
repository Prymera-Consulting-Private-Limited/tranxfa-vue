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
        props.transaction.payment.paymentUrl = e.payment_url;
        if (props.transaction.payment.state.code === PaymentState.PENDING) {
          clearPullInterval();
        } else if (props.transaction.payment.state.code === PaymentState.AUTHORIZED || props.transaction.payment.state.code === PaymentState.CAPTURED) {
          setTimeout(() => {
            router.push({
              name: 'viewTransaction',
              params: {
                transactionId: props.transaction.id
              }
            });
          }, 1500)
        }
      });
  if (props.transaction.payment.state.code !== PaymentState.PENDING) {
    intervalId = setInterval(getTransaction, 10000);
  }
})

const clearPullInterval = async () => {
  if (intervalId) {
    await clearInterval(intervalId);
    intervalId = null;
  }
}

onUnmounted(async () => {
  Echo.leaveChannel(`client-payment.${props.transaction.payment.id}`);
  await clearPullInterval();
})

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
  emits('retryPayment');
}
</script>

<template>
  <template v-if="transaction.payment.state.code === PaymentState.PENDING">
    <div class="">
      <h2 class="text-lg font-semibold text-gray-900 mb-5 text-left">Complete Your Payment</h2>
      <p class="text-sm/6 text-gray-600 mb-6 text-left">
        Your transaction is awaiting payment. Please proceed by clicking the button below to securely complete your payment.
      </p>
      <a :href="transaction.payment.paymentUrl" class="block w-full px-4 md:px-6 lg:px-8 bg-green-600 text-white text-center py-3 rounded-md font-medium hover:bg-green-700 transition cursor-pointer text-sm outline-none ring-0 tracking-wider">Pay {{ transaction.payment.totalPaymentAmountCurrencyPrefixed }}</a>
      <p class="text-sm/6 text-gray-600 mt-4 text-left">You will be redirected to the secure site to finalize your payment.</p>
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
    <div v-if="showViewTransfer" class="mb-6 leading-6 text-center text-gray-900 hover:text-brand-700 font-semibold text-sm">
      <router-link :to="{name: 'viewTransaction', params: {transactionId: transaction.id}}">View Transaction</router-link>
    </div>
  </template>

  <template v-else-if="status === 'completed'">
    <PaymentCompleted class="-mt-10" />
    <h2 class="text-xl font-semibold text-green-700 mb-5 -mt-10">Pago exitosa</h2>
    <p class="text-lg text-gray-600 mb-6">Su pago se ha recibido correctamente.</p>
  </template>

  <template v-else-if="status === 'failed'">
    <Failed class="-mt-20" />
    <h2 class="text-2xl font-semibold text-red-500 mb-5 -mt-10">Payment Failed</h2>
    <p class="text-base text-red-600">Your payment has been failed. Please try again</p>
    <button @click="retryPayment" class="mt-5 px-4 md:px-6 lg:px-8 bg-blue-600 text-white text-center py-3 rounded-md font-medium hover:bg-blue-700 transition cursor-pointer text-sm outline-none ring-0">Retry Payment</button>
  </template>
</template>