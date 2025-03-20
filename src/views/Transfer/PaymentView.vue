<script setup>
import CustomerLayout from "@/components/CustomerLayout.vue";
import { DotLottieVue } from '@lottiefiles/dotlottie-vue'
import { useTransactionUtils } from "@/composables/transaction_utils.js";
import {onMounted, ref} from "vue";

const transactionUtils = useTransactionUtils();

const props = defineProps({
  id: {
    type: String,
    required: true
  }
});

const isRedirected = ref(false);

onMounted(async () => {
  transactionUtils.getTransaction(props.id).then((response) => {
    if (response.data.payment.state.code === 'PENDING') {
      isRedirected.value = true;
      window.open('https://gateway-web.fit.interac.ca/acceptPaymentRequest.do?rID=' + response.data.payment.shared_reference, '_blank', 'noopener,noreferrer')
    }
  });
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
            <div class="text-center" v-if="! isRedirected">
              <DotLottieVue class="size-64 mx-auto" autoplay loop src="https://lottie.host/24109003-b9f9-488a-9128-e7257e14d5c8/i47YCCI4CD.lottie" />
              <h2 class="text-2xl font-semibold text-gray-800 mb-5">Please wait...</h2>
              <p class="text-lg text-gray-700">We are redirecting you to the payment page. Please wait and do not close this tab.</p>
            </div>
            <div class="text-center" v-else>
              <DotLottieVue class="size-64 mx-auto" autoplay loop src="https://lottie.host/fde60a6b-78da-446b-bf0d-de80ea258609/TQGK51sSsf.lottie" />
              <h2 class="text-2xl font-semibold text-gray-800 mb-5">Awaiting payment confirmation</h2>
              <p class="text-lg text-gray-700">We have opened a window for you to finalize the payment.</p>
            </div>
          </section>
        </div>
      </div>
    </main>
  </CustomerLayout>
</template>