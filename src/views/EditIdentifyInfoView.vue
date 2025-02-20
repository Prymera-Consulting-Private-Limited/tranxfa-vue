<script setup>
import {useCustomerStore} from "@/stores/customer.js";
import {computed, onMounted, reactive, ref} from "vue";
import FormGroup from "@/components/CustomerAttribute/FormGroup.vue";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import {useCountriesStore} from "@/stores/countries.js";

const isLoading = ref(false)
const customerStore = useCustomerStore()
const countriesStore = useCountriesStore();
const customerUtils = useCustomerUtils()
const formErrors = ref({});
const identityAttributes = computed(() => {
  const identityAttributes = [];
  for (const attribute of customerStore.customer.attributes) {
      if (attribute.category === 'identity') {
        if (typeof formErrors.value[attribute.attribute] !== 'undefined') {
          attribute['errors'] = formErrors.value[attribute.attribute];
        }
        identityAttributes.push(attribute);
      }
  }
  return identityAttributes;
})

onMounted( () => {
  if (! customerStore.isLoaded) {
    customerUtils.refresh();
  }
});
async function update() {
  isLoading.value = true;
  try {
    await customerUtils.updateProfileIdentity(identityAttributes);
  } catch (e) {
    if (e.status === 422) {
      formErrors.value = e.response.data.errors;
    }
  } finally {
    isLoading.value = false;
  }
}

const showLoading = computed(() => {
  return isLoading.value || customerStore.isLoaded === false || countriesStore.isLoaded === false;
})
</script>
<template>
  <main>
    <div class="relative flex items-center justify-center min-h-screen bg-gray-50 tracking-wider">
      <i v-show="showLoading" class="pi pi-spin pi-spinner text-5xl text-purple-700 bg-white/10"></i>
      <div v-show="! showLoading" class="relative flex flex-col md:flex-row w-full h-screen bg-white">
        <div class=" w-[60%] md:w-[60%] h-auto md:h-full">
          <img src="/images/backgrounds/login.png" alt="Login Background" class="w-full h-90 md:h-full object-cover hidden md:block">
          <!-- Logo and Cross in Mobile View -->
          <div class="absolute top-4 left-4 md:hidden flex items-center justify-between w-full px-4">
            <a href="javascript:"><img src="/images/logo.png" alt="Tranxfa Logo" class="w-auto max-w-sm"></a>
            <a href="javascript:" class="text-gray-400 text-3xl hover:text-gray-500 pr-5">
              <i class="pi pi-times"></i>
            </a>
          </div>
          <div class="hidden md:block  absolute top-4 right-4">
            <a href="javascript:" class="text-gray-400 text-3xl hover:text-gray-500 pr-5">
              <i class="pi pi-times"></i>
            </a>
          </div>
        </div>

        <!-- Form Section -->
        <div class="flex-1 flex items-center justify-center p-4 md:p-8">
          <div class="w-full max-w-xl">
            <!-- Logo at Top Left (Desktop)  -->
            <div class="hidden md:block flex items-center justify-center w-full">
              <a href="javascript:"><img src="/images/logo.png" alt="Tranxfa Logo" class="w-auto max-w-sm"></a>
            </div>
            <!-- Form Header -->
            <h2 class="text-2xl font-semibold text-black mb-4 mt-8">Personal Details</h2>
            <p class="text-md text-[#B7A3C1] mb-8">Complete your profile by providing some details about you</p>
            <!-- Form -->

            <form @submit.prevent="update" class="space-y-6 mt-12">
              <div v-for="attr in identityAttributes">
                <FormGroup v-bind:attr="attr" />
              </div>
              <button type="submit" class="block w-full bg-purple-700 text-white text-center py-3  rounded-[10px] font-medium hover:bg-purple-800 transition cursor-pointer">Continue</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>
