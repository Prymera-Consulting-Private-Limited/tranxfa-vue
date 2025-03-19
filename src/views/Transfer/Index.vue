<script setup>
import CustomerLayout from "@/components/CustomerLayout.vue";
import {computed, onMounted, reactive, ref} from "vue";
import {useQuoteUtils} from "@/composables/quote_utils.js";
import {useMachine} from "@xstate/vue";
import {transactionNavigationMachine} from "@/machines/transaction_navigation_machine.js";
import RecipientListing from "@/components/Transaction/RecipientListing.vue";
import TransactionQuote from "@/models/transaction_quote.js";
import Confirm from "@/components/Transaction/Confirm.vue";
import Spinner from "@/components/Spinner.vue";
import AddRecipientWizard from "@/components/Recipient/AddRecipientWizard.vue";
import QuoteDisplay from "@/components/QuoteDisplay.vue";
import Progress from "@/components/Transaction/Progress.vue";
import RecipientCardShimmer from "@/components/Recipient/RecipientCardShimmer.vue";


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
  }
  isLoading.value = false;
});

async function createRecipient() {
  send({ type: 'ADD_RECIPIENT' });
}

async function setRecipient(recipient) {
  isLoading.value = true;
  await quoteUtils.setRecipient(props.id, recipient).then((response) => {
    quote.data = TransactionQuote.getInstance(response.data);
    send({ type: 'SET_CONTEXT', quote: quote.data });
    send({ type: 'PROCEED' });
  });
  isLoading.value = false;
}

async function recipientAddedOnQuote(recipient) {
  isStepProcessing.value = false;
  quote.data.recipients.push(recipient);
  quote.data.recipient = recipient;
  send({ type: 'SET_CONTEXT', quote: quote.data });
  send({ type: 'PROCEED' });
}

const isStepProcessing = ref(false);

const canContinue = computed(() => {
  return !isStepProcessing.value && !isLoading.value;
});
</script>

<template>
  <CustomerLayout>
    <main class="-mt-24 py-8">
      <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:max-w-7xl lg:px-8">
        <h1 class="sr-only">Your Recipients</h1>
        <!-- Main 3 column grid -->
        <div class="grid grid-cols-1 items-start gap-4 lg:grid-cols-3 lg:gap-8 bg-white rounded-t-lg p-4 md:px-6 md:py-8 shadow-lg">
          <!-- Left column -->
          <div class="grid grid-cols-1 gap-4 lg:col-span-2">
            <section aria-labelledby="section-2-title">
              <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <Progress
                    v-bind:currentStep="snapshot.value"
                    v-bind:quote="quote.data"
                />
                <div class="xl:col-span-2 px-3">
                  <div v-if="isLoading" role="status" class="p-10 flex items-center justify-center min-w-96 mx-auto min-h-96">
                    <Spinner class="size-16 mx-auto" />
                    <span class="sr-only">Loading...</span>
                  </div>
                  <template v-else>
                    <AddRecipientWizard
                        v-if="snapshot.value === 'addRecipient'"
                        v-bind:externalSaveTrigger="isStepProcessing"
                        v-bind:quote="quote.data"
                        v-on:recipient:add:failed="isStepProcessing = false"
                        v-on:recipient:added="recipientAddedOnQuote"
                        class="w-full max-w-2xl"
                    />
                    <template v-if="snapshot.value === 'selectRecipient'">
                      <RecipientListing
                          v-if="quote.data"
                          v-on:recipientClicked="setRecipient"
                          v-on:createRecipientClicked="createRecipient"
                          v-bind:quote="quote.data"
                      />
                      <template v-else>
                        <div class="grid lg:grid-cols-2 gap-4">
                          <RecipientCardShimmer class="shadow-sm border border-gray-300 rounded-md" v-for="i in 4" />
                        </div>
                      </template>
                    </template>

                    <Confirm
                        v-else-if="snapshot.value === 'confirm'"
                        v-bind:quote="quote.data"
                    />
                  </template>
                </div>
              </div>

            </section>
          </div>
          <!-- Right column -->
          <div class="grid grid-cols-1 gap-4">
            <section aria-labelledby="section-2-title">
              <h2 class="sr-only" id="section-2-title">Transaction Summary</h2>
              <template v-if="quote.data !== null && snapshot.value !== 'confirm'">
                <QuoteDisplay v-bind:quote="quote.data" />
              </template>
              <button @click="isStepProcessing = true" :class="{'opacity-60' : !canContinue}" :disabled="!canContinue" class="mt-6 block w-full bg-brand-700 text-white text-center py-2.5 rounded-[10px] font-medium hover:bg-brand-800 transition cursor-pointer text-sm">
                <span v-if="isStepProcessing" class="flex justify-center items-center">
                  <Spinner :class="'w-5 h-5 mr-3'"/>
                  <span>Saving...</span>
                </span>
                <span v-else>Continue</span>
              </button>
            </section>
          </div>
        </div>
      </div>
    </main>
  </CustomerLayout>
</template>