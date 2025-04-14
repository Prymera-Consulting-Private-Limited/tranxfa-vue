<script setup>
import Transaction from "@/models/transaction.js";
import {computed, onMounted, onUnmounted} from "vue";
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
})

onUnmounted(async () => {
  Echo.leaveChannel(`client-payment.${props.transaction.payment.id}`);
})

const redirected = async () => {
  props.transaction.payment.state.code = PaymentState.REDIRECTED;
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

  <template v-if="transaction.payment.state.code === PaymentState.PENDING">
    <AwaitingPending class="-mt-10" />
    <h2 class="text-xl font-semibold text-gray-900 mb-5 -mt-10">Complete Your Payment</h2>
    <p class="text-base text-gray-600 mb-6">Your transaction is pending. To proceed, please click the button below and complete the payment.</p>
    <div class="mt-6 mb-10">
      <a @click="redirected" :href="`https://gateway-web.fit.interac.ca/acceptPaymentRequest.do?rID=${transaction.payment.sharedReference}`" class="px-4 md:px-6 lg:px-8 bg-purple-600 text-white text-center py-3 rounded-md font-medium hover:bg-purple-700 transition cursor-pointer text-sm outline-none ring-0" target="_blank">Proceed to Payment</a>
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
    <div class="mt-6 mb-10">
      <a @click="redirected" :href="`https://gateway-web.fit.interac.ca/acceptPaymentRequest.do?rID=${transaction.payment.sharedReference}`" class="px-4 md:px-6 lg:px-8 bg-purple-600 text-white text-center py-3 rounded-md font-medium hover:bg-purple-700 transition cursor-pointer text-sm outline-none ring-0" target="_blank">Open again</a>
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
