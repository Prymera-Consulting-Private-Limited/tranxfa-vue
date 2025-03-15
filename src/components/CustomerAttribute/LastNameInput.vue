<script setup>
import CustomerAttribute from "@/models/customer_attribute.js";
import TextInput from "@/components/CustomerAttribute/TextInput.vue";

defineProps({
  attr: CustomerAttribute,
})
const emit = defineEmits(['customer:attribute:updated']);

const notifyLastNameUpdated = (attr, value) => {
  emit('customer:attribute:updated', attr, value);
}
</script>

<template>
  <TextInput v-on:customer:attribute:updated="notifyLastNameUpdated" v-bind:attr="attr" class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none" />
</template>