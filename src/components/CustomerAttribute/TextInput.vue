<script setup>
import CustomerAttribute from "@/models/customer_attribute.js";

defineProps({
  attr: CustomerAttribute,
})
</script>

<template>
  <input type="text" v-model="attr.value" class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none" />
</template>