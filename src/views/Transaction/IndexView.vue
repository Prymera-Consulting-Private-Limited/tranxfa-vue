<script setup>
import CustomerLayout from "@/components/CustomerLayout.vue";
import Calculator from "@/components/Calculator.vue";
import { computed, onMounted, ref } from "vue";
import { useTransactionUtils } from "@/composables/transaction_utils.js";
import Transaction from "@/models/transaction.js";
import { useTimeUtils } from "@/composables/time_utils.js";
import { BanknotesIcon } from "@heroicons/vue/24/outline";
import ListItem from "@/components/Transaction/ListItem.vue";
import ListShimmer from "@/components/Transaction/ListShimmer.vue";
import Pagination from "@/components/Pagination.vue";
import { DotLottieVue } from "@lottiefiles/dotlottie-vue";

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
    <main class="">
      <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:max-w-full lg:px-8 grid xl:grid-cols-3 gap-8">
        <div
          class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_85%_50%_at_50%_-20%,rgba(20,184,166,0.12),transparent)]"
          aria-hidden="true" />
        <div class="pointer-events-none absolute -bottom-20 right-0 h-56 w-56 rounded-full bg-brand-400/[0.1] blur-3xl"
          aria-hidden="true" />
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
          <template v-if="transactions?.length > 0">
            <div class="lg:col-span-2 flex-col">
              <div class="grid grid-cols-1 gap-4 rounded-t-lg bg-white border border-solid border-gray-100">
                <div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                  <div class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                    <ul role="list" class="divide-y divide-gray-100">
                      <template v-for="(transaction, i) in transactions" :key="transaction.data.id">
                        <router-link :class="{ 'rounded-t-lg': i === 0 }" as="li"
                          :to="{ name: 'viewTransaction', params: { transactionId: transaction.data.id } }"
                          class="flex justify-between gap-x-6 py-5 px-6 sm:px-8 cursor-pointer hover:bg-gray-50">
                          <ListItem v-bind:niceTime="transaction.niceTime" v-bind:transaction="transaction.data" />
                        </router-link>
                      </template>
                    </ul>
                  </div>
                </div>
              </div>
              <div class="-mb-4">
                <Pagination v-bind:pagination="data.pagination" v-on:pageClicked="getTransactions" />
              </div>
            </div>
          </template>
          <template v-else>
            <div
              class="relative flex flex-col items-center justify-center w-full h-full rounded-3xl border border-gray-300 p-12 text-center bg-white lg:col-span-2 shadow-lg">
              <div
                class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_85%_50%_at_50%_-20%,rgba(20,184,166,0.12),transparent)]"
                aria-hidden="true" />
              <div
                class="pointer-events-none absolute -bottom-20 right-0 h-56 w-56 rounded-full bg-brand-400/[0.1] blur-3xl"
                aria-hidden="true" />
              <div>
                <div class="mb-3 flex w-full shrink-0 justify-center" role="img"
                  aria-label="Animation illustrating money transfer">
                  <DotLottieVue
                    class="mx-auto h-28 w-full max-w-[min(100%,22rem)] object-contain md:h-[17rem] md:max-w-[36rem]"
                    autoplay loop src="/animation/money.json" />
                </div>
                <span class="mt-4 block text-lg font-semibold text-gray-900">No Transactions Yet</span>
                <p class="mt-2 text-sm text-gray-600 text-center max-w-sm mx-auto">
                  Ready to send money? Your first transfer is just a few clicks away! Start now and experience fast,
                  secure, and hassle-free transactions.
                </p>
              </div>
            </div>
          </template>
        </template>
        <div>
          <div class="rounded-3xl bg-white shadow-lg p-5 pb-8">
            <Calculator />
          </div>
        </div>
      </div>
    </main>
  </CustomerLayout>
</template>