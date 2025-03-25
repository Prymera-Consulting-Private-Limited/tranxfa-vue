<script setup>
import CustomerLayout from "@/components/CustomerLayout.vue";
import {onMounted, onUnmounted, reactive, ref} from "vue";
import {useTransactionUtils} from "@/composables/transaction_utils.js";
import Transaction from "@/models/transaction.js";
import {useTimeUtils} from "@/composables/time_utils.js";
import {useColorUtils} from "@/composables/color_utils.js";
import {
  RocketLaunchIcon,
  CalendarDaysIcon,
  CreditCardIcon,
  PlusCircleIcon,
  UserCircleIcon,
  CalculatorIcon,
} from '@heroicons/vue/24/outline'
import moment from "moment";
import TransactionStateIcon from "@/enums/transaction_state_icon.js";
import RecipientDataType from "@/enums/recipient_data_type.js";
import TransasctionState from "@/models/transaction_state.js";

const transactionUtils = useTransactionUtils();
const timeUtils = useTimeUtils();
const colorUtils = useColorUtils();

const props = defineProps({
  id: {
    type: String,
    required: true
  }
});

const isLoading = ref(false);

const transaction = reactive({
  data: null
});

const getTransaction = async () => {
  isLoading.value = true;
  await transactionUtils.getTransaction(props.id).then((response) => {
    transaction.data = Transaction.getInstance(response.data);
  })
  isLoading.value = false;
}

onMounted(async () => {
  await getTransaction()
  Echo.channel(`client-transaction.${transaction.data.id}`)
      .listen('TransactionStateUpdated', (e) => {
        getTransaction();
      });
});

onUnmounted(async () => {
  Echo.leaveChannel(`client-transaction.${transaction.data.id}`);
})

</script>

<template>
  <CustomerLayout>
    <main class="-mt-24 py-8">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <template v-if="isLoading">
          <div class="mx-auto grid max-w-2xl grid-cols-1 grid-rows-1 items-start gap-x-8 gap-y-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
            <!-- Invoice summary -->
            <div class="lg:col-start-3 lg:row-end-1">
              <h2 class="sr-only">Summary</h2>
              <div class="rounded-lg bg-white ring-1 shadow-xs ring-gray-900/5">
                <dl class="flex flex-wrap animate-pulse">
                  <div class="flex-auto py-6 pl-6">
                    <dt class="text-sm/6 font-semibold text-gray-900">Total Amount</dt>
                    <dd class="mt-1 h-4 w-32 bg-gray-300 rounded"></dd>
                  </div>
                  <div class="flex-none self-end px-6 py-4">
                    <dt class="sr-only">Status</dt>
                    <dd class="rounded-md bg-gray-300 h-6 w-12"></dd>
                  </div>
                </dl>
              </div>
            </div>

            <!-- Invoice -->
            <div class="-mx-4 px-4 py-8 ring-1 bg-white shadow-xs ring-gray-200 sm:mx-0 sm:rounded-lg sm:px-8 sm:pb-14 lg:col-span-2 lg:row-span-2 lg:row-end-2 xl:px-16 xl:pt-16 xl:pb-20 ">
              <h2 class="text-base font-semibold text-gray-900 animate-pulse">Transaction #</h2>
              <div class="col-span-2">
                <div class="border-l-4 border-1 border-gray-300 rounded-md mt-4 p-4 bg-gray-200 h-10 animate-pulse"></div>
              </div>
              <dl class="mt-6 grid grid-cols-1 text-sm/6 sm:grid-cols-2 animate-pulse">
                <div class="sm:pr-4 h-4 bg-gray-300 w-32"></div>
                <div class="mt-2 sm:mt-0 sm:pl-4 h-4 bg-gray-300 w-32"></div>
                <div class="mt-6 border-t border-gray-900/5 pt-6 sm:pr-4 h-4 bg-gray-300 w-48"></div>
                <div class="mt-8 sm:mt-6 sm:border-t sm:border-gray-900/5 sm:pt-6 sm:pl-4 h-4 bg-gray-300 w-48"></div>
              </dl>
            </div>
          </div>
        </template>
        <div v-else class="mx-auto grid max-w-2xl grid-cols-1 grid-rows-1 items-start gap-x-8 gap-y-8 lg:mx-0 lg:max-w-none lg:grid-cols-3" v-if="transaction.data">
          <!-- Invoice summary -->
          <div class="lg:col-start-3 lg:row-end-1">
            <h2 class="sr-only">Summary</h2>
            <div class="rounded-lg bg-white ring-1 shadow-xs ring-gray-900/5">
              <dl class="flex flex-wrap">
                <div class="flex-auto pt-6 pl-6">
                  <dt class="text-sm/6 font-semibold text-gray-900">Total Amount</dt>
                  <dd class="mt-1 text-base font-semibold text-gray-900">{{ transaction.data.localAmountCurrencyPrefixed }}</dd>
                </div>
                <div class="flex-none self-end px-6 pt-4">
                  <dt class="sr-only">Status</dt>
                  <dd class="rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-600 ring-1 ring-green-600/20 ring-inset">Paid</dd>
                </div>
                <div class="mt-6 flex w-full flex-none gap-x-4 border-t border-gray-900/5 px-6 pt-6">
                  <dt class="flex-none">
                    <span class="sr-only">Client</span>
                    <RocketLaunchIcon class="h-6 w-5 text-gray-400" aria-hidden="true" />
                  </dt>
                  <dd class="text-sm/6 font-medium text-gray-900">{{ transaction.data.localAmountCurrencyPrefixed }}</dd>
                </div>
                <div class="mt-4 flex w-full flex-none gap-x-4 px-6">
                  <dt class="flex-none">
                    <span class="sr-only">Due date</span>
                    <PlusCircleIcon class="h-6 w-5 text-gray-400" aria-hidden="true" />
                  </dt>
                  <dd class="text-sm/6 text-gray-500">
                    {{ transaction.data.baseFeesCurrencyPrefixed }}
                  </dd>
                </div>
