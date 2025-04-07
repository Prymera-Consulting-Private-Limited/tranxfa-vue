<script setup>
import Transaction from "@/models/transaction.js";
import {onMounted, onUnmounted, watchEffect} from "vue";
import PaymentTransactionState from "@/models/payment_transaction_state.js";
import PaymentState from "@/enums/payment_state.js";
import AwaitingPending from "@/components/Payment/State/AwaitingPending.vue";
import PendingReceived from "@/components/Payment/State/PendingReceived.vue";
import PaymentCompleted from "@/components/Payment/State/PaymentCompleted.vue";
import router from "@/router/index.js";
import axios from "axios";

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
  } else if (props.transaction.payment.state.code === PaymentState.AUTHORIZED || props.transaction.payment.state.code === PaymentState.CAPTURED) {
    await router.push({name: 'viewTransaction', params: {transactionId: props.transaction.id}});
  }
})

const paymentDone = async function () {
  axios.post(`${import.meta.env.VITE_PAGA_WEBHOOK_LISTENER}?paymentId=${props.transaction.payment.id}`, {
    "event": "PAYMENT_COMPLETE",
    "notificationId": "a12ef82b-14d0-4a67-a08c-162b95154f59",
    "statusCode": "0",
    "statusMessage": "Payment Request has been authorized",
    "externalReferenceNumber": "234447994060953",
    "state": "CONSUMED",
    "fundingDetails": {
      "payerAccountNumber": "0980763285",
      "paymentReferenceNumber": null,
      "payerName": "Bello Ramon",
      "payerBankName": "Access Bank Plc",
      "payerBankAccountNumber": "0980763285"
    },
    "hash": "33f9c9bd0785c2ccfa66ddedfbae7c3b56361250c581a39edad1d2ed08ccfbed845f34b8c30532f7c0ec544483ebee9360c5749bfe5eaa9986ac5553488e058a"
  }).then((response) => {
    props.transaction.payment.state = PaymentTransactionState.getInstance(response.data);
  }).catch((error) => {
    console.error(error);
  });
}

watchEffect(() => {
  if (props.transaction.payment.state.code === PaymentState.PENDING) {
    props.transaction.payment.state.code = PaymentState.REDIRECTED;
  }
  if (props.transaction.payment.state.code === PaymentState.REDIRECTED) {
    setTimeout(async () => {
      await paymentDone();
    }, 5000);
  }
  if (props.transaction.payment.state.code === PaymentState.AUTHORIZED ||  props.transaction.payment.state.code === PaymentState.CAPTURED) {
    setTimeout(async () => {
      await router.push({ name: 'viewTransaction', params: { transactionId: props.transaction.id } });
    }, 1500);
  }
})

onUnmounted(async () => {
  Echo.leaveChannel(`client-payment.${props.transaction.payment.id}`);
})
</script>

<template>
  <template v-if="transaction.payment.state.code === PaymentState.REDIRECTED">
    <PendingReceived class="-mt-10" />
    <h2 class="text-2xl font-semibold text-gray-900 mb-5 -mt-10">Payment in Progress</h2>
    <p class="text-base text-gray-600 mb-3">Please make a bank transfer of {{ transaction.payment.totalPaymentAmountCurrencyPrefixed }} to our following bank account.</p>
    <p class="text-base text-gray-600"><span class="font-semibold">Account Name:</span> Tranxfa Inc</p>
    <p class="text-base text-gray-600"><span class="font-semibold">Account Number:</span> 1234567890</p>
    <p class="text-base text-gray-600 mb-6"><span class="font-semibold">Bank Name:</span> Paga</p>
  </template>

  <template v-else-if="transaction.payment.state.code === PaymentState.AUTHORIZED || transaction.payment.state.code === PaymentState.CAPTURED">
    <PaymentCompleted class="-mt-10" />
    <h2 class="text-2xl font-semibold text-green-700 mb-5 -mt-10">Payment Successful</h2>
    <p class="text-base text-gray-600">Your payment has been successfully received.</p>
  </template>

  <template v-else>
    <AwaitingPending class="-mt-10" />
    <h2 class="text-2xl font-semibold text-gray-900 mb-5 -mt-10">Please wait...</h2>
    <p class="text-base text-gray-600">Please wait while we are setting up the payment.</p>
  </template>
</template>