<script setup>
import {useCustomerStore} from "@/stores/customer.js";
import {computed, onMounted, ref} from "vue";
import FormGroup from "@/components/CustomerAttribute/FormGroup.vue";
import {useCustomerUtils} from "@/composables/customer_utils.js";
import {useCountriesStore} from "@/stores/countries.js";
import Spinner from "@/components/Spinner.vue";

const isLoading = ref(false)
const customerStore = useCustomerStore()
const countriesStore = useCountriesStore();
const customerUtils = useCustomerUtils()
const formData = ref({})
const formErrors = ref({});

/**
 * @type {{data: Customer | null}}
 */
const customer = customerStore.customer;

const identityAttributes = computed(() => {
  const identityAttributes = [];
  for (const attribute of customer.data?.attributes) {
    if (attribute.category === 'identity') {
      if (typeof formErrors.value[attribute.attribute] !== 'undefined') {
        attribute['errors'] = formErrors.value[attribute.attribute];
      }
      identityAttributes.push(attribute);
    }
  }
  return identityAttributes;
})

onMounted( async () => {
  if (! customerStore.isLoaded) {
    await customerUtils.refresh();
  }
  for (const attribute of identityAttributes.value) {
    formData.value[attribute.attribute] = attribute.value;
  }
});

const isSaving = ref(false);

async function update() {
  isLoading.value = true;
  isSaving.value = true;
  customerUtils.updateProfileIdentity(formData.value).catch((e) => {
    if (e.status === 422) {
      formErrors.value = e.response.data.errors;
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

const updateFormData = (attr, value) => {
  formData.value[attr.attribute] = value;
}
</script>
<template>
  <div v-show="! showLoading" class="flex-1 flex items-center justify-center p-4 md:p-8">
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
          <FormGroup v-on:customer:attribute:updated="updateFormData" v-bind:attr="attr" />
        </div>
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
