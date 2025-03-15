<script setup>
import CustomerAttribute from "@/models/customer_attribute.js";
import {ref, watch} from "vue";

const props = defineProps({
  attr: {
    type: CustomerAttribute,
    required: true
  },
  class: {
    default: ''
  }
});

const input = ref(null);
const emit  = defineEmits(['customer:attribute:updated']);

watch(input, () => {
  emit('customer:attribute:updated', props.attr, input.value);
});
</script>

<template>
  <input :id="attr.attribute" :name="attr.attribute" type="text" v-model="input" :class="props.class" />
</template>