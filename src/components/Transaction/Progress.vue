<script setup>
import {CheckIcon} from "@heroicons/vue/20/solid";
import {computed} from "vue";
import TransactionQuote from "@/models/transaction_quote.js";

const props = defineProps({
  currentStep: {
    type: String,
    required: true
  },
  quote: {
    type: Object(TransactionQuote),
    required: false
  }
})

const steps = [
  {
    name: 'Prepare Your Transfer',
    description: 'Get started by entering the amount and selecting your transfer method for a smooth transaction.',
    href: '#',
    action: ['prepare']
  },
  {
    name: 'Add Recipient Details',
    description: 'Tell us who you’re sending money to by providing their name and transfer information.',
    href: '#',
    action: ['addRecipient', 'selectRecipient']
  },
  // {
  //   name: 'Provide Your Address',
  //   description: 'For security and compliance, we need your address details before proceeding.',
  //   href: '#',
  //   status: 'upcoming'
  // },
  // {
  //   name: 'Verify Your Identity',
  //   description: 'A quick identity check ensures your transfer is safe and secure.',
  //   href: '#',
  //   status: 'upcoming'
  // },
  {
    name: 'Review & Confirm',
    description: 'Double-check all details before finalizing your transfer.',
    href: '#',
    action: ['confirm']
  },
  // {
  //   name: 'Make Payment',
  //   description: 'Complete your transfer by choosing a payment method and sending the funds.',
  //   href: '#',
  // }
];

const progress = computed(() => {
  for (let i = 0; i < steps.length; i++) {
    const cursor = steps.findIndex((step) => step.action.includes(props.currentStep));
    if (steps[i].action.includes('selectRecipient')) {
      steps[i].name = props.quote?.recipients?.length > 0 ? 'Select Recipient Details' : 'Add Recipient Details';
    }
    if (i < cursor) {
      steps[i].status = 'complete';
    } else if (i === cursor) {
      steps[i].status = 'current';
    } else {
      steps[i].status = 'upcoming';
    }
  }

  return steps;
})
</script>
<template>
  <nav aria-label="Progress">
    <ol role="list" class="overflow-hidden">
      <li v-for="(step, stepIdx) in progress" :key="step.name" :class="[stepIdx !== steps.length - 1 ? 'pb-10' : '', 'relative']">
        <template v-if="step.status === 'complete'">
          <div v-if="stepIdx !== steps.length - 1" class="absolute top-4 left-4 mt-0.5 -ml-px h-full w-0.5 bg-purple-600" aria-hidden="true" />
          <a :href="step.href" class="group relative flex items-start">
            <span class="flex h-9 items-center">
              <span class="relative z-10 flex size-8 items-center justify-center rounded-full bg-purple-600 group-hover:bg-purple-800">
                <CheckIcon class="size-5 text-white" aria-hidden="true" />
              </span>
            </span>
            <span class="ml-4 flex min-w-0 flex-col">
              <span class="text-sm font-medium">{{ step.name }}</span>
              <span class="text-sm text-gray-500">{{ step.description }}</span>
            </span>
          </a>
        </template>
        <template v-else-if="step.status === 'current'">
          <div v-if="stepIdx !== steps.length - 1" class="absolute top-4 left-4 mt-0.5 -ml-px h-full w-0.5 bg-gray-300" aria-hidden="true" />
          <a :href="step.href" class="group relative flex items-start" aria-current="step">
            <span class="flex h-9 items-center" aria-hidden="true">
              <span class="relative z-10 flex size-8 items-center justify-center rounded-full border-2 border-purple-600 bg-white">
                <span class="size-2.5 rounded-full bg-purple-600" />
              </span>
            </span>
            <span class="ml-4 flex min-w-0 flex-col">
              <span class="text-sm font-medium text-purple-600">{{ step.name }}</span>
              <span class="text-sm text-gray-500">{{ step.description }}</span>
            </span>
          </a>
        </template>
        <template v-else>
          <div v-if="stepIdx !== steps.length - 1" class="absolute top-4 left-4 mt-0.5 -ml-px h-full w-0.5 bg-gray-300" aria-hidden="true" />
          <a :href="step.href" class="group relative flex items-start">
            <span class="flex h-9 items-center" aria-hidden="true">
              <span class="relative z-10 flex size-8 items-center justify-center rounded-full border-2 border-gray-300 bg-white group-hover:border-gray-400">
                <span class="size-2.5 rounded-full bg-transparent group-hover:bg-gray-300" />
              </span>
            </span>
            <span class="ml-4 flex min-w-0 flex-col">
              <span class="text-sm font-medium text-gray-500">{{ step.name }}</span>
              <span class="text-sm text-gray-500">{{ step.description }}</span>
            </span>
          </a>
        </template>
      </li>
    </ol>
  </nav>
</template>