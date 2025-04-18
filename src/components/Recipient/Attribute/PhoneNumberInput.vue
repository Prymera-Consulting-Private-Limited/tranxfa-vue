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
      country: Object,
      number: String,
    }),
    required: false,
    default: '',
  },
});
const emit = defineEmits(['recipient:input:updated']);
const phoneNumber = reactive({
  country: props.defaultValue?.country?.id || props.country?.id || null,
  number: props.defaultValue?.number || null,
})

const itemLabelGenerator = (country) => {
  return '+' + country.callingCode;
}

function updateIsdCode(updated) {
  phoneNumber.country = updated?.id;
}

watch(phoneNumber, () => {
  emit('recipient:input:updated', phoneNumber, props.attribute);
})
</script>

<template>
  <div class="input-group flex items-center">
    <IsdCodeInput :class="['min-w-40']" v-bind:itemLabelGenerator="itemLabelGenerator"  v-bind:modelValue="phoneNumber.country" v-on:update:modelValue="updateIsdCode" />
    <input id="phone-number" type="tel" v-model="phoneNumber.number" class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none ml-2" />
  </div>
</template>