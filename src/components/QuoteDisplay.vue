<script setup>
import {useI18n} from "vue-i18n";

const {t} = useI18n();

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
    label: t('travel.destination'),
    value: props.quote.payoutCountry.commonName
  });
  items.push({
    label: t('recipient.payoutMethod'),
    value: props.quote.payoutMethod.title
  });
  if (props.quote.payoutMethod.instructions) {
    items.push({
      label: null,
      value: props.quote.payoutMethod.instructions
    });
  }
  items.push({
    label: t('wallet.amount'),
    value: props.quote.localAmountCurrencyPrefixed
  });
  items.push({
    label: t('calculator.ourRate'),
    value: props.quote.exchangeRateFormatted
  });
  if (props.quote.coupon?.isBetterRate && props.quote.coupon.exchangeRateBeforeCouponFormatted) {
    items.push({
      label: t('calculator.rateBeforeCouponCode', {code: props.quote.coupon.code}),
      value: props.quote.coupon.exchangeRateBeforeCouponFormatted
    });
  }
  items.push({
    label: ( props.quote.recipient?.wholeName || t('recipient.recipient') ) + ' Gets',
    value: props.quote.foreignAmountCurrencyPrefixed
  });
  items.push({
    label: t('account.ourFees'),
    value: props.quote.baseFeesCurrencyPrefixed
  });
  if (props.quote.coupon?.isMonetary && props.quote.coupon.discountAmountCurrencyPrefixed) {
    items.push({
      label: `Coupon ${props.quote.coupon.code}`,
      value: `- ${props.quote.coupon.discountAmountCurrencyPrefixed}`
    });
  }
  items.push({
    label: t('account.subtotal'),
    value: props.quote.subTotalAmountCurrencyPrefixed
  });
  items.push({
    label: t('account.totalDue'),
    value: props.quote.totalAmountCurrencyPrefixed
  });

  return items;
});
</script>

<template>
  <ul class="rounded-lg bg-white border border-gray-300">
    <li v-for="(item, index) in items" :class="{'bg-gray-50': index % 2 === 0}" class="px-4 py-4 sm:px-6 flex justify-between items-center gap-4 border-b border-dashed border-gray-300">
      <div v-if="item.label" class="text-gray-700 font-semibold text-sm/6">{{ item.label }}</div>
      <p class="text-gray-700 text-sm/6">{{ item.value }}</p>
    </li>
  </ul>
</template>