<script setup>
import CustomerAttribute from "@/models/customer_attribute.js";
import FirstNameInput from "@/components/CustomerAttribute/FirstNameInput.vue";
import MiddleNameInput from "@/components/CustomerAttribute/MiddleNameInput.vue";
import LastNameInput from "@/components/CustomerAttribute/LastNameInput.vue";
import DateOfBirthInput from "@/components/CustomerAttribute/DateOfBirthInput.vue";
import NationalityInput from "@/components/CustomerAttribute/NationalityInput.vue";

defineProps({
  attr: CustomerAttribute,
});
</script>

<template>
  <label  :class="[attr.errors?.length > 0 ? 'text-red-700' : 'text-purple-700']" class="block text-sm font-medium mb-0">{{ attr.label }}</label>
  <p class="mt-2 mb-3 text-gray-400 text-sm">{{ attr.infoText }}</p>
  <FirstNameInput v-bind:attr="attr" v-if="attr.attribute === 'first_name'" />
  <MiddleNameInput v-bind:attr="attr" v-if="attr.attribute === 'middle_name'" />
  <LastNameInput v-bind:attr="attr" v-if="attr.attribute === 'last_name'" />
  <DateOfBirthInput v-bind:attr="attr" v-if="attr.attribute === 'birth_detail.birth_date'" />
  <NationalityInput v-bind:attr="attr" v-if="attr.attribute === 'nationality_id'" />
  <p v-if="attr.errors?.length > 0" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ attr.errors[0] }}</p>
</template>