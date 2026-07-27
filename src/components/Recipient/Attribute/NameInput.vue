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
  },
  isLookingUp: {
    type: Boolean,
    required: false,
    default: false,
  },
})

const emit = defineEmits(['recipient:input:updated']);
const nameUpdated = (value) => {
  emit('recipient:input:updated', value, props.attribute);
}
</script>

<template>
  <TextInput v-if="! disableNameInput" v-on:recipient:input:updated="nameUpdated" :id="id" class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none" />
  <div v-else :class="{
    'bg-gray-50 text-gray-400 border border-gray-300': isLookingUp || !input[attribute.attribute],
    'bg-green-50 text-green-700 border border-green-700': (input[attribute.attribute] && !  isLookingUp),
  }" class="block w-full px-3 py-2 rounded-md tracking-wider min-h-10">
    <template v-if="isLookingUp">
      <div class="flex gap-2 items-center justify-start animate-pulse text-gray-700">
        <i class="pi pi-spin pi-spinner mt-0.5 text-sm"></i>
        <span>Un momento...</span>
      </div>
    </template>
    <template v-else>
      <span>{{ input[attribute.attribute] || '' }}</span>
    </template>
  </div>
</template>