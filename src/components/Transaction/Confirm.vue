<script setup>
import {useI18n} from "vue-i18n";

const {t} = useI18n();

import TransactionQuote from "@/models/transaction_quote.js";
import {
  PaperAirplaneIcon,
    FlagIcon,
    TruckIcon,
    BanknotesIcon,
    CalculatorIcon,
    PlusIcon,
    WalletIcon,
    UserCircleIcon,
    BuildingLibraryIcon,
    DocumentCurrencyDollarIcon,
    InformationCircleIcon,
    PercentBadgeIcon
} from "@heroicons/vue/24/outline";
import RecipientDataType from "@/enums/recipient_data_type.js";
import {computed} from "vue";

const props = defineProps({
  quote: {
    type: TransactionQuote,
    required: true,
  }
})

// A computed, not an array built once at setup. The wizard replaces the quote
// under this component whenever a coupon is applied or removed, and a plain
// array kept showing the old rate and payout beside a box that said the new
// ones - on the last screen before the customer pays (SD-1213).
const reviewItems = computed(() => {
  const quote = props.quote;
  const items = [
    {
      icon: UserCircleIcon,
      label: t('recipient.recipient'),
      value: quote.recipient.wholeName,
    },
    {
      icon: FlagIcon,
      label: t('account.payoutCountry'),
      value: quote.payoutCountry.commonName,
    },
    {
      icon: TruckIcon,
      label: t('recipient.payoutMethod'),
      value: quote.payoutMethod.title,
    }
  ];
  if (quote.payoutMethod.instructions) {
    items.push({
      icon: InformationCircleIcon,
      label: null,
      value: quote.payoutMethod.instructions
    });
  }
  for (let i = 0; i < quote.recipient.accountDetailHashMap.length; i++) {
    const accountDetailHashmap = quote.recipient.accountDetailHashMap[i];
    if (accountDetailHashmap.type === RecipientDataType.ACCOUNT_HOLDER_NAME) {
      items.push({
        icon: UserCircleIcon,
        label: accountDetailHashmap.key,
        value: accountDetailHashmap.value,
      });
    } else if (accountDetailHashmap.type === RecipientDataType.DELIVERY_OPTION) {
      items.push({
        icon: BuildingLibraryIcon,
        label: accountDetailHashmap.key,
        value: accountDetailHashmap.value,
      });
    } else if (accountDetailHashmap.type === RecipientDataType.ACCOUNT_NUMBER) {
      items.push({
        icon: DocumentCurrencyDollarIcon,
        label: accountDetailHashmap.key,
        value: accountDetailHashmap.value,
      });
    }
  }
  items.push({
    icon: PaperAirplaneIcon,
    label: t('account.sendingAmount'),
    value: quote.localAmountCurrencyPrefixed,
  });
  items.push({
    icon: BanknotesIcon,
    label: t('account.exchangeRate'),
    value: quote.exchangeRateFormatted,
  });
  if (quote.coupon?.isBetterRate && quote.coupon.exchangeRateBeforeCouponFormatted) {
    items.push({
      icon: PercentBadgeIcon,
      // Same key as QuoteDisplay: one sentence, one key. The duplicate under
      // account went with SD-1212.
      label: t('calculator.rateBeforeCouponCode', {code: quote.coupon.code}),
      value: quote.coupon.exchangeRateBeforeCouponFormatted,
    });
  }
  items.push({
    icon: WalletIcon,
    label: t('account.recipientGets2'),
    value: quote.foreignAmountCurrencyPrefixed,
  });
  if (quote.payoutMethod.promo) {
    items.push({
      icon: PercentBadgeIcon,
      label: null,
      value: quote.payoutMethod.promo,
      color: 'bg-success-50 border-success-400 ',
      textColor: 'text-success-700',
    });
  }
  items.push({
    icon: PlusIcon,
    label: t('calculator.fees'),
    value: quote.baseFeesCurrencyPrefixed,
  });
  if (quote.coupon?.isMonetary && quote.coupon.discountAmountCurrencyPrefixed) {
    items.push({
      icon: PercentBadgeIcon,
      // Read from the catalogue like the row on QuoteDisplay. As a template
      // literal this stayed English in every locale and no guard could see
      // it (SD-1212).
      label: t('calculator.couponCode', {code: quote.coupon.code}),
      value: `- ${quote.coupon.discountAmountCurrencyPrefixed}`,
    });
  }
  items.push({
    icon: CalculatorIcon,
    label: t('account.subtotal'),
    value: quote.subTotalAmountCurrencyPrefixed,
  });
  items.push({
    icon: WalletIcon,
    label: t('account.totalDue'),
    value: quote.totalAmountCurrencyPrefixed,
  });

  return items;
});
</script>

<template>
  <section class="">
    <div class="text-sm/6">
      <template v-for="reviewItem in reviewItems">
        <div :class="reviewItem.label ? '' : [
            'rounded-md my-2 border',
            reviewItem.color ? reviewItem.color : 'bg-blue-50 border-blue-400 text-blue-700'
          ]" class="py-2 px-0 sm:px-5 flex space-x-6 flex-col sm:flex-row">
          <dt v-if="reviewItem.label" class="font-medium text-gray-900 sm:w-64 sm:flex-none">
            <div class="flex justify-start items-center gap-4 text-sm/6">
              <component :is="reviewItem.icon" class="h-4.5 w-4.5 text-gray-600" />
              {{ reviewItem.label }}
            </div>
          </dt>
          <dt v-else class="font-medium text-gray-900 sm:flex-none py-2">
            <div class="flex justify-start items-center gap-4">
              <component :is="reviewItem.icon" :class="reviewItem.textColor ? reviewItem.textColor : 'text-blue-700'" class="h-4.5 w-4.5  mt-1" />
            </div>
          </dt>
          <dd :class="[reviewItem.label ? 'text-gray-900 ml-8.5 sm:ml-0' : 'text-blue-700 py-2 ml-6.5 sm:-ml-2']" class="">
            <div :class="[reviewItem.label ? 'text-gray-900' : reviewItem.textColor ? reviewItem.textColor : 'text-blue-700']" class=" font-normal text-sm/6">{{ reviewItem.value }}</div>
          </dd>
        </div>
      </template>
    </div>
  </section>
</template>