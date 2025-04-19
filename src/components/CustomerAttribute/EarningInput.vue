<script setup>
import CustomerAttribute from "@/models/customer_attribute.js";
import vSelect from 'vue-select';
import {computed, h, ref, watchEffect} from "vue";

const props = defineProps({
  attr: {
    type: CustomerAttribute,
    required: true
  },
  currencySalaryRange: {
    type: Object,
    required: true,
  },
  formErrors: {
    type: Object,
    required: false,
  },
})

const emit = defineEmits(['customer:attribute:updated']);

const selectedEarningRange = ref(null);

const earning = ref(0);

vSelect.props.components.default = () => ({
  Deselect: {
    render: () => h('span', h('i', {class: ['pi', 'pi-times', 'text-gray-500', 'text-xs']})),
  },
  OpenIndicator: {
    render: () => h('span', h('i', {class: ['pi', 'pi-chevron-down', 'text-gray-500', 'text-xs']})),
  },
});

watchEffect(() => {
  if (selectedEarningRange?.value) {
    earning.value = null;
  }
  emit('customer:attribute:updated', props.attr, {
    earning_range_id: selectedEarningRange?.value?.id,
    earning: earning.value
  });
})


</script>

<template>
  <template v-if="currencySalaryRange?.ranges?.length > 0">
    <v-select v-model="selectedEarningRange" append-to-body :options="currencySalaryRange.ranges" :placeholder="`Please select`" key-by="id" :label="attr.label">
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
  </template>
  <template v-else>
    <input :id="attr.attribute" :name="'earning'" type="text" v-model="earning" :class="['block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none']" />
  </template>
</template>