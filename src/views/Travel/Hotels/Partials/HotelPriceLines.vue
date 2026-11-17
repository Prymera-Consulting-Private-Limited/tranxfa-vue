<script setup>
import {computed} from 'vue';
import {getIncludedNote, getPriceLines, isItemised} from '@/composables/travel/hotels/hotel_utils.js';

const props = defineProps({
  /**
   * A rate's breakdown, adding up to its total: the room, each tax inside the
   * price, and the fee.
   *
   * @type {Array<{key: string, label: string, includedIn: string|null, amount: Money, amountWithIncluded: Money}>}
   */
  lines: {
    type: Array,
    default: () => [],
  },

  /**
   * The rooms list and the stay card sit in small print.
   */
  dense: {
    type: Boolean,
    default: false,
  },
});

// A line of nothing, such as a fee the pricing rule does not charge, is worth
// none of the room it takes. Since SD-1839 every tax inside the price is a line
// of its own, and since SD-2006 each is named under the room it is part of.
const shown = computed(() => getPriceLines(props.lines));
</script>

<template>
  <!-- A single line is only the total under another name, unless taxes sit
  inside it. -->
  <dl v-if="isItemised(shown)" :class="[dense ? 'text-xs/5' : 'text-sm/6', 'space-y-0.5']">
    <div v-for="line in shown" :key="line.key" class="flex items-baseline justify-between gap-3">
      <dt class="min-w-0 text-gray-500">
        {{ line.label }}
        <!-- Under the label and out of the amounts' column, so a tax inside the
        room never reads as a charge beside it. -->
        <span v-if="line.included.length" class="block pl-3 text-xs/5">{{ getIncludedNote(line) }}</span>
      </dt>
      <dd class="shrink-0 text-gray-700 tabular-nums">{{ line.amount.currencyPrefixed }}</dd>
    </div>
  </dl>
</template>
