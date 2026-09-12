<script setup>
import InlineFailure from "@/components/InlineFailure.vue";
import Transaction from "@/models/transaction.js";
import {computed, onMounted, onUnmounted, ref, watch, watchEffect} from "vue";
import PaymentState from "@/enums/payment_state.js";
import {usePaymentWatch} from "@/composables/payment_watch.js";
import {volumePaymentEnvironment} from "@/feature_flags.js";
import {loadVolumeSdk} from "@/composables/script_loader.js";
import PaymentCompleted from "@/components/Payment/State/PaymentCompleted.vue";
import Processing from "@/components/Payment/State/Processing.vue";
import AwaitingPending from "@/components/Payment/State/AwaitingPending.vue";
import Failed from "@/components/Payment/State/Failed.vue";

const FINAL_STATES = [
  PaymentState.AUTHORIZED, PaymentState.CAPTURED, PaymentState.FAILED,
  PaymentState.TIMED_OUT, PaymentState.CANCELLED, PaymentState.REFUNDED, PaymentState.PART_REFUNDED,
];

const props = defineProps({
  transaction: {
    type: Object(Transaction),
    required: true
  }
})

const {stopPolling} = usePaymentWatch(props.transaction, {
  isReady: () => props.transaction.payment.state.code === PaymentState.PENDING,
  isFinal: () => FINAL_STATES.includes(props.transaction.payment.state.code),
});



const status = computed(() => {
  if (props.transaction.payment.state.code === PaymentState.PENDING || props.transaction.payment.state.code === PaymentState.INITIALIZED || props.transaction.payment.state.code === PaymentState.CREATED) {
    return 'pending';
  } else if (props.transaction.payment.state.code === PaymentState.REDIRECTED) {
    return 'processing';
  } else if (props.transaction.payment.state.code === PaymentState.AUTHORIZED || props.transaction.payment.state.code === PaymentState.CAPTURED) {
    return 'completed';
  } else if (props.transaction.payment.state.code === PaymentState.FAILED) {
    return 'failed';
  } else if (props.transaction.payment.state.code === PaymentState.TIMED_OUT || props.transaction.payment.state.code === PaymentState.CANCELLED) {
    return 'cancelled';
  } else if (props.transaction.payment.state.code === PaymentState.REFUNDED || props.transaction.payment.state.code === PaymentState.PART_REFUNDED) {
    return 'refunded';
  }
  return 'unknown';
})

const emits = defineEmits(['retryPayment']);

// Set when the deployment has no Volume environment configured. The customer
// sees an unavailable state rather than a sandbox bank list.
const sdkFailure = ref(null);
function reload() {
  window.location.reload();
}
const isMisconfigured = ref(false);

// The sdk injects its own component into the container. Doing that again on
// every reactive change of the transaction stacked bank pickers on top of
// each other.
let initialised = false;

const initPayment = async () => {
  if (initialised) return;
  initialised = true;

  const environment = volumePaymentEnvironment();
  if (! environment || ! import.meta.env.VITE_VOLUME_PAYMENT_MERCHANT_ID) {
    console.error('[payment: volume] VITE_VOLUME_PAYMENT_ENVIRONMENT or VITE_VOLUME_PAYMENT_MERCHANT_ID is not set');
    isMisconfigured.value = true;
    return;
  }

  try {
    await loadVolumeSdk();
  } catch (e) {
    console.error('[payment: volume] the sdk could not be loaded', e);
    isMisconfigured.value = true;
    return;
  }

  const volume = new window.Volume({
    environment,
    applicationId: import.meta.env.VITE_VOLUME_PAYMENT_MERCHANT_ID,
    eventConsumer: (event) => {
      if (event === 'payment_initiated') {
        props.transaction.payment.state.code = PaymentState.REDIRECTED;
      }
    },
    errorConsumer: (error) => {
      console.error('[payment: volume] the sdk reported an error', error);
      sdkFailure.value = "Your bank connection didn't start. No money has moved. Reload this page to try again, or choose another way to pay.";
    },
  });
  volume.createPayment({
    amount: props.transaction.payment.totalPaymentAmount,
    merchantPaymentId: props.transaction.payment.id,
    paymentReference: props.transaction.transactionNumber + '',
  });
  volume.injectComponent('volume-element-container');
  volume.openInstitutionSelection()
}

