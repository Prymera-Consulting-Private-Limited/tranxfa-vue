<script setup>
import Country from "@/models/country.js";
import Currency from "@/models/currency.js";

defineProps({
  country: {
    type: Country,
    required: true,
  },
  currency: {
    type: Currency,
    required: true,
  },
  payoutMethods: {
    type: Array,
    required: true,
  },
})

const emit = defineEmits([
  'recipient:payoutMethodSelected',
]);

const payoutMethodSelected = (payoutMethod) => {
  emit('recipient:payoutMethodSelected', payoutMethod);
}
</script>

<template>
  <h2 class="text-base font-semibold text-gray-900">Select a Payout Method</h2>
  <p class="mt-1 text-sm text-gray-500">For your recipient in {{ country.commonName }} to receive {{ currency.isoAlpha }}</p>
  <ul role="list" class="mt-0 grid grid-cols-1 gap-6 py-6 sm:grid-cols-2">
    <li class="flow-root" v-for="(payoutMethod, index) in payoutMethods" :key="index">
      <a href="javascript:" @click="payoutMethodSelected(payoutMethod)" class="relative -m-2 flex items-center space-x-4 rounded-xl p-2 focus-within:ring-0 hover:bg-gray-50">
        <div :class="['flex size-12 shrink-0 items-center justify-center rounded-lg']">
          <span class="text-3xl">{{ payoutMethod.title.charAt(0).toUpperCase() }}</span>
        </div>
        <div class="tracking-wider">
          <h3 class="text-sm font-medium text-gray-900">
            <a href="#" class="focus:outline-hidden">
              <span class="absolute inset-0" aria-hidden="true" />
              <span>{{ payoutMethod.title }}</span>
            </a>
          </h3>
          <p class="mt-0 text-sm text-gray-500">
            {{ payoutMethod.description }}
          </p>
        </div>
      </a>
    </li>
  </ul>
</template>