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
  isLoading.value = true;
  isSaving.value = true;
  await customerUtils.updateMobileNumber(mobile.country, mobile.number).catch((e) => {
    if (e.status === 422) {
      errors.value = e.response.data.errors;
    } else {
      console.error(e);
    }
  }).finally(() => {
    isLoading.value = false;
    isSaving.value = false;
  });
}

const showLoading = computed(() => {
  return isLoading.value || customerStore.isLoaded === false || countriesStore.isLoaded === false;
})
</script>

<template>
  <div class="flex-1 flex items-center justify-center p-4 md:p-8">
    <div class="w-full max-w-xl">
      <div class="hidden md:block flex items-center justify-center w-full">
        <a href="javascript:"><img src="/images/logo.png" alt="Tranxfa Logo" class="w-auto max-w-sm"></a>
      </div>
      <h2 class="text-2xl font-semibold text-black mb-4 text-left">Enter Your Mobile Number</h2>
      <p class="text-md text-[#B7A3C1] mb-8 text-left">Please provide your mobile number along with the ISD code to continue.</p>
      <!-- Form -->
      <form v-show="! showLoading" @submit.prevent="updateMobileNumber" class="space-y-6 mt-12">
        <MobileNumberInput v-bind:mobile="mobile" v-bind:errors="errors" v-on:update:mobileNumberUpdated="mobileNumberUpdated" />
        <button :disabled="showLoading || isSaving" :class="[{'opacity-70': isLoading || isSaving}]" type="submit" class="block w-full bg-brand-700 text-white text-center py-3  rounded-[10px] font-medium hover:bg-brand-800 transition cursor-pointer">
          <template v-if="isSaving">
              <span class="flex items-center justify-center whitespace-nowrap">
                <Spinner :class="'size-4 mr-2'" />
                Saving ...
              </span>
          </template>
          <template v-else>Continue</template>
        </button>
      </form>
    </div>
  </div>
</template>