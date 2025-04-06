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
  disableNameInput: {
    type: Boolean,
    required: false,
    default: false,
  },
})

const emit = defineEmits(['recipient:input:updated']);

const thirdNameUpdated = (value) => {
  emit('recipient:input:updated', value, props.attribute);
}
</script>

<template>
  <TextInput v-if="! disableNameInput" v-bind:disableInput="disableNameInput" v-on:recipient:input:updated="thirdNameUpdated" :id="id" class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none"/>
  <div v-else class="block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">{{ attribute.attribute }}</div>
</template>