<script setup>
import CustomerLayout from "@/components/CustomerLayout.vue";
import { DotLottieVue } from '@lottiefiles/dotlottie-vue'
import { useTransactionUtils } from "@/composables/transaction_utils.js";
import {onMounted, onUnmounted, ref} from "vue";
import Transaction from "@/models/transaction.js";

const transactionUtils = useTransactionUtils();

const props = defineProps({
  id: {
    type: String,
    required: true
  }
});

const transaction = ref(null);

const isRedirected = ref(false);

onMounted(async () => {
  transactionUtils.getTransaction(props.id).then((response) => {
    transaction.value = Transaction.getInstance(response.data);
    Echo.channel(`client-payment.${transaction.value.payment.id}`)
        .listen('PaymentTransactionStateUpdated', (e) => {

        });
  });
})

onUnmounted(async () => {
  if (transaction.value) {
    Echo.leaveChannel(`client-payment.${transaction.value.payment.id}`);
  }
})
</script>

<template>
  <CustomerLayout>
    <main class="-mt-24 py-8">
      <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:max-w-7xl lg:px-8 min-h-148">
        <h1 class="sr-only">Make Payment</h1>
        <!-- Main 3 column grid -->
        <div class="grid grid-cols-1 items-center justify-center gap-4 lg:gap-8 bg-white rounded-t-lg p-4 md:px-6 md:py-8 min-h-full">
          <section aria-labelledby="section-2-title">
            <h2 class="sr-only" id="section-2-title">Section title</h2>
            <div class="text-center" v-if="isRedirected">
              <DotLottieVue class="size-64 mx-auto" autoplay loop src="https://lottie.host/24109003-b9f9-488a-9128-e7257e14d5c8/i47YCCI4CD.lottie" />
              <h2 class="text-2xl font-semibold text-gray-800 mb-5">Awaiting payment confirmation</h2>
              <p class="text-lg text-gray-700">We have opened a window for you to finalize the payment.</p>
            </div>
            <div class="text-center" v-else>
              <DotLottieVue class="size-64 mx-auto" autoplay loop src="https://lottie.host/fde60a6b-78da-446b-bf0d-de80ea258609/TQGK51sSsf.lottie" />
              <h2 class="text-2xl font-semibold text-gray-800 mb-5">Complete Payment</h2>
              <p class="text-lg text-gray-700 mb-6">Please click the button below to make the payment.</p>
              <a :class="{'opacity-70' : ! transaction}" @click="isRedirected = true" :href="[
                transaction ? `https://gateway-web.fit.interac.ca/acceptPaymentRequest.do?rID=${transaction.payment?.sharedReference}` : 'javascript:'
              ]" class="mt-6 px-3 md:px-6 lg:px-8 bg-brand-700 text-white text-center py-2.5 rounded-md font-medium hover:bg-brand-800 transition cursor-pointer text-sm" target="_blank">Make Payment</a>
            </div>
          </section>
        </div>
      </div>
    </main>
  </CustomerLayout>
</template>