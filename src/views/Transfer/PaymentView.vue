<script setup>
import {useI18n} from "vue-i18n";

const {t} = useI18n();

import {isOutcomeUnknown} from "@/composables/checkout_safety.js";
import {failureMessage, logRequestFailure} from "@/composables/api_utils.js";
import InlineFailure from "@/components/InlineFailure.vue";
import CustomerLayout from "@/components/CustomerLayout.vue";
import { useTransactionUtils } from "@/composables/transaction_utils.js";
import {computed, onMounted, onUnmounted, ref, watch} from "vue";
import { Dialog, DialogPanel, TransitionChild, TransitionRoot } from '@headlessui/vue'
import Transaction from "@/models/transaction.js";
import PaymentTransaction from "@/models/payment_transaction.js";
import PaymentState from "@/enums/payment_state.js";
import router from "@/router/index.js";
import ManualPayment from "@/components/Payment/ManualPayment.vue";
import PagaPayment from "@/components/Payment/PagaPayment.vue";
import Volume from "@/components/Payment/Volume.vue";
import Monoova from "@/components/Payment/Monoova.vue";
import Apaylo from "@/components/Payment/Apaylo.vue";
import Pay360 from "@/components/Payment/Pay360.vue";
import PayCross from "@/components/Payment/PayCross.vue";
import Fincode from "@/components/Payment/Fincode.vue";
import CinetPay from "@/components/Payment/CinetPay.vue";
import BelmoneyCard from "@/components/Payment/BelmoneyCard.vue";
import CheckoutCom from "@/components/Payment/CheckoutCom.vue";
import WalletPayment from "@/components/Payment/Wallet.vue";
import ModalCloseButton from "@/components/ModalCloseButton.vue";

const transactionUtils = useTransactionUtils();

const props = defineProps({
  id: {
    type: String,
    required: true
  }
});

const transaction = ref(null);

// Every code with a component below. The back office has adapters the app has
// no screen for (Cybrid, Leatherback, Volt as of October 2026); one of those
// used to render a blank page.
const KNOWN_PROVIDER_CODES = new Set(['MANUAL-PAYMENT', 'PAGA', 'MONOOVA', 'VOLUME-PAYMENTS', 'APAYLO', 'PAY360', 'PAY-CROSS', 'FINCODE', 'CINET_PAY', 'WALLET', 'BELMONEY-CARD', 'CHECKOUT-COM']);
const isKnownProvider = computed(() => KNOWN_PROVIDER_CODES.has(transaction.value?.payment?.paymentProvider?.code));

const isLoading = ref(true);
const loadFailed = ref(false);

const loadTransaction = async () => {
  isLoading.value = true;
  loadFailed.value = false;
  transactionUtils.getTransaction(props.id).then((response) => {
    transaction.value = Transaction.getInstance(response.data);
  }).catch(() => {
    loadFailed.value = true;
  }).finally(() => {
    isLoading.value = false;
  });
}

onMounted(loadTransaction)


const paymentAttempt = ref(1);

const canAttemptPayment = computed(() => {
  return paymentAttempt.value <= 3
});

const retryPaymentErrors = ref([]);
const retryFailure = ref(null);

// An attempt only counts once the server has answered: a request that never
// left the phone must not use up one of the three tries. A fourth attempt is
// not sent at all; the watch below pauses the transfer instead.
//
// Paying again after the customer cancelled is not a try that went wrong, so
// it never counts and is never refused (ruled 27 Sep, SD-1423).
const retryPayment = async (paymentData = null) => {
  const counts = transaction.value?.payment?.state?.code !== PaymentState.CANCELLED;
  if (counts && paymentAttempt.value >= 3) {
    paymentAttempt.value++;
    return;
  }
  isLoading.value = true;
  retryFailure.value = null;
  retryPaymentErrors.value = [];
  transactionUtils.retryPayment(props.id, paymentData).then((response) => {
    if (counts) {
      paymentAttempt.value++;
    }
    transaction.value.payment = PaymentTransaction.getInstance(response.data);
  }).catch(async (e) => {
    if (e.response && counts) {
      paymentAttempt.value++;
    }
    if (e.response?.status === 422) {
      retryPaymentErrors.value = e.response.data.errors;
    } else if (isOutcomeUnknown(e)) {
      // No answer, or a 5xx: a new payment may have started. Re-read the
      // transaction before saying anything, and never claim nothing was
      // charged (the double-payment rule).
      logRequestFailure(e, 'retry-payment');
      if (counts) {
        paymentAttempt.value++;
      }
      try {
        const fresh = await transactionUtils.getTransaction(props.id);
        transaction.value = Transaction.getInstance(fresh.data);
        retryFailure.value = t('transfer.wizard.weDidntGetAn');
      } catch (refreshError) {
        logRequestFailure(refreshError, 'retry-payment-reconcile');
        retryFailure.value = t('transfer.wizard.weCouldntReachThe');
      }
    } else {
      logRequestFailure(e, 'retry-payment');
      retryFailure.value = failureMessage(e, t('transfer.wizard.weCouldntStartA2'));
      // A 412 with no type is the payment having moved on: already paid, or
      // not replaceable. What is on screen is stale, so show what it is now.
      // A typed 412 is a maintenance window, and nothing changed.
      if (e.response?.status === 412 && ! e.response.data?.type) {
        await refreshTransaction();
      }
    }
  }).finally(() => {
    isLoading.value = false;
  });
}

