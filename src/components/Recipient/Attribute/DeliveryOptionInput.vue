<script setup>
import vSelect from 'vue-select';
import PayoutChannelAttribute from "@/models/payout_channel_attribute.js";
import {ref} from "vue";
import {createPopper} from "@popperjs/core";

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
  defaultValue: {
    type: String,
    required: false,
    default: '',
  },
})

const deliveryOption = ref(null);
if (props.defaultValue) {
  deliveryOption.value = props.attribute.options.find(o => o.id === props.defaultValue);
}


const emit = defineEmits(['recipient:input:updated']);

const optionSelected = (option) => {
  emit('recipient:input:updated', option, props.attribute);
};

const optionRemoved = () => {
  emit('recipient:input:updated', null, props.attribute);
};

function withPopper(dropdownList, component, { width }) {
  dropdownList.style.width = width;
  const popper = createPopper(component.$refs.toggle, dropdownList, {
    placement: 'bottom-start',
    modifiers: [
      {
        name: 'flip',
        options: {
          fallbackPlacements: ['top-start'],
        },
      },
      {
        name: 'offset',
        options: {
          offset: [0, 0],
        },
      },
      {
        name: 'toggleClass',
        enabled: true,
        phase: 'write',
        fn({ state }) {
          component.$el.classList.toggle('drop-up', state.placement.startsWith('top'));
        },
      },
    ],
  });

  return () => popper.destroy();
}
</script>

<template>
  <v-select v-on:option:selected="optionSelected" v-on:option:deselected="optionRemoved" :calculate-position="withPopper" v-model="deliveryOption" :options="attribute.options" :placeholder="`${placeholder}`" key-by="id" label="title">
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