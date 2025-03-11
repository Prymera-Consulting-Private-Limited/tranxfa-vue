<script setup>
import TextInput from "@/components/Recipient/Attribute/TextInput.vue";
defineProps({
  id: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['recipient:input:updated']);

const lastNameUpdated = (value) => {
  emit('recipient:input:updated', value);
}
</script>

<template>
  <TextInput v-on:recipient:input:updated="lastNameUpdated" :id="id" class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none"/>
</template>