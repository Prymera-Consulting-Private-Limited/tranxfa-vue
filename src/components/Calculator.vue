<script setup>
import {
  ArrowRightIcon,
  CheckIcon, ChevronDownIcon,
  ClockIcon,
  PaperAirplaneIcon,
  PlusIcon,
  TruckIcon,
  UserIcon, XMarkIcon, DivideIcon, BanknotesIcon, ExclamationTriangleIcon,
    PercentBadgeIcon, InformationCircleIcon
} from "@heroicons/vue/20/solid/index.js";
import {
  Listbox,
  ListboxButton,
  ListboxLabel,
  ListboxOption,
  ListboxOptions,

} from "@headlessui/vue";
import {computed, onMounted, reactive, ref} from "vue";
import { useQuoteUtils } from "@/composables/quote_utils.js";
import MoneyInput from "@/components/MoneyInput.vue";
import MoneyInputShimmer from "@/components/MoneyInputShimmer.vue";
import AmountType from "@/enums/amount_type.js";
import Recipient from "@/models/recipient.js";
import Spinner from "@/components/Spinner.vue";
import router from "@/router/index.js";
import TransactionQuote from "@/models/transaction_quote.js";
import {useRecipientUtils} from "@/composables/recipient_utils.js";
import {useCustomerStore} from "@/stores/customer.js";

const customerStore = useCustomerStore();

/**
 * @type {{data: Customer|null}}
 */
const customer = customerStore.customer;

const pendingPoi = customer.data?.pendingDocuments?.find(cat => cat.code === 'POI');

const props = defineProps({
  recipient: {
    type: Recipient,
    required: false,
    default: null,
  }
})

const isFetchingQuote = ref(true);
const isSavingQuote = ref(false);

const sendMoneyInput = ref(null);
const receiveMoneyInput = ref(null);

const quoteUtil = useQuoteUtils();
const recipientUtil = useRecipientUtils();

const query = reactive({
  amountType: quoteUtil.quote.data?.amountType,
  amount: quoteUtil.quote.data?.amount,
  paymentCountry: quoteUtil.quote.data?.paymentCountry,
  paymentCurrency: quoteUtil.quote.data?.paymentCurrency,
  payoutCountry: props.recipient?.channel?.country || quoteUtil.quote.data?.payoutCountry,
  payoutCurrency: props.recipient?.channel?.currency || quoteUtil.quote.data?.payoutCurrency,
  payoutMethod: props.recipient?.channel?.payoutMethod || quoteUtil.quote.data?.payoutMethod,
  payoutCompany: quoteUtil.quote.data?.payoutCompany,
});

const quoteErrors = reactive({
  payment: [],
  payout: [],
});

const quoteFailureReason = ref('');

async function getQuote() {
  isFetchingQuote.value = true;
  quoteErrors.payment = [];
  quoteErrors.payout = [];
  quoteFailureReason.value = '';
  await quoteUtil.getQuote(query).then(() => {
    query.amountType = quoteUtil.quote.data?.amountType;
    query.amount = quoteUtil.quote.data?.amount;
    query.paymentCountry = quoteUtil.quote.data?.paymentCountry;
    query.paymentCurrency = quoteUtil.quote.data?.paymentCurrency;
    query.payoutCountry = quoteUtil.quote.data?.payoutCountry;
    query.payoutCurrency = quoteUtil.quote.data?.payoutCurrency;
    query.payoutMethod = quoteUtil.quote.data?.payoutMethod;
    query.payoutCompany = quoteUtil.quote.data?.payoutCompany;
    if (quoteUtil.quote.data.alerts?.send_amount) {
      quoteErrors.payment.push(quoteUtil.quote.data.alerts.send_amount);
      quoteErrors.payout = [];
    }
    if (quoteUtil.quote.data.alerts?.payout_amount) {
      quoteErrors.payment = [];
      quoteErrors.payout.push(quoteUtil.quote.data.alerts.payout_amount);
    }
  }).catch((e) => {
    if (e.response.status === 422) {
      const errors = e.response.data.errors;
      if (errors?.amount?.length > 0) {
        if ((query?.amountType || AmountType.SEND) === AmountType.SEND) {
          for (const error of errors.amount) {
            quoteErrors.payment.push(error);
          }
        } else {
          for (const error of errors.amount) {
            quoteErrors.payout.push(error);
          }
        }
      } else if (errors?.send_amount?.length > 0) {
        for (const error of errors.send_amount) {
          quoteErrors.payment.push(error);
        }
      } else if (errors?.payout_amount?.length > 0) {
        for (const error of errors.payout_amount) {
          quoteErrors.payout.push(error);
        }
      }
    } else if (e.response.status === 503) {
      quoteFailureReason.value = e.response.data.message;
    } else {
      console.error(e);
    }
  }).finally(() => {
    isFetchingQuote.value = false;
  });
}

