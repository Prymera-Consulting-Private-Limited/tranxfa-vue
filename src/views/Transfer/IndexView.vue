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
import {useCustomerStore} from "@/stores/customer.js";
import DocumentTypeItem from "@/components/AccountVerification/DocumentTypeItem.vue";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import {Dialog, DialogPanel, RadioGroup, RadioGroupOption, TransitionChild, TransitionRoot} from '@headlessui/vue'
import { CheckCircleIcon, ChevronRightIcon, ArrowUpTrayIcon, IdentificationIcon } from '@heroicons/vue/20/solid'
import {createPopper} from "@popperjs/core";

const { snapshot, send } = useMachine(transactionNavigationMachine);
const customerStore = useCustomerStore();
const customerUtils = useCustomerUtils();
/**
 * @type {{data: Customer|null}}
 */
const customer = customerStore.customer;
const props = defineProps({
  id: {
    type: String,
    required: true
  },
});
const quoteUtils = useQuoteUtils();
/**
 * @type {Reactive<{data: null|TransactionQuote}>}
 */
const quote = reactive({
  data: null
});
const isLoading = ref(false);
const isStepProcessing = ref(false);
const isSubComponentLoading = ref(false);
const purpose = ref(null);
const paymentMethod = ref(null);
const isAddressRequired = ref(false);

onMounted(async () => {
  if (customerStore.isLoaded === false) {
    isLoading.value = true;
    await customerUtils.refresh()
  }
  if (! quote.data) {
    isLoading.value = true;
    await quoteUtils.getTransferQuote(props.id).then((response) => {
      quote.data = TransactionQuote.getInstance(response.data);
      send({ type: 'SET_CONTEXT', quote: quote.data });
      send({ type: 'PROCEED' });
    });
  }
  if (quote.data.paymentMethods.length === 1) {
    paymentMethod.value = quote.data.paymentMethods[0];
  }
  isLoading.value = false;
});

const canContinue = computed(() => {
  if (snapshot.value?.value === 'confirm') {
    return !!purpose.value && !!paymentMethod.value && !isStepProcessing.value && !isLoading.value;
  }
  return !isStepProcessing.value && !isLoading.value && !isSubComponentLoading.value;
});

const isIdentityDocumentRequired = computed(() => {
  return (customer.data?.pendingDocuments?.find(category => category.code === 'POI') || null) !== null;
});

const identityDocumentCategory = computed(() => customer.data?.pendingDocuments?.find(category => category.code === 'POI'));

const showContinueButton = computed(() => {
  return !(snapshot.value?.value === 'selectRecipient' || snapshot.value?.value === 'verifyIdentity');
});

const createRecipient = async () => {
  send({ type: 'ADD_RECIPIENT' });
  isSubComponentLoading.value = true;
};

const setRecipient =  async (recipient) => {
  isLoading.value = true;
  await quoteUtils.setRecipient(props.id, recipient).then((response) => {
    quote.data = TransactionQuote.getInstance(response.data);
    send({ type: 'SET_CONTEXT', quote: quote.data });
    send({ type: 'PROCEED' });
  });
  isLoading.value = false;
}

const recipientAddedOnQuote = async (recipient)  => {
  isStepProcessing.value = false;
  quote.data.recipients.push(recipient);
  quote.data.recipient = recipient;
  send({ type: 'SET_CONTEXT', quote: quote.data });
  send({ type: 'PROCEED' });
}

const confirmQuote = async () => {
  try {
    const response = await quoteUtils.confirmQuote(quote.data, purpose.value, paymentMethod.value);
    const transaction = response.data;
    isStepProcessing.value = false;
    await router.push({name: 'makePayment', params: {transactionId: transaction.id}});
  } catch (error) {
    if (error.response.status === 412) {
      if (error.response.data.type === "incomplete_customer_address") {
        isAddressRequired.value = true;
        isStepProcessing.value = false;
        await send({ type: 'ADDRESS_REQUIRED' });
      } else if (error.response.data.type === "poi_required") {
        isStepProcessing.value = false;
        await send({ type: 'POI_REQUIRED' });
      } else if (error.response.data.type === "poi_name_check_failed") {
        isStepProcessing.value = false;
        await send({ type: 'POI_NAME_CHECK_FAILED' });
      }
    }
  }
}

