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
import vSelect from 'vue-select';
import router from "@/router/index.js";
import CustomerAttributeForm from "@/components/Customer/CustomerAttributeForm.vue";
import CustomerAttributeCategory from "@/enums/customer_attribute_category.js";

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
  if (snapshot.value?.value === 'confirm') {
    return !!purpose.value && !isStepProcessing.value && !isLoading.value;
  }
  return !isStepProcessing.value && !isLoading.value;
});

const purpose = ref(null);
const isAddressRequired = ref(false);

const submitAndContinue = async () => {
  isStepProcessing.value = true
  if (snapshot.value?.value === 'confirm') {
    try {
      const response = await quoteUtils.confirmQuote(quote.data, purpose.value);
      const transaction = response.data;
      await router.push({name: 'makePayment', params: {transactionId: transaction.id}});
    } catch (error) {
      if (error.response.status === 412) {
        if (error.response.data.type === "incomplete_customer_address") {
          isAddressRequired.value = true;
          send({ type: 'ADDRESS_REQUIRED' });
        }
      }
    } finally {
      isStepProcessing.value = false
    }
  }
}

const customerAttributeCategoryUpdated = () => {
  isStepProcessing.value = false;
  send({ type: 'PROCEED' });
}
</script>

<template>
  <CustomerLayout>
    <main class="-mt-24 py-8">
      <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:max-w-7xl lg:px-8">
        <h1 class="sr-only">Review & Confirm</h1>
        <!-- Main 3 column grid -->
        <div class="grid grid-cols-1 items-start gap-4 lg:grid-cols-3 lg:gap-8 bg-white rounded-t-lg p-4 md:px-6 md:py-8 shadow-lg">
          <!-- Left column -->
          <div class="grid grid-cols-1 gap-4 lg:col-span-2">
            <section aria-labelledby="section-2-title">
              <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <Progress
                    v-bind:currentStep="snapshot.value"
                    v-bind:quote="quote.data"
                    v-bind:addressRequired="isAddressRequired"
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
                    <template v-if="snapshot.value === 'provideAddress'">
                      <p class="text-gray-500 text-sm mb-4">For security and compliance, we need your address details before proceeding.</p>
                      <CustomerAttributeForm
                          v-bind:categories="`${CustomerAttributeCategory.ADDRESS}`"
                          v-bind:updateOutsourced="true"
                          v-bind:updateCommandReceived="isStepProcessing"
                          v-on:customer:attribute_category:updated="customerAttributeCategoryUpdated"
                          v-on:customer:attribute_category:update_failed="isStepProcessing = false"
                      />
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
              <template v-if="quote.data">
                <QuoteDisplay v-if="snapshot.value !== 'confirm'" v-bind:quote="quote.data" />
                <template v-else>
                  <label for="purpose" class="text-sm/6 font-semibold text-gray-900">Select a purpose</label>
                  <p class="my-4 text-sm text-gray-500">Please provide the purpose of your transfer to the recipient.</p>
                  <v-select v-model="purpose" :options="quote.data.purposes" :placeholder="`Please select`" key-by="id" label="purpose">
                    <template v-slot:no-options="{ search, searching }">
                      <template class="text-sm text-gray-300" v-if="searching">No results found for <em>{{ search }}</em>.</template>
                      <em class="text-sm text-gray-400 opacity-50" v-else>Start typing to search ...</em>
                    </template>
                    <template #selected-option-container="{ option, deselect, multiple, disabled }">
                      <div class="vs__selected">
                        <div class="flex items-center w-auto">
                          <div class="text-sm flex items-center w-full gap-x-2">
                            <span class="lg:max-w-sm xl:max-w-md truncate">{{ option.title }}</span>
                          </div>
                        </div>
                      </div>
                    </template>
                    <template #option="option">
                      <div class="text-sm flex items-center w-full gap-x-3 truncate">
                        <span class="truncate">{{ option.title }}</span>
                      </div>
                    </template>
                  </v-select>
                </template>
              </template>
              <button v-if="snapshot.value?.value !== 'selectRecipient'" @click="submitAndContinue" :class="{'opacity-60' : !canContinue}" :disabled="!canContinue" class="mt-6 block w-full bg-brand-700 text-white text-center py-2.5 rounded-[10px] font-medium hover:bg-brand-800 transition cursor-pointer text-sm">
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