<script setup>
import {CheckIcon} from "@heroicons/vue/24/outline";
import {computed} from "vue";
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
  identityDocumentRequired: {
    type: Boolean,
    required: false,
    default: false
  }
})

const steps = [
  {
    id: 'selectRecipient',
    name: 'Choose your recipient',
    description: 'Tell us who you’re sending money to by providing their name and transfer information.',
    show: true,
    stepCommand: 'SELECT_RECIPIENT',
    isMain: true,
  },
  {
    id: 'addRecipient',
    name: 'Add Recipient Details',
    description: 'Tell us who you’re sending money to by providing their name and transfer information.',
    show: true,
    stepCommand: 'ADD_RECIPIENT',
    isMain: false,
  },
  {
    id: 'provideAddress',
    name: 'Provide Your Address',
    description: 'For security and compliance, we need your address details before proceeding.',
    show: false,
    stepCommand: null,
    isMain: false,
  },
  {
    id: 'verifyIdentity',
    name: 'Verify Your Identity',
    description: 'For security and compliance, please verify your identity before proceeding with the transaction.',
    show: false,
    stepCommand: null,
    isMain: false,
  },
  {
    id: 'confirm',
    name: 'Review & Confirm',
    description: 'Double-check all details before finalizing your transfer.',
    show: true,
    stepCommand: null,
    isMain: true,
  },
  {
    id: 'makePayment',
    name: 'Make Payment',
    description: 'Complete your transfer by choosing a payment method and sending the funds.',
    show: true,
    stepCommand: null,
    isMain: true,
  }
];

const progress = computed(() => steps.map((step) => {
  if (step.id === 'checkRecipients' && props.quote) {
    step.name = `Transfer to ${props.quote?.payoutCountry?.commonName}`;
  }
  if (step.id === 'provideAddress') {
    step.show = props.addressRequired;
  }
  if (step.id === 'verifyIdentity') {
    step.show = props.identityDocumentRequired;
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
  if (step.id === 'selectRecipient') {
    step.show = props.quote?.recipients?.length > 0;
  }
  if (step.id === 'addRecipient') {
    if (step.status === 'current') {
      step.show = true;
      return step;
    }
    step.show = !(step.status === 'complete' || props.quote?.recipients?.length > 0);
  }
  return step;
}).filter((step) => step.show));

const emit = defineEmits(['stepCommandExecuted']);

const stepCommandExecuted = async (e) => {
  emit('stepCommandExecuted', e);
}

</script>
<template>
  <nav class="flex items-center justify-between space-x-8 sm:hidden py-3 px-4" aria-label="Progress">
    <p class="text-sm font-medium">Step {{ progress.findIndex((step) => step.status === 'current') + 1 }} of {{ progress.length }}</p>
    <ol role="list" class="flex items-center space-x-5">
      <li v-for="step in progress" :key="step.name">
        <a v-if="step.status === 'complete'" @click="stepCommandExecuted(step.stepCommand)" class="block size-2.5 rounded-full bg-purple-600 hover:bg-purple-900">
          <span class="sr-only">{{ step.name }}</span>
        </a>
        <a v-else-if="step.status === 'current'" class="relative flex items-center justify-center" aria-current="step">
          <span class="absolute flex size-5 p-px" aria-hidden="true">
            <span class="size-full rounded-full bg-purple-200" />
          </span>
          <span class="relative block size-2.5 rounded-full bg-purple-600" aria-hidden="true" />
          <span class="sr-only">{{ step.name }}</span>
        </a>
        <a v-else class="block size-2.5 rounded-full bg-gray-200 hover:bg-gray-400">
          <span class="sr-only">{{ step.name }}</span>
        </a>
      </li>
    </ol>
  </nav>
  <nav aria-label="Progress" class="hidden sm:block">
    <ol role="list" class="overflow-hidden">
      <template v-for="(step, stepIdx) in progress" :key="step.id">
        <li :class="[stepIdx !== steps.length - 1 ? 'pb-10' : '', 'relative']">
          <template v-if="step.status === 'complete'">
            <div v-if="stepIdx !== progress.length - 1" class="absolute top-4 left-4 mt-0.5 -ml-px h-full w-0.5 bg-purple-600" aria-hidden="true" />
            <div @click="stepCommandExecuted(step.stepCommand)" class="group relative flex items-start cursor-pointer">
              <div class="flex h-9 items-center">
                <div :class="{'bg-purple-600 group-hover:bg-purple-800' : stepIdx !== 0 || !quote}" class="relative z-10 flex size-8 items-center justify-center rounded-full">
                  <FlagIcon v-if="stepIdx === 0 && quote" :code="quote.payoutCountry.iso2Alpha.toLowerCase()" circle size="30"  />
                  <CheckIcon v-else class="size-5 text-white" aria-hidden="true" />
                </div>
              </div>
              <div class="ml-4 flex min-w-0 flex-col">
                <div class="text-sm font-medium mt-2">{{stepIdx + 1}}. {{ step.name }}</div>
                <p class="mt-1 text-sm text-gray-500"></p>
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
                <div class="text-sm font-medium text-purple-600 mt-2">{{stepIdx + 1}}. {{ step.name }}</div>
                <p class="text-sm text-gray-500"></p>
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
              <div class="ml-4 flex min-w-0 flex-col mt-2">
                <div class="text-sm font-medium text-gray-500">{{stepIdx + 1}}. {{ step.name }}</div>
                <p class="text-sm text-gray-500"></p>
              </div>
            </div>
          </template>
        </li>
      </template>
    </ol>
  </nav>
</template>