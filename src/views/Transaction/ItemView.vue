<script setup>
import CustomerLayout from "@/components/CustomerLayout.vue";
import {onMounted, onUnmounted, reactive, ref} from "vue";
import {useTransactionUtils} from "@/composables/transaction_utils.js";
import Transaction from "@/models/transaction.js";
import {useColorUtils} from "@/composables/color_utils.js";
import {
  RocketLaunchIcon,
  CreditCardIcon,
  PlusCircleIcon,
  CalculatorIcon,
  ArrowUpTrayIcon
} from '@heroicons/vue/24/outline'
import moment from "moment";
import TransactionStateIcon from "@/enums/transaction_state_icon.js";
import RecipientDataType from "@/enums/recipient_data_type.js";
import PaymentState from "@/enums/payment_state.js";
import TransactionState from "@/enums/transaction_state.js";
import router from "@/router/index.js";
import {Dialog, DialogPanel, TransitionChild, TransitionRoot} from "@headlessui/vue";
import ManualPayment from "@/components/Payment/ManualPayment.vue";
import PagaPayment from "@/components/Payment/PagaPayment.vue";
import Monoova from "@/components/Payment/Monoova.vue";
import {useCustomerStore} from "@/stores/customer.js";

const transactionUtils = useTransactionUtils();
const colorUtils = useColorUtils();
const customerStore = useCustomerStore();

const FIRST_PURCHASE_TRACKED_KEY = 'fbq_first_purchase_tracked';

function isPaymentCompleted(payment) {
  const code = payment?.state?.code;
  return code === PaymentState.AUTHORIZED || code === PaymentState.CAPTURED;
}

function trackFirstPurchase(transactionData) {
  if (!isPaymentCompleted(transactionData.payment)) {
    return;
  }

  const customerId = customerStore.customer.data?.id;
  if (!customerId) {
    return;
  }

  const trackedKey = `${FIRST_PURCHASE_TRACKED_KEY}_${customerId}`;
  if (localStorage.getItem(trackedKey)) {
    return;
  }

  if (typeof window.fbq === 'function') {
    window.fbq('track', 'Purchase', {
      value: transactionData.localAmount,
      currency: transactionData.paymentCurrency?.isoAlpha,
    });
    localStorage.setItem(trackedKey, '1');
  }
}

const props = defineProps({
  id: {
    type: String,
    required: true
  }
});

const isLoading = ref(false);

/**
 * @type {Reactive<{data: Transaction|null}>}
 */
const transaction = reactive({
  data: null
});

