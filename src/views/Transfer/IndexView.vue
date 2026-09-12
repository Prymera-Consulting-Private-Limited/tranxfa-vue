<script setup>
import InlineFailure from "@/components/InlineFailure.vue";
import {fixFor} from "@/composables/verification_routes.js";
import {findTransactionForQuote, isOutcomeUnknown, MFA_REQUIRED_TYPE, saveCheckoutDraft, takeCheckoutDraft} from "@/composables/checkout_safety.js";
import {useTransactionUtils} from "@/composables/transaction_utils.js";
import {CUSTOMER_ACTIONS, refreshServiceStatus, useServiceStatus} from "@/composables/service_status.js";
import {useCouponUtils} from "@/composables/coupon_utils.js";
import {couponsEnabled} from "@/feature_flags.js";
import CustomerLayout from "@/components/CustomerLayout.vue";
import {computed, onMounted, reactive, ref, watch, watchEffect} from "vue";
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
import LoadFailurePanel from "@/components/LoadFailurePanel.vue";
import {failureMessage, fieldlessErrors, getCustomerMessage, logRequestFailure} from "@/composables/api_utils.js";
import CustomerAttributeForm from "@/components/Customer/CustomerAttributeForm.vue";
import CustomerAttributeCategory from "@/enums/customer_attribute_category.js";
import {useCustomerStore} from "@/stores/customer.js";
import DocumentTypeItem from "@/components/AccountVerification/DocumentTypeItem.vue";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import {Dialog, DialogPanel, RadioGroup, RadioGroupOption, TransitionChild, TransitionRoot} from '@headlessui/vue'
import {ArrowUpTrayIcon, CheckCircleIcon, ChevronRightIcon, IdentificationIcon, ExclamationTriangleIcon} from '@heroicons/vue/20/solid'
import {createPopper} from "@popperjs/core";
import CategoryDescription from "@/components/AccountVerification/CategoryDescription.vue";
import QuotePendingDocument from "@/models/quote_pending_document.js";
import DocumentCategory from "@/models/document_category.js";
import SpendOtpModal from "@/components/Wallet/SpendOtpModal.vue";
import TermsModal from "@/components/Wallet/TermsModal.vue";
import TopUpFlow from "@/components/Wallet/TopUpFlow.vue";
import WalletRefusalType from "@/enums/wallet_refusal_type.js";
import {useWalletStore} from "@/stores/wallet.js";
import {useWalletUtils} from "@/composables/wallet_utils.js";

const thirdPartyDeclaration = import.meta.env.VITE_THIRD_PARTY_TRANSACTION_DECLARATION;
const thirdPartyDeclarationAccepted = ref(false);
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
const quoteFailure = ref(null);
const isStepProcessing = ref(false);
const isSubComponentLoading = ref(false);
const purpose = ref(null);
const paymentMethod = ref(null);
const transactionUtils = useTransactionUtils();

// The confirm step's choices, restored after the MFA round trip.
const resumedAfterMfa = ref(false);

// A confirm that got no answer (or a 5xx) may still have created the
// transfer. Until the list has been checked nothing may be confirmed again.
const outcomeUnknown = ref(false);
const isReconciling = ref(false);
const reconcileFailure = ref(null);
let attemptStartedAt = null;
const isAddressRequired = ref(false);
const selectedUploadDocumentCategory = ref(null);

const walletStore = useWalletStore();
const walletUtils = useWalletUtils();
const walletOtp = ref('');
const isSpendOtpModalOpen = ref(false);
const spendOtpError = ref('');
const isWalletTermsModalOpen = ref(false);
const walletTermsMode = ref('enrol');
const isWalletTopUpOpen = ref(false);
const walletShortMessage = ref('');

onMounted(async () => {
  if (customerStore.isLoaded === false) {
    isLoading.value = true;
    await customerUtils.refresh()
  }
  isAddressRequired.value = customerStore.customer.data.addressInformationRequired();
  if (! quote.data) {
    isLoading.value = true;
    // Without this the rejection escaped onMounted before isLoading could be
    // cleared, so a quote that had expired or never existed left the customer
    // watching a spinner with no way to know it would never finish.
    try {
      const response = await quoteUtils.getTransferQuote(props.id);
      quote.data = TransactionQuote.getInstance(response.data);
      send({ type: 'SET_CONTEXT', quote: quote.data });
      send({ type: 'PROCEED' });
    } catch (error) {
      quoteFailure.value = getCustomerMessage(error) ?? true;
      isLoading.value = false;
      return;
    }
  }
  if (quote.data.paymentMethods.length === 1) {
    paymentMethod.value = quote.data.paymentMethods[0];
  }
  if (quote.data.pendingDocuments.length === 1) {
    selectedUploadDocumentCategory.value = quote.data.pendingDocuments[0];
  }
  restoreDraft();
  isLoading.value = false;
});

// What the customer had chosen before a 412 sent them to the MFA screen.
// The quote id is the same, so the same Confirm Quote goes out again once
// they press Confirm; only the picks had to survive the navigation.
function restoreDraft() {
  const draft = takeCheckoutDraft(props.id);
  if (! draft) return;
  purpose.value = quote.data.purposes.find((p) => p.id === draft.purposeId) ?? purpose.value;
  const method = quote.data.paymentMethods.find((m) => m.id === draft.paymentMethodId);
  if (method) {
    paymentMethod.value = method;
  }
  thirdPartyDeclarationAccepted.value = draft.thirdPartyDeclarationAccepted === true;
  if (draft.paymentData && paymentData.data) {
    for (const [attribute, value] of Object.entries(draft.paymentData)) {
      if (paymentData.data[attribute]) {
        paymentData.data[attribute].value = value;
      }
    }
  }
  resumedAfterMfa.value = true;
}

function saveDraft() {
  const values = {};
  if (paymentData.data) {
    for (const [attribute, entry] of Object.entries(paymentData.data)) {
      values[attribute] = entry.value;
    }
  }
  saveCheckoutDraft(props.id, {
    purposeId: purpose.value?.id ?? null,
    paymentMethodId: paymentMethod.value?.id ?? null,
    thirdPartyDeclarationAccepted: thirdPartyDeclarationAccepted.value,
    paymentData: values,
  });
}

