<script setup>
import TransactionQuote from "@/models/transaction_quote.js";
import {computed} from "vue";

const props = defineProps({
  quote: {
    type: Object(TransactionQuote),
    required: true
  }
})

const items = computed(() => {
  const items = [];
  items.push({
    label: 'Destination',
    value: props.quote.payoutCountry.commonName
  });
  items.push({
    label: 'Payout Method',
    value: props.quote.payoutMethod.title
  });
  if (props.quote.payoutMethod.instructions) {
    items.push({
      label: null,
      value: props.quote.payoutMethod.instructions
    });
  }
  items.push({
    label: 'Amount',
    value: props.quote.localAmountCurrencyPrefixed
  });
  items.push({
    label: 'Our Rate',
    value: props.quote.exchangeRateFormatted
  });
  items.push({
    label: ( props.quote.recipient?.wholeName || 'Recipient' ) + ' Gets',
    value: props.quote.foreignAmountCurrencyPrefixed
  });
  items.push({
    label: 'Our Fees',
    value: props.quote.baseFeesCurrencyPrefixed
  });
  items.push({
    label: 'Subtotal',
    value: props.quote.subTotalAmountCurrencyPrefixed
  });
  items.push({
    label: 'Total Due',
    value: props.quote.totalAmountCurrencyPrefixed
  });

  return items;
});
</script>

<template>
  <ul class="rounded-lg bg-white border border-gray-300">
    <li v-for="(item, index) in items" :class="{'bg-gray-50': index % 2 === 0}" class="px-4 py-4 sm:px-6 flex justify-between items-center gap-4 border-b border-dashed border-gray-300">
      <div v-if="item.label" class="text-gray-700 font-semibold text-sm">{{ item.label }}</div>
      <p class="text-gray-700 text-sm/6">{{ item.value }}</p>
    </li>
  </ul>
</template>