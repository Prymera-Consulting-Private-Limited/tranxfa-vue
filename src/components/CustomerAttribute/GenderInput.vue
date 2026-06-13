<script setup>
import CustomerAttribute from "@/models/customer_attribute.js";
import {ref, watch} from "vue";

const props = defineProps({
  attr: {
    type: CustomerAttribute,
    required: true
  },
});

const emit = defineEmits(['customer:attribute:updated']);

const selectedGender = ref(props.attr.value ?? '');

const notifyGenderUpdated = (attr, value) => {
  emit('customer:attribute:updated', attr, value);
}

watch(selectedGender, function (newValue) {
  notifyGenderUpdated(props.attr, newValue);
});


const genders = [
  {id: 'MALE', title: 'Male'},
  {id: 'FEMALE', title: 'Female'},
]
</script>

<template>
  <div class="sm:flex sm:items-center sm:space-y-0 sm:space-x-10">
    <div v-for="gender in genders" :key="gender.id" class="flex items-center">
      <input v-model="selectedGender" :value="gender.id" :id="`gender-${gender.id}`" type="radio" :checked="selectedGender === gender.id" class="relative size-4 appearance-none rounded-full border border-gray-300 bg-white before:absolute before:inset-1 before:rounded-full before:bg-white not-checked:before:hidden checked:border-brand-600 checked:bg-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:border-gray-300 disabled:bg-gray-100 disabled:before:bg-gray-400 forced-colors:appearance-auto forced-colors:before:hidden" />
      <label :for="`gender-${gender.id}`" class="ml-3 block text-sm/6 font-medium text-gray-900">{{ gender.title }}</label>
    </div>
  </div>
</template>