async function sentAmountUpdated(amount) {
  query.amountType = AmountType.SEND;
  query.amount = amount;
  await getQuote();
}

async function sourceUpdated(option) {
  query.paymentCountry = option.country;
  query.paymentCurrency = option.currency;
  await getQuote();
}

async function receiveAmountUpdated(amount) {
  query.amountType = AmountType.RECEIVE;
  query.amount = amount;
  await getQuote();
}

async function targetUpdated(option) {
  query.payoutCountry = option.country;
  query.payoutCurrency = option.currency;
  await getQuote();
}

const selectedPayoutMethod = computed({
  get: () => quoteUtil.quote.data?.payoutMethod,
  set: (value) => {
    query.payoutMethod = value;
    getQuote();
  }
})

onMounted(getQuote)

async function saveQuote() {
  isSavingQuote.value = true;

  // An amount typed without leaving the field has not refreshed the quote yet
  // (blur never fires on Enter-key submission) — re-quote it before saving.
  const pendingSendAmount = sendMoneyInput.value?.pendingAmount() ?? null;
  const pendingReceiveAmount = receiveMoneyInput.value?.pendingAmount() ?? null;
  let requoted = false;
  if (pendingSendAmount !== null) {
    await sentAmountUpdated(pendingSendAmount);
    requoted = true;
  } else if (pendingReceiveAmount !== null) {
    await receiveAmountUpdated(pendingReceiveAmount);
    requoted = true;
  }
  if (requoted && (quoteErrors.payment.length > 0 || quoteErrors.payout.length > 0 || quoteFailureReason.value || quoteUtil.quote.data?.transferDisableReason)) {
    isSavingQuote.value = false;
    return;
  }

  if (props.recipient) {
    recipientUtil.getQuote(props.recipient, quoteUtil.quote.data).then((response) => {
      const quote = TransactionQuote.getInstance(response.data);
      router.push({name: 'transferWizard', params: {quoteId: quote.id}});
    }).catch(() => {
      isSavingQuote.value = false;
    });
  } else {
    quoteUtil.saveQuote(quoteUtil.quote.data).then((response) => {
      const quote = TransactionQuote.getInstance(response.data);
      router.push({name: 'transferWizard', params: {quoteId: quote.id}});
    }).catch(() => {
      isSavingQuote.value = false;
    });
  }

}

