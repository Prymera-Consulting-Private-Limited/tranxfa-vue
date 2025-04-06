<script setup>
import PayoutChannelAttribute from "@/models/payout_channel_attribute.js";
import {ref, watch} from "vue";

const props = defineProps({
  id: {
    type: String,
    required: true,
  },
  attribute: {
    type: PayoutChannelAttribute,
    required: false,
  },
})

const emit = defineEmits(['recipient:input:updated']);

const model = ref(null);

watch(model, (value) => {
  emit('recipient:input:updated', value, props.attribute);
});
</script>

<template>
  <input
      :inputmode="attribute?.inputMode || 'text'"
      :id="id"
      :minlength="attribute?.exactLength || attribute?.minLength"
      :maxlength="attribute?.exactLength || attribute?.maxLength"
      v-model="model"
      type="text"
      class="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none shadow-sm"
  />
</template>