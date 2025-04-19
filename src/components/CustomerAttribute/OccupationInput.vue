<script setup>
import CustomerAttribute from "@/models/customer_attribute.js";
import vSelect from 'vue-select';
import {computed, h, ref, watchEffect} from "vue";

const props = defineProps({
  attr: {
    type: CustomerAttribute,
    required: true
  },
  occupations: {
    type: Array,
    required: true,
  },
  formErrors: {
    type: Object,
    required: false,
  },
})

const emit = defineEmits(['customer:attribute:updated']);

const selectedOccupation = ref(null);

const otherOccupation = ref('');

vSelect.props.components.default = () => ({
  Deselect: {
    render: () => h('span', h('i', {class: ['pi', 'pi-times', 'text-gray-500', 'text-xs']})),
  },
  OpenIndicator: {
    render: () => h('span', h('i', {class: ['pi', 'pi-chevron-down', 'text-gray-500', 'text-xs']})),
  },
});

watchEffect(() => {
  if (selectedOccupation?.value?.code !== 'OTHER') {
    otherOccupation.value = '';
  }
  emit('customer:attribute:updated', props.attr, {
    id: selectedOccupation?.value?.id,
    other: otherOccupation.value
  });
})

const otherOccupationError = computed(() => {
  if (props.formErrors?['employment.other_occupation'] : null) {
    return props.formErrors['employment.other_occupation'];
  }

  return null;
})

</script>

<template>
  <v-select v-model="selectedOccupation" append-to-body :options="occupations" :placeholder="`Please select`" key-by="id" :label="attr.label">
    <template v-slot:no-options="{ search, searching }">
      <template class="text-sm text-gray-300" v-if="searching">No results found for <em>{{ search }}</em>.</template>
      <em class="text-sm text-gray-400 opacity-50" v-else>Start typing to search ...</em>
    </template>
    <template #selected-option-container="{ option, deselect, multiple, disabled }">
      <div class="vs__selected">
        <div class="flex items-center w-auto">
          <div class="text-sm flex items-center w-full gap-x-2">
            <span class="lg:max-w-sm xl:max-w-md truncate">{{ option.title }}</span>
          </div>
        </div>
      </div>
    </template>
    <template #option="option">
      <div class="text-sm flex items-center w-full gap-x-3 truncate">
        <span class="truncate">{{ option.title }}</span>
      </div>
    </template>
  </v-select>

  <template v-if="selectedOccupation?.code === 'OTHER'">
    <p :class="[otherOccupationError ? 'text-red-700' : 'text-gray-400']" class="my-3 text-sm">Please enter your occupation in input below</p>
    <input :id="attr.attribute" :name="'other_occupation'" type="text" v-model="otherOccupation" :class="['block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none']" />
    <p v-if="otherOccupationError?.length > 0" class="mt-2 text-sm text-red-600 dark:text-red-500">{{ otherOccupationError[0] }}</p>
  </template>
</template>