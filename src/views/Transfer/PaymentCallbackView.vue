<script setup>
import CustomerLayout from "@/components/CustomerLayout.vue";
import { useTransactionUtils } from "@/composables/transaction_utils.js";
import {computed, onMounted, onUnmounted, ref, watchEffect} from "vue";
import { Dialog, DialogPanel, TransitionChild, TransitionRoot } from '@headlessui/vue'
import Transaction from "@/models/transaction.js";
import PaymentState from "@/enums/payment_state.js";
import PaymentTransactionState from "@/models/payment_transaction_state.js";
import Failed from "@/components/Payment/State/Failed.vue";
import Processing from "@/components/Payment/State/Processing.vue";
import PaymentCompleted from "@/components/Payment/State/PaymentCompleted.vue";
import router from "@/router/index.js";

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
  await transactionUtils.getTransaction(props.id).then((response) => {
    transaction.value = Transaction.getInstance(response.data);
    if (transaction.value.payment.state.code === PaymentState.AUTHORIZED || transaction.value.payment.state.code === PaymentState.CAPTURED) {
      setTimeout(async () => {
        await router.push({ name: 'viewTransaction', params: { transactionId: transaction.value.id } });
      }, 1500);
    }
  }).finally(() => {
    isLoading.value = false;
  });

  Echo.channel(`client-payment.${transaction.value.payment.id}`)
      .listen('PaymentTransactionStateUpdated', (e) => {
        transaction.value.payment.state = PaymentTransactionState.getInstance(e.state);
        transaction.value.payment.sharedReference = e.shared_reference;
      });
})

watchEffect(() => {
  if (transaction.value) {
    if (transaction.value.payment.state.code === PaymentState.FAILED) {
      transaction.value.payment.state.code = PaymentState.FAILED;
    }
    if (transaction.value.payment.state.code === PaymentState.AUTHORIZED ||  transaction.value.payment.state.code === PaymentState.CAPTURED) {
      setTimeout(async () => {
        await router.push({ name: 'viewTransaction', params: { transactionId: transaction.value.id } });
      }, 1500);
    }
  }
})

const status = computed(() => {
  if (transaction.value.payment.state.code === PaymentState.PENDING || transaction.value.payment.state.code === PaymentState.INITIALIZED || transaction.value.payment.state.code === PaymentState.CREATED) {
    return 'pending';
  } else if (transaction.value.payment.state.code === PaymentState.REDIRECTED) {
    return 'processing';
  } else if (transaction.value.payment.state.code === PaymentState.AUTHORIZED || transaction.value.payment.state.code === PaymentState.CAPTURED) {
    return 'completed';
  } else if (transaction.value.payment.state.code === PaymentState.FAILED) {
    return 'failed';
  }
})

onUnmounted(async () => {
  Echo.leaveChannel(`client-payment.${transaction.value.payment.id}`);
})

const retryPayment = async () => {
  isLoading.value = true;
  transactionUtils.retryPayment(props.id).then(() => {
    router.push({ name: 'makePayment', params: { transactionId: transaction.value.id } });
  }).catch((e) => {
    console.error(e);
  }).finally(() => {
    isLoading.value = false;
  });
}
</script>

<template>
  <CustomerLayout>
    <main class="-mt-24 py-8">
      <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:max-w-7xl lg:px-8">
        <h1 class="sr-only">Processing Payment</h1>
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
            <DialogPanel class="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-sm sm:p-6">
              <button class="sr-only"></button>
              <div class="p-8 sm:pb-6">
                <div class="mt-3 text-center sm:mt-5">
                  <template v-if="status === 'pending' || status === 'processing'">
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
                </div>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>