// Did the confirm that never answered create the transfer? The list says.
// Found: carry on to its payment page. Not found: the quote is untouched
// and may be confirmed again. Unknown (the list failed too): stay put and
// point at the transfers page, never at the Confirm button.
async function reconcileOutcome() {
  isReconciling.value = true;
  reconcileFailure.value = null;
  try {
    const transaction = await findTransactionForQuote(transactionUtils, quote.data, attemptStartedAt ?? Date.now());
    if (transaction) {
      outcomeUnknown.value = false;
      await router.push({name: 'makePayment', params: {transactionId: transaction.id}});
      return;
    }
    outcomeUnknown.value = false;
    preconditionFailedMessage.value = 'Your transfer was not created. Nothing has been charged. You can confirm it again.';
  } catch (e) {
    logRequestFailure(e, 'confirm-reconcile');
    reconcileFailure.value = "We still couldn't reach the server. Check your transfers before confirming again.";
  } finally {
    isReconciling.value = false;
  }
}

const serviceStatus = useServiceStatus();

// Promotion coupons (Client API reference, "Promotion Coupons"), behind
// VITE_COUPONS_ENABLED. Validate previews a code and soft-fails with a
// customer-written reason; Apply reprices the quote and every later quote
// response carries the coupon block, so the quote is always taken from the
// response rather than remembered.
const couponUtils = useCouponUtils();
const hasCoupons = couponsEnabled();
const couponCode = ref('');
const couponPreview = ref(null);
const couponFailure = ref(null);
const isCouponBusy = ref(false);

function replaceQuote(data) {
  quote.data = TransactionQuote.getInstance(data);
  send({ type: 'SET_CONTEXT', quote: quote.data });
}

async function previewCoupon() {
  if (! couponCode.value.trim() || isCouponBusy.value) return;
  isCouponBusy.value = true;
  couponFailure.value = null;
  couponPreview.value = null;
  try {
    const response = await couponUtils.validate(quote.data.id, couponCode.value.trim());
    if (response.data?.is_valid === true) {
      couponPreview.value = response.data;
    } else {
      // Soft-fail by design: the reason is written for the customer.
      couponFailure.value = response.data?.failure_reason || "This code can't be used on this transfer.";
    }
  } catch (e) {
    logRequestFailure(e, 'coupon-validate');
    couponFailure.value = failureMessage(e, "We couldn't check that code. Please try again.");
  } finally {
    isCouponBusy.value = false;
  }
}

async function applyCoupon() {
  if (isCouponBusy.value) return;
  isCouponBusy.value = true;
  couponFailure.value = null;
  try {
    const response = await couponUtils.apply(quote.data.id, couponCode.value.trim());
    replaceQuote(response.data);
    couponPreview.value = null;
    couponCode.value = '';
  } catch (e) {
    logRequestFailure(e, 'coupon-apply');
    // A 422 carries the same customer wording Validate returns.
    couponFailure.value = failureMessage(e, "We couldn't apply that code. Please try again.");
    couponPreview.value = null;
  } finally {
    isCouponBusy.value = false;
  }
}

async function removeCoupon() {
  if (isCouponBusy.value) return;
  isCouponBusy.value = true;
  couponFailure.value = null;
  try {
    const response = await couponUtils.remove(quote.data.id);
    replaceQuote(response.data);
  } catch (e) {
    logRequestFailure(e, 'coupon-remove');
    couponFailure.value = failureMessage(e, "We couldn't remove the code. Please try again.");
  } finally {
    isCouponBusy.value = false;
  }
}

const showContinueButton = computed(() => {
  if (outcomeUnknown.value) return false;
  // A maintenance window that stops new transfers: the button goes, the
  // banner says why.
  if (snapshot.value?.value === 'confirm' && serviceStatus.isFrozen(CUSTOMER_ACTIONS.NEW_TRANSFERS)) return false;
  return !(snapshot.value?.value === 'selectRecipient' || snapshot.value?.value === 'accountVerification');
});

const createRecipient = async () => {
  send({ type: 'ADD_RECIPIENT' });
  isSubComponentLoading.value = true;
};

const setRecipient =  async (recipient) => {
  isLoading.value = true;
  stepFailure.value = null;
  await quoteUtils.setRecipient(props.id, recipient).then((response) => {
    quote.data = TransactionQuote.getInstance(response.data);
    send({ type: 'SET_CONTEXT', quote: quote.data });
    send({ type: 'PROCEED' });
  }).catch((e) => {
    logRequestFailure(e, 'quote-set-recipient');
    stepFailure.value = failureMessage(e, "We couldn't add that recipient to this transfer. Please choose them again.");
  });
  isLoading.value = false;
}

const recipientAddedOnQuote = async (recipient)  => {
  isStepProcessing.value = false;
  isSubComponentLoading.value = false;
  quote.data.recipients.push(recipient);
  quote.data.recipient = recipient;
  send({ type: 'SET_CONTEXT', quote: quote.data });
  send({ type: 'PROCEED' });
}

const preconditionFailedMessage = ref('');

const confirmFormErrors = ref([]);

// Everything the confirm step refused that is not a payment-data field. Those
// were stored and never rendered, so the spinner cleared and the form looked
// unchanged.
const confirmGeneralErrors = computed(() => fieldlessErrors(confirmFormErrors.value, 'payment_data.'));

