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
  input: {
    type: Object,
    required: false,
    default: null,
  }
})

const emit = defineEmits(['recipient:input:updated']);
const nameUpdated = (value) => {
  emit('recipient:input:updated', value, props.attribute);
}
</script>

<template>
  <TextInput v-if="! disableNameInput" v-on:recipient:input:updated="nameUpdated" :id="id" class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none" />
  <div v-else :class="[
      (input[attribute.attribute] || null) === 'Looking up for name with the bank ...' ? 'text-gray-400' : '',
  ]" class="block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 tracking-wider">{{ input[attribute.attribute] ?? "&nbsp;" }}</div>
</template>