// Re-reads the transfer behind whatever message is showing, which stays. A
// failed read leaves the screen as it was rather than replacing the message.
const refreshTransaction = async () => {
  try {
    const fresh = await transactionUtils.getTransaction(props.id);
    transaction.value = Transaction.getInstance(fresh.data);
  } catch (e) {
    logRequestFailure(e, 'payment-refresh');
  }
}

// The account is free the moment the cancel answers. The payment keeps its id,
// so the provider's screen stays mounted and shows it cancelled.
const onPaymentCancelled = (payment) => {
  retryFailure.value = null;
  transaction.value.payment = payment;
}

// Too late to cancel, or the gateway cannot. Nothing changed on the server, but
// the screen is out of date.
const onCancelRefused = async (message) => {
  retryFailure.value = message;
  await refreshTransaction();
}

// Every provider but these has its own retry on a failed payment. None has one
// on a cancelled or expired payment, which was a dead end before SD-1423.
const PROVIDERS_WITH_RETRY_ON_FAILURE = new Set(['MONOOVA', 'VOLUME-PAYMENTS', 'APAYLO', 'PAY360', 'PAY-CROSS', 'FINCODE', 'CINET_PAY', 'BELMONEY-CARD', 'CHECKOUT-COM', 'WALLET']);
const offerPayAgain = computed(() => {
  if (! transaction.value?.canPayAgain) {
    return false;
  }

  return transaction.value.payment.state.code !== PaymentState.FAILED
      || ! PROVIDERS_WITH_RETRY_ON_FAILURE.has(transaction.value.payment.paymentProvider.code);
});

// After the third failed attempt the transfer is paused. The customer used
// to be sent to the transaction page with no explanation.
const retryLimitReached = ref(false);
let retryLimitRedirectId = null;

watch(canAttemptPayment, () => {
  if (! canAttemptPayment.value) {
    retryLimitReached.value = true;
    retryLimitRedirectId = setTimeout(() => {
      router.push({name: 'viewTransaction', params: {transactionId: props.id}});
    }, 8000);
  }
});

onUnmounted(() => clearTimeout(retryLimitRedirectId));

function closePaymentModal() {
  router.push({name: 'viewTransaction', params: {transactionId: props.id}});
}
</script>

