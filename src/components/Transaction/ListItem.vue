<script setup>
import TransactionState from "@/enums/transaction_state.js";
import TransactionStateIcon from "@/enums/transaction_state_icon.js";
import moment from "moment";
import Transaction from "@/models/transaction.js";
import {useColorUtils} from "@/composables/color_utils.js";

const colorUtils = useColorUtils();
const props = defineProps({
  transaction: {
    type: Object(Transaction),
    required: true
  },
  niceTime: {
    type: String,
    required: true
  }
});
</script>

<template>
  <div :class="{'opacity-75': transaction.state.code === TransactionState.CANCELLED}" class="flex min-w-0 gap-x-4">
    <span class="inline-flex size-11 items-center justify-center border border-1 rounded-full" :style="{
       backgroundColor: colorUtils.getStyleValue(transaction.state.colorScheme, 50),
       borderColor: colorUtils.getStyleValue(transaction.state.colorScheme, 600),
     }">
        <component :style="{
         color: colorUtils.getStyleValue(transaction.state.colorScheme, 600),
       }" :is="TransactionStateIcon[transaction.state.code]" class="size-6" />
    </span>
    <div class="min-w-0 flex-auto">
      <div class="text-sm/6 font-semibold text-gray-900">{{ transaction.localAmountCurrencyPrefixed }} to <span class="text-purple-700">{{ transaction.recipient.wholeName }}</span></div>
      <div class="text-xs/5 text-gray-800 flex justify-center items-center gap-x-1.5">
        Sent {{ transaction.foreignAmountCurrencyPrefixed }} via {{ transaction.payoutMethod.title }}
        <span class="flex justify-center items-center text-xs/5 text-gray-500">
          <abbr :title="moment(transaction.createdAt)">{{ niceTime }}</abbr>
        </span>
      </div>
    </div>
  </div>
  <div class="hidden shrink-0 sm:flex sm:flex-col sm:items-end">
    <div class="mt-1 flex items-center gap-x-1.5">
      <p :style="{
         color: colorUtils.getStyleValue(transaction.state.colorScheme, 600),
       }" class="text-xs/5">
        <span :style="{
             backgroundColor: colorUtils.getStyleValue(transaction.state.colorScheme, 50),
             '--tw-ring-color': colorUtils.getStyleValue(transaction.state.colorScheme, 200),
           }" class="inline-flex items-center gap-x-1.5 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset">
          <svg :style="{
             fill: colorUtils.getStyleValue(transaction.state.colorScheme, 600),
           }" class="size-1.5" viewBox="0 0 6 6" aria-hidden="true">
            <circle cx="3" cy="3" r="3" />
          </svg>
          {{ transaction.state.label }}
        </span>
      </p>
    </div>
  </div>
</template>