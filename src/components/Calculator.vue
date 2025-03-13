<script setup>
import {
  ArrowRightIcon,
  CheckIcon, ChevronDownIcon,
  ClockIcon,
  PaperAirplaneIcon,
  PlusIcon,
  TruckIcon,
  UserIcon, XMarkIcon
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

const isFetchingQuote = ref(true);

const quoteUtil = useQuoteUtils();

const query = reactive({
  amountType: quoteUtil.quote.data?.amountType,
  amount: quoteUtil.quote.data?.amount,
  paymentCountry: quoteUtil.quote.data?.paymentCountry,
  paymentCurrency: quoteUtil.quote.data?.paymentCurrency,
  payoutCountry: quoteUtil.quote.data?.payoutCountry,
  payoutCurrency: quoteUtil.quote.data?.payoutCurrency,
  payoutMethod: quoteUtil.quote.data?.payoutMethod,
  payoutCompany: quoteUtil.quote.data?.payoutCompany,
});

async function getQuote() {
  isFetchingQuote.value = true;
  await quoteUtil.getQuote(query).then(() => {
    query.amountType = quoteUtil.quote.data?.amountType;
    query.amount = quoteUtil.quote.data?.amount;
    query.paymentCountry = quoteUtil.quote.data?.paymentCountry;
    query.paymentCurrency = quoteUtil.quote.data?.paymentCurrency;
    query.payoutCountry = quoteUtil.quote.data?.payoutCountry;
    query.payoutCurrency = quoteUtil.quote.data?.payoutCurrency;
    query.payoutMethod = quoteUtil.quote.data?.payoutMethod;
    query.payoutCompany = quoteUtil.quote.data?.payoutCompany;
  });
  isFetchingQuote.value = false;
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
</script>
<template>
  <div class="flow-root">
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
                        v-bind:country="quoteUtil.quote.data.paymentCountry"
                        v-bind:currency="quoteUtil.quote.data.paymentCurrency"
                        v-bind:options="quoteUtil.quote.data.sources"
                        v-bind:amount="quoteUtil.quote.data.localAmount"
                        v-bind:inputId="`send-money-input`"
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
                  <XMarkIcon class="size-5 text-white"/>
              </span>
            </div>
            <div class="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
              <div>
                <p v-if="! isFetchingQuote" class="text-sm text-gray-900 font-semibold tracking-wider">{{ quoteUtil.quote.data?.exchangeRate }}</p>
                <p v-else class="text-sm bg-gray-300 h-5 w-36 font-semibold tracking-wider pulse"></p>
              </div>
              <div :class="[! isFetchingQuote ? 'text-gray-800' : 'text-gray-300']" class="text-right text-sm whitespace-nowrap font-semibold tracking-wider">
                <span>Exchange Rate</span>
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
                <p v-if="! isFetchingQuote" class="text-sm text-emerald-700 font-semibold tracking-wider">Zero</p>
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
                    <label :class="[! isFetchingQuote ? 'text-gray-800' : 'text-gray-300']" for="receive-money-input" class="block text-sm/6 font-medium ml-2 tracking-wider">Recipient Gets</label>
                  </div>
                  <div class="mt-4">
                    <MoneyInput
                        v-if="! isFetchingQuote"
                        v-bind:country="quoteUtil.quote.data.payoutCountry"
                        v-bind:currency="quoteUtil.quote.data.payoutCurrency"
                        v-bind:options="quoteUtil.quote.data.targets"
                        v-bind:amount="quoteUtil.quote.data.foreignAmount"
                        v-bind:inputId="`receive-money-input`"
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
                          <div :class="[quoteUtil.quote?.data?.payoutMethods?.length > 0 ? '' : 'py-3']" class="flex items-center gap-x-1.5 rounded-l-md border-r-0 text-brand-700 px-3 bg-white w-full">
                            <TruckIcon class="-ml-0.5 size-5" aria-hidden="true" />
                            <p class="text-sm font-semibold ml-2">{{ selectedPayoutMethod?.title || 'Please Select' }}</p>
                          </div>
                          <ListboxButton :class="['flex items-center justify-end rounded-l-none rounded-r-md bg-white px-2 py-3 mt-1 outline-hidden outline-0 w-full']">
                            <template v-if="quoteUtil.quote?.data?.payoutMethods?.length > 0" >
                              <span class="sr-only">Select or Change Delivery Method</span>
                              <ChevronDownIcon class="size-5 text-brand-700 forced-colors:text-[Highlight]" aria-hidden="true" />
                            </template>
                          </ListboxButton>
                        </div>

                        <transition v-if="quoteUtil.quote?.data?.payoutMethods?.length > 0" leave-active-class="transition ease-in duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
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
                                  <p :class="[active ? 'text-purple-200' : 'text-gray-500', 'mt-2']">{{ payoutMethod.description }}</p>
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
                <p v-if="! isFetchingQuote" class="text-sm text-brand-700 font-semibold tracking-wider">Blazing Fast, Instant Transfers</p>
                <p v-else class="text-sm bg-gray-300 h-5 w-64 font-semibold tracking-wider pulse"></p>
              </div>
            </div>
          </div>
        </div>
      </li>
    </ul>
    <button  :class="[! isFetchingQuote ? '' : 'opacity-75']" type="button" class="mt-12 flex items-center justify-center gap-x-2 rounded-md bg-brand-700 px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 w-full">
      Send Money
      <ArrowRightIcon class="-mr-0.5 size-5" aria-hidden="true" />
    </button>
  </div>
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