const submitAndContinue = async () => {
  isStepProcessing.value = true
  if (snapshot.value?.value === 'confirm') {
    await confirmQuote();
  } else if (snapshot.value?.value === 'verifyIdentity') {
    await customerUtils.refresh();
    await send({ type: 'SET_CONTEXT', quote: quote.data });
    await send({ type: 'PROCEED' });
    if (purpose) {
      await confirmQuote();
    }
  } else if (snapshot.value?.value === 'addRecipient') {
    isStepProcessing.value = true;
  } else if (snapshot.value?.value !== 'provideAddress') {
    await send({ type: 'SET_CONTEXT', quote: quote.data });
    await send({ type: 'PROCEED' });
    isStepProcessing.value = false;
  }
}

const customerAttributeCategoryUpdated = async () => {
  await send({ type: 'PROCEED' });
  await confirmQuote();
  isStepProcessing.value = false;
}

const sdkFinalStateReached = async () => {
  await customerUtils.refresh();
  isStepProcessing.value = false;
  await send({ type: 'PROCEED' });
}

const stepCommandExecuted = (e) => {
  if (e) {
    send({ type: e });
  }
}

const addRecipientLoadingStateUpdated = (e) => {
  isSubComponentLoading.value = e;
}

const isApplyingNameFromPoiDocument = ref(false);

const applyNameFromPoiDocument = async () => {
  isApplyingNameFromPoiDocument.value = true;
  customerUtils.applyNameFromPoiDocument().then((response) => {
    customerUtils.updateStore(response.data);
    send({ type: 'PROCEED' });
    isStepProcessing.value = true;
    confirmQuote();
  }).catch((e) => {
    console.error(e);
  }).finally(() => {
    isApplyingNameFromPoiDocument.value = false;
  });
}

function withPopper(dropdownList, component, { width }) {
  dropdownList.style.width = width;
  const popper = createPopper(component.$refs.toggle, dropdownList, {
    placement: 'bottom-start',
    modifiers: [
      {
        name: 'flip',
        options: {
          fallbackPlacements: ['top-start'],
        },
      },
      {
        name: 'offset',
        options: {
          offset: [0, 0],
        },
      },
      {
        name: 'toggleClass',
        enabled: true,
        phase: 'write',
        fn({ state }) {
          component.$el.classList.toggle('drop-up', state.placement.startsWith('top'));
        },
      },
    ],
  });

  return () => popper.destroy();
}
</script>