<template>
  <CustomerLayout>
    <div>
      <div class="mx-auto max-w-3xl lg:max-w-full">
        <h1 class="sr-only">{{ $t('transfer.payment.makePayment') }}</h1>
        <div class="flex items-center justify-center gap-4 lg:gap-8 bg-white rounded-t-lg p-4 md:px-6 md:py-8 min-h-148">
          <div class="text-center" v-if="isLoading">
            <span class="text-6xl pi pi-spinner-dotted pi-spin text-gray-500"></span>
            <h2 class="text-2xl font-semibold text-gray-600 mb-5 mt-5">{{ $t('transfer.payment.pleaseWait') }}</h2>
          </div>
        </div>
      </div>
    </div>
  </CustomerLayout>
  <!-- A backdrop tap or Escape used to navigate away, which for the redirect
       providers meant losing the only route to the payment page. The close
       button still leaves; the backdrop does nothing. -->
  <TransitionRoot as="template" :show="isLoading === false">
    <Dialog class="relative z-50" @close="() => {}">
      <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0" enter-to="opacity-100" leave="ease-in duration-200" leave-from="opacity-100" leave-to="opacity-0">
        <div class="fixed inset-0 bg-gray-500/75 transition-opacity" />
      </TransitionChild>

      <div class="fixed inset-0 z-50 w-screen overflow-y-auto">
        <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95" enter-to="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-200" leave-from="opacity-100 translate-y-0 sm:scale-100" leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
            <DialogPanel class="relative w-full transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
              <ModalCloseButton @close="closePaymentModal" />
              <div class="py-0 sm:pb-6 px-0 sm:px-2">
                <div class="mt-3 text-center sm:mt-5">
                  <div v-if="retryLimitReached" class="text-center">
                    <h2 class="text-xl font-semibold text-gray-900 mb-5">{{ $t('transfer.payment.wevePausedThisTransfer') }}</h2>
                    <p class="text-base text-gray-600 mb-2">{{ $t('transfer.payment.thePaymentDidNotGo') }}</p>
                    <!-- Welded on both sides of the link before SD-1203:
                         "Pleasecontact supportand quote transfer #123". -->
                    <i18n-t keypath="transfer.payment.pleaseContactSupportAndQuote" tag="p" scope="global" class="text-sm/6 text-gray-500 mb-6">
                      <template #link><router-link :to="{name: 'support'}" class="font-semibold text-brand-700 hover:underline">{{ $t('transfer.payment.contactSupport') }}</router-link></template>
                      <template #transactionNumber>{{ transaction?.transactionNumber }}</template>
                    </i18n-t>
                  </div>
                  <div v-else-if="transaction && ! isKnownProvider" class="text-center">
                    <h2 class="text-xl font-semibold text-gray-900 mb-5">{{ $t('transfer.payment.thisWayToPayIsnt') }}</h2>
                    <p class="text-base text-gray-600 mb-2">{{ $t('transfer.payment.nothingHasBeenChargedPlease', {transactionNumber: transaction.transactionNumber}) }}</p>
                    <router-link :to="{name: 'viewTransaction', params: {transactionId: transaction.id}}" class="mt-4 inline-flex min-h-11 items-center rounded-xl bg-brand-700 px-5 py-2.5 text-sm/6 font-medium text-white hover:bg-brand-800">{{ $t('transfer.payment.goToYourTransfer') }}</router-link>
                  </div>
                  <div v-else-if="transaction" class="text-center">
                    <InlineFailure :message="retryFailure" class="mb-4" />
                    <ManualPayment :key="transaction.payment.id" v-on:paymentCancelled="onPaymentCancelled" v-on:cancelRefused="onCancelRefused" v-if="transaction.payment.paymentProvider.code === 'MANUAL-PAYMENT'" v-bind:transaction="transaction"  />
                    <PagaPayment :key="transaction.payment.id" v-if="transaction.payment.paymentProvider.code === 'PAGA'" v-bind:transaction="transaction"  />
                    <Monoova :key="transaction.payment.id" v-on:retryPayment="retryPayment" v-on:paymentCancelled="onPaymentCancelled" v-on:cancelRefused="onCancelRefused" v-if="transaction.payment.paymentProvider.code === 'MONOOVA'" v-bind:transaction="transaction"  />
                    <Volume :key="transaction.payment.id" v-on:retryPayment="retryPayment" v-if="transaction.payment.paymentProvider.code === 'VOLUME-PAYMENTS'" v-bind:transaction="transaction"  />
                    <Apaylo :key="transaction.payment.id" v-on:retryPayment="retryPayment" v-if="transaction.payment.paymentProvider.code === 'APAYLO'" v-bind:transaction="transaction"  v-bind:retryFormErrors="retryPaymentErrors"  />
                    <Pay360 :key="transaction.payment.id" v-on:retryPayment="retryPayment" v-if="transaction.payment.paymentProvider.code === 'PAY360'" v-bind:transaction="transaction"  />
                    <PayCross :key="transaction.payment.id" v-on:retryPayment="retryPayment" v-if="transaction.payment.paymentProvider.code === 'PAY-CROSS'" v-bind:transaction="transaction"  />
                    <Fincode :key="transaction.payment.id" v-on:retryPayment="retryPayment" v-if="transaction.payment.paymentProvider.code === 'FINCODE'" v-bind:transaction="transaction"  />
                    <CinetPay :key="transaction.payment.id" v-on:retryPayment="retryPayment" v-if="transaction.payment.paymentProvider.code === 'CINET_PAY'" v-bind:transaction="transaction"  />
                    <BelmoneyCard :key="transaction.payment.id" v-on:retryPayment="retryPayment" v-if="transaction.payment.paymentProvider.code === 'BELMONEY-CARD'" v-bind:transaction="transaction"  />
                    <CheckoutCom :key="transaction.payment.id" v-on:retryPayment="retryPayment" v-if="transaction.payment.paymentProvider.code === 'CHECKOUT-COM'" v-bind:transaction="transaction"  />
                    <WalletPayment :key="transaction.payment.id" v-on:retryPayment="retryPayment" v-if="transaction.payment.paymentProvider.code === 'WALLET'" v-bind:transaction="transaction"  />
                    <!-- A new payment on the same transfer, at its original amount and rate. -->
                    <button v-if="offerPayAgain" type="button" @click="retryPayment()" class="-mt-2 mb-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-700 px-6 py-2.5 text-sm/6 font-semibold text-white hover:bg-brand-800 transition cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700">{{ $t('transfer.payment.payAgain') }}</button>
                  </div>
                  <div v-else-if="loadFailed" class="text-center">
                    <h2 class="text-xl font-semibold text-gray-900 mb-5">{{ $t('transfer.payment.weCouldntLoadYourPayment') }}</h2>
                    <p class="text-base text-gray-600 mb-6">{{ $t('transfer.payment.pleaseCheckYourConnectionAnd') }}</p>
                    <button @click="loadTransaction" class="mt-2 px-4 md:px-6 lg:px-8 bg-brand-700 text-white text-center py-2.5 rounded-xl font-medium hover:bg-brand-800 transition cursor-pointer text-sm/6 outline-none ring-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700">{{ $t('common.tryAgain') }}</button>
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