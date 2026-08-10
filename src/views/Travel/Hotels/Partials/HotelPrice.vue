<script setup>
import {computed} from 'vue';

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

// Search results do not itemise taxes, so a zero line is expected rather than
// missing data — it just has nothing to say until the hotel page.
const lines = computed(() => props.rate.breakdown.filter(line => line.amount.amount !== 0));

// One line is the total under another name, which is worth no more room.
const showBreakdown = computed(() => lines.value.length > 1);
</script>

<template>
  <div>
    <p class="text-xs font-medium tracking-wide text-gray-400 uppercase">Total</p>
    <p class="mt-1 flex items-baseline gap-1.5">
      <span class="text-sm font-medium text-gray-500">{{ money.currency }}</span>
      <span class="text-2xl font-semibold tracking-tight text-gray-900">{{ rate.total.formatted }}</span>
    </p>
    <p v-if="rate.perNight.isStated" class="mt-0.5 text-xs text-gray-500">{{ nights }} night{{ nights === 1 ? '' : 's' }} &middot; {{ rate.perNight.currencyPrefixed }} / night</p>
    <!-- What the total is made of -->
    <dl v-if="showBreakdown" class="mt-2 space-y-0.5">
      <div v-for="line in lines" :key="line.key" class="flex items-baseline justify-between gap-2 text-xs">
        <dt class="min-w-0 truncate text-gray-500">{{ line.label }}</dt>
        <dd class="shrink-0 text-gray-600 tabular-nums">{{ line.amount.formatted }}</dd>
      </div>
    </dl>
    <!-- Not part of the total: the hotel collects this on arrival -->
    <p v-if="rate.payableAtProperty.isStated" class="mt-2 text-xs text-amber-700">Plus {{ rate.payableAtProperty.currencyPrefixed }} payable at the property</p>
  </div>
</template>
