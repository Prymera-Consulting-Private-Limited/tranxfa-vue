<script setup>
import IsdCodeInput from "@/components/IsdCodeInput.vue";
import {reactive, watch} from "vue";

const props = defineProps({
  mobile: Object,
  errors: Object,
});
const emit = defineEmits(['update:mobileNumberUpdated']);
const mobileNumber = reactive({
  country: props.mobile?.country || null,
  number: props.mobile?.number || null,
})

function updateIsdCode(updated) {
  mobileNumber.country = updated?.id;
}

watch(mobileNumber, () => {
  emit('update:mobileNumberUpdated', mobileNumber);
})
</script>

<template>
  <div>
    <label :class="[errors?.mobile_number_country_id?.length > 0 ? 'text-red-700' : 'text-brand-700']" class="block text-sm font-medium mb-0">Country</label>
    <p class="mt-2 mb-3 text-gray-400 text-sm"></p>
    <IsdCodeInput v-on:update:modelValue="updateIsdCode" />
    <p v-if="errors?.mobile_number_country_id?.length > 0" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ errors.mobile_number_country_id[0] }}</p>
  </div>
  <div>
    <label for="mobile-number" :class="[errors?.mobile_number?.length > 0 ? 'text-red-700' : 'text-brand-700']" class="block text-sm font-medium mb-0">Mobile Number</label>
    <p class="mt-2 mb-3 text-gray-400 text-sm"></p>
    <input id="mobile-number" type="tel" v-model="mobileNumber.number" class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none" />
    <p v-if="errors?.mobile_number?.length > 0" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ errors.mobile_number[0] }}</p>
  </div>
</template>