const confirmQuote = async () => {
  preconditionFailedMessage.value = '';
  resumedAfterMfa.value = false;
  attemptStartedAt = Date.now();
  try {
    let paymentDataAttributes = {};
    if (paymentData.data) {
      for (const paymentDataAttribute of Object.entries(paymentData.data)) {
        paymentDataAttributes[paymentDataAttribute[0]] = paymentDataAttribute[1].value;
      }
    }
    const response = await quoteUtils.confirmQuote(quote.data, purpose.value, paymentMethod.value, paymentDataAttributes, thirdPartyDeclarationAccepted.value, walletOtp.value || null);
    const transaction = response.data;
    isStepProcessing.value = false;
    isSpendOtpModalOpen.value = false;
    await router.push({name: 'makePayment', params: {transactionId: transaction.id}});
  } catch (error) {
    if (error.response?.status === 412) {
      if (error.response.data.type === MFA_REQUIRED_TYPE) {
        // The session lost its MFA trust mid-checkout. The interceptor is
        // already taking the customer to the MFA screen and back here; the
        // quote is persisted, so only the picks need keeping.
        saveDraft();
        isStepProcessing.value = false;
      } else if (error.response.data.type === "payment_amount_collides") {
        // The rail already holds a deposit for this exact figure. Retrying
        // the same amount is refused again; a different amount goes through.
        isStepProcessing.value = false;
        preconditionFailedMessage.value = (error.response.data.message || 'You already have a transfer open for this exact amount.') + ' Change the amount and confirm again.';
      } else if (error.response.data.type === "incomplete_customer_address") {
        isAddressRequired.value = true;
        isStepProcessing.value = false;
        await send({ type: 'ADDRESS_REQUIRED' });
      } else if (error.response.data.type === "account_verification_required") {
        isStepProcessing.value = false;
        if (error.response.data.pending_documents?.length > 0) {
          quote.data.pendingDocuments = error.response.data.pending_documents.map((document) => {
            return QuotePendingDocument.getInstance(document);
          })
        }
        await send({ type: 'ACCOUNT_VERIFICATION_REQUIRED' });
      } else if (error.response.data.type === "poi_info_check_failed") {
        isStepProcessing.value = false;
        await send({ type: 'POI_INFO_CHECK_FAILED' });
      } else if (error.response.data.type === WalletRefusalType.SUBSCRIPTION_REQUIRED) {
        isStepProcessing.value = false;
        walletTermsMode.value = 'enrol';
        isWalletTermsModalOpen.value = true;
      } else if (error.response.data.type === WalletRefusalType.TERMS_REACCEPTANCE_REQUIRED) {
        isStepProcessing.value = false;
        walletTermsMode.value = 'reaccept';
        isWalletTermsModalOpen.value = true;
      } else if (error.response.data.type === WalletRefusalType.INSUFFICIENT_BALANCE) {
        isStepProcessing.value = false;
        isSpendOtpModalOpen.value = false;
        walletShortMessage.value = error.response.data.message;
        walletUtils.getWallet().catch(() => {});
      } else if (error.response.data.type === WalletRefusalType.AUTHORIZATION_REQUIRED) {
        await requestWalletSpendCode();
      } else if (error.response.data.type === WalletRefusalType.AUTHORIZATION_INVALID) {
        isStepProcessing.value = false;
        spendOtpError.value = error.response.data.message;
        isSpendOtpModalOpen.value = true;
      } else if (error.response.data.type === "duplicate_transaction" || error.response.data.type === "active_transfer_disable_rule") {
        isStepProcessing.value = false;
        preconditionFailedMessage.value = error.response.data.message;
        if (error.response.data.type === "active_transfer_disable_rule") {
          // The reference: this refusal and the service-status endpoint
          // describe the same window, so ask it again now.
          refreshServiceStatus();
        }
      } else if (error.response.data.type === "missing_recipient") {
        // The quote has no recipient any more (deleted, or a stale tab).
        isStepProcessing.value = false;
        preconditionFailedMessage.value = error.response.data.message || 'Please choose who to send this transfer to.';
        await send({ type: 'SELECT_RECIPIENT' });
      } else if (fixFor(error.response.data.type, router.currentRoute.value.fullPath)) {
        // Something on the profile has to be finished first: a mobile number
        // to verify, an identity form to complete. Send them there; the
        // onboarding flow brings them back to this transfer.
        isStepProcessing.value = false;
        await router.push(fixFor(error.response.data.type, router.currentRoute.value.fullPath).route);
      } else {
        isStepProcessing.value = false;
        preconditionFailedMessage.value = error.response.data.message || 'We could not confirm this transfer. Please try again.';
      }
    } else if (error.response?.status === 422) {
      confirmFormErrors.value = error.response.data.errors;
      isStepProcessing.value = false;
    } else if (isOutcomeUnknown(error)) {
      // No answer, or a 5xx: the transfer may exist. Never offer the button
      // again until the list has been checked (the double-payment rule).
      logRequestFailure(error, 'confirm-quote');
      isStepProcessing.value = false;
      outcomeUnknown.value = true;
      await reconcileOutcome();
    } else {
      isStepProcessing.value = false;
      preconditionFailedMessage.value = failureMessage(error, 'We could not confirm this transfer. Please try again.');
    }
  }
}

