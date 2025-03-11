<script setup>
import vSelect from 'vue-select';
import PayoutChannelAttribute from "@/models/payout_channel_attribute.js";
import {ref} from "vue";

const props = defineProps({
  placeholder: {
    type: String,
    default: 'Please Select',
  },
  attribute: {
    type: PayoutChannelAttribute,
    required: true,
  },
  id: {
    type: String,
    required: true,
  },
})

const deliveryOption = ref(null);

const emit = defineEmits(['update:deliveryOption']);

const optionSelected = (option) => {
  emit('recipient:input:updated', option, props.attribute);
};
</script>

<template>
  <v-select v-on:option:selected="optionSelected" v-model="deliveryOption" :options="attribute.options" :placeholder="`${placeholder}`" key-by="id" label="demonym">
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