const getTransaction = async () => {
  isLoading.value = true;
  await transactionUtils.getTransaction(props.id).then((response) => {
    transaction.data = Transaction.getInstance(response.data);
    trackFirstPurchase(transaction.data);
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

const isShowPaymentAccountModalOpen = ref(false);
</script>

<template>
  <CustomerLayout>
    <main class="-mt-24 py-8 print:mt-0 print:py-0">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <template v-if="isLoading">
          <div class="mx-auto grid max-w-2xl grid-cols-1 grid-rows-1 items-start gap-x-8 gap-y-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
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
          </div>
        </template>
        <div v-else class="mx-auto grid max-w-2xl grid-cols-1 grid-rows-1 items-start gap-x-8 gap-y-8 lg:mx-0 lg:max-w-none lg:grid-cols-3" v-if="transaction.data">
          <!-- Invoice -->
          <div class="-mx-4 px-4 py-8 print:px-0 print:py-4 print:ring-0 print:shadow-none ring-1 bg-white shadow-xs ring-gray-200 sm:mx-0 sm:rounded-lg sm:px-8 sm:pb-14 lg:col-span-2 lg:row-span-2 lg:row-end-2 xl:px-16 xl:pt-16 xl:pb-20">
            <div class="mb-6 hidden print:block">
              <img src="/images/logo.png" alt="RemitSo Logo" class="max-h-10 max-w-48" />
            </div>
            <h2 class="text-base font-semibold text-gray-900">Transaction #{{ transaction.data.transactionNumber }}</h2>
            <div v-if="transaction.data.state.code === TransactionState['PENDING-PAYMENT'] && transaction.data.payment.clientPaymentAccount">
              <div :style="{
                 backgroundColor: colorUtils.getStyleValue(transaction.data.state.colorScheme, 50),
                 borderColor: colorUtils.getStyleValue(transaction.data.state.colorScheme, 400),
               }" class="border-l-4 border-1 rounded-md mt-4 p-4">
                <div class="flex">
                  <div class="shrink-0">
                    <component :style="{
                         color: colorUtils.getStyleValue(transaction.data.state.colorScheme, 600),
                       }" :is="TransactionStateIcon[transaction.data.state.code]" class="size-5 mt-1" />
                  </div>
                  <div class="ml-3">
                    <p v-if="transaction.data.payment.customerConfirmedPayment" :style="{
                         color: colorUtils.getStyleValue(transaction.data.state.colorScheme, 600),
                       }" class="text-sm leading-6">
                      {{ transaction.data.payment.clientPaymentAccount.waitTimeMessage }}
                    </p>
                    <p v-else :style="{
                         color: colorUtils.getStyleValue(transaction.data.state.colorScheme, 600),
                       }" class="text-sm leading-6">
                      {{ transaction.data.state.description }}
                    </p>
                    <div :style="{
                         color: colorUtils.getStyleValue(transaction.data.state.colorScheme, 600),
                       }" class="text-sm leading-6 mt-2">
                      <a href="javascript:" @click="isShowPaymentAccountModalOpen = true" class="font-semibold text-sm hover:underline">View Our {{ transaction.data.payment.paymentMethod.title }} Account</a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="col-span-2">
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
            <div v-if="transaction.data.pendingDocuments.length > 0 && (transaction.data.state.code === TransactionState['DOCUMENT-REQUIRED'] || transaction.data.state.code === TransactionState['ADDITIONAL-DOCUMENT-REQUIRED'])">
              <ul role="list" class="mt-4 grid grid-cols-1 gap-5">
                <template v-for="document in transaction.data.pendingDocuments" :key="document.id">
                  <li @click="router.push({name: 'categoryView', params: {category: document.documentCategory.id}, query: {'_rtr': 'viewTransaction', '_rti': transaction.data.id}})" class="col-span-1 flex rounded-md shadow-xs cursor-pointer">
                    <div class="flex flex-1 items-center justify-between rounded-l-md rounded-r-md border border-yellow-200 bg-yellow-50">
                      <div class="flex-1 px-4 py-2 text-sm">
                        <p class="font-medium text-yellow-700">{{ document.documentCategory.title }}</p>
                        <p class="text-yellow-600 leading-6">Upload your {{ document.documentCategory.title.toLowerCase() }} to process the transaction</p>
                      </div>
                      <div class="shrink-0 px-3 text-yellow-700">
                        <ArrowUpTrayIcon class="size-5" aria-hidden="true" />
                      </div>
                    </div>
                  </li>
                </template>
              </ul>
            </div>
            <dl class="mt-6 grid grid-cols-1 text-sm/6 lg:grid-cols-2">
              <div class="sm:pr-4 col-span-2 sm:col-span-1">
                <dt class="inline text-gray-500">Fecha</dt>
                {{  }}
                <dd class="inline text-gray-700"><time :datetime="transaction.data.createdAt">{{ moment(transaction.data.createdAt).format('MMMM D, YYYY hh:mm A') }}</time></dd>
              </div>
              <div class="mt-2 sm:mt-0 sm:pl-4 col-span-2 sm:col-span-1">
                <dt class="inline text-gray-500">Actualizado el</dt>
                {{ ' ' }}
                <dd class="inline text-gray-700"><time :datetime="transaction.data.updatedAt">{{ moment(transaction.data.updatedAt).format('MMMM D, YYYY hh:mm A') }}</time></dd>
              </div>
              <div class="mt-6 border-t border-gray-900/5 pt-6 sm:pr-4 col-span-2 sm:col-span-1">
                <dt class="font-semibold text-gray-900">Envías desde <span class="text-brand-700">{{ transaction.data.paymentCountry.commonName }}</span></dt>
                <dd class="mt-2 text-gray-500 flex flex-col">
                  <span class="font-medium text-gray-900">Enviaste</span>
                  <span class="text-gray-900">{{ transaction.data.localAmountCurrencyPrefixed }}</span>
                  <span class="">{{ transaction.data.payment.paymentMethod.title }}</span>
                </dd>
              </div>
              <div class="mt-8 sm:mt-6 sm:border-t sm:border-gray-900/5 sm:pt-6 sm:pl-4 col-span-2 sm:col-span-1">
                <dt class="font-semibold text-gray-900">Pago en {{ transaction.data.payoutCountry.commonName }}</dt>
                <dd class="mt-2 text-gray-500 flex flex-col">
                  <span class="font-medium text-gray-900">{{ transaction.data.recipient.wholeName }}</span>
                  <span class="text-gray-900">{{ transaction.data.foreignAmountCurrencyPrefixed }} <span class="text-gray-700">@ {{ transaction.data.exchangeRateFormatted }}</span></span>
                  <span class="">{{ transaction.data.payoutMethod.title }}</span>
                  <span v-if="transaction.data.payout.collectionPin" :class="transaction.data.payout.collectionPinAvailable ? 'text-gray-900 font-semibold' : 'text-yellow-700 text-xs mt-1'" class="">
                    <template v-if="transaction.data.payout.collectionPinAvailable">Collection PIN: </template>
                    {{ transaction.data.payout.collectionPin }}
                  </span>
                </dd>
              </div>
              <div class="col-span-2 mt-8 sm:mt-6 border-t border-gray-900/5">
                <div class="py-6">
                  <h2 id="applicant-information-title" class="text-small font-medium text-gray-900">Datos del beneficiario</h2>
                  <p class="mt-1 max-w-2xl text-sm text-gray-500">{{ transaction.data.payoutMethod.title }} in {{ transaction.data.payoutCountry.commonName }}</p>
                </div>
                <div class="">
                  <dl class="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
                    <div class="sm:col-span-1">
                      <dt class="text-sm font-medium text-gray-500">Nombre</dt>
                      <dd class="mt-1 text-sm text-gray-900">{{ transaction.data.recipient.wholeName }}</dd>
                    </div>
                    <div class="sm:col-span-1">
                      <dt class="text-sm font-medium text-gray-500">Relación</dt>
                      <dd class="mt-1 text-sm text-gray-900">{{ transaction.data.recipient.relationship.title }}</dd>
                    </div>
                    <template v-for="attribute in transaction.data.recipient.attributes">
                      <div class="sm:col-span-1" v-if="[RecipientDataType.NAME, RecipientDataType.SECOND_NAME, RecipientDataType.THIRD_NAME].includes(attribute.type) === false">
                        <dt class="text-sm font-medium text-gray-500">{{ attribute.label }}</dt>
                        <dd v-if="attribute.type === RecipientDataType.MOBILE_NUMBER" class="mt-1 text-sm text-gray-900">+{{ attribute.value?.country?.callingCode }} {{  attribute.value?.number }}</dd>
                        <dd v-else-if="attribute.type === RecipientDataType.DELIVERY_OPTION" class="mt-1 text-sm text-gray-900">{{  attribute.value?.title }}</dd>
                        <dd v-else-if="attribute.type === RecipientDataType.SUB_DELIVERY_OPTION" class="mt-1 text-sm text-gray-900">{{  attribute.value?.title }}</dd>
                        <dd v-else-if="attribute.type === RecipientDataType.SELECT" class="mt-1 text-sm text-gray-900">{{  attribute.value?.title }}</dd>
                        <dd v-else class="mt-1 text-sm text-gray-900">{{ attribute.value }}</dd>
                      </div>
                    </template>
                  </dl>
                </div>
              </div>
              <div class="col-span-2 print:grid grid-cols-2 mt-8 sm:mt-6 border-t border-gray-900/5 hidden py-3">
                <div class="py-3">
                  <h2 id="applicant-information-title" class="text-small font-medium text-gray-900">Importe enviado</h2>
                  <p class="mt-1 max-w-2xl text-sm text-gray-500">El total <span class="font-medium">{{ transaction.data.localAmountCurrencyPrefixed }}</span></p>
                </div>
                <div class="py-3">
                  <h2 id="applicant-information-title" class="text-small font-medium text-gray-900">Tarifa</h2>
                  <p class="mt-1 max-w-2xl text-sm text-gray-500">El total <span class="font-medium">{{ transaction.data.baseFeesCurrencyPrefixed }}</span></p>
                </div>
                <div class="py-3">
                  <h2 id="applicant-information-title" class="text-small font-medium text-gray-900">Importe total</h2>
                  <p class="mt-1 max-w-2xl text-sm text-gray-500">El total <span class="font-medium">{{ transaction.data.payment.totalPaymentAmountCurrencyPrefixed }}</span></p>
                </div>
                <div class="py-3">
                  <h2 v-if="false" id="applicant-information-title" class="text-small font-medium text-gray-900">Estado del pago</h2>
                  <p v-if="false" class="mt-1 max-w-2xl text-sm text-gray-500">
                    <span v-if="transaction.data?.payment?.state?.code === PaymentState.PENDING || transaction.data?.payment?.state?.code === PaymentState.CREATED  || transaction.data?.payment?.state?.code === PaymentState.INITIALIZED" class="text-sm font-medium">Pendiente</span>
                    <span v-else-if="transaction.data?.payment?.state?.code === PaymentState.FAILED" class="text-sm font-medium">Fallida</span>
                    <span v-else class="text-sm font-medium">Pagada</span>
                  </p>
                </div>
              </div>
            </dl>
          </div>
          <div class="lg:col-start-3 lg:row-end-1 print:hidden">
            <h2 class="sr-only">Resumen</h2>
            <div class="rounded-lg bg-white ring-1 shadow-xs ring-gray-900/5">
              <dl class="flex items-center flex-wrap">
                <div class="flex-auto pt-6 pl-6">
                  <dt class="text-sm/6 font-semibold text-gray-900">Importe total</dt>
                  <dd class="text-base font-semibold text-gray-900">{{ transaction.data.totalPaymentAmountCurrencyPrefixed }}</dd>
                </div>
                <div v-if="false" class="flex-none px-6">
                  <dt class="sr-only">Estado</dt>
                  <dd v-if="transaction.data?.payment?.state?.code === PaymentState.PENDING || transaction.data?.payment?.state?.code === PaymentState.CREATED  || transaction.data?.payment?.state?.code === PaymentState.INITIALIZED" class="rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-600 ring-1 ring-yellow-600/20 ring-inset">Pendiente</dd>
                  <dd v-else-if="transaction.data?.payment?.state?.code === PaymentState.FAILED" class="rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-600 ring-1 ring-red-600/20 ring-inset">Fallida</dd>
                  <dd v-else class="rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-600 ring-1 ring-green-600/20 ring-inset">Pagada</dd>
                </div>
                <div class="mt-6 flex w-full flex-none gap-x-4 border-t border-gray-900/5 px-6 pt-6">
                  <dt class="flex-none">
                    <span class="sr-only">Cliente</span>
                    <RocketLaunchIcon class="h-6 w-5 text-brand-500" aria-hidden="true" />
                  </dt>
                  <dd class="text-sm/6 text-gray-900"><span class="font-semibold">Sent Amount</span><br />{{ transaction.data.localAmountCurrencyPrefixed }}</dd>
                </div>
                <div class="mt-4 flex w-full flex-none gap-x-4 px-6">
                  <dt class="flex-none">
                    <span class="sr-only">Honorarios</span>
                    <PlusCircleIcon class="h-6 w-5 text-brand-500" aria-hidden="true" />
                  </dt>
                  <dd class="text-sm/6 text-gray-900"><span class="font-semibold">Fees</span><br />{{ transaction.data.baseFeesCurrencyPrefixed }}</dd>
                </div>
                <div class="mt-4 flex w-full flex-none gap-x-4 px-6">
                  <dt class="flex-none">
                    <span class="sr-only">Total</span>
                    <CalculatorIcon class="h-6 w-5 text-brand-500" aria-hidden="true" />
                  </dt>
                  <dd class="text-sm/6 text-gray-900"><span class="font-semibold">Total</span><br />{{ transaction.data.payment.totalPaymentAmountCurrencyPrefixed }}</dd>
                </div>
                <div class="mt-4 mb-4 flex w-full flex-none gap-x-4 px-6" v-if="transaction.data?.payment?.paymentAccount">
                  <dt class="flex-none">
                    <span class="sr-only">Estado</span>
                    <CreditCardIcon class="h-6 w-5 text-brand-500" aria-hidden="true" />
                  </dt>
                  <dd class="text-sm/6 text-gray-900"><span class="font-semibold">Método de pago</span><br />{{ transaction.data.payment.paymentAccount?.institution }}<br />{{ transaction.data.payment.paymentAccount?.accountNumber }}</dd>
                </div>
              </dl>
              <div class="mt-6 border-t border-gray-900/5 px-6 py-6 print:hidden">
                <a href="javascript:window.print()" class="text-sm/6 font-semibold text-gray-900">Imprimir comprobante<span aria-hidden="true">&rarr;</span></a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </CustomerLayout>
  <TransitionRoot as="template" :show="isShowPaymentAccountModalOpen">
    <Dialog class="relative z-10" @close="isShowPaymentAccountModalOpen = false">
      <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0" enter-to="opacity-100" leave="ease-in duration-200" leave-from="opacity-100" leave-to="opacity-0">
        <div class="fixed inset-0 bg-gray-500/75 transition-opacity" />
      </TransitionChild>
      <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95" enter-to="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-200" leave-from="opacity-100 translate-y-0 sm:scale-100" leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
            <DialogPanel class="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-sm sm:p-6">
              <button class="sr-only"></button>
              <div class="p-8 sm:pb-6">
                <div class="mt-3 text-center sm:mt-5">
                  <div v-if="transaction" class="text-center">
                    <ManualPayment v-if="transaction.data.payment.paymentProvider.code === 'MANUAL-PAYMENT'" v-bind:transaction="transaction.data" v-bind:showViewTransfer="false"  />
                    <PagaPayment v-else-if="transaction.data.payment.paymentProvider.code === 'PAGA'" v-bind:transaction="transaction.data" v-bind:showViewTransfer="false"  />
                    <Monoova v-else-if="transaction.data.payment.paymentProvider.code === 'MONOOVA'" v-bind:transaction="transaction.data" v-bind:showViewTransfer="false"  />
                  </div>
                </div>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>