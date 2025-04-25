<script setup>
import Transaction from "@/models/transaction.js";
import {computed, onMounted, onUnmounted, ref} from "vue";
import PaymentTransactionState from "@/models/payment_transaction_state.js";
import PaymentState from "@/enums/payment_state.js";
import PaymentCompleted from "@/components/Payment/State/PaymentCompleted.vue";
import Processing from "@/components/Payment/State/Processing.vue";
import AwaitingPending from "@/components/Payment/State/AwaitingPending.vue";
import Failed from "@/components/Payment/State/Failed.vue";
import { ClipboardIcon } from '@heroicons/vue/24/outline';
import {UseClipboard} from '@vueuse/components';
import {useTransactionUtils} from "@/composables/transaction_utils.js";
import router from "@/router/index.js";

const props = defineProps({
  transaction: {
    type: Object(Transaction),
    required: true
  }
})

const transactionUtils = useTransactionUtils();

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

const iHaveMadePayment = async () => {
  props.transaction.payment.state.code = PaymentState.REDIRECTED;
  transactionUtils.iHaveMadePayment(props.transaction.payment.id).then(() => {
      router.replace({name: 'viewTransaction', params: {transactionId: props.transaction.id}})
  });
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
    <div class="-m-5">
      <h2 class="text-lg font-semibold text-gray-900 mb-5 text-left">Complete Your Payment</h2>
      <template v-if="transaction.payment.clientPaymentAccount">
        <p class="text-base font-normal text-sm text-gray-600 mb-6 text-left leading-6">{{ transaction.payment.clientPaymentAccount?.instruction }}</p>
        <div v-for="(accountAttribute, index) in transaction.payment.clientPaymentAccount?.attributes" :key="`account-attribute-${index}`" class="text-left my-5">
          <label :for="`account-attribute-${index}`" class="block text-sm/6 font-medium text-gray-900">{{ accountAttribute.key }}</label>
          <UseClipboard v-slot="{ copy, copied }" :source="accountAttribute.value">
            <div class="mt-2 flex">
              <div class="-mr-px grid grow grid-cols-1 focus-within:relative">
                <input type="text" readonly :value="accountAttribute.value" :id="`account-attribute-${index}`" class="col-start-1 row-start-1 block w-full rounded-l-md bg-gray-50 py-2.5 px-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-purple-600 sm:text-sm/6" />
              </div>
              <button @click="copy()" type="button" class="flex shrink-0 items-center gap-x-1.5 rounded-r-md bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-900 outline-1 -outline-offset-1 outline-gray-300 hover:bg-gray-50 focus:relative focus:outline-2 focus:-outline-offset-2 focus:outline-purple-600 cursor-pointer">
                <ClipboardIcon class="-ml-0.5 size-4 text-gray-400" aria-hidden="true" />
              </button>
            </div>
            <p v-if="copied" class="text-green-600 mt-2 font-normal text-xs">{{ accountAttribute.key }} has been copied!</p>
          </UseClipboard>
        </div>
        <div class="text-left my-5">
          <label :for="`payment-reference`" class="block text-sm/6 font-medium text-gray-900">Payment Reference</label>
          <UseClipboard v-slot="{ copy, copied }" :source="transaction.payment.clientPaymentAccount.paymentReference">
            <div class="mt-2 flex">
              <div class="-mr-px grid grow grid-cols-1 focus-within:relative">
                <input type="text" readonly :value="transaction.payment.clientPaymentAccount.paymentReference" :id="`payment-reference`" class="col-start-1 row-start-1 block w-full rounded-l-md bg-gray-50 py-2.5 px-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-purple-600 sm:text-sm/6" />
              </div>
              <button @click="copy()" type="button" class="flex shrink-0 items-center gap-x-1.5 rounded-r-md bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-900 outline-1 -outline-offset-1 outline-gray-300 hover:bg-gray-50 focus:relative focus:outline-2 focus:-outline-offset-2 focus:outline-purple-600 cursor-pointer">
                <ClipboardIcon class="-ml-0.5 size-4 text-gray-400" aria-hidden="true" />
              </button>
            </div>
            <p v-if="copied" class="text-green-600 mt-2 font-normal text-xs">Payment Reference has been copied!</p>
          </UseClipboard>
        </div>
        <div class="mt-6">
          <button @click="iHaveMadePayment" type="button" class="rounded-md w-full bg-purple-600 px-6 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-purple-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600 cursor-pointer">I've made payment</button>
        </div>
        <div class="my-6 leading-6 text-center text-gray-900 hover:text-purple-700 font-semibold text-sm">
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