<script setup>
import CustomerLayout from "@/components/CustomerLayout.vue";
import Calculator from "@/components/Calculator.vue";
import {computed, onMounted, ref} from "vue";
import {useTransactionUtils} from "@/composables/transaction_utils.js";
import Transaction from "@/models/transaction.js";
import {useTimeUtils} from "@/composables/time_utils.js";
import { BanknotesIcon, ArrowDownTrayIcon } from "@heroicons/vue/24/outline";
import ListItem from "@/components/Transaction/ListItem.vue";
import ListShimmer from "@/components/Transaction/ListShimmer.vue";
import Pagination from "@/components/Pagination.vue";
import StatementRequestModal from "@/components/Transaction/StatementRequestModal.vue";

const isStatementModalOpen = ref(false);

const transactionUtils = useTransactionUtils();
const timeUtils = useTimeUtils();

const data = ref(null);
const isLoading = ref(true);

async function getTransactions(page = null) {
  isLoading.value = true;
  await transactionUtils.get(page).then((response) => {
    data.value = response.data;
  }).finally(() => {
    isLoading.value = false;
  });
}

onMounted(async () => {
  getTransactions();
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
        <div class="lg:col-span-2 flex flex-col gap-4">
          <div class="flex flex-col gap-3 rounded-lg border border-gray-100 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 class="text-base font-semibold text-gray-900">Your transactions</h2>
              <p class="mt-0.5 text-sm text-gray-500">
                Request a statement by email for any date range.
              </p>
            </div>
            <button
              type="button"
              class="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
              @click="isStatementModalOpen = true"
            >
              <ArrowDownTrayIcon class="size-5" aria-hidden="true" />
              Download statement
            </button>
          </div>
        <template v-if="isLoading">
          <div class="grid grid-cols-1 gap-4 rounded-t-lg bg-white border border-solid border-gray-100">
            <div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                <ListShimmer />
              </div>
            </div>
          </div>
        </template>
        <template v-else>
          <template v-if="transactions?.length > 0">
            <div class="flex-col">
              <div class="grid grid-cols-1 gap-4 rounded-t-lg bg-white border border-solid border-gray-100">
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
              <div class="-mb-4">
                <Pagination
                    v-bind:pagination="data.pagination"
                    v-on:pageClicked="getTransactions"
                />
              </div>
            </div>
          </template>
          <template v-else>
            <div class="relative flex flex-col items-center justify-center w-full h-full rounded-lg border border-gray-300 p-12 text-center bg-white shadow-lg">
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
        </div>
        <div>
          <div class="rounded-lg bg-white shadow-lg p-5 pb-8">
            <Calculator />
          </div>
        </div>
      </div>
    </main>
    <StatementRequestModal :open="isStatementModalOpen" @close="isStatementModalOpen = false" />
  </CustomerLayout>
</template>