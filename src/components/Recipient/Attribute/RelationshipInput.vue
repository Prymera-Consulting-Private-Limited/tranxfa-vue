<script setup>
import vSelect from 'vue-select';
import {ref} from "vue";
import Relationship from "@/models/relationship.js";

const props = defineProps({
  relationships: {
    type: Array({type: Relationship}),
    required: true,
  },
  placeholder: {
    type: String,
    default: 'Please Select',
  },
})

const relationship = ref(null);

const emit = defineEmits(['recipient:relationship:updated']);

const optionSelected = (option) => {
  emit('recipient:relationship:updated', option);
};
</script>

<template>
  <v-select append-to-body v-on:option:selected="optionSelected" v-model="relationship" :options="relationships" :placeholder="`${placeholder}`" key-by="id" label="relationship">
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