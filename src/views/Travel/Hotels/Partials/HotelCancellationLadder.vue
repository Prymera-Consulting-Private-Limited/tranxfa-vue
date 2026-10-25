<script setup>
import {computed} from 'vue';
import {useI18n} from 'vue-i18n';
import moment from 'moment';
import {CANCELLATION_STATUS} from '@/composables/travel/hotels/hotel_utils.js';

const {t} = useI18n();

const props = defineProps({
  /**
   * @type {RateCancellation|null}
   */
  cancellation: {
    type: Object,
    default: null,
  },

  /**
   * The rooms list and the stay card sit in small print; the quote does not.
   */
  dense: {
    type: Boolean,
    default: false,
  },
});

const periods = computed(() => props.cancellation?.ladder ?? []);

// The time matters as much as the day: a free window that ends at noon has gone
// by the afternoon, and the windows of one rate can change on the same day.
// The time is shown on the customer's own clock, so its zone is named too: for a
// stay abroad they would otherwise be left to guess whose noon it is.
function at(value) {
  const date = moment(value);
  const zone = new Intl.DateTimeFormat(undefined, {timeZoneName: 'short'})
      .formatToParts(date.toDate())
      .find(part => part.type === 'timeZoneName')?.value;

  return [date.format('D MMM YYYY, HH:mm'), zone].filter(Boolean).join(' ');
}

/**
 * @param {CancellationWindow} period
 * @returns {string}
 */
function when(period) {
  if (period.from && period.until) {
    return t('travel.cancelBetween', {from: at(period.from), until: at(period.until)});
  }

  if (period.until) {
    return t('travel.cancelUntil', {date: at(period.until)});
  }

  if (period.from) {
    return t('travel.cancelFrom', {date: at(period.from)});
  }

  return t('travel.cancelAtAnyTime');
}

/**
 * Each window is priced by the console with the same answer as cancelling now,
 * so its cost is shown as it came and never worked out here.
 *
 * @param {CancellationWindow} period
 * @returns {string}
 */
function cost(period) {
  if (period.status === CANCELLATION_STATUS.free) {
    return t('travel.cancelFree');
  }

  if (period.status === CANCELLATION_STATUS.unknown || !period.costs.isStated) {
    return t('travel.cancelCostNotKnown');
  }

  return period.costs.currencyPrefixed;
}

/**
 * @param {CancellationWindow} period
 * @returns {string}
 */
function classes(period) {
  switch (period.status) {
    case CANCELLATION_STATUS.free:
      return 'font-medium text-success-700';

    case CANCELLATION_STATUS.partial:
      return 'text-warning-700';

    case CANCELLATION_STATUS.nonRefundable:
      return 'text-gray-900';

    default:
      return 'text-gray-500';
  }
}
</script>

<template>
  <!-- Every window still to come, in the supplier's order, so the customer sees
  what cancelling costs later as well as today (SD-1839). -->
  <div v-if="periods.length" :class="dense ? 'text-xs/5' : 'text-sm/6'">
    <p class="font-medium text-gray-900">{{ $t('travel.cancellationPolicy') }}</p>
    <ul class="mt-0.5 space-y-0.5">
      <!-- By position: two windows can start at the same moment. -->
      <li v-for="(period, position) in periods" :key="position" class="flex items-baseline justify-between gap-3">
        <span class="min-w-0 text-gray-500">{{ when(period) }}</span>
        <span :class="[classes(period), 'shrink-0 tabular-nums']">{{ cost(period) }}</span>
      </li>
    </ul>
  </div>
</template>
