<script setup>
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
    InformationCircleIcon
} from "@heroicons/vue/24/outline";
import RecipientDataType from "@/enums/recipient_data_type.js";

const props = defineProps({
  quote: {
    type: TransactionQuote,
    required: true,
  }
})

const reviewItems = [
  {
    icon: UserCircleIcon,
    label: 'Recipient',
    value: props.quote.recipient.wholeName,
  },
  {
    icon: FlagIcon,
    label: 'Payout Country',
    value: props.quote.payoutCountry.commonName,
  },
  {
    icon: TruckIcon,
    label: 'Payout Method',
    value: props.quote.payoutMethod.title,
  }
];
if (props.quote.payoutMethod.instructions) {
  reviewItems.push({
    icon: InformationCircleIcon,
    label: null,
    value: props.quote.payoutMethod.instructions
  });
}
for (let i = 0; i < props.quote.recipient.accountDetailHashMap.length; i++) {
  const accountDetailHashmap = props.quote.recipient.accountDetailHashMap[i];
  if (accountDetailHashmap.type === RecipientDataType.ACCOUNT_HOLDER_NAME) {
    reviewItems.push({
      icon: UserCircleIcon,
      label: accountDetailHashmap.key,
      value: accountDetailHashmap.value,
    });
  } else if (accountDetailHashmap.type === RecipientDataType.DELIVERY_OPTION) {
    reviewItems.push({
      icon: BuildingLibraryIcon,
      label: accountDetailHashmap.key,
      value: accountDetailHashmap.value,
    });
  } else if (accountDetailHashmap.type === RecipientDataType.ACCOUNT_NUMBER) {
    reviewItems.push({
      icon: DocumentCurrencyDollarIcon,
      label: accountDetailHashmap.key,
      value: accountDetailHashmap.value,
    });
  }
}
reviewItems.push({
  icon: PaperAirplaneIcon,
  label: 'Sending Amount',
  value: props.quote.localAmountCurrencyPrefixed,
});
reviewItems.push({
  icon: BanknotesIcon,
  label: 'Exchange Rate',
  value: props.quote.exchangeRateFormatted,
});
reviewItems.push({
  icon: WalletIcon,
  label: 'Recipient Gets',
  value: props.quote.foreignAmountCurrencyPrefixed,
});
reviewItems.push({
  icon: PlusIcon,
  label: 'Fees',
  value: props.quote.baseFeesCurrencyPrefixed,
});
reviewItems.push({
  icon: CalculatorIcon,
  label: 'Subtotal',
  value: props.quote.subTotalAmountCurrencyPrefixed,
});
reviewItems.push({
  icon: WalletIcon,
  label: 'Total Due',
  value: props.quote.totalAmountCurrencyPrefixed,
});
</script>

<template>
  <section class="">
    <div class="text-sm/6">
      <template v-for="reviewItem in reviewItems">
        <div :class="[reviewItem.label ? '' : 'bg-blue-50 border border-blue-400 rounded-md text-blue-700 my-2']" class="py-2 px-0 sm:px-5 flex space-x-6 flex-col sm:flex-row">
          <dt v-if="reviewItem.label" class="font-medium text-gray-900 sm:w-64 sm:flex-none">
            <div class="flex justify-start items-center gap-4 text-sm/7">
              <component :is="reviewItem.icon" class="h-4.5 w-4.5 text-gray-600" />
              {{ reviewItem.label }}
            </div>
          </dt>
          <dt v-else class="font-medium text-gray-900 sm:flex-none py-2">
            <div class="flex justify-start items-center gap-4">
              <component :is="reviewItem.icon" class="h-4.5 w-4.5 text-blue-700 mt-1" />
            </div>
          </dt>
          <dd :class="[reviewItem.label ? 'text-gray-900 ml-8.5 sm:ml-0' : 'text-blue-700 py-2 ml-6.5 sm:-ml-2']" class="">
            <div :class="[reviewItem.label ? 'text-gray-900' : 'text-blue-700']" class=" font-normal text-sm/6">{{ reviewItem.value }}</div>
          </dd>
        </div>
      </template>
    </div>
  </section>
</template>