<script setup>
import DocumentCategory from "@/models/document_category.js";
import DocumentType from "@/models/document_type.js";
import {computed, onMounted, ref} from "vue";
import SingleFileUpload from "@/components/AccountVerification/SingleFileUpload.vue";
import Spinner from "@/components/Spinner.vue";
import {useCustomerUtils} from "@/composables/customer_utils.js";

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

const customerUtils = useCustomerUtils();

const files = ref([]);

const emit = defineEmits([
  'sdkInitialized',
  'sdkError',
  'sdkStepCompleted',
  'sdkApplicantStatusChanged'
]);

const sdkInitialized = () => {
  emit('sdkInitialized');
}

const sdkFinalStateReached = () => {
  emit('sdkApplicantStatusChanged');
}

onMounted(() => {
  sdkInitialized();
})

const photoSideSelected = (file) => {
  files.value[0] = file;
}

const backSideSelected = (file) => {
  files.value[1] = file;
}

const isSaving = ref(false);

async function save() {
  isSaving.value = true;
  customerUtils.uploadDocument(props.documentCategory, props.documentType, files.value.map((file) => file.path)).then((response) => {
    emit('sdkApplicantStatusChanged', response.data);
  }).catch((e) => {
    console.error(e);
  }).finally(() => {
    isSaving.value = false;
  });
}

const canSave = computed(() => {
  if (files.value.length === 0) {
    return false;
  }
  const incompleteFiles = files.value.filter((file) => file.status !== 'completed');
  if (incompleteFiles.length > 0) {
    return false;
  }
  return !isSaving.value;
})

</script>

<template>

  <div class="px-6 py-8 space-y-6">
    <div>
      <h1 class="text-lg font-bold">Upload {{ documentType.title }}</h1>
      <p class="text-sm text-gray-600">Ensure all details on the document are clear and readable</p>
    </div>
    <div class="grid sm:grid-cols-2 items-center justify-center gap-5">
      <SingleFileUpload
          v-bind:page="'photo'"
          v-bind:documentCategory="documentCategory"
          v-bind:documentType="documentType"
          v-on:fileSelected="photoSideSelected"
      />
      <SingleFileUpload
          v-bind:page="'back'"
          v-bind:documentCategory="documentCategory"
          v-bind:documentType="documentType"
          v-on:fileSelected="backSideSelected"
      />
    </div>
    <form @submit.prevent="save">
      <button :disabled="!canSave" :class="[{'opacity-70': !canSave}, !canSave ? 'cursor-not-allowed' : 'cursor-pointer' ]" type="submit" class="mt-6 block w-full bg-brand-700 text-white text-center py-3 rounded-md font-medium hover:bg-brand-800 transition">
        <template v-if="isSaving">
          <span class="flex items-center justify-center whitespace-nowrap">
            <Spinner class="size-4 mr-2" />
            Uploading ...
          </span>
        </template>
        <template v-else>Upload</template>
      </button>
    </form>
  </div>
</template>

<style scoped>
input[type="file"] {
  display: none;
}
</style>