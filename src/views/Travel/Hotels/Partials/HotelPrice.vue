<script setup>
import {computed} from 'vue';

const props = defineProps({
  payment: {
    type: Object,
    required: true,
  },

  nights: {
    type: Number,
    default: 0,
  },
});

const currency = computed(() => props.payment.showCurrencyCode ?? props.payment.currencyCode ?? '');

const total = computed(() => Number(props.payment.showAmount ?? props.payment.amount ?? 0));

function format(amount) {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

const perNight = computed(() => {
  if (!props.nights) {
    return null;
  }

  return format(total.value / props.nights);
});

const taxesIncluded = computed(() => props.payment.vatData?.included === true);
</script>

<template>
  <div>
    <p class="text-xs font-medium tracking-wide text-gray-400 uppercase">Total</p>
    <p class="mt-1 flex items-baseline gap-1.5">
      <span class="text-sm font-medium text-gray-500">{{ currency }}</span>
      <span class="text-2xl font-semibold tracking-tight text-gray-900">{{ format(total) }}</span>
    </p>
    <p v-if="perNight" class="mt-0.5 text-xs text-gray-500">{{ nights }} night{{ nights === 1 ? '' : 's' }} &middot; {{ currency }} {{ perNight }} / night</p>
    <p class="mt-2 text-xs" :class="taxesIncluded ? 'text-emerald-700' : 'text-gray-500'">
      {{ taxesIncluded ? 'Taxes & VAT included' : 'Taxes may apply at checkout' }}
    </p>
  </div>
</template>
