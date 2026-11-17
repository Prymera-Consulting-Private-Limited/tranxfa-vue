<script setup>
import {computed} from 'vue';
import PayableAtProperty from '@/views/Travel/Hotels/Partials/PayableAtProperty.vue';
import {getIncludedNote, getPriceLines, isItemised} from '@/composables/travel/hotels/hotel_utils.js';

const props = defineProps({
  /**
   * @type {HotelRate}
   */
  rate: {
    type: Object,
    required: true,
  },

  /**
   * The response's currency, for the label beside the total.
   */
  money: {
    type: Object,
    required: true,
  },

  nights: {
    type: Number,
    default: 0,
  },
});

// Search results do not always itemise taxes, so a zero line is expected rather
// than missing data, and is left out. Taxes inside the room are named under it
// rather than listed beside it (SD-2006).
const lines = computed(() => getPriceLines(props.rate.breakdown));

const showBreakdown = computed(() => isItemised(lines.value));
</script>

<template>
  <div>
    <p class="text-xs/5 font-medium tracking-wide text-gray-500 uppercase">{{ $t('account.total') }}</p>
    <p class="mt-1 flex items-baseline gap-1.5">
      <span class="text-sm/6 font-medium text-gray-500">{{ money.currency }}</span>
      <span class="text-2xl font-semibold tracking-tight text-gray-900">{{ rate.total.formatted }}</span>
    </p>
    <p v-if="rate.perNight.isStated" class="mt-0.5 text-xs/5 text-gray-500">{{ $t('travel.nightsNightSMiddotCurrencyprefixed', {nights: nights, s: nights === 1 ? '' : 's', currencyPrefixed: rate.perNight.currencyPrefixed}) }}</p>
    <!-- What the total is made of -->
    <dl v-if="showBreakdown" class="mt-2 space-y-0.5">
      <div v-for="line in lines" :key="line.key" class="flex items-baseline justify-between gap-2 text-xs/5">
        <dt class="min-w-0 text-gray-500">
          <span class="block truncate">{{ line.label }}</span>
          <!-- Under the label and out of the amounts' column, so a tax inside
          the room never reads as a charge beside it. -->
          <span v-if="line.included.length" class="block pl-3">{{ getIncludedNote(line, 'formatted') }}</span>
        </dt>
        <dd class="shrink-0 text-gray-600 tabular-nums">{{ line.amount.formatted }}</dd>
      </div>
    </dl>
    <!-- Not part of the total: the hotel collects this on arrival -->
    <PayableAtProperty :charges="rate.payableAtProperty" dense class="mt-2" />
  </div>
</template>
