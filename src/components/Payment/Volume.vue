<script setup>
import Transaction from "@/models/transaction.js";
import {computed, onMounted, onUnmounted, ref, watch, watchEffect} from "vue";
import PaymentTransactionState from "@/models/payment_transaction_state.js";
import PaymentState from "@/enums/payment_state.js";
import PaymentCompleted from "@/components/Payment/State/PaymentCompleted.vue";
import Processing from "@/components/Payment/State/Processing.vue";
import AwaitingPending from "@/components/Payment/State/AwaitingPending.vue";
import Failed from "@/components/Payment/State/Failed.vue";

const props = defineProps({
  transaction: {
    type: Object(Transaction),
    required: true
  }
})

onMounted(async () => {
  Echo.channel(`client-payment.${props.transaction.payment.id}`)
      .listen('PaymentTransactionStateUpdated', (e) => {
        props.transaction.payment.state = PaymentTransactionState.getInstance(e.state);
        props.transaction.payment.sharedReference = e.shared_reference;
      });
  if (props.transaction.payment.state.code === PaymentState.PENDING) {
    await initPayment();
  }
})

onUnmounted(async () => {
  Echo.leaveChannel(`client-payment.${props.transaction.payment.id}`);
})

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

const emits = defineEmits(['retryPayment']);

const initPayment = async () => {
  const volume = new window.Volume({
    environment: "SANDBOX",
    applicationId: import.meta.env.VITE_VOLUME_PAYMENT_MERCHANT_ID,
    eventConsumer: (event) => {
      console.log("A VOLUME EVENT: " + event)
      if (event === 'payment_initiated') {
        props.transaction.payment.state.code = PaymentState.REDIRECTED;
      }
    },
    errorConsumer: (error) => {
      console.error(JSON.stringify(error))
    },
  });
  volume.createPayment({
    amount: props.transaction.payment.totalPaymentAmount,
    merchantPaymentId: props.transaction.payment.id,
    paymentReference: props.transaction.transactionNumber + '',
  });
  volume.injectComponent('volume-element-container');
  volume.openInstitutionSelection()

}

watch(props.transaction, () => {
  if (props.transaction.payment.state.code === PaymentState.PENDING) {
    initPayment();
  }
});

const retryPayment = async () => {
  emits('retryPayment');
}
</script>

<template>
  <template v-if="transaction.payment.state.code === PaymentState.PENDING">
    <AwaitingPending class="-mt-10" />
    <h2 class="text-xl font-semibold text-gray-900 mb-5 -mt-10">Complete Your Payment</h2>
    <p class="text-base text-gray-600 mb-6">Your transaction is pending. Please select your bank to continue.</p>
    <div class="mt-6 mb-10">
      <div id="volume-element-container"></div>
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
    <p class="text-base text-gray-600 mb-6">We have opened a new browser window for you to complete the payment.</p>
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
    <button @click="retryPayment" class="mt-5 px-4 md:px-6 lg:px-8 bg-blue-600 text-white text-center py-3 rounded-md font-medium hover:bg-blue-700 transition cursor-pointer text-sm outline-none ring-0">Retry Payment</button>
  </template>

</template>
