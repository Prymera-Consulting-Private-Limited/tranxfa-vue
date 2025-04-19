<script setup>
import CustomerAttribute from "@/models/customer_attribute.js";
import NameInput from "@/components/CustomerAttribute/NameInput.vue";
import SecondNameInput from "@/components/CustomerAttribute/SecondNameInput.vue";
import ThirdNameInput from "@/components/CustomerAttribute/ThirdNameInput.vue";
import DateOfBirthInput from "@/components/CustomerAttribute/DateOfBirthInput.vue";
import NationalityInput from "@/components/CustomerAttribute/NationalityInput.vue";
import TextInput from "@/components/CustomerAttribute/TextInput.vue";
import OccupationInput from "@/components/CustomerAttribute/OccupationInput.vue";
import EarningRangeInput from "@/components/CustomerAttribute/EarningRangeInput.vue";

defineProps({
  attr: {
    type: CustomerAttribute,
    required: true
  },
  occupations: {
    type: Array,
    required: false,
  },
  currencySalaryRange: {
    type: Object,
    required: false,
  },
  formErrors: {
    type: Object,
    required: false,
  },
});

const emit = defineEmits(['customer:attribute:updated', 'customer:occupation:updated', 'customer:earning:updated']);

const notifyAttributeUpdated = (attr, value) => {
  emit('customer:attribute:updated', attr, value);
}
const notifyOccupationUpdated = (attr, value) => {
  emit('customer:occupation:updated', attr, value);
}
</script>

<template>
  <label :for="attr.attribute" :class="[attr.errors?.length > 0 ? 'text-red-700' : 'text-brand-700']" class="block text-sm font-medium mb-0">
    <span>{{ attr.label }}</span>
    <span v-if="attr.isRequired === true" class="ml-0.5 text-red-500">*</span>
  </label>
  <p class="mt-2 mb-3 text-gray-400 text-xs">{{ attr.infoText }}</p>
  <NameInput
      v-if="attr.attribute === 'name'"
      v-bind:attr="attr"
      v-on:customer:attribute:updated="notifyAttributeUpdated"
  />
  <SecondNameInput
      v-else-if="attr.attribute === 'second_name'"
      v-bind:attr="attr"
      v-on:customer:attribute:updated="notifyAttributeUpdated"
  />
  <ThirdNameInput
      v-else-if="attr.attribute === 'third_name'"
      v-bind:attr="attr"
      v-on:customer:attribute:updated="notifyAttributeUpdated"
  />
  <DateOfBirthInput
      v-else-if="attr.attribute === 'birth_detail.birth_date'"
      v-bind:attr="attr"
      v-on:customer:attribute:updated="notifyAttributeUpdated"
  />
  <NationalityInput
      v-else-if="attr.attribute === 'nationality_id'"
      v-bind:attr="attr"
      v-on:customer:attribute:updated="notifyAttributeUpdated"
  />
  <OccupationInput
      v-else-if="attr.attribute === 'employment.occupation_id'"
      v-bind:attr="attr"
      v-bind:occupations="occupations"
      v-bind:formErrors="formErrors"
      v-on:customer:attribute:updated="notifyOccupationUpdated"
  />
  <EarningRangeInput
      v-else-if="attr.attribute === 'employment.earning_range_id'"
      v-bind:attr="attr"
      v-bind:currencySalaryRange="currencySalaryRange"
      v-on:customer:attribute:updated="notifyAttributeUpdated"
  />
  <TextInput
      v-else v-bind:attr="attr"
      v-on:customer:attribute:updated="notifyAttributeUpdated"
      :id="attr.attribute"
      class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none"
  />
  <p v-if="attr.errors?.length > 0" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ attr.errors[0] }}</p>
</template>