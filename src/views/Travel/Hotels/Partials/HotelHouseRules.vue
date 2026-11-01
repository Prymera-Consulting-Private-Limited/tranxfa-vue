<script setup>
import {computed} from 'vue';
import {useI18n} from 'vue-i18n';
import {prettifyLabel} from '@/composables/travel/hotels/hotel_utils.js';

const {t} = useI18n();

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
 * Two charges of one type - breakfast and lunch - read alike without the
 * detail, so it follows the type: "Meals · Breakfast". Its words come from the
 * labels and never from matching the code, because the supplier writes these
 * as free text and adds new ones without notice.
 *
 * @param {HouseRuleCharge} charge
 * @returns {string}
 */
function name(charge) {
  return [label(charge.type), charge.detail ? label(charge.detail) : null].filter(Boolean).join(' · ');
}

/**
 * The same children's breakfast can cost 10.00 for ages 0-5 and 14.00 for
 * 6-12, so the ages are what tell those two apart. A hotel that states only
 * one end is quoted as it stated it.
 *
 * @param {HouseRuleCharge} charge
 * @returns {string|null}
 */
function ages(charge) {
  const from = charge.appliesFromAge;
  const to = charge.appliesToAge;

  if (from !== null && to !== null) {
    return from === to ? t('travel.agesExactly', {age: from}) : t('travel.agesFromTo', {from: from, to: to});
  }

  if (from !== null) {
    return t('travel.agesFrom', {age: from});
  }

  if (to !== null) {
    return t('travel.agesUpTo', {age: to});
  }

  return null;
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

  // An extra the hotel offers at a stated price of nothing costs nothing: the
  // supplier marks a free cot PAID at 0.00, and "Available at extra cost"
  // would tell the customer otherwise.
  if (isFree(charge)) {
    return t('travel.included');
  }

  return label(charge.inclusion);
}

/**
 * Only for an extra the hotel offers. One it marks not available, or says
 * nothing about, keeps those words whatever price rides along with them.
 *
 * @param {HouseRuleCharge} charge
 * @returns {boolean}
 */
function isFree(charge) {
  return ['PAID', 'INCLUDED'].includes(charge.inclusion)
      && charge.amount.isStated
      && charge.amount.amount === 0;
}

/**
 * @param {HouseRuleCharge} charge
 * @returns {string}
 */
function classes(charge) {
  if (isFree(charge)) {
    return 'bg-success-50 text-success-700 ring-success-200';
  }

  switch (charge.inclusion) {
    case 'INCLUDED':
      return 'bg-success-50 text-success-700 ring-success-200';

    case 'NOT-AVAILABLE':
      return 'bg-gray-100 text-gray-600 ring-gray-300';

    case 'UNSPECIFIED':
      return 'bg-gray-50 text-gray-500 ring-gray-200';

    default:
      return 'bg-warning-50 text-warning-700 ring-warning-200';
  }
}

// Since SD-1839 the list holds every rule the hotel states, and only some of
// them carry a price: an included breakfast or a no-show rule has none.
const priced = computed(() => props.charges.filter(charge => charge.amount.isStated));

// The prices are in the property's own currency rather than the customer's, so
// where they differ that has to be said outright.
const currencies = computed(() => [...new Set(priced.value.map(charge => charge.currency).filter(Boolean))]);

// One sentence per key, and the currencies decide which of the two is used.
// Rendered as three fragments back to back, the space before the currencies
// was dropped, and a sentence assembled that way cannot be translated.
const collectedNote = computed(() => (currencies.value.length
    ? t('travel.collectedByTheHotelAndChargedIn', {currencies: currencies.value.join(t('common.listJoin'))})
    : t('travel.collectedByTheHotel')));

const hasAnything = computed(() => props.rules.length > 0 || props.charges.length > 0);

/**
 * The hotel writes a rule as paragraphs, and the console keeps them apart with
 * a blank line. Printed as one text they run together into a wall.
 *
 * @param {string|null} body
 * @returns {string[]}
 */
function paragraphs(body) {
  return (body ?? '').split(/\n\s*\n/).map(paragraph => paragraph.trim()).filter(Boolean);
}
</script>

<template>
  <section v-if="hasAnything">
    <h2 class="text-lg font-semibold tracking-tight text-gray-900">{{ $t('travel.houseRules') }}</h2>
    <!-- Prose and money are kept apart on purpose: one is read, the other may
    actually be asked for at the desk. -->
    <div v-if="charges.length" class="mt-4 overflow-hidden rounded-3xl bg-white ring-1 ring-gray-200">
      <header class="border-b border-gray-100 px-5 py-4">
        <h3 class="text-sm/6 font-semibold text-gray-900">{{ $t('travel.extrasAndConditions') }}</h3>
        <!-- Only a price is collected at the desk, so only where there is one
        does the hotel's currency need saying. -->
        <p v-if="priced.length" class="mt-0.5 text-xs/5 text-gray-500">{{ collectedNote }}</p>
      </header>
      <ul class="divide-y divide-gray-100">
        <!-- By position: one type can carry several charges (two meals, two
        shuttles), so the type is not an identity. -->
        <li v-for="(charge, index) in charges" :key="index" class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-3">
          <span class="text-sm/6 text-gray-700">
            {{ name(charge) }}
            <span v-if="ages(charge)" class="text-gray-500">{{ ages(charge) }}</span>
          </span>
          <span :class="[classes(charge), 'inline-flex items-center rounded-lg px-2.5 py-1 text-xs/5 font-medium ring-1 ring-inset']">{{ description(charge) }}</span>
        </li>
      </ul>
    </div>
    <dl v-if="rules.length" class="mt-4 space-y-4 rounded-3xl bg-white p-5 ring-1 ring-gray-200">
      <div v-for="rule in rules" :key="rule.title">
        <dt class="text-sm/6 font-semibold text-gray-900">{{ rule.title }}</dt>
        <dd class="mt-1 space-y-2 text-sm/6 text-gray-600">
          <p v-for="(paragraph, position) in paragraphs(rule.body)" :key="position" class="whitespace-pre-line">{{ paragraph }}</p>
        </dd>
      </div>
    </dl>
  </section>
</template>
