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
    label: 'Fees',
    value: props.quote.baseFeesCurrencyPrefixed
  });
  items.push({
    label: 'Subtotal',
    value: props.quote.subTotalAmountCurrencyPrefixed
  });
  if (props.quote.coupon?.discountAmountCurrencyPrefixed) {
    items.push({
      label: 'Promo Code',
      value: `${props.quote.coupon.code}`
    });
    items.push({
      label: 'Promo Discount',
      value: `${props.quote.coupon.discountAmountCurrencyPrefixed}`,
      valueClass: 'font-semibold text-emerald-700'
    });
  }
  items.push({
    label: 'Total Due',
    value: props.quote.totalAmountCurrencyPrefixed,
    valueClass: 'font-semibold text-gray-900'
  });

  return items;
});
</script>

<template>
  <!-- overflow-hidden so the striped rows are clipped to the rounded corners,
       and no separator on the last row so it does not double up with the
       container's own bottom border. -->
  <ul class="rounded-lg bg-white border border-gray-300 overflow-hidden">
    <li
        v-for="(item, index) in items"
        :class="[
          {'bg-gray-50': index % 2 === 0},
          index < items.length - 1 ? 'border-b border-dashed border-gray-300' : ''
        ]"
        class="px-4 py-3 sm:px-6 flex justify-between items-center gap-4"
    >
      <div class="text-gray-700 font-semibold text-sm break-words">{{ item.label }}</div>
      <p :class="item.valueClass || 'text-gray-700'" class="text-sm/6 text-right break-words">{{ item.value }}</p>
    </li>
  </ul>
</template>