<template>
  <CustomerLayout>
    <main class="-mt-24 py-8">
      <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:max-w-7xl lg:px-8 py-5"  v-if="snapshot.value !== 'poiNameCheckFailed'">
        <h1 class="sr-only">Review & Confirm</h1>
        <!-- Main 3 column grid -->
        <div class="grid grid-cols-1 items-start gap-4 lg:grid-cols-3 lg:gap-8 bg-white rounded-lg p-4 md:px-6 md:py-10 shadow-lg">
          <!-- Left column -->
          <div class="grid grid-cols-1 gap-4 lg:col-span-2">
            <section aria-labelledby="section-2-title">
              <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <Progress
                    v-bind:currentStep="snapshot.value"
                    v-bind:quote="quote.data"
                    v-bind:addressRequired="isAddressRequired"
                    v-bind:identityDocumentRequired="isIdentityDocumentRequired"
                    v-on:stepCommandExecuted="stepCommandExecuted"
                />
                <div :class="{'animate-pulse': isStepProcessing}" class="xl:col-span-2 px-3">
                  <div v-if="isLoading" role="status" class="p-10 flex items-center justify-center w-64 lg:min-w-96 mx-auto min-h-96">
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
                        v-on:recipient:add:loadingStateUpdated="addRecipientLoadingStateUpdated"
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
                      <h3 class="text-gray-900 mb-4 font-semibold">Provide Your Address</h3>
                      <CustomerAttributeForm
                          v-bind:categories="`${CustomerAttributeCategory.ADDRESS}`"
                          v-bind:updateOutsourced="true"
                          v-bind:externalSaveTrigger="isStepProcessing"
                          v-bind:showLoading="false"
                          v-on:customer:attribute_category:updated="customerAttributeCategoryUpdated"
                          v-on:customer:attribute_category:update_failed="isStepProcessing = false"
                      />
                    </template>
                    <template v-if="snapshot.value === 'verifyIdentity'">
                      <h3 class="text-gray-900 mb-4 font-semibold">Verify your identity</h3>
                      <p class="text-gray-500 text-sm mb-6">For security and compliance, please upload a valid government-issued ID. Ensure the details match those in your profile.</p>
                      <ul v-if="identityDocumentCategory?.documentTypes?.length > 0" role="list" class="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <li v-for="documentType in identityDocumentCategory.documentTypes" :key="documentType.id" class="col-span-1 flex flex-col divide-y divide-gray-200 rounded-lg text-center shadow-sm bg-white transition-transform transform hover:scale-105">
                          <DocumentTypeItem
                              v-bind:documentType="documentType"
                              v-bind:documentCategory="identityDocumentCategory"
                              v-on:sdkFinalStateReached="sdkFinalStateReached"
                          />
                        </li>
                      </ul>
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
                <div v-if="snapshot.value !== 'confirm'" class="hidden sm:grid"><QuoteDisplay v-bind:quote="quote.data" /></div>
                <template v-else>
                  <div class="px-3 sm:px-0">
                    <label for="purpose" class="text-sm/6 font-semibold text-gray-900">Select a purpose <span class="text-red-500">*</span></label>
                    <p class="mb-4 text-sm text-gray-500">Please provide the purpose of your transfer to the recipient.</p>
                    <v-select v-model="purpose" :calculate-position="withPopper" :options="quote.data.purposes" :placeholder="`Please select`" key-by="id" label="purpose">
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

                    <fieldset aria-label="Server size" class="mt-6 mb-4">
                      <label for="purpose" class="text-sm/6 font-semibold text-gray-900">Payment Method <span class="text-red-500">*</span></label>
                      <p class="mb-4 text-sm text-gray-500">Please select how would you like to pay</p>
                      <RadioGroup v-model="paymentMethod" class="space-y-4 mt-4">
                        <RadioGroupOption as="template" v-for="paymentMethod in quote.data.paymentMethods" :key="paymentMethod.id" :value="paymentMethod" :aria-label="paymentMethod.title" :aria-description="`${paymentMethod.title}`" v-slot="{ active, checked }">
                          <div :class="[(active || checked) ? 'border-purple-600 ring-1 ring-purple-600 bg-purple-50' : 'border-gray-300 bg-white', 'relative flex cursor-pointer rounded-lg border px-4 py-2.5 shadow-xs focus:outline-hidden']">
                          <span class="flex flex-1">
                            <span class="flex flex-col">
                              <span class="block text-sm font-medium text-gray-900">{{ paymentMethod.title }}</span>
                              <!--<span class="mt-1 flex items-center text-sm text-gray-500">{{ paymentMethod.description }}</span>-->
                            </span>
                          </span>
                            <CheckCircleIcon :class="[!checked ? 'text-gray-400' : 'text-purple-600', 'size-5']" aria-hidden="true" />
                          </div>
                        </RadioGroupOption>
                      </RadioGroup>
                    </fieldset>
                  </div>
                </template>
              </template>
              <div class="py-4 px-3 sm:px-0">
                <button v-if="showContinueButton" @click="submitAndContinue" :class="{'opacity-60' : !canContinue}" :disabled="!canContinue" class="block w-full bg-brand-700 text-white text-center py-2.5 rounded-[10px] font-medium hover:bg-brand-800 transition cursor-pointer text-sm">
                  <span v-if="isStepProcessing" class="flex justify-center items-center">
                    <Spinner :class="'w-5 h-5 mr-3'"/>
                    <span>Saving...</span>
                  </span>
                  <span v-else>Continue</span>
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
      <template v-else>
        <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:max-w-7xl lg:px-8">
          <h1 class="sr-only">Make Payment</h1>
          <div class="flex items-center justify-center gap-4 lg:gap-8 bg-white rounded-t-lg p-4 md:px-6 md:py-8 min-h-148">
            <div class="text-center" v-if="isLoading">
              <span class="text-6xl pi pi-spinner-dotted pi-spin text-gray-500"></span>
              <h2 class="text-2xl font-semibold text-gray-600 mb-5 mt-5">Please wait ...</h2>
            </div>
          </div>
        </div>
        <TransitionRoot as="template" :show="true">
          <Dialog class="relative z-10">
            <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0" enter-to="opacity-100" leave="ease-in duration-200" leave-from="opacity-100" leave-to="opacity-0">
              <div class="fixed inset-0 bg-gray-500/75 transition-opacity" />
            </TransitionChild>
            <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
              <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95" enter-to="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-200" leave-from="opacity-100 translate-y-0 sm:scale-100" leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
                  <DialogPanel class="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-sm sm:p-6">
                    <button class="sr-only"></button>
                    <div class="">
                      <div class="text-left">
                        <h3 class="font-semibold text-red-600">Name Mismatch Detected</h3>
                        <p class="leading-5 font-normal text-sm/8 text-red-500 mt-3">
                          The name you entered doesn't match the name shown on your identity document.
                          To proceed, please choose one of the following options:
                        </p>
                        <ul role="list" class="mt-6 divide-y divide-gray-200" :class="isApplyingNameFromPoiDocument ? 'opacity:70 animate animate-pulse' : ''">
                          <li @click="stepCommandExecuted('UPLOAD_ANOTHER_DOCUMENT')" :class="isApplyingNameFromPoiDocument ? '' : 'cursor-pointer'">
                            <div class="group relative flex items-start space-x-3 py-4">
                              <div class="shrink-0">
                                <span :class="['inline-flex size-10 items-center justify-center rounded-lg bg-purple-600 mt-1']">
                                  <ArrowUpTrayIcon class="size-6 text-white" aria-hidden="true" />
                                </span>
                              </div>
                              <div class="min-w-0 flex-1">
                                <div class="text-sm font-medium text-gray-900">
                                  <div>
                                    <span class="absolute inset-0" aria-hidden="true" />
                                    Update My Document
                                  </div>
                                </div>
                                <p class="text-sm text-gray-500 mt-1">
                                  Upload a new identity document that matches the name you entered.
                                </p>
                              </div>
                              <div class="shrink-0 self-center">
                                <ChevronRightIcon class="size-5 text-gray-400 group-hover:text-gray-500" aria-hidden="true" />
                              </div>
                            </div>
                          </li>
                          <li @click="applyNameFromPoiDocument" :class="isApplyingNameFromPoiDocument ? 'bg-gray-100' : 'cursor-pointer'">
                            <div class="group relative flex items-start space-x-3 py-4">
                              <div class="shrink-0">
                                <span :class="['inline-flex size-10 items-center justify-center rounded-lg bg-purple-600 mt-1']">
                                  <IdentificationIcon class="size-6 text-white" aria-hidden="true" />
                                </span>
                              </div>
                              <div class="min-w-0 flex-1">
                                <div class="text-sm font-medium text-gray-900">
                                  <div>
                                    <span class="absolute inset-0" aria-hidden="true" />
                                    Use the Name from My ID
                                  </div>
                                </div>
                                <p class="text-sm text-gray-500 mt-1">
                                  Automatically update your name to match the one on your identity document.
                                </p>
                              </div>
                              <div class="shrink-0 self-center">
                                <ChevronRightIcon class="size-5 text-gray-400 group-hover:text-gray-500" aria-hidden="true" />
                              </div>
                            </div>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </DialogPanel>
                </TransitionChild>
              </div>
            </div>
          </Dialog>
        </TransitionRoot>
      </template>
    </main>
  </CustomerLayout>
</template>