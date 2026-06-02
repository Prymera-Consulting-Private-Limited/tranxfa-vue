<script setup>
import {computed, onMounted, ref} from "vue";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import {useCustomerStore} from "@/stores/customer.js";
import Spinner from "@/components/Spinner.vue";

const customerUtils = useCustomerUtils();
const customerStore = useCustomerStore();
const props = defineProps({
  showEditPersonalInformation: {
    type: Boolean,
    default: false,
  },
});

const isLoading = ref(false);
const isSaving = ref(false);

const showLoading = computed(() => {
  return isLoading.value || customerStore.isLoaded === false;
})

const emit = defineEmits([
  'editPersonalInformationRequested',
  'skipEmailInput',
  'emailUpdated',
])

const editPersonalInformation = () => {
  emit('editPersonalInformationRequested');
}
const skip = () => {
  emit('skipEmailInput');
}

const email = ref('');
const errors = ref([]);

async function updateEmail() {
  isSaving.value = true;
  await customerUtils.updateEmailAddress(email.value).then(() => {
    customerUtils.refresh().then(() => {
      emit('emailUpdated');
    });
  }).catch((e) => {
    if (e.status === 422) {
      errors.value = e.response.data.errors;
    } else {
      console.error(e);
    }
    isSaving.value = false;
  });
}

onMounted( async () => {
  if (! customerStore.isLoaded) {
    isLoading.value = true;
    await customerUtils.refresh();
    isLoading.value = false;
  }
});
</script>

<template>
  <div class="relative flex-1 flex items-center justify-center p-4 md:p-8">
    <div v-if="showLoading" class="absolute inset-0 flex items-center justify-center bg-white/75 z-10">
      <i class="pi pi-spin pi-spinner text-5xl text-brand-700"></i>
    </div>
    <div v-show="! showLoading || isSaving" class="w-full max-w-xl">
      <div class="hidden md:block flex items-center justify-center w-full">
        <a href="javascript:"><img src="/images/logo.png" alt="RemitSo Logo" class="max-w-64 max-h-10 mb-5"></a>
      </div>
      <h2 class="text-2xl font-semibold text-black mb-4 text-left mt-14 sm:mt-8">Enter Your Email</h2>
      <p class="text-md text-gray-900 mb-8 text-left">Please provide your email address to continue.</p>
      <!-- Form -->
      <form @submit.prevent="updateEmail" class="space-y-6 mt-12">
        <div class="relative ">
          <input type="email" id="email" required v-model="email" :class="[errors.length > 0 ? 'text-red-500 border-red-500' : 'text-gray-900 border-gray-300']" placeholder="enter your email" class="w-full px-4 py-2 border rounded-lg">
          <button type="button" class="absolute inset-y-0 right-0 top-1 flex items-center px-3">
            <span class="pi pi-envelope w-5 h-5 text-gray-400"></span>
          </button>
        </div>
        <p v-if="errors.length > 0" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ errors[0] }}</p>
        <button :disabled="showLoading || isSaving" :class="[{'opacity-70': isLoading || isSaving}]" type="submit" class="block w-full bg-brand-700 text-white text-center py-3  rounded-[10px] font-medium hover:bg-brand-800 transition cursor-pointer">
          <template v-if="isSaving">
              <span class="flex items-center justify-center whitespace-nowrap">
                <Spinner :class="'size-4 mr-2'" />
                Saving ...
              </span>
          </template>
          <template v-else>Continue</template>
        </button>
        <button @click="skip" :disabled="showLoading || isSaving" :class="[{'opacity-70': isLoading || isSaving}]" type="button" class="block mt-3 w-full bg-gray-200 hover:text-gray-500 text-gray-600 text-center py-3  rounded-[10px] font-medium hover:bg-gray-300 transition cursor-pointer">
          Skip
        </button>
      </form>
      <div v-if="props.showEditPersonalInformation" class="text-center mt-12">
        <a @click="editPersonalInformation" class="text-brand-700 text-sm hover:underline" href="javascript:">Edit Personal Information</a>
      </div>
    </div>
  </div>
</template>