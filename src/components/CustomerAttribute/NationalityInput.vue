<script setup>
import CustomerAttribute from "@/models/customer_attribute.js";
import vSelect from 'vue-select';
import {useCountryUtils} from "@/composables/country_utils.js";
import {computed, h, onMounted, ref} from "vue";
import FlagIcon from 'vue3-flag-icons'

const props = defineProps({
  attr: CustomerAttribute,
})

const countryUtils = useCountryUtils();
const countries = ref([]);
const nationality = computed({
  get () {
    return countries.value.find((o) => o.id === props.attr.value)
  },
  set(nationality) {
    if (nationality) {
      props.attr.value = nationality.id;
    } else {
      props.attr.value = null;
    }
  }
})

vSelect.props.components.default = () => ({
  Deselect: {
    render: () => h('span', h('i', {class: ['pi', 'pi-times', 'text-gray-500', 'text-xs']})),
  },
  OpenIndicator: {
    render: () => h('span', h('i', {class: ['pi', 'pi-chevron-down', 'text-gray-500', 'text-xs']})),
  },
});

onMounted(async () => {
  countries.value = await countryUtils.getCountries();
})

</script>

<template>
  <v-select v-model="nationality" :options="countries" :placeholder="`Please select`" key-by="id" label="demonym">
    <template v-slot:no-options="{ search, searching }">
      <template class="text-sm text-gray-300" v-if="searching">No results found for <em>{{ search }}</em>.</template>
      <em class="text-sm text-gray-400" v-else style="opacity: 0.5">Start typing to search for a country.</em>
    </template>
    <template #selected-option-container="{ option, deselect, multiple, disabled }">
      <div class="vs__selected">
        <div class="flex items-center w-auto">
          <div class="text-sm flex items-center w-full gap-x-2">
            <FlagIcon :code="option.iso2Alpha.toLowerCase()" circle  />
            <span class="lg:max-w-sm xl:max-w-md truncate">{{ option.demonym }}</span>
          </div>
        </div>
      </div>
    </template>

    <template #option="option">
      <div class="text-sm flex items-center w-full gap-x-3 truncate">
        <FlagIcon :code="option.iso2Alpha.toLowerCase()" circle  />
        <span class="truncate">{{ option.demonym }}</span>
      </div>
    </template>
  </v-select>
</template>