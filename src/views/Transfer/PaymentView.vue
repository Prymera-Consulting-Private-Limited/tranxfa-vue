<script setup>
import CustomerLayout from "@/components/CustomerLayout.vue";
import { useTransactionUtils } from "@/composables/transaction_utils.js";
import {computed, onMounted, ref, watch} from "vue";
import { Dialog, DialogPanel, TransitionChild, TransitionRoot } from '@headlessui/vue'
import Transaction from "@/models/transaction.js";
import PaymentTransaction from "@/models/payment_transaction.js";
import router from "@/router/index.js";
import ManualPayment from "@/components/Payment/ManualPayment.vue";
import PagaPayment from "@/components/Payment/PagaPayment.vue";
import Volume from "@/components/Payment/Volume.vue";
import Monoova from "@/components/Payment/Monoova.vue";
import Apaylo from "@/components/Payment/Apaylo.vue";
import Pay360 from "@/components/Payment/Pay360.vue";
import CinetPay from "@/components/Payment/CinetPay.vue";

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


const paymentAttempt = ref(1);

const canAttemptPayment = computed(() => {
  return paymentAttempt.value <= 3
});

const retryPaymentErrors = ref([]);

const retryPayment = async (paymentData = null) => {
  paymentAttempt.value++;
  if (canAttemptPayment === false) {
    return;
  }
  isLoading.value = true;
  transactionUtils.retryPayment(props.id, paymentData).then((response) => {
    transaction.value.payment = PaymentTransaction.getInstance(response.data);
  }).catch((e) => {
    if (e.response.status === 422) {
      retryPaymentErrors.value = e.response.data.errors;
    } else {
      console.error(e);
    }
  }).finally(() => {
    isLoading.value = false;
  });
}

watch(canAttemptPayment, async () => {
  if (! canAttemptPayment.value) {
    await router.push({name: 'viewTransaction', params: {transactionId: props.id}});
  }
});
</script>

<template>
  <CustomerLayout>
    <main class="py-8">
      <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:max-w-full lg:px-8">
        <h1 class="sr-only">Make Payment</h1>
        <div class="flex items-center justify-center gap-4 lg:gap-8 bg-white rounded-t-lg p-4 md:px-6 md:py-8 min-h-148">
          <div class="text-center" v-if="isLoading">
            <span class="text-6xl pi pi-spinner-dotted pi-spin text-gray-500"></span>
            <h2 class="text-2xl font-semibold text-gray-600 mb-5 mt-5">Please wait ...</h2>
          </div>
        </div>
      </div>
    </main>
  </CustomerLayout>
  <TransitionRoot as="template" :show="isLoading === false">
    <Dialog class="relative z-10">
      <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0" enter-to="opacity-100" leave="ease-in duration-200" leave-from="opacity-100" leave-to="opacity-0">
        <div class="fixed inset-0 bg-gray-500/75 transition-opacity" />
      </TransitionChild>

      <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95" enter-to="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-200" leave-from="opacity-100 translate-y-0 sm:scale-100" leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
            <DialogPanel class="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
              <button class="sr-only"></button>
              <div class="py-0 sm:pb-6 px-6">
                <div class="mt-3 text-center sm:mt-5">
                  <div v-if="transaction" class="text-center">
                    <ManualPayment v-if="transaction.payment.paymentProvider.code === 'MANUAL-PAYMENT'" v-bind:transaction="transaction"  />
                    <PagaPayment v-if="transaction.payment.paymentProvider.code === 'PAGA'" v-bind:transaction="transaction"  />
                    <Monoova v-on:retryPayment="retryPayment" v-if="transaction.payment.paymentProvider.code === 'MONOOVA'" v-bind:transaction="transaction"  />
                    <Volume v-on:retryPayment="retryPayment" v-if="transaction.payment.paymentProvider.code === 'VOLUME-PAYMENTS'" v-bind:transaction="transaction"  />
                    <Apaylo v-on:retryPayment="retryPayment" v-if="transaction.payment.paymentProvider.code === 'APAYLO'" v-bind:transaction="transaction"  v-bind:retryFormErrors="retryPaymentErrors"  />
                    <Pay360 v-on:retryPayment="retryPayment" v-if="transaction.payment.paymentProvider.code === 'PAY360'" v-bind:transaction="transaction"  />
                    <CinetPay v-on:retryPayment="retryPayment" v-if="transaction.payment.paymentProvider.code === 'CINET_PAY'" v-bind:transaction="transaction"  />
                  </div>
                </div>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>