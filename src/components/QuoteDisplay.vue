<script setup>
import TransactionQuote from "@/models/transaction_quote.js";

const props = defineProps({
  quote: {
    type: Object(TransactionQuote),
    required: true
  }
})
</script>

<template>
  <ul class="rounded-lg bg-white border border-dashed border-gray-300">
    <li class="px-4 py-4 sm:px-6 flex justify-between items-center gap-4 border-b border-dashed border-gray-300">
      <div class="text-gray-700 font-semibold text-sm">Destination</div>
      <p class="text-gray-700 text-sm">{{ quote.payoutCountry.commonName }}</p>
    </li>
    <li class="px-4 py-4 sm:px-6 flex justify-between items-center gap-4 border-b border-dashed border-gray-300 bg-gray-50">
      <div class="text-gray-700 font-semibold text-sm">Payout Method</div>
      <p class="text-gray-700 text-sm">{{ quote.payoutMethod.title }}</p>
    </li>
    <li class="px-4 py-4 sm:px-6 flex justify-between items-center gap-4 border-b border-dashed border-gray-300">
      <div class="text-gray-700 font-semibold text-sm">Amount</div>
      <p class="text-gray-700 text-sm">{{ quote.localAmountCurrencyPrefixed }}</p>
    </li>
    <li class="px-4 py-4 sm:px-6 flex justify-between items-center gap-4 border-b border-dashed border-gray-300 bg-gray-50">
      <div class="text-gray-700 font-semibold text-sm">Our Rate</div>
      <p class="text-gray-700 text-sm">{{ quote.exchangeRateFormatted }}</p>
    </li>
    <li class="px-4 py-4 sm:px-6 flex justify-between items-center gap-4 border-b border-dashed border-gray-300">
      <div class="text-gray-700 font-semibold text-sm">{{ quote.recipient?.fullName || 'Recipient' }} Gets</div>
      <p class="text-gray-700 text-sm">{{ quote.foreignAmountCurrencyPrefixed }}</p>
    </li>
    <li class="px-4 py-4 sm:px-6 flex justify-between items-center gap-4 border-b border-dashed border-gray-300 bg-gray-50">
      <div class="text-gray-700 font-semibold text-sm">Our Fees</div>
      <p class="text-gray-700 text-sm">{{ quote.baseFeesCurrencyPrefixed }}</p>
    </li>
    <li class="px-4 py-4 sm:px-6 flex justify-between items-center gap-4 border-b border-dashed border-gray-300">
      <div class="text-gray-700 font-semibold text-sm">Subtotal</div>
      <p class="text-gray-700 text-sm">{{ quote.localAmountCurrencyPrefixed }}</p>
    </li>
    <li class="px-4 py-4 sm:px-6 flex justify-between items-center gap-4 bg-gray-50 rounded-b-lg">
      <div class="text-gray-700 font-semibold text-sm">Total Due</div>
      <p class="text-gray-700 text-sm">{{ quote.localAmountCurrencyPrefixed }}</p>
    </li>
  </ul>
</template>