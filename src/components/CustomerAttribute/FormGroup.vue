<script setup>
import CustomerAttribute from "@/models/customer_attribute.js";
import FirstNameInput from "@/components/CustomerAttribute/FirstNameInput.vue";
import MiddleNameInput from "@/components/CustomerAttribute/MiddleNameInput.vue";
import LastNameInput from "@/components/CustomerAttribute/LastNameInput.vue";
import DateOfBirthInput from "@/components/CustomerAttribute/DateOfBirthInput.vue";
import NationalityInput from "@/components/CustomerAttribute/NationalityInput.vue";
import TextInput from "@/components/CustomerAttribute/TextInput.vue";

defineProps({
  attr: {
    type: CustomerAttribute,
    required: true
  },
});

const emit = defineEmits(['customer:attribute:updated']);

const notifyAttributeUpdated = (attr, value) => {
  emit('customer:attribute:updated', attr, value);
}
</script>

<template>
  <label :for="attr.attribute" :class="[attr.errors?.length > 0 ? 'text-red-700' : 'text-brand-700']" class="block text-sm font-medium mb-0">{{ attr.label }}</label>
  <p class="mt-2 mb-3 text-gray-400 text-sm">{{ attr.infoText }}</p>
  <FirstNameInput v-if="attr.attribute === 'first_name'" v-bind:attr="attr" v-on:customer:attribute:updated="notifyAttributeUpdated" />
  <MiddleNameInput v-else-if="attr.attribute === 'middle_name'" v-bind:attr="attr" v-on:customer:attribute:updated="notifyAttributeUpdated" />
  <LastNameInput v-else-if="attr.attribute === 'last_name'" v-bind:attr="attr" v-on:customer:attribute:updated="notifyAttributeUpdated" />
  <DateOfBirthInput v-else-if="attr.attribute === 'birth_detail.birth_date'" v-bind:attr="attr" v-on:customer:attribute:updated="notifyAttributeUpdated" />
  <NationalityInput v-else-if="attr.attribute === 'nationality_id'" v-bind:attr="attr" v-on:customer:attribute:updated="notifyAttributeUpdated" />
  <TextInput v-else v-bind:attr="attr" v-on:customer:attribute:updated="notifyAttributeUpdated" :id="attr.attribute" class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none" />
  <p v-if="attr.errors?.length > 0" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ attr.errors[0] }}</p>
</template>