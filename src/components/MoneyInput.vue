<script setup>
import FlagIcon from "vue3-flag-icons";
import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItems
} from "@headlessui/vue";
import {ChevronDownIcon} from "@heroicons/vue/20/solid/index.js";
import {computed, ref, watch} from "vue";
import Currency from "@/models/currency.js";
import Country from "@/models/country.js";

/**
 * An amount field the customer owns while they are typing.
 *
 * The previous version bound the input to the parent's amount through v-model
 * and a masking library. Any re-render of the component (an error list reset,
 * a pending flag) made Vue write the parent's old amount back into the field,
 * so a customer typing 123.45 watched it snap to 0.50 and back while the quote
 * was in flight - the mismatched send/receive pair a Xenvia client reported
 * from production. The mask also filled digits from the cents end, so typing
 * 200 meant $2.00.
 *
 * Now the field keeps its own text. The parent's amount is written in only
 * when the field is not focused, or when the parent answers with a different
 * number (a clamped maximum, for instance). Typing is ordinary: 200 is 200.
 *
 * Ported from app.payvel.com.au's MoneyInput.vue (commit 643020b), which
 * carried this fix in production before it reached this repo.
 */

const props = defineProps({
  amount: Number,
  currency: Currency,
  country: Country,
  options: Array(Object({
    country: Country,
    currency: Currency
  })),
  inputId: String,
  disableSelection: {
    type: Boolean,
    default: false
  },
  errors: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits([
    'update:amount',
    'option:updated',
]);

const decimalPlaces = computed(() => Math.max(0, Number(props.currency?.decimalPlaces ?? 2)));

const formatter = computed(() => new Intl.NumberFormat('en-AU', {
  minimumFractionDigits: decimalPlaces.value,
  maximumFractionDigits: decimalPlaces.value,
}));

/**
 * @param {number|null|undefined} value
 * @returns {string}
 */
function format(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '';
  }
  return formatter.value.format(Number(value));
}

/**
 * The number the text currently represents, or null when it is not one.
 *
 * @param {string} text
 * @returns {number|null}
 */
function parse(text) {
  const raw = String(text ?? '').replace(/,/g, '').trim();
  if (raw === '' || raw === '.') {
    return null;
  }
  const value = Number(raw);
  if (Number.isNaN(value)) {
    return null;
  }
  return Number(value.toFixed(decimalPlaces.value));
}

/**
 * What a keystroke may leave in the field: digits, one decimal point, and at
 * most the currency's decimal places after it, with thousands separators
 * re-applied to the whole-number part.
 *
 * @param {string} text
 * @returns {string}
 */
function sanitise(text) {
  let raw = String(text ?? '').replace(/[^\d.]/g, '');
  const firstDot = raw.indexOf('.');
  if (firstDot !== -1) {
    raw = raw.slice(0, firstDot + 1) + raw.slice(firstDot + 1).replace(/\./g, '');
  }
  if (decimalPlaces.value === 0) {
    raw = raw.replace(/\..*$/, '');
  }
  let [whole, fraction] = raw.split('.');
  whole = whole.replace(/^0+(?=\d)/, '');
  if (fraction !== undefined) {
    fraction = fraction.slice(0, decimalPlaces.value);
  }
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return fraction === undefined ? grouped : `${grouped}.${fraction}`;
}

const display = ref(format(props.amount));
const isFocused = ref(false);
let lastEmitted = parse(display.value);

// The parent's amount reaches the field only when the customer is not in the
// middle of typing, or when it is genuinely a different number.
watch(() => props.amount, (amount) => {
  const incoming = parse(String(amount ?? ''));
  if (! isFocused.value || incoming !== parse(display.value)) {
    display.value = format(amount);
    lastEmitted = incoming;
  }
});

watch(decimalPlaces, () => {
  display.value = format(parse(display.value));
});

function onInput(event) {
  const next = sanitise(event.target.value);
  display.value = next;
  // Keep the DOM in step when the sanitised text differs from what was typed.
  if (event.target.value !== next) {
    event.target.value = next;
  }
  const value = parse(next);
  if (value !== null && value !== lastEmitted) {
    lastEmitted = value;
    emit('update:amount', value);
  }
}

function onFocus() {
  isFocused.value = true;
}

function onBlur() {
  isFocused.value = false;
  const value = parse(display.value);
  if (value !== null) {
    display.value = format(value);
    if (value !== lastEmitted) {
      lastEmitted = value;
      emit('update:amount', value);
    }
  }
}

// The typed value when it differs from the quoted amount - blur has not fired
// yet (Enter-key submission never blurs). Read from `display` rather than the
// DOM directly: onInput already keeps it sanitised and in step with the field.
function pendingAmount() {
  const value = parse(display.value);
  if (value === null || value === props.amount) {
    return null;
  }
  return value;
}

function selectOption(option) {
  if (option.country.id !== props.country.id || option.currency.id !== props.currency.id) {
    emit('option:updated', option);
  }
}

defineExpose({
  pendingAmount,
});
</script>
<template>
  <div class="flex items-center rounded-md bg-white pl-3 outline-2 -outline-offset-1 outline-brand-700 has-[input:focus-within]:outline-2 has-[input:focus-within]:-outline-offset-2 has-[input:focus-within]:outline-brand-700">
    <div class="shrink-0 text-base text-gray-500 select-none sm:text-sm/6">{{ currency.iconUnicode }}</div>
    <input
        :id="inputId"
        type="text"
        inputmode="decimal"
        autocomplete="off"
        enterkeyhint="done"
        :value="display"
        :placeholder="format(0)"
        :aria-invalid="errors.length > 0 ? 'true' : undefined"
        :aria-describedby="errors.length > 0 ? `${inputId}-error` : undefined"
        @input="onInput"
        @focus="onFocus"
        @blur="onBlur"
        class="block min-w-0 grow py-3 pr-3 pl-1 text-base text-gray-900 placeholder:text-gray-500 focus:outline-none sm:text-sm/6"
    />
    <div class="grid shrink-0 grid-cols-1 focus-within:relative bg-white">
      <Menu as="div" class="relative inline-block text-left">
        <div>
          <MenuButton :as="options.length > 1 && ! disableSelection ? 'button' : 'div'" :class="{'cursor-pointer': options.length > 1 && ! disableSelection}" class="inline-flex w-full items-center justify-center rounded-r-md bg-brand-700 px-4 py-4 text-sm/6 font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700">
            <FlagIcon :class="['ring-2 ring-white']" :code="country.iso2Alpha.toLowerCase()" circle />
            <strong class="text-sm/6 tracking-wider ml-2">{{ currency.code }}</strong>
            <ChevronDownIcon v-if="options.length > 1 && !disableSelection" class="-mr-1 ml-2 h-5 w-5 text-brand-200 hover:text-brand-100" aria-hidden="true"/>
          </MenuButton>
        </div>
        <transition enter-active-class="transition duration-100 ease-out" enter-from-class="transform scale-95 opacity-0" enter-to-class="transform scale-100 opacity-100" leave-active-class="transition duration-75 ease-in" leave-from-class="transform scale-100 opacity-100" leave-to-class="transform scale-95 opacity-0">
          <MenuItems v-if="options.length > 1 && !disableSelection" class="absolute right-0 mt-2 w-86 origin-top-right divide-y divide-gray-300 rounded-md bg-gray-50 shadow-lg ring-1 ring-black/5 focus:outline-none z-99">
            <MenuItem as="div" v-for="(option, index) in options" :key="`${option.country.id}-${option.currency.id}`" v-slot="{ active }">
              <button type="button" @click="selectOption(option)" :class="[
                active ? 'text-brand-900' : 'text-gray-900',
                'group flex w-full items-center px-4 py-4 text-sm/6 tracking-wider gap-x-2 cursor-pointer',
                index === 0 ? 'rounded-t-md' : '',
                index === options.length - 1 ? 'rounded-b-md' : ''
              ]">
                <FlagIcon :class="['ring-2 ring-white']" :code="option.country.iso2Alpha.toLowerCase()" circle />
                <strong class="text-sm/6">{{ option.currency.code }}</strong>
                <span class="text-sm/6">{{ option.country.commonName }}</span>
              </button>
            </MenuItem>
          </MenuItems>
        </transition>
      </Menu>
    </div>
  </div>
  <p v-if="errors.length > 0" :id="`${inputId}-error`" class="mt-3 ml-6 text-xs/5 text-danger-600" role="alert">{{ errors[0] }}</p>
</template>
