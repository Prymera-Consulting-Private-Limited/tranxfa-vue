<script setup>
import {computed} from 'vue';

const props = defineProps({
  /**
   * A rate's breakdown, adding up to its total: the room, each tax inside the
   * price, and the fee.
   *
   * @type {Array<{key: string, label: string, amount: Money}>}
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
// none of the room it takes.
const shown = computed(() => props.lines.filter(line => line.amount.amount !== 0));
</script>

<template>
  <!-- A single line is only the total under another name. Since SD-1839 every
  tax inside the price is a line of its own, each with its own key, so two taxes
  never share a row. -->
  <dl v-if="shown.length > 1" :class="[dense ? 'text-xs/5' : 'text-sm/6', 'space-y-0.5']">
    <div v-for="line in shown" :key="line.key" class="flex items-baseline justify-between gap-3">
      <dt class="min-w-0 text-gray-500">{{ line.label }}</dt>
      <dd class="shrink-0 text-gray-700 tabular-nums">{{ line.amount.currencyPrefixed }}</dd>
    </div>
  </dl>
</template>
