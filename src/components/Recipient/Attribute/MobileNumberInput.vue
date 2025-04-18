<script setup>
import IsdCodeInput from "@/components/IsdCodeInput.vue";
import {reactive, watch} from "vue";
import PayoutChannelAttribute from "@/models/payout_channel_attribute.js";
import Country from "@/models/country.js";

const props = defineProps({
  attribute: {
    type: PayoutChannelAttribute,
    required: true,
  },
  country: {
    type: Country,
    required: true,
  },
  id: {
    type: String,
    required: true,
  },
  defaultValue: {
    type: Object({
      country: String,
      number: String,
    }),
    required: false,
    default: '',
  },
});
const emit = defineEmits(['recipient:input:updated']);
const mobileNumber = reactive({
  country: props.defaultValue?.country || props.country?.id || null,
  number: props.defaultValue?.number || null,
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
    <IsdCodeInput :class="['min-w-36 sm:min-w-40']" v-bind:modelValue="mobileNumber.country" v-bind:itemLabelGenerator="itemLabelGenerator" v-on:update:modelValue="updateIsdCode" />
    <input :id="id" type="tel" v-model="mobileNumber.number" class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none ml-2" />
  </div>
</template>