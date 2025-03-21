<script setup>
import CustomerLayout from "@/components/CustomerLayout.vue";
import { useTransactionUtils } from "@/composables/transaction_utils.js";
import {onMounted, onUnmounted, ref} from "vue";
import Transaction from "@/models/transaction.js";
import Apaylo from "@/components/Payment/Apaylo.vue";
import Paga from "@/components/Payment/Paga.vue";

const transactionUtils = useTransactionUtils();

const props = defineProps({
  id: {
    type: String,
    required: true
  }
});

const transaction = ref(null);

const isLoading = ref(true);

onMounted(async () => {
  transactionUtils.getTransaction(props.id).then((response) => {
    transaction.value = Transaction.getInstance(response.data);
  }).finally(() => {
    isLoading.value = false;
  });
})

</script>

<template>
  <CustomerLayout>
    <main class="-mt-24 py-8">
      <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:max-w-7xl lg:px-8">
        <h1 class="sr-only">Make Payment</h1>
        <div class="flex items-center justify-center gap-4 lg:gap-8 bg-white rounded-t-lg p-4 md:px-6 md:py-8 min-h-148  shadow-lg">
          <div class="text-center" v-if="isLoading">
            <span class="text-6xl pi pi-spinner-dotted pi-spin text-gray-500"></span>
            <h2 class="text-2xl font-semibold text-gray-600 mb-5 mt-5">Please wait ...</h2>
          </div>
          <template v-else>
            <div v-if="transaction" class="text-center">
              <Apaylo v-if="transaction.payment.paymentProvider.code === 'INTERAC'" v-bind:transaction="transaction"  />
              <Paga v-if="transaction.payment.paymentProvider.code === 'PAGA'" v-bind:transaction="transaction"  />
            </div>
          </template>
        </div>
      </div>
    </main>
  </CustomerLayout>
</template>