watch(props.transaction, () => {
  if (props.transaction.payment.state.code === PaymentState.PENDING) {
    initPayment();
  }
}, {immediate: true});

const retryPayment = async () => {
  emits('retryPayment');
}
</script>

<template>
  <template v-if="isMisconfigured">
    <Failed class="-mt-20" />
    <h2 class="text-2xl font-semibold text-danger-600 mb-5 -mt-10">Payment unavailable</h2>
    <p class="text-base text-gray-600">This way to pay is not available right now. No money has moved. Please choose another payment method or contact support.</p>
  </template>

  <template v-else-if="transaction.payment.state.code === PaymentState.PENDING">
    <AwaitingPending class="-mt-10" />
    <h2 class="text-xl font-semibold text-gray-900 mb-5 -mt-10">Completa tu pago</h2>
    <p class="text-base text-gray-600 mb-6">Your transfer is waiting for payment. Choose your bank to continue.</p>
    <div class="mt-6 mb-10">
      <div id="volume-element-container"></div>
      <InlineFailure :message="sdkFailure" retryLabel="Reload this page" @retry="reload" />
    </div>
  </template>

  <template v-else-if="status === 'pending'">
    <AwaitingPending class="-mt-10" />
    <h2 class="text-xl font-semibold text-gray-900 mb-5 -mt-10">Espera un momento…</h2>
    <p class="text-base text-gray-600 mb-6">Espera un momento mientras preparamos el pago.</p>
  </template>

  <template v-else-if="status === 'processing'">
    <Processing class="-mt-10" />
    <h2 class="text-xl font-semibold text-gray-900 mb-5 -mt-10">Estamos pendientes de tu pago</h2>
    <p class="text-base text-gray-600 mb-6">We have opened a new browser window for you to complete the payment.</p>
  </template>

  <template v-else-if="status === 'completed'">
    <PaymentCompleted class="-mt-10" />
    <h2 class="text-xl font-semibold text-success-700 mb-5 -mt-10">Payment received</h2>
    <p class="text-lg text-gray-600 mb-6">Hemos recibido tu pago correctamente.</p>
  </template>

  <template v-else-if="status === 'failed'">
    <Failed class="-mt-20" />
    <h2 class="text-2xl font-semibold text-danger-600 mb-5 -mt-10">Payment failed</h2>
    <p class="text-base text-danger-600">We couldn't take your payment and no money has left your account. You can try again or choose another way to pay.</p>
    <button @click="retryPayment" class="mt-5 px-4 md:px-6 lg:px-8 bg-brand-700 text-white text-center py-2.5 rounded-xl font-medium hover:bg-brand-800 transition cursor-pointer text-sm/6 outline-none ring-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700">Reintentar el pago</button>
  </template>

  <!-- Expired, cancelled and refunded payments rendered an empty modal here. -->
  <template v-else-if="status === 'cancelled'">
    <Failed class="-mt-20" />
    <h2 class="text-2xl font-semibold text-gray-900 mb-5 -mt-10">{{ transaction.payment.state.code === PaymentState.TIMED_OUT ? 'This payment has expired' : 'This payment was cancelled' }}</h2>
    <p class="text-base text-gray-600 mb-6">No money has moved. You can start the transfer again whenever you're ready.</p>
    <div class="mb-6 text-center text-gray-900 hover:text-brand-800 font-semibold text-sm/6">
      <router-link :to="{name: 'viewTransaction', params: {transactionId: transaction.id}}">View transfer</router-link>
    </div>
  </template>

  <template v-else-if="status === 'refunded'">
    <h2 class="text-xl font-semibold text-gray-900 mb-5">Payment refunded</h2>
    <p class="text-base text-gray-600 mb-6">Este pago se te ha devuelto. Consulta el envío para ver los detalles.</p>
    <div class="mb-6 text-center text-gray-900 hover:text-brand-800 font-semibold text-sm/6">
      <router-link :to="{name: 'viewTransaction', params: {transactionId: transaction.id}}">View transfer</router-link>
    </div>
  </template>
</template>
