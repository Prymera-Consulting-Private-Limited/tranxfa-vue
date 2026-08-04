<script setup>
import TransactionQuote from "@/models/transaction_quote.js";
import {
  PaperAirplaneIcon,
    FlagIcon,
    TruckIcon,
    BanknotesIcon,
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

/**
 * Computed, not built once: the server reprices the quote — and can drop the
 * coupon entirely — while this component stays mounted, so every row has to be
 * re-read from the current quote.
 */
const reviewItems = computed(() => {
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
    // With a better-rate coupon this row carries the pre-coupon rate so it reads
    // as the "was" against the Promo Rate below. Falls back to the current rate
    // until the formatted field is live in the environment being tested.
    value: props.quote.coupon?.exchangeRateBeforeCouponFormatted || props.quote.exchangeRateFormatted,
  });
  if (props.quote.coupon?.exchangeRateBeforeCoupon) {
    // Better-rate coupon: the improved rate and the amount it buys the
    // recipient, grouped into one highlighted block. `rows` renders as labelled
    // rows inside the block rather than as a single banner sentence.
    reviewItems.push({
      color: 'bg-emerald-50 border-emerald-400 ',
      textColor: 'text-emerald-700',
      rows: [
        {
          icon: PercentBadgeIcon,
          label: 'Promo Rate',
          value: props.quote.exchangeRateFormatted,
        },
        {
          icon: WalletIcon,
          label: 'Recipient Gets',
          value: props.quote.foreignAmountCurrencyPrefixed,
          bold: true,
        },
      ],
    });
  } else {
    reviewItems.push({
      icon: WalletIcon,
      label: 'Recipient Gets',
      value: props.quote.foreignAmountCurrencyPrefixed,
    });
  }
  if (props.quote.payoutMethod.promo) {
    reviewItems.push({
      icon: PercentBadgeIcon,
      label: null,
      value: props.quote.payoutMethod.promo,
      color: 'bg-lime-50 border-lime-400 ',
      textColor: 'text-lime-700',
    });
  }
  // Fees, Subtotal, the promo discount line and Total Due live in CostSummary
  // in the right column, alongside the coupon entry and Continue.

  return reviewItems;
});
</script>

<template>
  <section class="">
    <div class="text-sm/6">
      <template v-for="reviewItem in reviewItems">
        <!-- Grouped highlight block: labelled rows laid out like the plain rows
             above, but inside the promo colour. -->
        <div v-if="reviewItem.rows" :class="[
            'rounded-md my-2 border',
            reviewItem.color ? reviewItem.color : 'bg-blue-50 border-blue-400'
          ]" class="animate-promo-in py-1 px-0 sm:px-5">
          <div v-for="row in reviewItem.rows" class="py-2 flex space-x-6 flex-col sm:flex-row">
            <dt :class="[reviewItem.textColor, row.bold ? 'font-semibold' : 'font-medium']" class="sm:w-64 sm:flex-none">
              <div class="flex justify-start items-center gap-4 text-sm/7">
                <component :is="row.icon" :class="reviewItem.textColor" class="h-4.5 w-4.5" />
                {{ row.label }}
              </div>
            </dt>
            <dd :class="reviewItem.textColor" class="ml-8.5 sm:ml-0">
              <div :class="[reviewItem.textColor, row.bold ? 'font-semibold' : 'font-normal']" class="text-sm/6">{{ row.value }}</div>
            </dd>
          </div>
        </div>
        <div v-else :class="reviewItem.label ? '' : [
            'rounded-md my-2 border',
            reviewItem.color ? reviewItem.color : 'bg-blue-50 border-blue-400 text-blue-700'
          ]" class="py-2 px-0 sm:px-5 flex space-x-6 flex-col sm:flex-row">
          <dt v-if="reviewItem.label" class="font-medium text-gray-900 sm:w-64 sm:flex-none">
            <div class="flex justify-start items-center gap-4 text-sm/7">
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