<script setup>
import CustomerLayout from "@/components/CustomerLayout.vue";
import Calculator from "@/components/Calculator.vue";
import {computed, onMounted, ref} from "vue";
import {useTransactionUtils} from "@/composables/transaction_utils.js";
import Transaction from "@/models/transaction.js";
import {useTimeUtils} from "@/composables/time_utils.js";
import {BanknotesIcon} from "@heroicons/vue/24/outline";
import ListItem from "@/components/Transaction/ListItem.vue";
import ListShimmer from "@/components/Transaction/ListShimmer.vue";

const transactionUtils = useTransactionUtils();
const timeUtils = useTimeUtils();

const data = ref(null);
const isLoading = ref(true);

onMounted(async () => {
  await transactionUtils.get().then((response) => {
    data.value = response.data;
    isLoading.value = false;
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
      <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:max-w-7xl lg:px-8 grid xl:grid-cols-3 gap-8">
        <h1 class="sr-only">Transactions</h1>
        <template v-if="isLoading">
          <div class="grid grid-cols-1 gap-4 lg:col-span-2 rounded-t-lg bg-white border border-solid border-gray-100">
            <div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                <ListShimmer />
              </div>
            </div>
          </div>
        </template>
        <template v-else>
          <div v-if="transactions?.length > 0" class="grid grid-cols-1 gap-4 lg:col-span-2 rounded-t-lg bg-white border border-solid border-gray-100">
            <div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                <ul role="list" class="divide-y divide-gray-100">
                  <template v-for="(transaction, i) in transactions" :key="transaction.data.id">
                    <router-link :class="{'rounded-t-lg': i === 0}" as="li" :to="{name: 'viewTransaction', params: {transactionId: transaction.data.id}}" class="flex justify-between gap-x-6 py-5 px-6 sm:px-8 cursor-pointer hover:bg-gray-50">
                      <ListItem v-bind:niceTime="transaction.niceTime" v-bind:transaction="transaction.data" />
                    </router-link>
                  </template>
                </ul>
              </div>
            </div>
          </div>
          <template v-else>
            <div class="relative flex flex-col items-center justify-center w-full h-full rounded-lg border border-gray-300 p-12 text-center bg-white col-span-2 shadow-lg">
              <div>
                <BanknotesIcon class="mx-auto size-12 text-gray-400" aria-hidden="true" />
                <span class="mt-4 block text-lg font-semibold text-gray-900">No Transactions Yet</span>
                <p class="mt-2 text-sm text-gray-600 max-w-sm">
                  Ready to send money? Your first transfer is just a few clicks away! Start now and experience fast, secure, and hassle-free transactions.
                </p>
              </div>
            </div>
          </template>
        </template>
        <div class="flex items-center justify-center rounded-lg bg-white p-5 pb-8 border border-solid border-gray-300 border-1 shadow-lg w-full">
          <Calculator />
        </div>
      </div>
    </main>
  </CustomerLayout>
</template>