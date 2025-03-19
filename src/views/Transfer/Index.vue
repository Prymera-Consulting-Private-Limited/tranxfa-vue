<script setup>
import CustomerLayout from "@/components/CustomerLayout.vue";
import {onMounted, reactive, ref} from "vue";
import {useQuoteUtils} from "@/composables/quote_utils.js";
import {useMachine} from "@xstate/vue";
import {transactionNavigationMachine} from "@/machines/transaction_navigation_machine.js";
import RecipientListing from "@/components/Transaction/RecipientListing.vue";
import TransactionQuote from "@/models/transaction_quote.js";
import Confirm from "@/components/Transaction/Confirm.vue";
import Spinner from "@/components/Spinner.vue";
import AddRecipientWizard from "@/components/Recipient/AddRecipientWizard.vue";
import { CheckIcon } from '@heroicons/vue/20/solid'


const { snapshot, send } = useMachine(transactionNavigationMachine);
const props = defineProps({
  id: {
    type: String,
    required: true
  },
});

const quoteUtils = useQuoteUtils();
const quote = reactive({
  data: null
});

const isLoading = ref(false);

onMounted(async () => {
  if (! quote.data) {
    isLoading.value = true;
    await quoteUtils.getTransferQuote(props.id).then((response) => {
      quote.data = TransactionQuote.getInstance(response.data);
      send({ type: 'SET_CONTEXT', quote: quote.data });
      send({ type: 'PROCEED' });
    });
    isLoading.value = false;
  } else {
    isLoading.value = false;
  }
});

async function setRecipient(recipient) {
  isLoading.value = true;
  await quoteUtils.setRecipient(props.id, recipient).then((response) => {
    quote.data = TransactionQuote.getInstance(response.data);
    send({ type: 'SET_CONTEXT', quote: quote.data });
    send({ type: 'PROCEED' });
  });
  isLoading.value = false;
}

const steps = [
  {
    name: 'Prepare Your Transfer',
    description: 'Get started by entering the amount and selecting your transfer method for a smooth transaction.',
    href: '#',
    status: 'complete'
  },
  {
    name: 'Add Recipient Details',
    description: 'Tell us who you’re sending money to by providing their name and transfer information.',
    href: '#',
    status: 'current'
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
    status: 'upcoming'
  },
  {
    name: 'Make Payment',
    description: 'Complete your transfer by choosing a payment method and sending the funds.',
    href: '#',
    status: 'upcoming'
  }
];


</script>

<template>
  <CustomerLayout>
    <main class="-mt-24 py-8">
      <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:max-w-7xl lg:px-8">
        <h1 class="sr-only">Your Recipients</h1>
        <!-- Main 3 column grid -->
        <div class="grid grid-cols-1 items-start gap-4 lg:grid-cols-3 lg:gap-8 bg-white rounded-t-lg p-4 md:px-6 md:py-8">
          <!-- Left column -->
          <div class="grid grid-cols-1 gap-4 lg:col-span-2">
            <div v-if="isLoading" role="status" class="p-10 flex items-center justify-center min-w-96 mx-auto min-h-96">
              <Spinner class="size-16 mx-auto" />
              <span class="sr-only">Loading...</span>
            </div>
            <section v-else aria-labelledby="section-2-title">
              <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <nav aria-label="Progress">
                  <ol role="list" class="overflow-hidden">
                    <li v-for="(step, stepIdx) in steps" :key="step.name" :class="[stepIdx !== steps.length - 1 ? 'pb-10' : '', 'relative']">
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
                <div class="xl:col-span-2">
                  <RecipientListing v-on:recipientClicked="setRecipient" v-if="snapshot.value === 'selectRecipient'" v-bind:quote="quote.data" />
                  <AddRecipientWizard class="w-full max-w-2xl" v-if="snapshot.value === 'addRecipient'" v-bind:quote="quote.data" />
                  <Confirm v-else-if="snapshot.value === 'confirm'" v-bind:quote="quote.data" />
                </div>
              </div>

            </section>
          </div>

          <!-- Right column -->
          <div class="grid grid-cols-1 gap-4">
            <section aria-labelledby="section-2-title">
              <h2 class="sr-only" id="section-2-title">Transaction Summary</h2>
            </section>
          </div>
        </div>
      </div>
    </main>

  </CustomerLayout>
</template>