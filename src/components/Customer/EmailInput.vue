<script setup>
import {computed, onMounted, ref} from "vue";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import {useCountriesStore} from "@/stores/countries.js";
import {useCustomerStore} from "@/stores/customer.js";
import Spinner from "@/components/Spinner.vue";

const countriesStore = useCountriesStore();
const customerUtils = useCustomerUtils();
const customerStore = useCustomerStore();

const isLoading = ref(false);
const isSaving = ref(false);

const showLoading = computed(() => {
  return isLoading.value || customerStore.isLoaded === false || countriesStore.isLoaded === false;
})

const emit = defineEmits([
  'editPersonalInformation',
  'skipEmailInput',
  'emailUpdated',
])

const editPersonalInformation = () => {
  emit('editPersonalInformation');
}
const skip = () => {
  emit('skipEmailInput');
}

const email = ref('');
const errors = ref([]);
const emailFocused = ref(false);

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
      <form @submit.prevent="updateEmail" class="mt-12 space-y-5">
        <div>
          <label for="email" class="mb-2 block font-medium text-brand-700">Email</label>
          <div
            class="relative rounded-2xl border bg-white transition-all duration-200"
            :class="errors.length > 0 ? 'border-red-500' : (emailFocused ? 'border-brand-700 ring-4 ring-brand-700/10' : 'border-gray-200 hover:border-gray-300')"
          >
            <input
              type="email"
              id="email"
              required
              v-model="email"
              placeholder="enter your email"
              class="w-full rounded-2xl border-0 bg-transparent py-3 pl-4 pr-12 text-gray-900 outline-none placeholder:text-gray-400"
              @focus="emailFocused = true"
              @blur="emailFocused = false"
            >
            <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3">
              <i class="pi pi-envelope transition-colors" :class="emailFocused ? 'text-brand-700' : 'text-gray-400'"></i>
            </span>
          </div>
          <p v-if="errors.length > 0" class="mt-2 text-sm text-red-600">{{ errors[0] }}</p>
        </div>
        <button
          :disabled="showLoading || isSaving"
          type="submit"
          class="group relative block w-full overflow-hidden rounded-full bg-brand-700 py-3.5 text-center text-base font-semibold text-white shadow-sm transition-all duration-200 hover:bg-brand-800 hover:shadow-md active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
        >
          <template v-if="isSaving">
            <span class="inline-flex items-center justify-center gap-2 whitespace-nowrap">
              <Spinner :class="'size-4'" />
              Saving ...
            </span>
          </template>
          <template v-else>
            <span class="inline-flex items-center justify-center gap-2">
              Continue
              <i class="pi pi-arrow-right text-sm transition-transform duration-200 group-hover:translate-x-0.5"></i>
            </span>
          </template>
        </button>
        <button
          @click="skip"
          :disabled="showLoading || isSaving"
          type="button"
          class="block w-full rounded-full bg-gray-100 py-3.5 text-center text-base font-medium text-gray-600 transition-all duration-200 hover:bg-gray-200 hover:text-gray-700 active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
        >
          Skip
        </button>
      </form>
      <div class="mt-12 text-center">
        <a
          @click="editPersonalInformation"
          class="inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50 hover:underline"
          href="javascript:"
        >Edit Personal Information</a>
      </div>
    </div>
  </div>
</template>