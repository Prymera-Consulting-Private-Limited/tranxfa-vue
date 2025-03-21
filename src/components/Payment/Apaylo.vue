<script setup>
import Transaction from "@/models/transaction.js";
import {onMounted, onUnmounted} from "vue";
import PaymentTransactionState from "@/models/payment_transaction_state.js";
import PaymentState from "@/enums/payment_state.js";
import PaymentCompleted from "@/components/Payment/State/PaymentCompleted.vue";
import PendingReceived from "@/components/Payment/State/PendingReceived.vue";
import AwaitingPending from "@/components/Payment/State/AwaitingPending.vue";

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
      });
})

onUnmounted(async () => {
  Echo.leaveChannel(`client-payment.${props.transaction.payment.id}`);
})

const redirected = async () => {
  props.transaction.payment.state.code = PaymentState.REDIRECTED;
}
</script>

<template>

  <template v-if="transaction.payment.state.code === PaymentState.REDIRECTED">
    <PendingReceived class="-mt-10" />
    <h2 class="text-xl font-semibold text-gray-900 mb-5 -mt-10">Awaiting Payment Updated</h2>
    <p class="text-base text-gray-600 mb-6">We have opened a new browser window for you to complete the payment.</p>
  </template>

  <template v-else-if="transaction.payment.state.code === PaymentState.AUTHORIZED || transaction.payment.state.code === PaymentState.CAPTURED">
    <PaymentCompleted class="-mt-10" />
    <h2 class="text-xl font-semibold text-green-700 mb-5 -mt-10">Payment Successful</h2>
    <p class="text-lg text-gray-600 mb-6">Your payment has been successfully received.</p>
  </template>

  <template v-if="transaction.payment.state.code === PaymentState.PENDING">
    <AwaitingPending class="-mt-10" />
    <h2 class="text-xl font-semibold text-gray-900 mb-5 -mt-10">Complete Your Payment</h2>
    <p class="text-base text-gray-600 mb-6">Your transaction is pending. To proceed, please click the button below and complete the payment.</p>
    <a @click="redirected" :href="`https://gateway-web.fit.interac.ca/acceptPaymentRequest.do?rID=${transaction.payment.sharedReference}`" class="mt-6 px-4 md:px-6 lg:px-8 bg-blue-600 text-white text-center py-3 rounded-md font-medium hover:bg-blue-700 transition cursor-pointer text-sm" target="_blank">Proceed to Payment</a>
  </template>

  <template v-else>
    <AwaitingPending class="-mt-10" />
    <h2 class="text-xl font-semibold text-gray-900 mb-5 -mt-10">Please wait...</h2>
    <p class="text-base text-gray-600 mb-6">Please wait while we are setting up the payment.</p>
  </template>
</template>
