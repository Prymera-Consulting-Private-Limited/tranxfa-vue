<script setup>
import Transaction from "@/models/transaction.js";
import {computed, onMounted, onUnmounted, reactive, ref} from "vue";
import PaymentTransactionState from "@/models/payment_transaction_state.js";
import PaymentState from "@/enums/payment_state.js";
import PaymentCompleted from "@/components/Payment/State/PaymentCompleted.vue";
import Processing from "@/components/Payment/State/Processing.vue";
import AwaitingPending from "@/components/Payment/State/AwaitingPending.vue";
import Failed from "@/components/Payment/State/Failed.vue";
import {useTransactionUtils} from "@/composables/transaction_utils.js";
import router from "@/router/index.js";

const props = defineProps({
  transaction: {
    type: Object(Transaction),
    required: true
  },
  showViewTransfer: {
    type: Boolean,
    required: false,
    default: true,
  },
  retryFormErrors: {
    type: Object,
    required: false,
    default: null,
  }
})

const transactionUtils = useTransactionUtils();

const getTransaction = async () => {
  transactionUtils.getTransaction(props.transaction.id).then((response) => {
    const transaction = Transaction.getInstance(response.data);
    props.transaction.payment = transaction.payment;
  });
}

onMounted(async () => {
  Echo.channel(`client-payment.${props.transaction.payment.id}`)
      .listen('PaymentTransactionStateUpdated', (e) => {
        props.transaction.payment.state = PaymentTransactionState.getInstance(e.state);
        props.transaction.payment.sharedReference = e.shared_reference;
        props.transaction.payment.paymentUrl = e.payment_url;
        if (props.transaction.payment.state.code === PaymentState.AUTHORIZED || props.transaction.payment.state.code === PaymentState.CAPTURED) {
          setTimeout(() => {
            router.push({
              name: 'viewTransaction',
              params: {
                transactionId: props.transaction.id
              }
            });
          }, 1500)
        }
      });
})

onUnmounted(async () => {
  Echo.leaveChannel(`client-payment.${props.transaction.payment.id}`);
})

const status = computed(() => {
  if (
      (
        props.transaction.payment.state.code === PaymentState.PENDING ||
        props.transaction.payment.state.code === PaymentState.INITIALIZED ||
        props.transaction.payment.state.code === PaymentState.CREATED
      )
  ) {
    return 'pending';
  } else if (props.transaction.payment.state.code === PaymentState.REDIRECTED) {
    return 'processing';
  } else if (props.transaction.payment.state.code === PaymentState.AUTHORIZED || props.transaction.payment.state.code === PaymentState.CAPTURED) {
    return 'completed';
  } else if (props.transaction.payment.state.code === PaymentState.FAILED) {
    return 'failed';
  }
})

const emits = defineEmits(['retryPayment']);

const retryPayment = async () => {
  let paymentDataAttributes = {};
  if (paymentData.data) {
    for (const paymentDataAttribute of Object.entries(paymentData.data)) {
      paymentDataAttributes[paymentDataAttribute[0]] = paymentDataAttribute[1].value;
    }
  }
  emits('retryPayment', paymentDataAttributes);
}

function redirectToPaymentUrl() {
  props.transaction.payment.state.code = PaymentState.REDIRECTED;
}

const iHaveMadePayment = async () => {
  props.transaction.payment.customerConfirmedPayment = true;
  await transactionUtils.iHaveMadePayment(props.transaction.payment.id).then(() => {
    router.push({
      name: 'viewTransaction',
      params: {
        transactionId: props.transaction.id
      }
    });
  });
}

const paymentData = reactive({
  data: {},
});

if (props.transaction?.payment.paymentProvider?.paymentDataAttributes?.length > 0) {
  props.transaction.payment.paymentProvider.paymentDataAttributes.forEach(function (attribute) {
    paymentData.data[attribute.attribute] = attribute;
  });
}
</script>

