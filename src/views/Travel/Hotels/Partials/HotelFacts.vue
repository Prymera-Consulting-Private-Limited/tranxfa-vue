<script setup>
import {computed} from 'vue';
import moment from 'moment';
import {ArrowRightStartOnRectangleIcon, ClockIcon, EnvelopeIcon, PhoneIcon} from '@heroicons/vue/24/outline';

const props = defineProps({
  /**
   * @type {HotelProvider|null}
   */
  provider: {
    type: Object,
    default: null,
  },
});

/**
 * Times are the hotel's own local times, sent as "HH:mm:ss".
 *
 * @param {string|null} value
 * @returns {string|null}
 */
function timeLabel(value) {
  if (!value) {
    return null;
  }

  const time = moment(value, 'HH:mm:ss', true);

  return time.isValid() ? time.format('h:mm A') : value;
}

const facts = computed(() => {
  if (!props.provider) {
    return [];
  }

  return [
    {
      key: 'checkin',
      icon: ClockIcon,
      label: 'Check-in',
      value: timeLabel(props.provider.checkInTime),
      href: null,
    }, {
      key: 'checkout',
      icon: ArrowRightStartOnRectangleIcon,
      label: 'Check-out',
      value: timeLabel(props.provider.checkOutTime),
      href: null,
    }, {
      key: 'phone',
      icon: PhoneIcon,
      label: 'Reception',
      value: props.provider.phone,
      href: props.provider.phone ? `tel:${props.provider.phone}` : null,
    }, {
      key: 'email',
      icon: EnvelopeIcon,
      label: 'Email',
      value: props.provider.email,
      href: props.provider.email ? `mailto:${props.provider.email}` : null,
    },
  ].filter(fact => fact.value);
});
</script>

<template>
  <section v-if="facts.length" class="rounded-2xl bg-white p-5 ring-1 ring-gray-200 sm:p-6">
    <h2 class="text-base font-semibold tracking-tight text-gray-900">Good to know</h2>
    <dl class="mt-4 grid gap-3 sm:grid-cols-2">
      <div v-for="fact in facts" :key="fact.key" class="flex items-center gap-3 rounded-xl bg-gray-50/70 p-3">
        <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-gray-500 ring-1 ring-gray-200">
          <component :is="fact.icon" class="size-4.5" aria-hidden="true" />
        </span>
        <div class="min-w-0">
          <dt class="text-xs text-gray-500">{{ fact.label }}</dt>
          <dd class="truncate text-sm font-medium text-gray-900">
            <a v-if="fact.href" :href="fact.href" class="transition hover:text-brand-800">{{ fact.value }}</a>
            <template v-else>{{ fact.value }}</template>
          </dd>
        </div>
      </div>
    </dl>
  </section>
</template>
