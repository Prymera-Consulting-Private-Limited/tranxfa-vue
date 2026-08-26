<script setup>
import {computed, onMounted, reactive, ref} from "vue";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import MobileNumberInput from "@/components/CustomerAttribute/MobileNumberInput.vue";
import {useCountriesStore} from "@/stores/countries.js";
import {useCustomerStore} from "@/stores/customer.js";
import Spinner from "@/components/Spinner.vue";

const countriesStore = useCountriesStore();
const customerUtils = useCustomerUtils();
const customerStore = useCustomerStore();

const isLoading = ref(false);
const isSaving = ref(false);

const mobile = reactive({
  number: null,
  country: null,
});

const emit = defineEmits(['mobileNumberUpdated', 'editPersonalInformationRequested']);

const errors = ref({});

onMounted( async () => {
  if (! customerStore.isLoaded) {
    isLoading.value = true;
    await customerUtils.refresh();
    isLoading.value = false;
  }
});

function mobileNumberUpdated(updated) {
  mobile.number = updated?.number;
  mobile.country = updated?.country;
}

async function updateMobileNumber() {
  isSaving.value = true;
  await customerUtils.updateMobileNumber(mobile.country, mobile.number).catch((e) => {
    if (e.status === 422) {
      errors.value = e.response.data.errors;
    } else {
      console.error(e);
    }
    isSaving.value = false;
  });
  emit('mobileNumberUpdated');
}

const showLoading = computed(() => {
  return isLoading.value || customerStore.isLoaded === false || countriesStore.isLoaded === false;
})

const editPersonalInformation = () => {
  emit('editPersonalInformationRequested');
}
</script>

<template>
  <div class="relative flex-1 flex items-center justify-center p-4 md:p-8">
    <div v-if="showLoading" class="absolute inset-0 flex items-center justify-center bg-white/75 z-10">
      <i class="pi pi-spin pi-spinner text-5xl text-brand-700"></i>
    </div>
    <div v-show="! showLoading || isSaving" class="w-full max-w-xl">
      <div class="hidden md:block flex items-center justify-center w-full">
        <a href="javascript:"><img src="/images/logo.png" alt="VeloxPays Logo" class="max-w-64 max-h-10 mb-5"></a>
      </div>
      <h2 class="text-2xl font-semibold text-black mb-4 text-left mt-14 sm:mt-8">Enter Your Mobile Number</h2>
      <p class="text-md text-gray-900 mb-8 text-left">Please provide your mobile number to continue.</p>
      <!-- Form -->
      <form @submit.prevent="updateMobileNumber" class="mt-12 space-y-5">
        <MobileNumberInput v-bind:mobile="mobile" v-bind:errors="errors" v-on:update:mobileNumberUpdated="mobileNumberUpdated" />
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