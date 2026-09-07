<script setup>
import {computed} from 'vue';
import {prettifyLabel} from '@/composables/travel/hotels/hotel_utils.js';

const props = defineProps({
  /**
   * @type {Array<{title: string, body: string}>}
   */
  rules: {
    type: Array,
    default: () => [],
  },

  /**
   * @type {HouseRuleCharge[]}
   */
  charges: {
    type: Array,
    default: () => [],
  },

  labels: {
    type: Object,
    default: () => ({}),
  },
});

function label(code) {
  return props.labels[code] ?? prettifyLabel(code);
}

/**
 * "Not stated by the hotel" and "Not available" are different answers, and a
 * customer told there is no parking would rule out a hotel that has it. So a
 * charge the hotel said nothing about is never rendered as a refusal.
 *
 * @param {HouseRuleCharge} charge
 * @returns {string}
 */
function description(charge) {
  if (charge.amount.isStated && charge.amount.amount > 0) {
    // The unit is written to read after the amount: "USD 18.50 per vehicle, per night".
    return [charge.amount.currencyPrefixed, label(charge.chargeUnit)].filter(Boolean).join(' ');
  }

  return label(charge.inclusion);
}

/**
 * @param {HouseRuleCharge} charge
 * @returns {string}
 */
function classes(charge) {
  switch (charge.inclusion) {
    case 'INCLUDED':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-200';

    case 'NOT-AVAILABLE':
      return 'bg-gray-100 text-gray-600 ring-gray-300';

    case 'UNSPECIFIED':
      return 'bg-gray-50 text-gray-500 ring-gray-200';

    default:
      return 'bg-amber-50 text-amber-700 ring-amber-200';
  }
}

// The charges are in the property's own currency rather than the customer's, so
// where they differ that has to be said outright.
const currencies = computed(() => [...new Set(props.charges.map(charge => charge.currency).filter(Boolean))]);

const hasAnything = computed(() => props.rules.length > 0 || props.charges.length > 0);
</script>

<template>
  <section v-if="hasAnything">
    <h2 class="text-lg font-semibold tracking-tight text-gray-900">House rules</h2>
    <!-- Prose and money are kept apart on purpose: one is read, the other may
    actually be asked for at the desk. -->
    <div v-if="charges.length" class="mt-4 overflow-hidden rounded-3xl bg-white ring-1 ring-gray-200">
      <header class="border-b border-gray-100 px-5 py-4">
        <h3 class="text-sm font-semibold text-gray-900">Paid at the property</h3>
        <p class="mt-0.5 text-xs text-gray-500">
          Collected by the hotel rather than by us<template v-if="currencies.length"> and charged in {{ currencies.join(' and ') }}</template>, so these are not part of your total.
        </p>
      </header>
      <ul class="divide-y divide-gray-100">
        <li v-for="charge in charges" :key="charge.type" class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-3">
          <span class="text-sm text-gray-700">{{ label(charge.type) }}</span>
          <span :class="[classes(charge), 'inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium ring-1 ring-inset']">{{ description(charge) }}</span>
        </li>
      </ul>
    </div>
    <dl v-if="rules.length" class="mt-4 space-y-4 rounded-3xl bg-white p-5 ring-1 ring-gray-200">
      <div v-for="rule in rules" :key="rule.title">
        <dt class="text-sm font-semibold text-gray-900">{{ rule.title }}</dt>
        <dd class="mt-1 text-sm leading-relaxed text-gray-600">{{ rule.body }}</dd>
      </div>
    </dl>
  </section>
</template>
