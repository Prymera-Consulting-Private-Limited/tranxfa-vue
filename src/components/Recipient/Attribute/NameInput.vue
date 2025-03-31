<script setup>
import TextInput from "@/components/Recipient/Attribute/TextInput.vue";
import PayoutChannelAttribute from "@/models/payout_channel_attribute.js";
const props = defineProps({
  id: {
    type: String,
    required: true,
  },
  attribute: {
    type: PayoutChannelAttribute,
    required: true,
  },
})

const emit = defineEmits(['recipient:input:updated']);
const nameUpdated = (value) => {
  emit('recipient:input:updated', value, props.attribute);
}
</script>

<template>
  <TextInput v-on:recipient:input:updated="nameUpdated" :id="id" class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none" />
</template>