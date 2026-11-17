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
  <div :class="{'opacity-75': transaction.state.code === TransactionState.CANCELLED}" class="flex min-w-0 flex-1 gap-x-4 px-4 md:px-0">
    <span class="size-9 shrink-0 items-center justify-center border border-1 rounded-full inline-flex md:size-11" :style="{
       backgroundColor: colorUtils.getStyleValue(transaction.state.colorScheme, 50),
       borderColor: colorUtils.getStyleValue(transaction.state.colorScheme, 600),
     }">
        <component :style="{
         color: colorUtils.getStyleValue(transaction.state.colorScheme, 700),
       }" :is="TransactionStateIcon[transaction.state.code]" class="size-5 md:size-6" />
    </span>
    <div class="min-w-0 flex-auto">
      <i18n-t keypath="account.amountToRecipient" tag="div" class="text-sm/6 font-semibold text-gray-900 break-words" scope="global">
        <template #amount>{{ transaction.localAmountCurrencyPrefixed }}</template>
        <template #recipient><span class="text-brand-700">{{ transaction.recipient.wholeName }}</span></template>
      </i18n-t>
      <div class="text-xs/5 text-gray-800 flex flex-wrap items-center gap-x-1.5">{{ $t('account.sentAmountViaMethod', {foreignAmountCurrencyPrefixed: transaction.foreignAmountCurrencyPrefixed, title: transaction.payoutMethod.title}) }}<span class="flex justify-center items-center text-xs/5 text-gray-500">
          <abbr :title="moment(transaction.createdAt).format('LLL')">{{ niceTime }}</abbr>
        </span>
      </div>
    </div>
  </div>
  <!-- The state is the one thing a customer scans a transfer list for. It
       used to be hidden below the sm breakpoint, together with the icon, so
       on a phone Pending, Failed and Cancelled were indistinguishable. -->
  <div class="flex shrink-0 flex-col items-start sm:items-end">
    <div class="mt-1 flex items-center gap-x-1.5">
      <p :style="{
         color: colorUtils.getStyleValue(transaction.state.colorScheme, 700),
       }" class="text-xs/5">
        <span :style="{
             backgroundColor: colorUtils.getStyleValue(transaction.state.colorScheme, 50),
             '--tw-ring-color': colorUtils.getStyleValue(transaction.state.colorScheme, 200),
           }" class="inline-flex items-center gap-x-1.5 rounded-md px-2 py-1 text-xs/5 font-medium ring-1 ring-inset">
          <svg :style="{
             fill: colorUtils.getStyleValue(transaction.state.colorScheme, 700),
           }" class="size-1.5" viewBox="0 0 6 6" aria-hidden="true">
            <circle cx="3" cy="3" r="3" />
          </svg>
          {{ transaction.state.label }}
        </span>
      </p>
    </div>
  </div>
</template>