const submitAndContinue = async () => {
  isStepProcessing.value = true
  if (snapshot.value?.value === 'confirm') {
    await confirmQuote();
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
  isStepProcessing.value = false;
}

async function documentUploaded() {
  stepFailure.value = null;
  await quoteUtils.getTransferQuote(props.id).then((response) => {
    quote.data = TransactionQuote.getInstance(response.data);
    send({ type: 'SET_CONTEXT', quote: quote.data });
    if (quote.data.pendingDocuments.length === 0) {
      send({ type: 'PROCEED' });
      if (purpose?.value) {
        confirmQuote();
      }
    }
  }).catch((e) => {
    logRequestFailure(e, 'quote-after-upload');
    stepFailure.value = failureMessage(e, "Your document was received, but we couldn't refresh this transfer. Please reload the page.");
  });
  selectedUploadDocumentCategory.value = null;
  isLoading.value = false;
}

const watchForDocumentUpdate = ref(false);

const sdkFinalStateReached = async () => {
  isStepProcessing.value = false;
  isLoading.value = true;
  watchForDocumentUpdate.value = true;
}

watchEffect(() => {
  if (watchForDocumentUpdate.value) {
    let isDocumentPending = customer.data?.pendingDocuments?.find(o => o.code === selectedUploadDocumentCategory.value.code);
    if (! isDocumentPending) {
      watchForDocumentUpdate.value = false;
      isStepProcessing.value = false;
      documentUploaded()
      watchForDocumentUpdate.value = false;
    } else {
      isLoading.value = false;
    }
  }
});

const stepCommandExecuted = (e) => {
  if (e) {
    send({ type: e });
  }
}

const addRecipientLoadingStateUpdated = (e) => {
  isSubComponentLoading.value = e;
}

// The document was handed over but the category is still pending, which
// means it is with our compliance team rather than missing.
const documentInReview = computed(() => {
  if (! watchForDocumentUpdate.value || isLoading.value) return null;
  return selectedUploadDocumentCategory.value?.title?.toLowerCase() ?? 'document';
});

const applyPoiFailure = ref(null);
const isApplyingInfoFromPoiDocument = ref(false);

const applyInfoFromPoiDocument = async () => {
  isApplyingInfoFromPoiDocument.value = true;
  applyPoiFailure.value = null;
  customerUtils.applyInfoFromPoiDocument().then((response) => {
    customerUtils.updateStore(response.data);
    send({ type: 'PROCEED' });
    isStepProcessing.value = true;
    confirmQuote();
  }).catch((e) => {
    logRequestFailure(e, 'apply-poi-details');
    applyPoiFailure.value = failureMessage(e, "We couldn't copy the details from your document. Please try again or update your details by hand.");
  }).finally(() => {
    isApplyingInfoFromPoiDocument.value = false;
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

function startVerification(category) {
  selectedUploadDocumentCategory.value = category;
}

const stepFailure = ref(null);

// The "upload another document" step needs the identity category before it
// can show anything. If that request fails the customer used to be left on a
// blank step with the spinner gone.
function loadPoiCategory() {
  isLoading.value = true;
  stepFailure.value = null;
  customerUtils.documentCategories().then((response) => {
    const documentCategories = response.data.map((category) => DocumentCategory.getInstance(category));
    const poiDocumentCategory = documentCategories.find(category => category.code === 'POI');
    if (poiDocumentCategory) {
      selectedUploadDocumentCategory.value =  poiDocumentCategory;
      quote.data.pendingDocuments.push(poiDocumentCategory);
    }
    send({ type: 'PROCEED' });
  }).catch((e) => {
    logRequestFailure(e, 'poi-category');
    stepFailure.value = failureMessage(e, "We couldn't load the document upload. Please try again.");
  }).finally(() => {
    isLoading.value = false;
  });
}

watch(snapshot, () => {
  if (snapshot.value?.value === 'uploadAnotherPoi') {
    loadPoiCategory();
  }
});

const paymentData = reactive({
  data: null,
});

watch(paymentMethod, (newValue) => {
  if (newValue) {
    paymentData.data = [];
    if (newValue?.providers[0]?.paymentDataAttributes?.length > 0) {
      newValue.providers[0].paymentDataAttributes.forEach(function (attribute) {
        paymentData.data[attribute.attribute] = attribute;
      });
    }
    walletOtp.value = '';
    walletShortMessage.value = '';
    if (newValue.code === 'WALLET' && walletStore.isEnrolled) {
      walletUtils.getWallet().catch(() => {});
    }
  }
});

const walletCheckoutBalance = computed(() => {
  return walletStore.wallet.data?.balanceFor(quote.data?.paymentCurrency?.code) ?? null;
});

watch(() => walletStore.isEnrolled, (enrolled) => {
  if (enrolled && paymentMethod.value?.code === 'WALLET') {
    walletUtils.getWallet().catch(() => {});
  }
});

const requestWalletSpendCode = async () => {
  spendOtpError.value = '';
  walletOtp.value = '';
  await walletUtils.requestSpendOtp(quote.data.id).then(() => {
    isStepProcessing.value = false;
    isSpendOtpModalOpen.value = true;
  }).catch((error) => {
    isStepProcessing.value = false;
    preconditionFailedMessage.value = error.response?.data?.message ?? 'Something went wrong. Please try again.';
  });
}

const walletOtpEntered = async (otp) => {
  walletOtp.value = otp;
  spendOtpError.value = '';
  isStepProcessing.value = true;
  await confirmQuote();
}

const walletTermsAccepted = async () => {
  isWalletTermsModalOpen.value = false;
  isStepProcessing.value = true;
  await confirmQuote();
}

const walletTopUpClosed = () => {
  isWalletTopUpOpen.value = false;
  walletUtils.getWallet().catch(() => {});
}

const canContinue = computed(() => {
  if (snapshot.value?.value === 'confirm') {
    if (!!purpose.value && !!paymentMethod.value && !isStepProcessing.value && !isLoading.value) {
      if (paymentData.data) {
        for (const paymentDataAttribute of Object.entries(paymentData.data)) {
          if (paymentDataAttribute[1].isRequired && !paymentDataAttribute[1].value) {
            return false;
          }
        }
      }
      if (thirdPartyDeclaration) {
        return thirdPartyDeclarationAccepted.value;
      }
      return true;
    } else {
      return false;
    }
  }
  return !isStepProcessing.value && !isLoading.value && !isSubComponentLoading.value;
});
</script>

<template>
  <CustomerLayout>
    <main class="-mt-24 py-8">
      <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:max-w-7xl lg:px-8 py-5"  v-if="snapshot.value !== 'poiInfoCheckFailed'">
        <h1 class="sr-only">{{ $t('transfer.wizard.reviewConfirm') }}</h1>
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
                    v-on:stepCommandExecuted="stepCommandExecuted"
                />
                <div :class="{'animate-pulse': isStepProcessing}" class="xl:col-span-2 px-3">
                  <div v-if="isLoading" role="status" class="p-10 flex items-center justify-center w-64 lg:min-w-96 mx-auto min-h-96">
                    <Spinner class="size-16 mx-auto" />
                    <span class="sr-only">{{ $t('transfer.wizard.loading') }}</span>
                  </div>
                  <LoadFailurePanel
                    v-else-if="quoteFailure"
                    :title="$t('transfer.wizard.weCouldntLoadThisTransfer')"
                    :message="typeof quoteFailure === 'string' ? quoteFailure : null"
                    :backTo="{name: 'dashboard'}"
                    :backLabel="$t('transfer.wizard.startANewTransfer')"
                  />
                  <template v-else>
                    <InlineFailure :message="stepFailure" :retryLabel="$t('common.tryAgain')" @retry="loadPoiCategory" class="mb-5" />
                    <div v-if="resumedAfterMfa" role="status" class="border-l-4 border-success-400 bg-success-50 p-4 mb-5">
                      <p class="text-sm/6 text-success-800">{{ $t('transfer.wizard.verifiedReadyToConfirm') }}</p>
                    </div>
                    <div v-if="outcomeUnknown" role="alert" class="border-l-4 border-warning-400 bg-warning-50 p-4 mb-5">
                      <p class="text-sm/6 font-semibold text-warning-800">{{ $t('transfer.wizard.weDidntGetAnAnswer') }}</p>
                      <p class="mt-1 text-sm/6 text-warning-800">{{ $t('transfer.wizard.itMayAlreadyExistWere') }}</p>
                      <p v-if="reconcileFailure" class="mt-2 text-sm/6 text-danger-700">{{ reconcileFailure }}</p>
                      <div class="mt-3 flex flex-wrap gap-3">
                        <button type="button" @click="reconcileOutcome" :disabled="isReconciling" class="inline-flex min-h-11 items-center rounded-xl bg-brand-700 px-4 text-sm/6 font-semibold text-white hover:bg-brand-800 disabled:opacity-60 disabled:cursor-not-allowed">{{ isReconciling ? $t('transfer.wizard.checking') : $t('transfer.wizard.checkAgain') }}</button>
                        <router-link :to="{name: 'transactions'}" class="inline-flex min-h-11 items-center rounded-xl border border-gray-300 px-4 text-sm/6 font-semibold text-gray-700 hover:bg-gray-50">{{ $t('transfer.wizard.seeMyTransfers') }}</router-link>
                      </div>
                    </div>
                    <div v-if="preconditionFailedMessage" class="border-l-4 border-warning-400 bg-warning-50 p-4 mb-5">
                      <div class="flex">
                        <div class="shrink-0">
                          <ExclamationTriangleIcon class="size-5 text-warning-400" aria-hidden="true" />
                        </div>
                        <div class="ml-3">
                          <p class="text-sm/6 text-warning-700">{{ preconditionFailedMessage }}</p>
                        </div>
                      </div>
                    </div>
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
                      <h3 class="text-gray-900 mb-4 font-semibold">{{ $t('transfer.wizard.provideYourAddress') }}</h3>
                      <p class="text-gray-500 text-sm/6 mb-3 -mt-2"><i18n-t keypath="onboarding.addressIntroShort" scope="global"><template #country><span class="font-semibold text-brand-700">{{ customer.data?.country?.commonName }}</span></template></i18n-t>
                      </p>
                      <p class="text-gray-500 text-sm/6 mb-6 -mt-2">
                        <span>{{ $t('transfer.wizard.accurateAddressInformationIsRequired') }}</span>
                      </p>

                      <CustomerAttributeForm
                          v-bind:categories="`${CustomerAttributeCategory.ADDRESS}`"
                          v-bind:updateOutsourced="true"
                          v-bind:externalSaveTrigger="isStepProcessing"
                          v-bind:showLoading="false"
                          v-on:customer:attribute_category:updated="customerAttributeCategoryUpdated"
                          v-on:customer:attribute_category:update_failed="isStepProcessing = false"
                      />
                    </template>
                    <template v-if="snapshot.value === 'accountVerification'">
                      <h3 class="text-gray-900 mb-4 font-semibold">{{ $t('transfer.wizard.oneTimeAccountVerification') }}</h3>
                      <template v-if="selectedUploadDocumentCategory">
                        <CategoryDescription v-bind:category="selectedUploadDocumentCategory" />
                        <div v-if="documentInReview" role="status" class="mb-5 rounded-lg border border-info-200 bg-info-50 px-4 py-3 text-sm/6 text-info-800">
                          <p class="font-semibold">{{ $t('transfer.wizard.documentReceived', {documentInReview: documentInReview}) }}</p>
                          <p>{{ $t('transfer.wizard.weAreCheckingItNow') }}</p>
                        </div>
                        <ul v-if="selectedUploadDocumentCategory.documentTypes?.length > 0" role="list" class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                          <li v-for="documentType in selectedUploadDocumentCategory.documentTypes" :key="documentType.id" class="col-span-1 flex flex-col divide-y divide-gray-200 rounded-lg text-center shadow-sm bg-white transition-transform transform hover:scale-105">
                            <DocumentTypeItem
                                v-bind:documentType="documentType"
                                v-bind:documentCategory="selectedUploadDocumentCategory"
                                v-on:sdkFinalStateReached="sdkFinalStateReached"
                            />
                          </li>
                        </ul>
                      </template>
                      <template v-else>
                        <p class="text-gray-500 text-sm/6 mb-6">{{ $t('transfer.wizard.weNeedToVerifyYour') }}</p>
                        <ul v-if="quote.data.pendingDocuments[0].documentTypes?.length > 0" role="list" class="grid grid-cols-1 gap-6">
                          <li v-for="pendingCategory in quote.data?.pendingDocuments" :key="pendingCategory.id" class="col-span-1 flex rounded-lg bg-white items-start border-1 border-gray-200 hover:shadow-sm transition-transform transform hover:scale-105 px-6 py-3">
                            <div class="text-left pl-3 py-3">
                              <h3 class="text-sm/6 font-medium text-gray-900">{{ pendingCategory.title }}</h3>
                              <dl v-if="pendingCategory.description" class="mt-0 flex grow flex-col justify-between">
                                <dt class="sr-only">{{ $t('transfer.wizard.information') }}</dt>
                                <dd class="mt-1 text-sm/6 text-gray-500">
                                  <CategoryDescription v-bind:category="pendingCategory" />
                                </dd>
                                <dt class="sr-only">{{ $t('transfer.wizard.startVerification') }}</dt>
                                <dd class="text-sm/6 text-gray-500">
                                  <a href="javascript:" @click="startVerification(pendingCategory)" class="text-brand-700 font-semibold hover:underline">{{ $t('transfer.wizard.startVerification') }}</a>
                                </dd>
                              </dl>
                            </div>
                          </li>
                        </ul>
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
              <h2 class="sr-only" id="section-2-title">{{ $t('transfer.wizard.transactionSummary') }}</h2>
              <template v-if="quote.data">
                <div v-if="snapshot.value !== 'confirm'" class="hidden sm:grid"><QuoteDisplay v-bind:quote="quote.data" /></div>
                <template v-else>
                  <div class="px-3 sm:px-0">
                    <label for="purpose" class="text-sm/6 font-semibold text-gray-900">{{ $t('transfer.wizard.selectAPurpose') }}<span class="text-danger-600">*</span></label>
                    <p class="mb-4 text-sm/6 text-gray-500">{{ $t('transfer.wizard.pleaseProvideThePurposeOf') }}</p>
                    <v-select v-model="purpose" :calculate-position="withPopper" :options="quote.data.purposes" :placeholder="`Please select`" key-by="id" :label="$t('transfer.wizard.title')">
                      <template v-slot:no-options="{ search, searching }">
                        <template class="text-sm/6 text-gray-300" v-if="searching"><i18n-t keypath="transfer.wizard.noResultsFound" scope="global"><template #query><em>{{ search }}</em></template></i18n-t></template>
                        <em class="text-sm/6 text-gray-500 opacity-50" v-else>{{ $t('transfer.wizard.startTypingToSearch') }}</em>
                      </template>
                      <template #selected-option-container="{ option, deselect, multiple, disabled }">
                        <div class="vs__selected">
                          <div class="flex items-center w-auto">
                            <div class="text-sm/6 flex items-center w-full gap-x-2">
                              <span class="lg:max-w-sm xl:max-w-md truncate">{{ option.title }}</span>
                            </div>
                          </div>
                        </div>
                      </template>
                      <template #option="option">
                        <div class="text-sm/6 flex items-center w-full gap-x-3 truncate">
                          <span class="truncate">{{ option.title }}</span>
                        </div>
                      </template>
                    </v-select>

                    <div v-if="hasCoupons" class="mt-6 mb-4">
                      <label for="coupon-code" class="text-sm/6 font-semibold text-gray-900">{{ $t('transfer.wizard.haveAPromotionCode') }}</label>
                      <template v-if="quote.data.coupon">
                        <div role="status" class="mt-2 rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm/6 text-success-800">
                          <p class="font-semibold">{{ $t('transfer.wizard.codeCodeApplied', {code: quote.data.coupon.code}) }}<template v-if="quote.data.coupon.discountAmountCurrencyPrefixed">{{ $t('transfer.wizard.youSaveDiscountamountcurrencyprefixed', {discountAmountCurrencyPrefixed: quote.data.coupon.discountAmountCurrencyPrefixed}) }}</template><template v-else-if="quote.data.coupon.exchangeRateBeforeCouponFormatted">{{ $t('transfer.wizard.rateWasExchangeratebeforecouponformattedNowExchangerateformatted', {exchangeRateBeforeCouponFormatted: quote.data.coupon.exchangeRateBeforeCouponFormatted, exchangeRateFormatted: quote.data.exchangeRateFormatted}) }}</template>.</p>
                          <p v-if="quote.data.coupon.infoText">{{ quote.data.coupon.infoText }}</p>
                          <p v-if="quote.data.coupon.termsText" class="text-xs/5 text-success-700">{{ quote.data.coupon.termsText }}</p>
                          <button type="button" @click="removeCoupon" :disabled="isCouponBusy" class="mt-2 inline-flex min-h-11 items-center text-sm/6 font-semibold underline underline-offset-2 disabled:opacity-60">{{ $t('transfer.wizard.removeCode') }}</button>
                        </div>
                      </template>
                      <template v-else>
                        <div class="mt-2 flex gap-2">
                          <input id="coupon-code" v-model="couponCode" type="text" autocomplete="off" autocapitalize="characters" maxlength="255" :placeholder="$t('transfer.wizard.enterCode')" class="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm/6 uppercase focus:outline-2 focus:-outline-offset-2 focus:outline-brand-600" @keydown.enter.prevent="previewCoupon" />
                          <button type="button" @click="previewCoupon" :disabled="isCouponBusy || ! couponCode.trim()" class="inline-flex min-h-11 shrink-0 items-center rounded-xl border border-gray-300 px-4 text-sm/6 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed">{{ isCouponBusy ? $t('transfer.wizard.checking') : $t('transfer.wizard.checkCode') }}</button>
                        </div>
                        <p v-if="couponFailure" role="alert" class="mt-2 text-sm/6 text-danger-700">{{ couponFailure }}</p>
                        <div v-if="couponPreview" role="status" class="mt-2 rounded-lg border border-info-200 bg-info-50 px-4 py-3 text-sm/6 text-info-800">
                          <p class="font-semibold">{{ couponPreview.info_text || $t('transfer.wizard.thisCodeAppliesTo') }}</p>
                          <p v-if="couponPreview.discount_amount">{{ $t('transfer.wizard.savesDiscountAmountIsoalphaOn', {discount_amount: couponPreview.discount_amount, isoAlpha: quote.data.paymentCurrency?.isoAlpha ?? ''}) }}</p>
                          <p v-else-if="couponPreview.adjusted_exchange_rate">{{ $t('transfer.wizard.improvesYourRateToAdjusted', {adjusted_exchange_rate: couponPreview.adjusted_exchange_rate}) }}</p>
                          <p v-if="couponPreview.terms_text" class="text-xs/5 text-info-700">{{ couponPreview.terms_text }}</p>
                          <button type="button" @click="applyCoupon" :disabled="isCouponBusy" class="mt-2 inline-flex min-h-11 items-center rounded-xl bg-brand-700 px-4 text-sm/6 font-semibold text-white hover:bg-brand-800 disabled:opacity-60 disabled:cursor-not-allowed">{{ $t('transfer.wizard.useThisCode') }}</button>
                        </div>
                      </template>
                    </div>

                    <fieldset :aria-label="$t('transfer.wizard.paymentMethod')" class="mt-6 mb-4">
                      <label for="payment-method" class="text-sm/6 font-semibold text-gray-900">{{ $t('transfer.wizard.paymentMethod') }}<span class="text-danger-600">*</span></label>
                      <p class="mb-4 text-sm/6 text-gray-500">{{ $t('transfer.wizard.pleaseSelectHowWouldYou') }}</p>
                      <RadioGroup v-model="paymentMethod" class="space-y-4 mt-4">
                        <RadioGroupOption as="template" v-for="paymentMethod in quote.data.paymentMethods" :key="paymentMethod.id" :value="paymentMethod" :aria-label="paymentMethod.title" :aria-description="`${paymentMethod.title}`" v-slot="{ active, checked }">
                          <div :class="[(active || checked) ? 'border-brand-600 ring-1 ring-brand-600 bg-brand-50' : 'border-gray-300 bg-white', 'relative flex cursor-pointer rounded-lg border px-4 py-2.5 shadow-xs focus:outline-hidden']">
                          <span class="flex flex-1">
                            <span class="flex flex-col">
                              <span class="block text-sm/6 font-medium text-gray-900">{{ paymentMethod.title }}</span>
                              <!--<span class="mt-1 flex items-center text-sm/6 text-gray-500">{{ paymentMethod.description }}</span>-->
                            </span>
                          </span>
                            <CheckCircleIcon v-if="checked" :class="[!checked ? 'text-gray-400' : 'text-brand-600', 'size-5']" aria-hidden="true" />
                            <div v-else :class="['text-gray-300', 'size-4 mt-0.5 mr-0.5 border border-2 rounded-full border-gray-300']" aria-hidden="true" />
                          </div>
                        </RadioGroupOption>
                      </RadioGroup>
                    </fieldset>

                    <template v-if="paymentMethod?.providers[0]?.paymentDataAttributes?.length > 0">
                      <template v-for="attribute in paymentMethod?.providers[0].paymentDataAttributes">
                        <div class="mb-4">
                          <label :for="`payment-data-${attribute.attribute}`" :class="[confirmFormErrors[`payment_data.${attribute.attribute}`]?.length > 0 ? 'text-danger-600' : 'text-gray-900']" class="text-sm/6 font-semibold">{{ attribute.label }}<span class="text-danger-600" v-if="attribute.isRequired">*</span></label>
                          <p v-if="attribute.info" class="mb-4 text-sm/6 text-gray-500">{{ attribute.info }}</p>
                          <input v-if="attribute.type === 'text'" v-model="paymentData.data[attribute.attribute].value" :inputmode="attribute.inputMode" :required="attribute.isRequired" :id="`payment-data-${attribute.attribute}`" type="text" class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none" />
                          <input v-else-if="attribute.type === 'email'" v-model="paymentData.data[attribute.attribute].value" :required="attribute.isRequired" :id="`payment-data-${attribute.attribute}`" type="email" class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none" />
                          <p v-if="confirmFormErrors[`payment_data.${attribute.attribute}`]?.length > 0" class="mt-2 text-sm/6 text-danger-600">{{ confirmFormErrors[`payment_data.${attribute.attribute}`][0] }}</p>
                        </div>
                      </template>
                    </template>

                    <template v-if="paymentMethod?.code === 'WALLET'">
                      <div class="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <template v-if="walletStore.isEnrolled">
                          <div class="flex items-center justify-between text-sm/6 text-gray-600">
                            <span>{{ $t('transfer.wizard.walletBalance') }}</span>
                            <span class="font-semibold text-gray-900">{{ walletCheckoutBalance?.amountFormatted ?? '—' }}</span>
                          </div>
                          <div class="mt-1 flex items-center justify-between text-sm/6 text-gray-600">
                            <span>{{ $t('transfer.wizard.thisTransfer') }}</span>
                            <span class="font-semibold text-gray-900">{{ quote.data.totalAmountCurrencyPrefixed }}</span>
                          </div>
                          <template v-if="walletStore.requiresReacceptance">
                            <div class="mt-3 border-l-4 border-warning-400 bg-warning-50 p-3">
                              <p class="text-sm/6 text-warning-700">{{ $t('transfer.wizard.weveUpdatedTheWalletTerms') }}</p>
                              <button type="button" @click="walletTermsMode = 'reaccept'; isWalletTermsModalOpen = true" class="mt-2 text-sm/6 font-semibold text-warning-800 hover:text-warning-900 cursor-pointer">{{ $t('transfer.wizard.reviewAndAccep') }} <span aria-hidden="true">→</span></button>
                            </div>
                          </template>
                          <p v-else class="mt-2 text-xs/5 text-gray-500">{{ $t('transfer.wizard.youllConfirmThisPaymentWith') }}</p>
                          <div v-if="walletShortMessage" class="mt-3 border-l-4 border-warning-400 bg-warning-50 p-3">
                            <p class="text-sm/6 text-warning-700">{{ walletShortMessage }}</p>
                            <div class="mt-2 flex items-center gap-x-4">
                              <button type="button" @click="isWalletTopUpOpen = true" class="text-sm/6 font-semibold text-warning-800 hover:text-warning-900 cursor-pointer">{{ $t('transfer.wizard.addMone') }} <span aria-hidden="true">→</span></button>
                              <span class="text-xs/5 text-warning-700">{{ $t('transfer.wizard.orChooseAnotherWayTo') }}</span>
                            </div>
                          </div>
                        </template>
                        <template v-else>
                          <p class="text-sm/6 text-gray-600">{{ $t('transfer.wizard.activateYourWalletToPay') }}</p>
                          <button type="button" @click="walletTermsMode = 'enrol'; isWalletTermsModalOpen = true" class="mt-2 text-sm/6 font-semibold text-brand-700 hover:text-brand-800 cursor-pointer">{{ $t('transfer.wizard.activateWalle') }} <span aria-hidden="true">→</span></button>
                        </template>
                      </div>
                    </template>

                    <!-- Checkbox -->
                    <div v-if="thirdPartyDeclaration" class="flex items-start space-x-2">
                      <input type="checkbox" id="third-party-declaration-accepted" v-model="thirdPartyDeclarationAccepted" class="mt-1.5 w-4 h-4 min-w-4 min-h-4 text-brand-700 border-gray-300 rounded focus:ring-brand-700 focus:ring-0 outline-none accent-brand-700" />
                      <label for="third-party-declaration-accepted" class="text-sm/6 text-gray-700">{{ thirdPartyDeclaration }}</label>
                    </div>

                  </div>
                </template>
              </template>
              <div v-if="confirmGeneralErrors.length > 0" class="mx-3 sm:mx-0 rounded-md bg-danger-50 p-4" role="alert">
                <ul role="list" class="list-disc space-y-1 pl-5 text-sm/6 text-danger-700">
                  <li v-for="(message, index) in confirmGeneralErrors" :key="index">{{ message }}</li>
                </ul>
              </div>
              <div class="py-4 px-3 sm:px-0">
                <button v-if="showContinueButton" @click="submitAndContinue" :class="{'opacity-60' : !canContinue}" :disabled="!canContinue" class="block w-full bg-brand-700 text-white text-center py-2.5 rounded-xl font-medium hover:bg-brand-800 transition cursor-pointer text-sm/6">
                  <span v-if="isStepProcessing" class="flex justify-center items-center">
                    <Spinner :class="'w-5 h-5 mr-3'"/>
                    <span>{{ $t('transfer.wizard.saving') }}</span>
                  </span>
                  <span v-else>{{ snapshot.value === 'confirm' && paymentMethod?.code === 'WALLET' ? $t('transfer.wizard.payWithWallet') : $t('common.continue') }}</span>
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
      <template v-else>
        <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:max-w-7xl lg:px-8">
          <div class="flex items-center justify-center gap-4 lg:gap-8 bg-white rounded-t-lg p-4 md:px-6 md:py-8 min-h-148">
            <div class="text-center" v-if="isLoading">
              <span class="text-6xl pi pi-spinner-dotted pi-spin text-gray-500"></span>
              <h2 class="text-2xl font-semibold text-gray-600 mb-5 mt-5">{{ $t('transfer.wizard.pleaseWait') }}</h2>
            </div>
          </div>
        </div>
        <TransitionRoot as="template" :show="true">
          <Dialog class="relative z-50">
            <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0" enter-to="opacity-100" leave="ease-in duration-200" leave-from="opacity-100" leave-to="opacity-0">
              <div class="fixed inset-0 bg-gray-500/75 transition-opacity" />
            </TransitionChild>
            <div class="fixed inset-0 z-50 w-screen overflow-y-auto">
              <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95" enter-to="opacity-100 translate-y-0 sm:scale-100" leave="ease-in duration-200" leave-from="opacity-100 translate-y-0 sm:scale-100" leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95">
                  <DialogPanel class="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-sm sm:p-6">
                    <button class="sr-only">{{ $t('transfer.wizard.identityMismatchDetected') }}</button>
                    <div class="">
                      <div class="text-left">
                        <h3 class="font-semibold text-danger-600">{{ $t('transfer.wizard.identityMismatchDetected') }}</h3>
                        <p class="font-normal text-sm/6 text-danger-600 mt-3">{{ $t('transfer.wizard.weVeDetectedADiscrepancy') }}</p>
                        <ul role="list" class="mt-6 divide-y divide-gray-200" :class="isApplyingInfoFromPoiDocument ? 'opacity:70 animate animate-pulse' : ''">
                          <li @click="stepCommandExecuted('UPLOAD_ANOTHER_POI')" :class="isApplyingInfoFromPoiDocument ? '' : 'cursor-pointer'">
                            <div class="group relative flex items-start space-x-3 py-4">
                              <div class="shrink-0">
                                <span :class="['inline-flex size-10 items-center justify-center rounded-lg bg-brand-600 mt-1']">
                                  <ArrowUpTrayIcon class="size-6 text-white" aria-hidden="true" />
                                </span>
                              </div>
                              <div class="min-w-0 flex-1 px-2.5">
                                <div class="text-sm/6 font-medium text-gray-900">
                                  <div>
                                    <span class="absolute inset-0" aria-hidden="true" />{{ $t('transfer.wizard.uploadAnotherDocument') }}</div>
                                </div>
                                <p class="text-sm/6 text-gray-500 mt-1">{{ $t('transfer.wizard.iLlProvideADifferent') }}</p>
                              </div>
                              <div class="shrink-0 self-center">
                                <ChevronRightIcon class="size-5 text-gray-400 group-hover:text-gray-500" aria-hidden="true" />
                              </div>
                            </div>
                          </li>
                          <li v-if="applyPoiFailure" class="py-2"><InlineFailure :message="applyPoiFailure" /></li>
                          <li @click="applyInfoFromPoiDocument" :class="isApplyingInfoFromPoiDocument ? 'bg-gray-100' : 'cursor-pointer'">
                            <div class="group relative flex items-start space-x-3 py-4">
                              <div class="shrink-0">
                                <span :class="['inline-flex size-10 items-center justify-center rounded-lg bg-brand-600 mt-1']">
                                  <IdentificationIcon class="size-6 text-white" aria-hidden="true" />
                                </span>
                              </div>
                              <div class="min-w-0 flex-1 px-2.5">
                                <div class="text-sm/6 font-medium text-gray-900">
                                  <div>
                                    <span class="absolute inset-0" aria-hidden="true" />{{ $t('transfer.wizard.useDocumentDetails') }}</div>
                                </div>
                                <p class="text-sm/6 text-gray-500 mt-1">{{ $t('transfer.wizard.updateMyProfileWithThe') }}</p>
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
      <SpendOtpModal :open="isSpendOtpModalOpen" :quoteId="quote.data?.id" :error="spendOtpError" :isSubmitting="isStepProcessing" @close="isSpendOtpModalOpen = false" @complete="walletOtpEntered" />
      <TermsModal :open="isWalletTermsModalOpen" :mode="walletTermsMode" @close="isWalletTermsModalOpen = false" @accepted="walletTermsAccepted" />
      <TopUpFlow :open="isWalletTopUpOpen" @close="walletTopUpClosed" />
    </main>
  </CustomerLayout>
</template>