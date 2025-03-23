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
        <h1 class="sr-only">Recipients</h1>
        <div class="grid grid-cols-1 gap-4 lg:col-span-2 rounded-t-lg bg-white border border-solid border-gray-100">
          <div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              <ul role="list" class="divide-y divide-gray-100">
                <li v-for="transaction in transactions" :key="transaction.data.id" class="flex justify-between gap-x-6 py-5 px-6 sm:px-8">
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
                      <p class="text-sm/6 font-semibold text-gray-900">{{ transaction.data.localAmountCurrencyPrefixed }} to <span class="text-purple-700">{{ transaction.data.recipient.fullName }}</span></p>
                      <p class="truncate text-xs/5 text-gray-500">Sent {{ transaction.data.foreignAmountCurrencyPrefixed }} via {{ transaction.data.payoutMethod.title }}</p>
                    </div>
                  </div>
                  <div class="hidden shrink-0 sm:flex sm:flex-col sm:items-end">
                    <div class="mt-1 flex items-center gap-x-1.5">
                      <p class="text-xs/5 text-gray-500">{{ transaction.niceTime }}</p>
                    </div>
                  </div>
                </li>
              </ul>
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