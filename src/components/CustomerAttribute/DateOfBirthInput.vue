<script setup>
import CustomerAttribute from "@/models/customer_attribute.js";
import VueDatePicker from '@vuepic/vue-datepicker';
import moment from "moment";
import {computed, reactive, watch} from "vue";

const props = defineProps({
  attr: CustomerAttribute,
})

const textInputOptions = {
  format: 'yyyy-MM-dd'
};

// Ensure maxDate is a valid date string
const maxDate = computed(() => moment().subtract(18, 'years').format('YYYY-MM-DD'));

const emit = defineEmits(['customer:attribute:updated']);

const input = reactive({
  dateOfBirth: props.attr?.value || null,
});

watch(() => input.dateOfBirth, (newDateOfBirth) => {
  emit('customer:attribute:updated', props.attr, newDateOfBirth);
});
</script>

<template>
  <VueDatePicker
      v-model="input.dateOfBirth"
      :always-clearable="false"
      :format="textInputOptions.format"
      :class="['rounded-md shadow-sm focus:outline-none']"
      :enable-time-picker="false"
      :preview-format="textInputOptions.format"
      :max-date="maxDate"
      :start-date="maxDate"
      hide-input-icon
      auto-apply
      position="left"
  />
</template>
