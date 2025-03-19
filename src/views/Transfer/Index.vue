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
import QuoteDisplay from "@/components/QuoteDisplay.vue";
import Progress from "@/components/Transaction/Progress.vue";


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
            <div v-if="isLoading" role="status" class="p-10 flex items-center justify-center min-w-96 mx-auto min-h-96">
              <Spinner class="size-16 mx-auto" />
              <span class="sr-only">Loading...</span>
            </div>
            <section v-else aria-labelledby="section-2-title">
              <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <Progress />
                <div class="xl:col-span-2">
                  <AddRecipientWizard class="w-full max-w-2xl" v-if="snapshot.value === 'addRecipient'" v-bind:quote="quote.data" />
                  <RecipientListing v-on:recipientClicked="setRecipient" v-if="snapshot.value === 'selectRecipient'" v-bind:quote="quote.data" />
                  <Confirm v-else-if="snapshot.value === 'confirm'" v-bind:quote="quote.data" />
                </div>
              </div>

            </section>
          </div>

          <!-- Right column -->
          <div class="grid grid-cols-1 gap-4">
            <section aria-labelledby="section-2-title">
              <h2 class="sr-only" id="section-2-title">Transaction Summary</h2>
              <template v-if="quote.data !== null">
                <QuoteDisplay v-bind:quote="quote.data" />
              </template>
            </section>
          </div>
        </div>
      </div>
    </main>
  </CustomerLayout>
</template>