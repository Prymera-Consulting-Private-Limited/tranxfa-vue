<script setup>
import CustomerAttribute from "@/models/customer_attribute.js";
import FirstNameInput from "@/components/CustomerAttribute/FirstNameInput.vue";
import MiddleNameInput from "@/components/CustomerAttribute/MiddleNameInput.vue";
import LastNameInput from "@/components/CustomerAttribute/LastNameInput.vue";
import DateOfBirthInput from "@/components/CustomerAttribute/DateOfBirthInput.vue";
import NationalityInput from "@/components/CustomerAttribute/NationalityInput.vue";

defineProps({
  attr: {
    type: CustomerAttribute,
    required: true
  },
});
</script>

<template>
  <label :for="attr.attribute" :class="[attr.errors?.length > 0 ? 'text-red-700' : 'text-brand-700']" class="block text-sm font-medium mb-0">{{ attr.label }}</label>
  <p class="mt-2 mb-3 text-gray-400 text-sm">{{ attr.infoText }}</p>
  <FirstNameInput v-if="attr.attribute === 'first_name'" v-bind:attr="attr" />
  <MiddleNameInput v-if="attr.attribute === 'middle_name'" v-bind:attr="attr" />
  <LastNameInput v-if="attr.attribute === 'last_name'" v-bind:attr="attr" />
  <DateOfBirthInput v-if="attr.attribute === 'birth_detail.birth_date'" v-bind:attr="attr" />
  <NationalityInput v-if="attr.attribute === 'nationality_id'" v-bind:attr="attr" />
  <p v-if="attr.errors?.length > 0" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ attr.errors[0] }}</p>
</template>