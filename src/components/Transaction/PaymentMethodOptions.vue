<script setup>
import {RadioGroup, RadioGroupOption} from '@headlessui/vue';
import {CheckCircleIcon} from '@heroicons/vue/20/solid';
import PaymentMethodRefusalType from '@/enums/payment_method_refusal_type.js';

defineProps({
  /**
   * The saved quote's ways to pay.
   *
   * @type {PaymentMethod[]}
   */
  methods: {
    type: Array,
    required: true,
  },

  /**
   * @type {PaymentMethod|null}
   */
  modelValue: {
    type: Object,
    default: null,
  },

  /**
   * A PaymentMethodRefusalType by method id, for each way to pay this amount
   * cannot use. Such a method stays in the list, greyed out with the reason,
   * so the customer can see why rather than wonder where it went (SD-1792).
   *
   * @type {Object<string, string>}
   */
  refusals: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits([
  'update:modelValue',
]);
</script>

<template>
  <!-- by="id": the wizard replaces the quote when a coupon is applied or removed,
  and the chosen method has to stay chosen across that. Headless UI marks a
  method that cannot be chosen aria-disabled, which is what greys it. -->
  <RadioGroup :model-value="modelValue" @update:model-value="emit('update:modelValue', $event)" by="id" class="space-y-4 mt-4">
    <RadioGroupOption as="template" v-for="method in methods" :key="method.id" :value="method" :disabled="!!refusals[method.id]" :aria-label="method.title" v-slot="{ active, checked, disabled }">
      <div :class="[(active || checked) ? 'border-brand-600 ring-1 ring-brand-600 bg-brand-50' : 'border-gray-300 bg-white', 'relative flex cursor-pointer rounded-lg border px-4 py-2.5 shadow-xs focus:outline-hidden aria-disabled:cursor-not-allowed aria-disabled:border-gray-200 aria-disabled:bg-gray-50']">
        <span class="flex flex-1">
          <span class="flex flex-col">
            <span :class="[disabled ? 'text-gray-500' : 'text-gray-900', 'block text-sm/6 font-medium']">{{ method.title }}</span>
            <!-- The limit the amount misses, in the API's own rendering of it. -->
            <span v-if="refusals[method.id] === PaymentMethodRefusalType.BELOW_MINIMUM && method.minAmountCurrencyPrefixed" class="text-xs/5 text-gray-500">{{ $t('transfer.wizard.availableFromAmount', {amount: method.minAmountCurrencyPrefixed}) }}</span>
            <span v-else-if="refusals[method.id] === PaymentMethodRefusalType.NOT_A_MULTIPLE && method.amountMultiplierCurrencyPrefixed" class="text-xs/5 text-gray-500">{{ $t('transfer.wizard.onlyInMultiplesOf', {amount: method.amountMultiplierCurrencyPrefixed}) }}</span>
            <span v-else-if="refusals[method.id]" class="text-xs/5 text-gray-500">{{ $t('transfer.wizard.notAvailableForThisTransfer') }}</span>
            <!-- Only a method that costs more than the base fee says so. -->
            <span v-else-if="method.hasFee" class="text-xs/5 text-gray-500">{{ $t('transfer.wizard.addsFeeAmount', {fee: method.feeCurrencyPrefixed}) }}</span>
          </span>
        </span>
        <CheckCircleIcon v-if="checked" class="text-brand-600 size-5" aria-hidden="true" />
        <div v-else :class="[disabled ? 'border-gray-200' : 'border-gray-300', 'size-4 mt-0.5 mr-0.5 border-2 rounded-full']" aria-hidden="true" />
      </div>
    </RadioGroupOption>
  </RadioGroup>
</template>
