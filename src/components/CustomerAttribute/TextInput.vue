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
</script>

<template>
  <input :id="attr.attribute" :name="attr.attribute" type="text" v-model="attr.value" :class="props.class" />
</template>