</script>
<template>
  <div v-if="quoteFailureReason" class="rounded-b-md bg-red-50 px-8 py-12">
    <div class="flex-col text-center">
      <div class="mx-auto">
        <ExclamationTriangleIcon class="size-8 mt-0.5 text-red-700 mx-auto" aria-hidden="true" />
      </div>
      <div class="mt-3">
        <div class="text-sm text-red-700">
          <p>{{ quoteFailureReason }}</p>
        </div>
      </div>
    </div>
  </div>
  <template v-else>
    <form @submit.prevent="saveQuote" class="flow-root">
      <ul role="list" class="-mb-8">
        <li>
          <div class="relative pb-4">
            <span class="absolute top-6 left-4 -ml-px h-full w-[2px]" :class="[!isFetchingQuote ? 'bg-brand-700' : 'bg-gray-300']" aria-hidden="true" />
            <div class="relative flex space-x-3">
              <div class="flex flex-1 justify-between space-x-4 pt-1.5">
                <div class="flex-1">
                  <div>
                    <div class="flex items-center justify-start">
                    <span :class="['flex size-8 items-center justify-center rounded-full ring-0', ! isFetchingQuote ? 'bg-brand-700' : 'bg-gray-300']">
                      <PaperAirplaneIcon class="size-4 text-white"/>
                    </span>
                      <label :class="[! isFetchingQuote ? 'text-gray-800' : 'text-gray-300']" for="send-money-input" class="block text-sm/6 font-medium ml-2  tracking-wider">You send</label>
                    </div>
                    <div class="mt-2">
                      <MoneyInput
                          v-if="! isFetchingQuote"
                          ref="sendMoneyInput"
                          v-bind:country="quoteUtil.quote.data.paymentCountry"
                          v-bind:currency="quoteUtil.quote.data.paymentCurrency"
                          v-bind:options="quoteUtil.quote.data.sources"
                          v-bind:amount="quoteUtil.quote.data.localAmount"
                          v-bind:inputId="`send-money-input`"
                          v-bind:errors="quoteErrors.payment"
                          v-on:update:amount="sentAmountUpdated"
                          v-on:option:updated="sourceUpdated"
                      />
                      <MoneyInputShimmer v-else />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </li>
        <li>
          <div class="relative pb-4">
            <span class="absolute top-4 left-4 -ml-px h-full w-[2px]" :class="[!isFetchingQuote ? 'bg-brand-700' : 'bg-gray-300']" aria-hidden="true" />
            <div class="relative flex space-x-3">
              <div>
              <span :class="['flex size-8 items-center justify-center rounded-full ring-0', ! isFetchingQuote ? 'bg-brand-700' : 'bg-gray-300']">
                  <DivideIcon v-if="! isFetchingQuote && quoteUtil.quote.data?.exchangeRateIsInverse" class="size-5 text-white"/>
                  <XMarkIcon v-else-if="! isFetchingQuote && !quoteUtil.quote.data?.exchangeRateIsInverse" class="size-4 text-white"/>
                  <BanknotesIcon v-else class="size-4 text-white" />
              </span>
              </div>
              <div class="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                <div>
                  <p v-if="! isFetchingQuote" class="text-sm text-gray-900 font-semibold tracking-wider">{{ quoteUtil.quote.data?.exchangeRateFormatted }}</p>
                  <p v-else class="text-sm bg-gray-300 h-5 w-36 font-semibold tracking-wider pulse"></p>
                </div>
                <div :class="[! isFetchingQuote ? 'text-gray-800' : 'text-gray-300']" class="text-right text-sm whitespace-nowrap font-semibold tracking-wider">
                  <span>Our Rate</span>
                </div>
              </div>
            </div>
          </div>
        </li>
        <li>
          <div class="relative pb-2">
            <span class="absolute top-4 left-4 -ml-px h-full w-[2px]" :class="[! isFetchingQuote ? 'bg-brand-700' : 'bg-gray-300']" aria-hidden="true" />
            <div class="relative flex space-x-3">
              <div>
              <span :class="['flex size-8 items-center justify-center rounded-full ring-0', ! isFetchingQuote ? 'bg-brand-700' : 'bg-gray-300']">
                  <PlusIcon class="size-5 text-white"/>
              </span>
              </div>
              <div class="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                <div>
                  <p v-if="! isFetchingQuote" class="text-sm tracking-wider">
                    <span class="text-emerald-700 font-semibold" v-if="quoteUtil.quote.data.baseFees === 0">Zero</span>
                    <span class="text-gray-700 font-semibold" v-else>{{ quoteUtil.quote.data.baseFeesCurrencyPrefixed }}</span>
                  </p>
                  <p v-else class="text-sm bg-gray-300 h-5 w-24 font-semibold tracking-wider pulse"></p>
                </div>
                <div :class="[! isFetchingQuote ? 'text-gray-800' : 'text-gray-300']" class="text-right text-sm whitespace-nowrap font-semibold tracking-wider">
                  <span>Fees</span>
                </div>
              </div>
            </div>
          </div>
        </li>
        <li>
          <div class="relative pb-4">
            <span class="absolute top-4 left-4 -ml-px h-full w-[2px]" :class="[!isFetchingQuote ? 'bg-brand-700' : 'bg-gray-300']" aria-hidden="true" />
            <div class="relative flex space-x-3">
              <div class="flex flex-1 justify-between space-x-4 pt-1.5">
                <div class="flex-1">
                  <div>
                    <div class="flex items-center justify-start">
                    <span :class="['flex size-8 items-center justify-center rounded-full ring-0', ! isFetchingQuote ? 'bg-brand-700' : 'bg-gray-300']">
                      <UserIcon class="size-4 text-white"/>
                    </span>
                      <label :class="[! isFetchingQuote ? 'text-gray-800' : 'text-gray-300']" for="receive-money-input" class="block text-sm/6 font-medium ml-2 tracking-wider">{{ recipient?.wholeName || 'Recipient' }} Gets</label>
                    </div>
                    <div class="mt-4">
                      <MoneyInput
                          v-if="! isFetchingQuote"
                          ref="receiveMoneyInput"
                          v-bind:country="quoteUtil.quote.data.payoutCountry"
                          v-bind:currency="quoteUtil.quote.data.payoutCurrency"
                          v-bind:options="quoteUtil.quote.data.targets"
                          v-bind:amount="quoteUtil.quote.data.foreignAmount"
                          v-bind:disableSelection="!!recipient"
                          v-bind:inputId="`receive-money-input`"
                          v-bind:errors="quoteErrors.payout"
                          v-on:update:amount="receiveAmountUpdated"
                          v-on:option:updated="targetUpdated"
                      />
                      <MoneyInputShimmer v-else />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </li>
        <li>
          <div class="relative pb-4">
            <span class="absolute top-4 left-4 -ml-px h-full w-[2px]" :class="[!isFetchingQuote ? 'bg-brand-700' : 'bg-gray-300']" aria-hidden="true" />
            <div class="relative flex space-x-3">
              <div class="flex flex-1 justify-between space-x-4 pt-1.5">
                <div class="flex-1">
                  <div>
                    <div class="flex items-center justify-start">
                    <span :class="['flex size-8 items-center justify-center rounded-full ring-0', ! isFetchingQuote ? 'bg-brand-700' : 'bg-gray-300']">
                      <TruckIcon class="size-4 text-white"/>
                    </span>
                      <label :class="[! isFetchingQuote ? 'text-gray-800' : 'text-gray-300']" for="price" class="block text-sm/6 font-medium ml-2 tracking-wider">Delivery Method</label>
                    </div>
                    <div class="mt-4">
                      <Listbox v-if="! isFetchingQuote" as="div" v-model="selectedPayoutMethod">
                        <ListboxLabel class="sr-only">Select or Change Delivery Method</ListboxLabel>
                        <div class="relative">
                          <div  class="flex divide-x divide-brand-700 rounded-md outline-2 outline-brand-700 bg-white w-full">
                            <ListboxButton :class="['flex items-center justify-end rounded-l-none rounded-r-md bg-white px-2 py-3 outline-hidden outline-0 w-full']">
                              <div :class="[quoteUtil.quote?.data?.payoutMethods?.length > 0 && ! recipient ? '' : 'py-3']" class="flex items-center gap-x-1.5 rounded-l-md border-r-0 text-brand-700 px-1 bg-white w-full">
                                <TruckIcon class="-ml-0.5 size-5" aria-hidden="true" />
                                <p class="text-sm font-semibold ml-2">{{ selectedPayoutMethod?.title || 'Please Select' }}</p>
                              </div>
                              <template v-if="quoteUtil.quote?.data?.payoutMethods?.length > 0 && ! recipient" >
                                <span class="sr-only">Select or Change Delivery Method</span>
                                <ChevronDownIcon class="size-5 text-brand-700 forced-colors:text-[Highlight]" aria-hidden="true" />
                              </template>
                            </ListboxButton>
                          </div>

                          <transition v-if="quoteUtil.quote?.data?.payoutMethods?.length > 0 && ! recipient" leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
                            <ListboxOptions class="absolute right-0 z-10 mt-2 w-72 origin-top-right divide-y divide-gray-200 overflow-hidden rounded-md bg-white ring-1 shadow-lg ring-black/5 focus:outline-hidden">
                              <ListboxOption as="template" v-for="payoutMethod in quoteUtil.quote?.data?.payoutMethods" :key="payoutMethod.id" :value="payoutMethod" v-slot="{ active, selectedPayoutMethod }">
                                <li :class="[active ? 'bg-brand-700 text-white' : 'text-gray-900', 'cursor-default p-4 text-sm select-none']">
                                  <div class="flex flex-col">
                                    <div class="flex justify-between">
                                      <p :class="selectedPayoutMethod?.id === payoutMethod.id ? 'font-semibold' : 'font-normal'">{{ payoutMethod.title }}</p>
                                      <span v-if="selectedPayoutMethod?.id === payoutMethod.id" :class="active ? 'text-white' : 'text-brand-700'">
                                      <CheckIcon class="size-5" aria-hidden="true" />
                                    </span>
                                    </div>
                                    <p v-if="payoutMethod.description" :class="[active ? 'text-brand-200' : 'text-gray-500', 'mt-2']">{{ payoutMethod.description }}</p>
                                  </div>
                                </li>
                              </ListboxOption>
                            </ListboxOptions>
                          </transition>
                        </div>
                      </Listbox>
                      <MoneyInputShimmer v-else />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </li>
        <li v-if="quoteUtil.quote?.data?.payoutMethod?.instructions && ! isFetchingQuote">
          <div class="relative pb-2">
            <span class="absolute top-4 left-4 -ml-px h-full w-[2px]" :class="[!isFetchingQuote ? 'bg-brand-700' : 'bg-gray-300']" aria-hidden="true" />
            <div class="relative flex space-x-3">
              <div>
              <span :class="['flex size-8 items-center justify-center rounded-full ring-0', ! isFetchingQuote ? 'bg-brand-700' : 'bg-gray-300']">
                  <InformationCircleIcon class="size-5 text-white"/>
              </span>
              </div>
              <div class="flex min-w-0 flex-1 justify-between space-x-4 pt-0.5">
                <div>
                  <p v-if="! isFetchingQuote" class="text-xs text-gray-900 tracking-wider">{{ quoteUtil.quote?.data?.payoutMethod?.instructions }}</p>
                  <p v-else class="text-sm bg-gray-300 h-5 w-64 font-semibold tracking-wider pulse"></p>
                </div>
              </div>
            </div>
          </div>
        </li>
        <li v-if="quoteUtil.quote?.data?.payoutMethod?.promo && ! isFetchingQuote">
          <div class="relative pb-2">
            <span class="absolute top-4 left-4 -ml-px h-full w-[2px]" :class="[!isFetchingQuote ? 'bg-brand-700' : 'bg-gray-300']" aria-hidden="true" />
            <div class="relative flex space-x-3">
              <div>
              <span :class="['flex size-8 items-center justify-center rounded-full ring-0', ! isFetchingQuote ? 'bg-lime-700' : 'bg-gray-300']">
                  <PercentBadgeIcon class="size-5 text-white"/>
              </span>
              </div>
              <div class="flex min-w-0 flex-1 justify-between space-x-4 pt-0.5">
                <div>
                  <p v-if="! isFetchingQuote" class="text-xs text-lime-700 tracking-wider">{{ quoteUtil.quote?.data?.payoutMethod?.promo }}</p>
                  <p v-else class="text-sm bg-gray-300 h-5 w-64 font-semibold tracking-wider pulse"></p>
                </div>
              </div>
            </div>
          </div>
        </li>
        <li>
          <div class="relative pb-2">

            <div class="relative flex space-x-3">

              <div>
              <span :class="['flex size-8 items-center justify-center rounded-full ring-0', ! isFetchingQuote ? 'bg-brand-700' : 'bg-gray-300']">
                  <ClockIcon class="size-5 text-white"/>
              </span>
              </div>
              <div class="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                <div>
                  <p v-if="! isFetchingQuote" class="text-sm text-brand-700 font-semibold tracking-wider">Fast, Secure Transfers</p>
                  <p v-else class="text-sm bg-gray-300 h-5 w-64 font-semibold tracking-wider pulse"></p>
                </div>
              </div>
            </div>
          </div>
        </li>
      </ul>
      <template v-if="(customer.data?.isBlockedForSending || false) === false">
        <template v-if="quoteUtil.quote?.data?.transferDisableReason">
          <div class="rounded-b-md bg-yellow-50 p-4 mt-12 -mx-5 -mb-8">
            <div class="flex">
              <div class="shrink-0">
                <ExclamationTriangleIcon class="size-5 mt-0.5 text-yellow-400" aria-hidden="true" />
              </div>
              <div class="ml-3">
                <div class="text-sm text-yellow-700">
                  <p>{{ quoteUtil.quote?.data?.transferDisableReason }}</p>
                </div>
              </div>
            </div>
          </div>
        </template>
        <button v-else :disabled="isFetchingQuote || isSavingQuote" :class="[(isFetchingQuote || isSavingQuote) ? 'opacity-75' : 'cursor-pointer']" type="submit" class="mt-12 flex items-center justify-center gap-x-2 rounded-md bg-brand-700 px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 w-full">
          <template v-if="isSavingQuote">
            <Spinner class="-ml-0.5 size-5" aria-hidden="true" />
            Saving ...
          </template>
          <template v-else>
            Send Money
            <ArrowRightIcon class="-mr-0.5 size-5" aria-hidden="true" />
          </template>
        </button>
      </template>
      <div v-else class="rounded-b-md bg-yellow-50 p-4 mt-12 -mx-5 -mb-8">
        <div class="flex">
          <div class="shrink-0">
            <ExclamationTriangleIcon class="size-5 mt-0.5 text-yellow-400" aria-hidden="true" />
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-yellow-800">Your ability to send money is temporarily restricted.</h3>
            <div class="mt-2 text-sm text-yellow-700">
              <p>Please reach out to our customer support team for assistance or to understand the reason behind this restriction.</p>
            </div>
          </div>
        </div>
      </div>
    </form>
    <p v-if="pendingPoi" class="mt-5 text-gray-700 text-sm/6 text-justify"><router-link class="text-brand-700 hover:underline" :to="{name: 'accountVerification'}">KYC verification</router-link> is required before you can send money. This is a one-time process to ensure your account and transactions are secure.</p>
  </template>
</template>

<style scoped>
@keyframes heartbeat-opacity {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.pulse {
  animation: heartbeat-opacity 1.5s infinite ease-in-out;
}
</style>