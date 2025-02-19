<script setup>
import CustomerAttribute from "@/models/customer_attribute.js";
import VueDatePicker from '@vuepic/vue-datepicker';
import moment from "moment";
import {computed} from "vue";

defineProps({
  attr: CustomerAttribute,
})

const textInputOptions = {
  format: 'yyyy-MM-dd'
};

const maxDate = computed(() => {
  return moment().subtract(18, 'years');
})
</script>

<template>
  <VueDatePicker
      v-model="attr.value"
      :always-clearable="false"
      :format="textInputOptions.format"
      class="rounded-md shadow-sm focus:outline-none"
      :enable-time-picker="false"
      :preview-format="textInputOptions.format"
      :max-date="maxDate.format('yyyy-MM-DD')"
      :start-date="maxDate.format('yyyy-MM-DD')"
      hide-input-icon
      auto-apply
      position="left"
  />
</template>