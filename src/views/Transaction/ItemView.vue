<script setup>
import CustomerLayout from "@/components/CustomerLayout.vue";
import Calculator from "@/components/Calculator.vue";
import {computed, onMounted, ref} from "vue";
import {useTransactionUtils} from "@/composables/transaction_utils.js";
import Transaction from "@/models/transaction.js";
import {useTimeUtils} from "@/composables/time_utils.js";
import {useColorUtils} from "@/composables/color_utils.js";

const transactionUtils = useTransactionUtils();
const timeUtils = useTimeUtils();
const colorUtils = useColorUtils();

const data = ref(null);

onMounted(async () => {
  await transactionUtils.get().then((response) => {
    data.value = response.data;
  })
});

const transactions = computed(() => {
  return data.value?.data.map((data) => {
    const transaction = Transaction.getInstance(data);
    return {
      data: transaction,
      niceTime: timeUtils.getNiceTime(transaction.createdAt)
    }
  });
})

</script>

<template>
  <CustomerLayout>
    <main class="-mt-24 py-8">
      <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:max-w-7xl lg:px-8 grid grid-cols-3 gap-8">
        <h1 class="sr-only">Transaction </h1>
        <div class="grid grid-cols-1 gap-4 lg:col-span-2 rounded-t-lg bg-white border border-solid border-gray-100">
          <div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">

            </div>
          </div>
        </div>
        <div class="grid grid-cols-1 gap-4">
          <section aria-labelledby="section-2-title">
            <h2 class="sr-only" id="section-2-title">Send Money</h2>
            <div class="rounded-lg bg-white p-5 pb-8 border border-solid border-gray-300 border-1 shadow-lg">
              <Calculator />
            </div>
          </section>
        </div>
      </div>
    </main>
  </CustomerLayout>
</template>