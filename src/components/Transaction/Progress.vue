<script setup>
import {CheckIcon} from "@heroicons/vue/24/outline";
import {computed, ref} from "vue";
import TransactionQuote from "@/models/transaction_quote.js";
import FlagIcon from "vue3-flag-icons";

const props = defineProps({
  currentStep: {
    type: String,
    required: true
  },
  quote: {
    type: Object(TransactionQuote),
    required: false
  },
  addressRequired: {
    type: Boolean,
    required: false,
    default: false
  },
})

const steps = [
  {
    id: 'checkRecipients',
    name: 'Prepare your transfer',
    description: 'Get started by entering the amount and selecting your transfer method for a smooth transaction.',
    show: true,
  },
  {
    id: 'verifyIdentity',
    name: 'Verify Your Identity',
    description: 'For security and compliance, please verify your identity before proceeding with the transaction.',
    show: false,
  },
  {
    id: 'addRecipient',
    name: 'Add Recipient Details',
    description: 'Tell us who you’re sending money to by providing their name and transfer information.',
    show: true,
  },
  {
    id: 'selectRecipient',
    name: 'Choose your recipient',
    description: 'Tell us who you’re sending money to by providing their name and transfer information.',
    show: true,
  },
  {
    id: 'provideAddress',
    name: 'Provide Your Address',
    description: 'For security and compliance, we need your address details before proceeding.',
    show: false,
  },
  {
    id: 'confirm',
    name: 'Review & Confirm',
    description: 'Double-check all details before finalizing your transfer.',
    show: true,
  },
  {
    id: 'makePayment',
    name: 'Make Payment',
    description: 'Complete your transfer by choosing a payment method and sending the funds.',
    show: true,
  }
];

const progress = computed(() => steps.map((step) => {
  if (step.id === 'checkRecipients' && props.quote) {
    step.name = `Transfer to ${props.quote?.payoutCountry?.commonName}`;
  }
  if (step.id === 'provideAddress') {
    step.show = props.addressRequired;
  }
  const currentStepIndex = steps.findIndex((o) => o.id === step.id);
  const cursor = steps.findIndex((o) => o.id === props.currentStep);
  if (currentStepIndex === cursor) {
    step.status = 'current';
  } else if (currentStepIndex < cursor) {
    step.status = 'complete';
  } else {
    step.status = 'upcoming';
  }
  return step;
}).filter((step) => step.show));
</script>
<template>
  <nav aria-label="Progress">
    <ol role="list" class="overflow-hidden">
      <template v-for="(step, stepIdx) in progress" :key="step.id">
        <template v-if="(step.id === 'selectRecipient' && step.status === 'upcoming') || (step.id === 'addRecipient' && step.status === 'complete')"></template>
        <li v-else :class="[stepIdx !== steps.length - 1 ? 'pb-10' : '', 'relative']">
          <template v-if="step.status === 'complete'">
            <div v-if="stepIdx !== progress.length - 1" class="absolute top-4 left-4 mt-0.5 -ml-px h-full w-0.5 bg-purple-600" aria-hidden="true" />
            <div class="group relative flex items-start">
              <div class="flex h-9 items-center">
                <div :class="{'bg-purple-600 group-hover:bg-purple-800' : stepIdx !== 0 || !quote}" class="relative z-10 flex size-8 items-center justify-center rounded-full">
                  <FlagIcon v-if="stepIdx === 0 && quote" :code="quote.payoutCountry.iso2Alpha.toLowerCase()" circle size="30"  />
                  <CheckIcon v-else class="size-5 text-white" aria-hidden="true" />
                </div>
              </div>
              <div class="ml-4 flex min-w-0 flex-col">
                <div class="text-sm font-medium">{{ step.name }}</div>
                <p class="mt-1 text-sm text-gray-500">{{ step.description }}</p>
              </div>
            </div>
          </template>
          <template v-else-if="step.status === 'current'">
            <div v-if="stepIdx !== progress.length - 1" class="absolute top-4 left-4 mt-0.5 -ml-px h-full w-0.5 bg-gray-300" aria-hidden="true" />
            <div class="group relative flex items-start" aria-current="step">
              <div class="flex h-9 items-center" aria-hidden="true">
                <div class="relative z-10 flex size-8 items-center justify-center rounded-full border-2 border-purple-600 bg-white">
                  <div class="size-2.5 rounded-full bg-purple-600" />
                </div>
              </div>
              <div class="ml-4 flex min-w-0 flex-col">
                <div class="text-sm font-medium text-purple-600">{{ step.name }}</div>
                <p class="text-sm text-gray-500">{{ step.description }}</p>
              </div>
            </div>
          </template>
          <template v-else>
            <div v-if="stepIdx !== progress.length - 1" class="absolute top-4 left-4 mt-0.5 -ml-px h-full w-0.5 bg-gray-300" aria-hidden="true" />
            <div class="group relative flex items-start">
              <div class="flex h-9 items-center" aria-hidden="true">
                <div class="relative z-10 flex size-8 items-center justify-center rounded-full border-2 border-gray-300 bg-white group-hover:border-gray-400">
                  <div class="size-2.5 rounded-full bg-transparent group-hover:bg-gray-300" />
                </div>
              </div>
              <div class="ml-4 flex min-w-0 flex-col">
                <div class="text-sm font-medium text-gray-500">{{ step.name }}</div>
                <p class="text-sm text-gray-500">{{ step.description }}</p>
              </div>
            </div>
          </template>
        </li>
      </template>
    </ol>
  </nav>
</template>