<template>
  <template v-if="transaction.payment.state.code === PaymentState.PENDING">
    <div class="-m-5 -mt-10">
      <h2 class="text-lg font-semibold text-gray-900 mb-5 text-left">Complete Your Interac Payment</h2>
      <p class="text-sm/6 text-gray-600 mb-6 text-left">
        Your transaction is awaiting payment. Please proceed by clicking the button below to securely complete your Interac e-Transfer.
      </p>
      <a :href="transaction.payment.paymentUrl" @click="redirectToPaymentUrl" target="_blank" class="block w-full px-4 md:px-6 lg:px-8 bg-green-600 text-white text-center py-3 rounded-md font-medium hover:bg-green-700 transition cursor-pointer text-sm outline-none ring-0 tracking-wider">Pay {{ transaction.payment.totalPaymentAmountCurrencyPrefixed }}</a>
      <p class="text-sm/6 text-gray-600 mt-4 text-left">You will be redirected to the Interac platform to finalize your payment.</p>
    </div>
  </template>

  <template v-else-if="status === 'pending'">
    <AwaitingPending class="-mt-10" />
    <h2 class="text-xl font-semibold text-gray-900 mb-5 -mt-10">Please wait...</h2>
    <p class="text-base text-gray-600 mb-6">Please wait while we are setting up the payment.</p>
  </template>

  <template v-else-if="status === 'processing'">
    <Processing class="-mt-10" />
    <h2 class="text-xl font-semibold text-gray-900 mb-5 -mt-10">Awaiting Payment Update</h2>
    <p class="text-base/6 text-gray-600 mb-6">Once you've sent the Interac e-Transfer, click "I have made the payment" below to let us know. It usually takes <strong>up to 5 minutes</strong> for the payment to be confirmed.</p>
    <div v-if="!transaction.payment.customerConfirmedPayment" class="my-6">
      <button @click="iHaveMadePayment" type="button" class="rounded-md w-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-brand-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 cursor-pointer">I've made payment</button>
    </div>
  </template>

  <template v-else-if="status === 'completed'">
    <PaymentCompleted class="-mt-10" />
    <h2 class="text-xl font-semibold text-green-700 mb-5 -mt-10">Pago exitosa</h2>
    <p class="text-lg text-gray-600 mb-6">Su pago se ha recibido correctamente.</p>
  </template>

  <template v-else-if="status === 'failed'">
    <Failed class="-mt-20" />
    <h2 class="text-2xl font-semibold text-red-500 mb-3 -mt-15">Payment Failed</h2>
    <p class="text-base text-red-600 mb-5">Your payment could not be completed.</p>
    <template v-if="transaction.payment.paymentProvider.paymentDataAttributes?.length > 0">
      <p class="text-sm text-gray-600 mb-2 text-left">Please review or update the information below and double-check that everything is correct, then try again.</p>
      <template v-for="attribute in transaction.payment.paymentProvider.paymentDataAttributes">
        <div class="mb-3 text-left">
          <label :class="[retryFormErrors[`${attribute.attribute}`]?.length > 0 ? 'text-red-600' : 'text-gray-900']" :for="`payment-data-${attribute.attribute}`" class="text-sm/6 font-semibold">{{ attribute.label }} <span class="text-red-500" v-if="attribute.isRequired">*</span></label>
          <p v-if="attribute.info" class="mb-4 text-sm text-gray-500">{{ attribute.info }}</p>
          <input v-if="attribute.type === 'text'" v-model="paymentData.data[attribute.attribute].value" :inputmode="attribute.inputMode" :required="attribute.isRequired" :id="`payment-data-${attribute.attribute}`" type="text" class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none" />
          <input v-else-if="attribute.type === 'email'" v-model="paymentData.data[attribute.attribute].value" :required="attribute.isRequired" :id="`payment-data-${attribute.attribute}`" type="email" class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none" />
          <p v-if="retryFormErrors[`${attribute.attribute}`]?.length > 0" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ retryFormErrors[`${attribute.attribute}`][0] }}</p>
        </div>
      </template>
    </template>
    <button @click="retryPayment" class="mt-5 px-4 md:px-6 block w-full lg:px-8 bg-brand-600 text-white text-center py-3 rounded-md font-medium hover:bg-brand-700 transition cursor-pointer text-sm outline-none ring-0">Retry Payment</button>
    <p class="text-base text-red-600 mt-5 text-sm">If the issue continues, please contact our support team. We'll be happy to assist you!</p>
  </template>
</template>