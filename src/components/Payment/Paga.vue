<script setup>
import Transaction from "@/models/transaction.js";
import {onMounted, onUnmounted} from "vue";
import PaymentTransactionState from "@/models/payment_transaction_state.js";
import PaymentState from "@/enums/payment_state.js";
import AwaitingPending from "@/components/Payment/State/AwaitingPending.vue";
import PendingReceived from "@/components/Payment/State/PendingReceived.vue";
import PaymentCompleted from "@/components/Payment/State/PaymentCompleted.vue";

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
  if (props.transaction.payment.state.code === PaymentState.PENDING) {
    props.transaction.payment.state.code = PaymentState.REDIRECTED;
  }
})

onUnmounted(async () => {
  Echo.leaveChannel(`client-payment.${props.transaction.value.payment.id}`);
})
</script>

<template>
  <template v-if="transaction.payment.state.code === PaymentState.REDIRECTED">
    <PendingReceived />
    <h2 class="text-2xl font-semibold text-gray-900 mb-5 mt-5">Payment in Progress</h2>
    <p class="text-lg text-gray-600 mb-6">Please make a bank transfer of {{ transaction.payment.totalPaymentAmountCurrencyPrefixed }} to our following bank account.</p>
  </template>

  <template v-else-if="transaction.payment.state.code === PaymentState.AUTHORIZED || transaction.payment.state.code === PaymentState.CAPTURED">
    <PaymentCompleted />
    <h2 class="text-2xl font-semibold text-green-700 mb-5 mt-5">Payment Successful</h2>
    <p class="text-lg text-gray-600 mb-6">Your payment has been successfully received.</p>
  </template>

  <template v-else>
    <AwaitingPending />
    <h2 class="text-2xl font-semibold text-gray-900 mb-5 mt-5">Please wait...</h2>
    <p class="text-lg text-gray-600 mb-6">Please wait while we are setting up the payment.</p>
  </template>
</template>