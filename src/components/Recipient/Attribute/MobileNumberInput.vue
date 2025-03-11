<script setup>
import IsdCodeInput from "@/components/IsdCodeInput.vue";
import {reactive, watch} from "vue";
import PayoutChannelAttribute from "@/models/payout_channel_attribute.js";

const props = defineProps({
  attribute: {
    type: PayoutChannelAttribute,
    required: true,
  },
  id: {
    type: String,
    required: true,
  },
});
const emit = defineEmits(['update:mobileNumberUpdated']);
const mobileNumber = reactive({
  country: props.mobile?.country || null,
  number: props.mobile?.number || null,
})

const itemLabelGenerator = (country) => {
  return '+' + country.callingCode;
}

function updateIsdCode(updated) {
  mobileNumber.country = updated?.id;
}

watch(mobileNumber, () => {
  emit('recipient:input:updated', mobileNumber, props.attribute);
})
</script>

<template>
  <div class="input-group flex items-center">
    <IsdCodeInput :class="['min-w-40']" v-bind:itemLabelGenerator="itemLabelGenerator" v-on:update:modelValue="updateIsdCode" />
    <input :id="id" type="tel" v-model="mobileNumber.number" class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none ml-2" />
  </div>
</template>