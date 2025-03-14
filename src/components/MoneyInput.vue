<script setup>
import FlagIcon from "vue3-flag-icons";
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItems
} from "@headlessui/vue";
import {ChevronDownIcon} from "@heroicons/vue/20/solid/index.js";
import {computed, reactive, ref} from "vue";
import { vMaska } from "maska/vue"
import Currency from "@/models/currency.js";
import Country from "@/models/country.js";

const props = defineProps({
  amount: Number,
  currency: Currency,
  country: Country,
  options: Array(Object({
    country: Country,
    currency: Currency
  })),
  inputId: String,
  disableTargetSelection: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
    'update:amount',
    'option:updated',
]);

const maskaOptions = reactive({
  mask: '#,###,###,###,###,###.##',
  numberFraction: props.currency.decimalPlaces,
  reversed: true,
  tokens: ''
});

const unmaskedValue = ref(null);

const onMaska = (event) => {
  unmaskedValue.value = event.detail.unmasked;
}

const amountModel = computed({
  get: () => Math.ceil(props.amount * Math.pow(10, props.currency.decimalPlaces)),
  set: () => {}
})

function selectOption(option) {
  if (option.country.id !== props.country.id || option.currency.id !== props.currency.id) {
    emit('option:updated', option);
  }
}

function amountUpdated() {
  emit('update:amount', Number.parseInt(unmaskedValue.value) / Math.pow(10, props.currency.decimalPlaces));
}
</script>
<template>
  <div class="flex items-center rounded-md bg-white pl-3 outline-2 -outline-offset-1 outline-brand-700 has-[input:focus-within]:outline-2 has-[input:focus-within]:-outline-offset-2 has-[input:focus-within]:outline-brand-700">
    <div class="shrink-0 text-base text-gray-500 select-none sm:text-sm/6">{{ currency.iconUnicode }}</div>
    <input :id="inputId" @change="amountUpdated" v-maska="maskaOptions" @maska="onMaska" type="text" v-model="amountModel" class="block min-w-0 grow py-3 pr-3 pl-1 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none sm:text-sm/6" placeholder="0.00" />
    <div class="grid shrink-0 grid-cols-1 focus-within:relative bg-white">
      <Menu as="div" class="relative inline-block text-left">
        <div>
          <MenuButton as="div" :class="{'cursor-pointer': options.length > 1 && ! disableTargetSelection}" class="inline-flex w-full items-center justify-center rounded-r-md bg-brand-700 px-4 py-4 text-sm font-medium text-white">
            <FlagIcon :class="['ring-2 ring-white']" :code="country.iso2Alpha.toLowerCase()" circle />
            <strong class="text-sm tracking-wider ml-2">{{ currency.code }}</strong>
            <ChevronDownIcon v-if="options.length > 1 && ! disableTargetSelection" class="-mr-1 ml-2 h-5 w-5 text-violet-200 hover:text-violet-100" aria-hidden="true"/>
          </MenuButton>
        </div>
        <transition enter-active-class="transition duration-100 ease-out" enter-from-class="transform scale-95 opacity-0" enter-to-class="transform scale-100 opacity-100" leave-active-class="transition duration-75 ease-in" leave-from-class="transform scale-100 opacity-100" leave-to-class="transform scale-95 opacity-0">
          <MenuItems v-if="options.length > 1 && ! disableTargetSelection" class="absolute right-0 mt-2 w-86 origin-top-right divide-y divide-gray-300 rounded-md bg-gray-50 shadow-lg ring-1 ring-black/5 focus:outline-none z-99">
            <MenuItem v-for="(option, index) in options" v-slot="{ active }">
              <button @click="selectOption(option)" :class="[
                active ? 'text-purple-900' : 'text-gray-900',
                'group flex w-full items-center px-4 py-4 text-sm tracking-wider gap-x-2 cursor-pointer',
                index === 0 ? 'rounded-t-md' : '',
                index === options.length - 1 ? 'rounded-b-md' : ''
              ]">
                <FlagIcon :class="['ring-2 ring-white']" :code="option.country.iso2Alpha.toLowerCase()" circle />
                <strong class="text-sm">{{ option.currency.code }}</strong>
                <span class="text-sm">{{ option.country.commonName }}</span>
              </button>
            </MenuItem>
          </MenuItems>
        </transition>
      </Menu>
    </div>
  </div>
</template>