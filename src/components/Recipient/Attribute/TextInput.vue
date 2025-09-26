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
  defaultValue: {
    type: String,
    required: false,
    default: '',
  },
})

const emit = defineEmits(['recipient:input:updated']);

const model = ref(null);

model.value = props.defaultValue;

watch(model, (value) => {
  emit('recipient:input:updated', value, props.attribute);
});
</script>

<template>
  <template v-if="attribute?.prefixAddon">
    <div class="flex">
      <div class="flex shrink-0 items-center rounded-l-md px-3 py-2 border border-r-0 border-gray-300 focus:outline-none shadow-sm text-gray-700 text-sm/6 bg-gray-100">{{ attribute?.prefixAddon }}</div>
      <input
          :inputmode="attribute?.inputMode || 'text'"
          :id="id"
          :minlength="attribute?.exactLength || attribute?.minLength"
          :maxlength="attribute?.exactLength || attribute?.maxLength"
          v-model="model"
          type="text"
          class="block w-full px-3 py-2 border border-gray-300 rounded-r-md focus:outline-none shadow-sm"
      />
    </div>
  </template>
  <input
      v-else
      :inputmode="attribute?.inputMode || 'text'"
      :id="id"
      :minlength="attribute?.exactLength || attribute?.minLength"
      :maxlength="attribute?.exactLength || attribute?.maxLength"
      v-model="model"
      type="text"
      class="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none shadow-sm"
  />
</template>