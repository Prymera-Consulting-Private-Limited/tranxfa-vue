<script setup>
import {customerChannel} from "@/realtime.js";
import DocumentCategory from "@/models/document_category.js";
import DocumentType from "@/models/document_type.js";
import {onMounted, onUnmounted, ref} from "vue";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import {useCustomerStore} from "@/stores/customer.js";

const customerUtils = useCustomerUtils();
const customerStore = useCustomerStore();

const emit = defineEmits([
  'sdkInitialized',
  'sdkError',
  'sdkStepCompleted',
  'sdkApplicantStatusChanged',
  'sdkCancelled',
]);

const props = defineProps({
  documentCategory: {
    type: DocumentCategory,
    required: true,
  },
  documentType: {
    type: DocumentType,
    required: true,
  }
})

/**
 * @type {{data: Customer|null}}
 */
const customer = customerStore.customer;

const sdkInitialized = () => {
  emit('sdkInitialized');
}

const sdkFinalStateReached = () => {
  emit('sdkApplicantStatusChanged');
}

async function getNewAccessToken() {
  let accessToken = null;
  await customerUtils.getAccountVerificationToken(props.documentCategory, props.documentType).then((response) => {
    accessToken = response.data.token;
  }).catch((e) => {
    console.error(e);
    throw e;
  });

  return accessToken;
}

const accessToken = ref('');

// getNewAccessToken() rethrows, and this used to let that reject unhandled -
// so the most likely failure of all, a token endpoint answering 500, emitted
// nothing and left the parent's spinner turning forever. It still rethrows,
// because Sumsub also uses it as the SDK's token-refresh callback where
// throwing is the contract; the catch belongs here instead.
onMounted(async () => {
  try {
    accessToken.value = await getNewAccessToken();
  } catch (e) {
    emit('sdkError', e);
    return;
  }
  sdkInitialized();
  // The layout listens on this same channel for the document outcome toasts.
  // Leaving the channel on unmount, as this used to, silenced those for the
  // rest of the page; only this listener is removed now.
  customerChannel(`client-customer.${customer.data?.id}`)
      .listen('CustomerDocumentUploaded', onDocumentUploaded);
})

const onDocumentUploaded = () => {
  sdkFinalStateReached();
};

onUnmounted(() => {
  customerChannel(`client-customer.${customer.data?.id}`)
      .stopListening('CustomerDocumentUploaded', onDocumentUploaded);
});
</script>

<template>
  <div class="px-6 py-6" v-if="accessToken">
    <p class="text-gray-600 text-sm/6 mb-6">
      Para continuar, te llevaremos a nuestro proveedor de verificación de confianza. Completa el proceso para verificar tu identidad de forma segura.
    </p>
    <div class="flex justify-end gap-3">
      <button type="button" @click="emit('sdkCancelled')" class="inline-flex min-h-11 items-center rounded-lg border border-gray-300 px-3 text-sm/6 text-gray-700 hover:bg-gray-100">
        Ahora no
      </button>
      <a :href="accessToken" target="_blank"
         class="px-2.5 py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-800 text-sm/6">
        Continuar
      </a>
    </div>
  </div>
</template>