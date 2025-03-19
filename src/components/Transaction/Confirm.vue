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
    DocumentCurrencyDollarIcon
} from "@heroicons/vue/24/outline";
import RecipientDataType from "@/enums/recipient_data_type.js";

defineProps({
  quote: {
    type: TransactionQuote,
    required: true,
  }
})
</script>

<template>
  <section class="">
    <div class="divide-y divide-dashed divide-gray-200 border-dashed border-gray-200 border-1 rounded-md text-sm/6">
      <div class="py-6 px-5 sm:flex">
        <dt class="font-medium text-gray-900 sm:w-64 sm:flex-none sm:pr-6">
          <div class="flex items-start gap-4">
            <UserCircleIcon class="h-6 w-6 text-gray-600" />
            Recipient
          </div>
        </dt>
        <dd class="mt-1 flex justify-between gap-x-6 sm:mt-0 sm:flex-auto">
          <div class="text-gray-900">{{ quote.recipient.fullName }}</div>
        </dd>
      </div>
      <div class="py-6 px-5 sm:flex">
        <dt class="font-medium text-gray-900 sm:w-64 sm:flex-none sm:pr-6">
          <div class="flex items-start gap-4">
            <FlagIcon class="h-6 w-6 text-gray-600" />
            Payout Country
          </div>
        </dt>
        <dd class="mt-1 flex justify-between gap-x-6 sm:mt-0 sm:flex-auto">
          <div class="text-gray-900">{{ quote.payoutCountry.commonName }}</div>
        </dd>
      </div>
      <div class="py-6 px-5 sm:flex">
        <dt class="font-medium text-gray-900 sm:w-64 sm:flex-none sm:pr-6">
          <div class="flex items-start gap-4">
            <TruckIcon class="h-6 w-6 text-gray-600" />
            Payout Method
          </div>
        </dt>
        <dd class="mt-1 flex justify-between gap-x-6 sm:mt-0 sm:flex-auto">
          <div class="text-gray-900">{{ quote.payoutMethod.title }}</div>
        </dd>
      </div>
      <div v-for="accountDetailHashmap in quote.recipient.accountDetailHashMap" class="py-6 px-5 sm:flex">
        <dt class="font-medium text-gray-900 sm:w-64 sm:flex-none sm:pr-6">
          <div class="flex items-start gap-4">
            <UserCircleIcon v-if="accountDetailHashmap.type === RecipientDataType.ACCOUNT_HOLDER_NAME" class="h-6 w-6 text-gray-600" />
            <BuildingLibraryIcon v-if="accountDetailHashmap.type === RecipientDataType.DELIVERY_OPTION" class="h-6 w-6 text-gray-600" />
            <DocumentCurrencyDollarIcon v-if="accountDetailHashmap.type === RecipientDataType.ACCOUNT_NUMBER" class="h-6 w-6 text-gray-600" />
            {{ accountDetailHashmap.key }}
          </div>
        </dt>
        <dd class="mt-1 flex justify-between gap-x-6 sm:mt-0 sm:flex-auto">
          <div class="text-gray-900">{{ accountDetailHashmap.value }}</div>
        </dd>
      </div>
      <div class="py-6 px-5 sm:flex">
        <dt class="font-medium text-gray-900 sm:w-64 sm:flex-none sm:pr-6">
          <div class="flex items-start gap-4">
            <PaperAirplaneIcon class="h-6 w-6 text-gray-600" />
            Sending Amount
          </div>
        </dt>
        <dd class="mt-1 flex justify-between gap-x-6 sm:mt-0 sm:flex-auto">
          <div class="text-gray-900">{{ quote.localAmountCurrencyPrefixed }}</div>
        </dd>
      </div>
      <div class="py-6 px-5 sm:flex">
        <dt class="font-medium text-gray-900 sm:w-64 sm:flex-none sm:pr-6">
          <div class="flex items-start gap-4">
            <BanknotesIcon class="h-6 w-6 text-gray-600" />
            Exchange Rate
          </div>
        </dt>
        <dd class="mt-1 flex justify-between gap-x-6 sm:mt-0 sm:flex-auto">
          <div class="text-gray-900">{{ quote.exchangeRateFormatted }}</div>
        </dd>
      </div>
      <div class="py-6 px-5 sm:flex">
        <dt class="font-medium text-gray-900 sm:w-64 sm:flex-none sm:pr-6">
          <div class="flex items-start gap-4">
            <BuildingLibraryIcon class="h-6 w-6 text-gray-600" />
            Payout Amount
          </div>
        </dt>
        <dd class="mt-1 flex justify-between gap-x-6 sm:mt-0 sm:flex-auto">
          <div class="text-gray-900">{{ quote.foreignAmountCurrencyPrefixed }}</div>
        </dd>
      </div>
      <div class="py-6 px-5 sm:flex">
        <dt class="font-medium text-gray-900 sm:w-64 sm:flex-none sm:pr-6">
          <div class="flex items-start gap-4">
            <PlusIcon class="h-6 w-6 text-gray-600" />
            Fees
          </div>
        </dt>
        <dd class="mt-1 flex justify-between gap-x-6 sm:mt-0 sm:flex-auto">
          <div class="text-gray-900">{{ quote.baseFeesFormatted }}</div>
        </dd>
      </div>
      <div class="py-6 px-5 sm:flex">
        <dt class="font-medium text-gray-900 sm:w-64 sm:flex-none sm:pr-6">
          <div class="flex items-start gap-4">
            <CalculatorIcon class="h-6 w-6 text-gray-600" />
            Sub Total
          </div>
        </dt>
        <dd class="mt-1 flex justify-between gap-x-6 sm:mt-0 sm:flex-auto">
          <div class="text-gray-900">{{ quote.localAmountCurrencyPrefixed }}</div>
        </dd>
      </div>
      <div class="py-6 px-5 sm:flex">
        <dt class="font-medium text-gray-900 sm:w-64 sm:flex-none sm:pr-6">
          <div class="flex items-start gap-4">
            <WalletIcon class="h-6 w-6 text-gray-600" />
            Total Due
          </div>
        </dt>
        <dd class="mt-1 flex justify-between gap-x-6 sm:mt-0 sm:flex-auto">
          <div class="text-gray-900">{{ quote.localAmountCurrencyPrefixed }}</div>
        </dd>
      </div>
    </div>
  </section>
</template>