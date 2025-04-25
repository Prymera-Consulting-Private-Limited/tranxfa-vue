<script setup>
import PayoutMethod from "@/models/payout_method.js";
import PayoutChannel from "@/models/payout_channel.js";
import Currency from "@/models/currency.js";
import Country from "@/models/country.js";
import RecipientType from "@/enums/recipient_type.js";
import { UserIcon, BuildingOfficeIcon } from '@heroicons/vue/24/outline'

defineProps({
  country: {
    type: Country,
    required: true,
  },
  currency: {
    type: Currency,
    required: true,
  },
  payoutMethod: {
    type: PayoutMethod,
    required: true,
  },
  payoutChannel: {
    type: PayoutChannel,
    required: true,
  }
})

const emit = defineEmits([
  'recipient:typeSelected',
]);
</script>

<template>
  <div>
    <h2 class="text-lg font-semibold text-gray-900">Select Recipient Type</h2>
    <p class="mt-1 text-sm text-gray-500">For receiving {{ currency.isoAlpha }} in {{ country.commonName }} using {{ payoutMethod.title }}</p>
    <div class="mt-4 grid grid-cols-1 gap-6 py-6 sm:grid-cols-2">
      <div class="flow-root" v-if="payoutChannel.configuration.recipientType === RecipientType.INDIVIDUAL || payoutChannel.configuration.recipientType === null">
        <a href="javascript:" @click="emit('recipient:typeSelected', RecipientType.INDIVIDUAL)" class="relative -m-2 flex items-center space-x-4 rounded-xl p-2 focus-within:ring-0 hover:bg-gray-50">
          <div class="flex size-12 shrink-0 items-center justify-center rounded-lg bg-blue-50">
            <UserIcon class="size-6 text-blue-600" />
          </div>
          <div class="tracking-wider">
            <h3 class="text-sm font-medium text-gray-900">
              <a href="#" class="focus:outline-hidden">
                <span class="absolute inset-0" aria-hidden="true" />
                <span>Individual</span>
              </a>
            </h3>
            <p class="mt-0 text-sm text-gray-500">
              An individual recipient
            </p>
          </div>
        </a>
      </div>
      <div class="flow-root" v-if="payoutChannel.configuration.recipientType === RecipientType.BUSINESS || payoutChannel.configuration.recipientType === null">
        <a href="javascript:" @click="emit('recipient:typeSelected', RecipientType.BUSINESS)" class="relative -m-2 flex items-center space-x-4 rounded-xl p-2 focus-within:ring-0 hover:bg-gray-50">
          <div class="flex size-12 shrink-0 items-center justify-center rounded-lg bg-purple-50">
            <BuildingOfficeIcon class="size-6 text-purple-600" />
          </div>
          <div class="tracking-wider">
            <h3 class="text-sm font-medium text-gray-900">
              <a href="#" class="focus:outline-hidden">
                <span class="absolute inset-0" aria-hidden="true" />
                <span>Business</span>
              </a>
            </h3>
            <p class="mt-0 text-sm text-gray-500">
              A business recipient
            </p>
          </div>
        </a>
      </div>
    </div>
  </div>
</template>