<script setup>
import {prettifyLabel} from '@/composables/travel/hotels/hotel_utils.js';

defineProps({
  /**
   * @type {PropertyCharge[]}
   */
  charges: {
    type: Array,
    default: () => [],
  },

  /**
   * The rooms list and the price card sit in small print; the quote does not.
   */
  dense: {
    type: Boolean,
    default: false,
  },
});
</script>

<template>
  <!-- Not part of our price: the hotel collects these at the desk, each in the
  currency it asks for. Every charge keeps its own line because two of them can
  be in two currencies, and a total across them would be a number nobody pays. -->
  <div v-if="charges.length > 0" :class="[dense ? 'text-xs/5' : 'text-sm/6', 'text-warning-700']">
    <p class="font-medium">{{ $t('travel.payableAtTheHotelIn') }}</p>
    <ul class="mt-0.5 space-y-0.5">
      <li v-for="(charge, position) in charges" :key="`${position}-${charge.name}`" class="flex items-baseline justify-between gap-3">
        <span class="min-w-0">{{ charge.name ? prettifyLabel(charge.name) : $t('travel.chargeAtTheHotel') }}</span>
        <span class="shrink-0 tabular-nums">{{ charge.amount.currencyPrefixed }}</span>
      </li>
    </ul>
  </div>
</template>
