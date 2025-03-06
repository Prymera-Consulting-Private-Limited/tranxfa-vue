<script setup>
import CustomerAttribute from "@/models/customer_attribute.js";
import vSelect from 'vue-select';
import {h, ref, watch} from "vue";
import FlagIcon from 'vue3-flag-icons'

const props = defineProps({
  attr: CustomerAttribute,
  countries: Array,
  labelGenerator: String,
  model: Object,
})

const emit = defineEmits(['update:modelValue']);

const selectedCountry = ref(null);
selectedCountry.value = props.model;

vSelect.props.components.default = () => ({
  Deselect: {
    render: () => h('span', h('i', {class: ['pi', 'pi-times', 'text-gray-500', 'text-xs']})),
  },
  OpenIndicator: {
    render: () => h('span', h('i', {class: ['pi', 'pi-chevron-down', 'text-gray-500', 'text-xs']})),
  },
});

watch(() => selectedCountry.value, (value) => {
  emit('update:modelValue', value);
});

</script>

<template>
  <v-select v-model="selectedCountry" :options="countries" :placeholder="`Please select`" key-by="id" label="demonym">
    <template v-slot:no-options="{ search, searching }">
      <template class="text-sm text-gray-300" v-if="searching">No results found for <em>{{ search }}</em>.</template>
      <em class="text-sm text-gray-400 opacity-50" v-else>Start typing to search ...</em>
    </template>
    <template #selected-option-container="{ option, deselect, multiple, disabled }">
      <div class="vs__selected">
        <div class="flex items-center w-auto">
          <div class="text-sm flex items-center w-full gap-x-2">
            <FlagIcon :code="option.iso2Alpha.toLowerCase()" circle  />
            <span class="lg:max-w-sm xl:max-w-md truncate">{{ option[props.labelGenerator] }}</span>
          </div>
        </div>
      </div>
    </template>
    <template #option="option">
      <div class="text-sm flex items-center w-full gap-x-3 truncate">
        <FlagIcon :code="option.iso2Alpha.toLowerCase()" circle  />
        <span class="truncate">{{ option[props.labelGenerator] }}</span>
      </div>
    </template>
  </v-select>
</template>