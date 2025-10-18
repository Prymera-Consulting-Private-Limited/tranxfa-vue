<script setup>
import DocumentCategory from "@/models/document_category.js";
import DocumentType from "@/models/document_type.js";
import {onMounted, onUnmounted, ref} from "vue";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import {useCustomerStore} from "@/stores/customer.js";
import router from "@/router/index.js";

const customerUtils = useCustomerUtils();
const customerStore = useCustomerStore();

const emit = defineEmits([
  'sdkInitialized',
  'sdkError',
  'sdkStepCompleted',
  'sdkApplicantStatusChanged'
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
  const route = router.currentRoute.value;
  const fullUrl = window.location.origin + route.fullPath;
  await customerUtils.getAccountVerificationToken(props.documentCategory, props.documentType, null, fullUrl).then((response) => {
    accessToken = response.data.token;
  }).catch((e) => {
    console.error(e);
    throw e;
  });

  return accessToken;
}

const accessToken = ref('');

onMounted(async () => {
  accessToken.value = await getNewAccessToken();
  sdkInitialized();
  Echo.channel(`client-customer.${customer.data?.id}`)
      .listen('CustomerDocumentUploaded', () => {
        sdkFinalStateReached();
      });
})

onUnmounted(() => {
  Echo.leaveChannel(`client-customer.${customer.data?.id}`);
});
</script>

<template>
  <div class="px-6 py-6" v-if="accessToken">
    <p class="text-gray-600 text-sm mb-6">
      To continue, you'll be redirected to our trusted verification partner.
      Please complete the process to verify your identity securely.
    </p>
    <div class="flex justify-end gap-3">
      <button @click="sdkFinalStateReached" class="px-2.5 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 text-sm">
        Cancel
      </button>
      <a :href="accessToken"
         class="px-2.5 py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 text-sm">
        Continue
      </a>
    </div>
  </div>
</template>