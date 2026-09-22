<script setup>
import {useI18n} from "vue-i18n";

const {t} = useI18n();

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
  }
})

const steps = [
  {
    id: 'selectRecipient',
    name: t('account.chooseYourRecipient'),
    description: t('account.tellUsWhoYou'),
    show: true,
    stepCommand: 'SELECT_RECIPIENT',
    isMain: true,
  },
  {
    id: 'addRecipient',
    name: t('account.addRecipientDetails'),
    description: t('account.tellUsWhoYou'),
    show: false,
    stepCommand: 'ADD_RECIPIENT',
    isMain: false,
  },
  {
    id: 'provideAddress',
    name: t('transfer.wizard.provideYourAddress'),
    description: t('account.forSecurityAndCompliance2'),
    show: false,
    stepCommand: null,
    isMain: false,
  },
  {
    id: 'accountVerification',
    name: t('verification.backToVerification'),
    description: t('account.forSecurityAndCompliance'),
    show: false,
    stepCommand: null,
    isMain: false,
  },
  {
    id: 'confirm',
    name: t('transfer.wizard.reviewConfirm'),
    description: t('account.doubleCheckAllDetails'),
    show: true,
    stepCommand: null,
    isMain: true,
  },
  {
    id: 'makePayment',
    name: t('routes.makePayment'),
    description: t('account.completeYourTransferBy'),
    show: true,
    stepCommand: null,
    isMain: true,
  }
];

const getStepStatus = (stepId, currentStep) => {
  const currentStepIndex = steps.findIndex(step => step.id === stepId);
  const cursor = steps.findIndex(step => step.id === currentStep);
  
  if (currentStepIndex === cursor) return 'current';
  if (currentStepIndex < cursor) return 'complete';
  return 'upcoming';
};

const shouldShowStep = (step, status) => {
  if (step.isMain) return true;

  if (step.id === 'selectRecipient' || step.id === 'addRecipient') {
    const hasRecipients = props.quote?.recipients?.length > 0;

    if (status === 'current') return true;

    if (status === 'complete') return step.id !== 'addRecipient';

    return step.id === 'selectRecipient' ? hasRecipients : !hasRecipients;
  } else if (step.id === 'accountVerification') {
    return props.quote?.pendingDocuments?.length > 0;
  } else if (step.id === 'provideAddress') {
    return props.addressRequired;
  }

  return step.show;
};

const progress = computed(() => {
  return steps.map(step => {
    const status = getStepStatus(step.id, props.currentStep);
    const show = shouldShowStep(step, status);
    
    // Update step name if needed
    const name = step.id === 'checkRecipients' && props.quote 
      ? t('account.transferToCommonname', {commonName: props.quote?.payoutCountry?.commonName})
      : step.name;
    
    return {
      ...step,
      name,
      status,
      show
    };
  }).filter(step => step.show);
});

const emit = defineEmits(['stepCommandExecuted']);

const stepCommandExecuted = async (e) => {
  emit('stepCommandExecuted', e);
}

</script>
<template>
  <nav class="flex items-center justify-between space-x-8 sm:hidden py-3 px-4" :aria-label="$t('account.progress')">
    <p class="text-sm/6 font-medium">{{ $t('account.stepOf', {current: progress.findIndex((step) => step.status === 'current') + 1, total: progress.length}) }}</p>
    <ol role="list" class="flex items-center space-x-5">
      <li v-for="step in progress" :key="step.name">
        <button v-if="step.status === 'complete'" type="button" @click="stepCommandExecuted(step.stepCommand)" class="group flex size-6 cursor-pointer items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700">
          <span class="block size-2.5 rounded-full bg-brand-600 transition group-hover:bg-brand-900" aria-hidden="true" />
          <span class="sr-only">{{ step.name }}</span>
        </button>
        <span v-else-if="step.status === 'current'" class="relative flex size-6 items-center justify-center" aria-current="step">
          <span class="absolute flex size-5 p-px" aria-hidden="true">
            <span class="size-full rounded-full bg-brand-200" />
          </span>
          <span class="relative block size-2.5 rounded-full bg-brand-600" aria-hidden="true" />
          <span class="sr-only">{{ step.name }}</span>
        </span>
        <span v-else class="flex size-6 items-center justify-center">
          <span class="block size-2.5 rounded-full bg-gray-200" aria-hidden="true" />
          <span class="sr-only">{{ step.name }}</span>
        </span>
      </li>
    </ol>
  </nav>
  <nav :aria-label="$t('account.progress')" class="hidden sm:block">
    <ol role="list" class="overflow-hidden">
      <template v-for="(step, stepIdx) in progress" :key="step.id">
        <li :class="[stepIdx !== steps.length - 1 ? 'pb-10' : '', 'relative']">
          <template v-if="step.status === 'complete'">
            <div v-if="stepIdx !== progress.length - 1" class="absolute top-4 left-4 mt-0.5 -ml-px h-full w-0.5 bg-brand-600" aria-hidden="true" />
            <div @click="stepCommandExecuted(step.stepCommand)" class="group relative flex items-start cursor-pointer">
              <div class="flex h-9 items-center">
                <div :class="{'bg-brand-600 group-hover:bg-brand-800' : stepIdx !== 0 || !quote}" class="relative z-10 flex size-8 items-center justify-center rounded-full">
                  <FlagIcon v-if="stepIdx === 0 && quote" :code="quote.payoutCountry.iso2Alpha.toLowerCase()" circle size="30"  />
                  <CheckIcon v-else class="size-5 text-white" aria-hidden="true" />
                </div>
              </div>
              <div class="ml-4 flex min-w-0 flex-col">
                <div class="text-sm/6 font-medium mt-2">{{stepIdx + 1}}. {{ step.name }}</div>
                <p class="mt-1 text-sm/6 text-gray-500"></p>
              </div>
            </div>
          </template>
          <template v-else-if="step.status === 'current'">
            <div v-if="stepIdx !== progress.length - 1" class="absolute top-4 left-4 mt-0.5 -ml-px h-full w-0.5 bg-gray-300" aria-hidden="true" />
            <div class="group relative flex items-start" aria-current="step">
              <div class="flex h-9 items-center" aria-hidden="true">
                <div class="relative z-10 flex size-8 items-center justify-center rounded-full border-2 border-brand-600 bg-white">
                  <div class="size-2.5 rounded-full bg-brand-600" />
                </div>
              </div>
              <div class="ml-4 flex min-w-0 flex-col">
                <div class="text-sm/6 font-medium text-brand-700 mt-2">{{stepIdx + 1}}. {{ step.name }}</div>
                <p class="text-sm/6 text-gray-500"></p>
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
                <div class="text-sm/6 font-medium text-gray-500">{{stepIdx + 1}}. {{ step.name }}</div>
                <p class="text-sm/6 text-gray-500"></p>
              </div>
            </div>
          </template>
        </li>
      </template>
    </ol>
  </nav>
</template>