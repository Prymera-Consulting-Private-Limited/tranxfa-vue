<script setup>
import CustomerLayout from "@/components/CustomerLayout.vue";
import Calculator from "@/components/Calculator.vue";
import {computed, onMounted, ref} from "vue";
import {useTransactionUtils} from "@/composables/transaction_utils.js";
import Transaction from "@/models/transaction.js";
import {useTimeUtils} from "@/composables/time_utils.js";
import {useColorUtils} from "@/composables/color_utils.js";
import TransactionStateIcon from "@/enums/transaction_state_icon.js";
import TransactionState from "@/enums/transaction_state.js";
import moment from "moment";
import {BanknotesIcon} from "@heroicons/vue/24/outline";

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
        <h1 class="sr-only">Transactions</h1>
        <div v-if="transactions?.length > 0" class="grid grid-cols-1 gap-4 lg:col-span-2 rounded-t-lg bg-white border border-solid border-gray-100">
          <div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              <ul role="list" class="divide-y divide-gray-100">
                <template v-for="(transaction, i) in transactions" :key="transaction.data.id">
                  <router-link :class="{'rounded-t-lg': i === 0}" as="li" :to="{name: 'viewTransaction', params: {transactionId: transaction.data.id}}" class="flex justify-between gap-x-6 py-5 px-6 sm:px-8 cursor-pointer hover:bg-gray-50">
                    <div :class="{'opacity-75': transaction.data.state.code === TransactionState.CANCELLED}" class="flex min-w-0 gap-x-4">
                    <span class="inline-flex size-11 items-center justify-center border border-1 rounded-full" :style="{
                       backgroundColor: colorUtils.getStyleValue(transaction.data.state.colorScheme, 50),
                       borderColor: colorUtils.getStyleValue(transaction.data.state.colorScheme, 600),
                     }">
                        <component :style="{
                         color: colorUtils.getStyleValue(transaction.data.state.colorScheme, 600),
                       }" :is="TransactionStateIcon[transaction.data.state.code]" class="size-6" />
                    </span>
                      <div class="min-w-0 flex-auto">
                        <div class="text-sm/6 font-semibold text-gray-900">{{ transaction.data.localAmountCurrencyPrefixed }} to <span class="text-purple-700">{{ transaction.data.recipient.fullName }}</span></div>
                        <div class="text-xs/5 text-gray-800 flex justify-center items-center gap-x-1.5">
                          Sent {{ transaction.data.foreignAmountCurrencyPrefixed }} via {{ transaction.data.payoutMethod.title }}
                          <span class="flex justify-center items-center text-xs/5 text-gray-500">
                          <abbr :title="moment(transaction.data.createdAt)">{{ transaction.niceTime }}</abbr>
                        </span>
                        </div>
                      </div>
                    </div>
                    <div class="hidden shrink-0 sm:flex sm:flex-col sm:items-end">
                      <div class="mt-1 flex items-center gap-x-1.5">
                        <p :style="{
                         color: colorUtils.getStyleValue(transaction.data.state.colorScheme, 600),
                       }" class="text-xs/5">
                        <span :style="{
                         backgroundColor: colorUtils.getStyleValue(transaction.data.state.colorScheme, 50),
                         '--tw-ring-color': colorUtils.getStyleValue(transaction.data.state.colorScheme, 200),
                       }" class="inline-flex items-center gap-x-1.5 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset">
                          <svg :style="{
                             fill: colorUtils.getStyleValue(transaction.data.state.colorScheme, 600),
                           }" class="size-1.5" viewBox="0 0 6 6" aria-hidden="true">
                            <circle cx="3" cy="3" r="3" />
                          </svg>
                          {{ transaction.data.state.label }}
                        </span>
                        </p>
                      </div>
                    </div>
                  </router-link>
                </template>
              </ul>
            </div>
          </div>
        </div>
        <template v-else>
          <div class="relative flex flex-col items-center justify-center w-full h-full rounded-lg border border-gray-300 p-12 text-center bg-white col-span-2 shadow-lg">
            <div class="animate-pulse">
              <BanknotesIcon class="mx-auto size-12 text-gray-400" aria-hidden="true" />
              <span class="mt-4 block text-lg font-semibold text-gray-900">No Transactions Yet</span>
              <p class="mt-2 text-sm text-gray-600 max-w-sm">
                Ready to send money? Your first transfer is just a few clicks away! Start now and experience fast, secure, and hassle-free transactions.
              </p>
            </div>
          </div>

        </template>
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