<!--                <div class="mt-4 flex w-full flex-none gap-x-4 px-6">-->
<!--                  <dt class="flex-none">-->
<!--                    <span class="sr-only">Status</span>-->
<!--                    <CalculatorIcon class="h-6 w-5 text-gray-400" aria-hidden="true" />-->
<!--                  </dt>-->
<!--                  <dd class="text-sm/6 text-gray-500">{{ transaction.data.localAmountCurrencyPrefixed }}</dd>-->
<!--                </div>-->
<!--                <div class="mt-6 flex w-full flex-none gap-x-4 border-t border-gray-900/5 px-6 pt-6">-->
<!--                  <dt class="flex-none">-->
<!--                    <span class="sr-only">Account Holder Name</span>-->
<!--                    <UserCircleIcon class="h-6 w-5 text-gray-400" aria-hidden="true" />-->
<!--                  </dt>-->
<!--                  <dd class="text-sm/6 font-medium text-gray-900">{{ transaction.data.payment.paymentAccount.accountHolderName }}</dd>-->
<!--                </div>-->
<!--                <div class="mt-4 flex w-full flex-none gap-x-4 px-6">-->
<!--                  <dt class="flex-none">-->
<!--                    <span class="sr-only">Due date</span>-->
<!--                    <CalendarDaysIcon class="h-6 w-5 text-gray-400" aria-hidden="true" />-->
<!--                  </dt>-->
<!--                  <dd class="text-sm/6 text-gray-500">-->
<!--                    <time datetime="2023-01-31">January 31, 2023</time>-->
<!--                  </dd>-->
<!--                </div>-->
<!--                <div class="mt-4 flex w-full flex-none gap-x-4 px-6" v-if="transaction.data?.payment?.paymentAccount">-->
<!--                  <dt class="flex-none">-->
<!--                    <span class="sr-only">Status</span>-->
<!--                    <CreditCardIcon class="h-6 w-5 text-gray-400" aria-hidden="true" />-->
<!--                  </dt>-->
<!--                  <dd class="text-sm/6 text-gray-500">Paid with {{ transaction.data.payment.paymentAccount?.institution }} {{ transaction.data.payment.paymentAccount?.accountNumber }}</dd>-->
<!--                </div>-->
              </dl>
              <div v-if="false" class="mt-6 border-t border-gray-900/5 px-6 py-6">
                <a href="#" class="text-sm/6 font-semibold text-gray-900">Download receipt <span aria-hidden="true">&rarr;</span></a>
              </div>
            </div>
          </div>

          <!-- Invoice -->
          <div class="-mx-4 px-4 py-8 ring-1 bg-white shadow-xs ring-gray-200 sm:mx-0 sm:rounded-lg sm:px-8 sm:pb-14 lg:col-span-2 lg:row-span-2 lg:row-end-2 xl:px-16 xl:pt-16 xl:pb-20">
            <h2 class="text-base font-semibold text-gray-900">Transaction #{{ transaction.data.transactionNumber }}</h2>
            <div class="col-span-2">
              <div  :style="{
                 backgroundColor: colorUtils.getStyleValue(transaction.data.state.colorScheme, 50),
                 borderColor: colorUtils.getStyleValue(transaction.data.state.colorScheme, 400),
               }" class="border-l-4 border-1 rounded-md mt-4 p-4">
                <div class="flex">
                  <div class="shrink-0">
                    <component :style="{
                         color: colorUtils.getStyleValue(transaction.data.state.colorScheme, 600),
                       }" :is="TransactionStateIcon[transaction.data.state.code]" class="size-5" />
                  </div>
                  <div class="ml-3">
                    <p :style="{
                         color: colorUtils.getStyleValue(transaction.data.state.colorScheme, 600),
                       }" class="text-sm">
                      {{ transaction.data.state.description }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <dl class="mt-6 grid grid-cols-1 text-sm/6 sm:grid-cols-2">
              <div class="sm:pr-4">
                <dt class="inline text-gray-500">Date</dt>
                {{  }}
                <dd class="inline text-gray-700"><time :datetime="transaction.data.createdAt">{{ moment(transaction.data.createdAt).format('MMMM D, YYYY hh:mm A') }}</time></dd>
              </div>
              <div class="mt-2 sm:mt-0 sm:pl-4">
                <dt class="inline text-gray-500">Updated on</dt>
                {{ ' ' }}
                <dd class="inline text-gray-700"><time :datetime="transaction.data.updatedAt">{{ moment(transaction.data.updatedAt).format('MMMM D, YYYY hh:mm A') }}</time></dd>
              </div>
              <div class="mt-6 border-t border-gray-900/5 pt-6 sm:pr-4">
                <dt class="font-semibold text-gray-900">Sending from <span class="text-purple-700">{{ transaction.data.paymentCountry.commonName }}</span></dt>
                <dd class="mt-2 text-gray-500 flex flex-col">
                  <span class="font-medium text-gray-900">Dhruv Patel</span>
                  <span class="text-gray-900">{{ transaction.data.localAmountCurrencyPrefixed }}</span>
                  <span class="">{{ transaction.data.payment.paymentMethod.title }}</span>
                </dd>
              </div>
              <div class="mt-8 sm:mt-6 sm:border-t sm:border-gray-900/5 sm:pt-6 sm:pl-4">
                <dt class="font-semibold text-gray-900">Payout in {{ transaction.data.payoutCountry.commonName }}</dt>
                <dd class="mt-2 text-gray-500 flex flex-col">
                  <span class="font-medium text-gray-900">{{ transaction.data.recipient.fullName }}</span>
                  <span class="text-gray-900">{{ transaction.data.foreignAmountCurrencyPrefixed }} <span class="text-gray-700">@ {{ transaction.data.exchangeRateFormatted }}</span></span>
                  <span class="">{{ transaction.data.payoutMethod.title }}</span>
                </dd>
              </div>
              <div class="col-span-2 mt-8 sm:mt-6 border-t border-gray-900/5">
                <div class="py-6">
                  <h2 id="applicant-information-title" class="text-small font-medium text-gray-900">Recipient Information</h2>
                  <p class="mt-1 max-w-2xl text-sm text-gray-500">{{ transaction.data.payoutMethod.title }} in {{ transaction.data.payoutCountry.commonName }}</p>
                </div>
                <div class="">
                  <dl class="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
                    <div class="sm:col-span-1">
                      <dt class="text-sm font-medium text-gray-500">Full Name</dt>
                      <dd class="mt-1 text-sm text-gray-900">{{ transaction.data.recipient.fullName }}</dd>
                    </div>
                    <div v-for="attribute in transaction.data.recipient.attributes" class="sm:col-span-1">
                      <dt class="text-sm font-medium text-gray-500">{{ attribute.label }}</dt>
                      <dd v-if="attribute.type === RecipientDataType.MOBILE_NUMBER" class="mt-1 text-sm text-gray-900">+{{ attribute.value?.country?.callingCode }} {{  attribute.value?.number }}</dd>
                      <dd v-else class="mt-1 text-sm text-gray-900">{{ attribute.value }}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </main>
  </CustomerLayout>
</template>