<script setup>
import {useI18n} from "vue-i18n";

const {t} = useI18n();

import {computed, onUnmounted, ref, watch} from 'vue';
import moment from 'moment';
import VueDatePicker from '@vuepic/vue-datepicker';
import {debounce} from 'lodash';
import {
  CHILD_AGE,
  MAX_ADULTS,
  MAX_CHECKIN_DAYS,
  MAX_CHILD_AGE,
  MAX_CHILDREN,
  MAX_ROOM_GUESTS,
  MAX_ROOMS,
  MAX_STAY_NIGHTS,
  MIN_ADULTS,
  REGION_QUERY_MIN,
} from '@/composables/travel/hotels/hotel_utils.js';
import {Combobox, ComboboxButton, ComboboxInput, ComboboxLabel, ComboboxOption, ComboboxOptions, Popover, PopoverButton, PopoverPanel} from '@headlessui/vue';
import {CalendarDaysIcon, ChevronDownIcon, ExclamationTriangleIcon, MagnifyingGlassIcon, MapPinIcon, MinusIcon, PencilSquareIcon, PlusIcon, UserGroupIcon} from '@heroicons/vue/24/outline';

const props = defineProps({
  criteria: {
    type: Object,
    required: true,
  },

  // Resolved from the results, since the API is queried by region id.
  region: {
    type: String,
    default: null,
  },

  
  regions: {
    type: Array,
    default: () => [],
  },

  isLoading: {
    type: Boolean,
    default: false,
  },

  isSearchingRegions: {
    type: Boolean,
    default: false,
  },

  
  regionLabels: {
    type: Object,
    default: () => ({}),
  },

  
  regionsFeatured: {
    type: Boolean,
    default: false,
  },

  
  regionsError: {
    type: String,
    default: null,
  },

  
  stacked: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits([
  'search',
  'region-search',
]);


const selectedRegion = ref(null);

const dates = ref([props.criteria.checkin, props.criteria.checkout]);


const guests = ref(getRooms(props.criteria.guests));

// Keep the bar in sync when the parent changes the search criteria, which the
// url does on the first load and on every back or forward.
watch(() => [props.criteria.checkin, props.criteria.checkout], ([checkin, checkout]) => {
  dates.value = [checkin, checkout];
});

watch(() => props.criteria.guests, rooms => {
  guests.value = getRooms(rooms);
});


function getRooms(rooms) {
  if (!Array.isArray(rooms) || rooms.length === 0) {
    return [{adults: 2, children: []}];
  }

  return rooms.map(room => ({
    adults: room.adults ?? 1,
    children: Array.isArray(room.children) ? [...room.children] : [],
  }));
}

// The supplier won't quote a check-in this far out, so the picker never offers one.
const latestDate = moment().add(MAX_CHECKIN_DAYS, 'days').toDate();

const nights = computed(() => {
  if (!dates.value?.[0] || !dates.value?.[1]) {
    return 0;
  }

  return moment(dates.value[1]).diff(moment(dates.value[0]), 'days');
});

const lookupRegions = debounce(query => emit('region-search', query), 300);

// Kept so a failed lookup can be retried on exactly what was typed, rather
// than silently falling back to the default list.
const lastQuery = ref(null);

function onDestinationQuery(value) {
  const query = value.trim();

  lastQuery.value = query.length ? query : null;

  lookupRegions(lastQuery.value);
}

function retryRegions() {
  lookupRegions.cancel();

  emit('region-search', lastQuery.value);
}


function regionDescription(region) {
  return [props.regionLabels[region.kind], region.country].filter(Boolean).join(' · ');
}

// Nothing curated yet, so there is nothing to open on and typing is the only way
// through — which is a state to explain rather than an error.
const showTypePrompt = computed(() => {
  return (lastQuery.value?.length ?? 0) < REGION_QUERY_MIN && props.regions.length === 0;
});

// Side by side months only fit once the bar itself is laid out horizontally.
const wideViewport = window.matchMedia('(min-width: 1024px)');
const isWide = ref(wideViewport.matches);

function trackViewport(event) {
  isWide.value = event.matches;
}

wideViewport.addEventListener('change', trackViewport);
onUnmounted(() => wideViewport.removeEventListener('change', trackViewport));

const months = computed(() => (isWide.value && !props.stacked ? 2 : 1));

const stayLabel = computed(() => {
  if (!nights.value) {
    return t('travel.selectDates');
  }

  const checkin = moment(dates.value[0]).format('ddd, D MMM');
  const checkout = moment(dates.value[1]).format('ddd, D MMM');

  return `${checkin} — ${checkout}`;
});

const OCCUPANCY = [
  {key: 'adults', label: t('travel.adults'), hint: '18+'},
  {key: 'children', label: t('travel.children'), hint: `0–${MAX_CHILD_AGE}`},
];


function roomGuests(room) {
  return room.adults + room.children.length;
}


function countOf(room, key) {
  return key === 'adults' ? room.adults : room.children.length;
}

function canDecrease(room, key) {
  return key === 'adults' ? room.adults > MIN_ADULTS : room.children.length > 0;
}

function canIncrease(room, key) {
  if (roomGuests(room) >= MAX_ROOM_GUESTS) {
    return false;
  }

  return key === 'adults' ? room.adults < MAX_ADULTS : room.children.length < MAX_CHILDREN;
}


function step(room, key, amount) {
  if (amount > 0 ? !canIncrease(room, key) : !canDecrease(room, key)) {
    return;
  }

  if (key === 'adults') {
    room.adults += amount;

    return;
  }

  if (amount > 0) {
    room.children.push(CHILD_AGE);

    return;
  }

  room.children.pop();
}


function stepAge(room, index, amount) {
  const age = (room.children[index] ?? 0) + amount;

  room.children[index] = Math.min(Math.max(age, 0), MAX_CHILD_AGE);
}

function addRoom() {
  if (guests.value.length >= MAX_ROOMS) {
    return;
  }

  // Matched to the last room, since the supplier prices multi-room stays best
  // when the rooms are occupied alike.
  const last = guests.value.at(-1);

  guests.value.push({
    adults: Math.min(last?.adults ?? 2, MAX_ADULTS),
    children: [],
  });
}

function removeRoom(index) {
  if (guests.value.length <= 1) {
    return;
  }

  guests.value.splice(index, 1);
}


function roomWarning(room) {
  if (room.adults > MAX_ADULTS) {
    return t('travel.upToMaxAdults', {mAX_ADULTS: MAX_ADULTS});
  }

  if (room.children.length > MAX_CHILDREN) {
    return t('travel.upToMaxChildren', {mAX_CHILDREN: MAX_CHILDREN});
  }

  if (roomGuests(room) > MAX_ROOM_GUESTS) {
    return t('travel.upToMaxRoom', {mAX_ROOM_GUESTS: MAX_ROOM_GUESTS});
  }

  return null;
}

const hasUnevenRooms = computed(() => {
  if (guests.value.length < 2) {
    return false;
  }

  const first = `${guests.value[0].adults}-${guests.value[0].children.length}`;

  return guests.value.some(room => `${room.adults}-${room.children.length}` !== first);
});

const totalAdults = computed(() => guests.value.reduce((total, room) => total + room.adults, 0));
const totalChildren = computed(() => guests.value.reduce((total, room) => total + room.children.length, 0));

const occupancyLabel = computed(() => {
  const parts = [`${totalAdults.value} adult${totalAdults.value === 1 ? '' : 's'}`];

  if (totalChildren.value > 0) {
    parts.push(`${totalChildren.value} child${totalChildren.value === 1 ? '' : 'ren'}`);
  }

  parts.push(`${guests.value.length} room${guests.value.length === 1 ? '' : 's'}`);

  return parts.join(' · ');
});

// The chosen region wins, so a search can be repeated after the url set one.
const regionId = computed(() => selectedRegion.value?.id ?? props.criteria.region_id);

const canSearch = computed(() => nights.value > 0 && regionId.value !== null);

function search() {
  if (!canSearch.value) {
    return;
  }

  emit('search', {
    region_id: regionId.value,
    checkin: moment(dates.value[0]).format('YYYY-MM-DD'),
    checkout: moment(dates.value[1]).format('YYYY-MM-DD'),
    guests: guests.value.map(room => ({
      adults: room.adults,
      children: [...room.children],
    })),
  });
}
</script>

<template>
  <!-- In a sidebar it is a card among cards, so it drops the floating bar's shadow and takes the
       stay card's two-tone treatment instead: a plain header over a tinted band of fields. -->
  <div :class="[stacked ? 'overflow-hidden rounded-2xl shadow-xs ring-1 ring-gray-200' : 'p-2 shadow-lg ring-1 ring-black/5', 'bg-white']">
    <div v-if="stacked" class="flex items-center gap-2.5 px-5 py-4">
      <span class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-gray-500 ring-1 ring-gray-200">
        <PencilSquareIcon class="size-4" aria-hidden="true" />
      </span>
      <p class="text-sm/6 font-semibold text-gray-900">{{ $t('travel.editYourSearch') }}</p>
    </div>
    <!-- Stacked, the hairlines between cells become gaps between white chips on a tinted band. -->
    <div :class="[stacked ? 'gap-2.5 border-t border-gray-100 bg-gray-50/70 p-3' : 'divide-y divide-gray-200 lg:flex-row lg:items-stretch lg:divide-x lg:divide-y-0', 'flex flex-col']">
      <!-- Destination -->
      <Combobox as="div" v-model="selectedRegion" nullable :class="[stacked ? 'rounded-xl bg-white ring-1 ring-gray-200 transition focus-within:ring-brand-300 hover:ring-gray-300' : '', 'relative flex flex-1']">
        <div class="flex w-full items-center gap-3 px-4 py-3">
          <span v-if="stacked" class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-500 ring-1 ring-gray-200">
            <MapPinIcon class="size-4" aria-hidden="true" />
          </span>
          <MapPinIcon v-else class="size-5 shrink-0 text-gray-400" aria-hidden="true" />
          <div class="min-w-0 flex-1">
            <ComboboxLabel class="block text-xs/5 text-gray-500">{{ $t('travel.destination') }}</ComboboxLabel>
            <ComboboxInput
                class="w-full truncate border-0 p-0 text-sm/6 font-medium text-gray-900 placeholder:font-normal placeholder:text-gray-500 focus:outline-0"
                :placeholder="region ?? $t('travel.whereTo')"
                :display-value="option => option?.name ?? region ?? ''"
                autocomplete="off"
                @change="onDestinationQuery($event.target.value)"
            />
          </div>
          <!-- Typing opens the list on its own; this is for browsing the default one. -->
          <ComboboxButton class="flex shrink-0 cursor-pointer items-center focus-visible:outline-0" v-slot="{open}">
            <ChevronDownIcon :class="[open ? 'rotate-180' : '', 'size-4 text-gray-400 transition']" aria-hidden="true" />
          </ComboboxButton>
        </div>
        <ComboboxOptions class="absolute top-full left-0 z-20 mt-2 max-h-80 w-full min-w-72 overflow-y-auto rounded-xl border border-gray-200 bg-white py-2 shadow-lg focus-visible:outline-0">
          <li v-if="isSearchingRegions" class="px-4 py-3 text-sm/6 text-gray-500">{{ $t('travel.searchingDestinations') }}</li>
          <!-- Travel is simply not part of this product, which must not be -->
          <!-- dressed up as an outage the customer could wait out. -->
          <li v-else-if="regionsError === 'unavailable'" class="px-4 py-3 text-sm/6 text-gray-500">{{ $t('travel.travelIsntAvailableOnThis') }}</li>
          <!-- mousedown.prevent keeps the input focused, so the list is still -->
          <!-- open by the time the click lands. -->
          <li v-else-if="regionsError === 'failed'" class="px-4 py-3">
            <p class="flex items-center gap-1.5 text-sm/6 font-medium text-gray-900">
              <ExclamationTriangleIcon class="size-4 shrink-0 text-warning-500" aria-hidden="true" />{{ $t('travel.weCouldntLoadDestinations') }}</p>
            <p class="mt-1 text-xs/5 text-gray-500">{{ $t('travel.somethingWentWrongReachingOur') }}</p>
            <button
                type="button"
                @mousedown.prevent
                @click="retryRegions"
                class="mt-2 cursor-pointer text-xs/5 font-medium text-brand-700 transition hover:text-brand-800"
            >{{ $t('common.tryAgain') }}</button>
          </li>
          <li v-else-if="showTypePrompt" class="px-4 py-3 text-sm/6 text-gray-500">{{ $t('travel.typeAtLeastRegionQuery', {REGION_QUERY_MIN: REGION_QUERY_MIN}) }}</li>
          <li v-else-if="regions.length === 0" class="px-4 py-3 text-sm/6 text-gray-500">{{ $t('travel.noDestinationsFound') }}</li>
          <li v-else-if="regionsFeatured" class="px-4 pt-1 pb-2 text-xs/5 font-semibold tracking-wide text-gray-500 uppercase">{{ $t('travel.popularDestinations') }}</li>
          <ComboboxOption v-for="option in regions" :key="option.id" :value="option" as="template" v-slot="{active, selected}">
            <li :class="[active ? 'bg-gray-50' : '', 'flex cursor-pointer items-center justify-between gap-3 px-4 py-2']">
              <div class="min-w-0">
                <p :class="[selected ? 'font-semibold' : 'font-medium', 'truncate text-sm/6 text-gray-900']">{{ option.name }}</p>
                <!-- The operator's own line wins, since it says something the kind and country cannot. -->
                <p class="truncate text-xs/5 text-gray-500">{{ option.about || regionDescription(option) }}</p>
              </div>
            </li>
          </ComboboxOption>
        </ComboboxOptions>
      </Combobox>
      <!-- Dates -->
      <!-- The cells stretch to the row height, so top-full drops the panel clear of the bar. -->
      <Popover as="div" :class="[stacked ? 'rounded-xl bg-white ring-1 ring-gray-200 transition hover:ring-gray-300' : '', 'relative flex flex-1']">
        <PopoverButton class="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left focus-visible:outline-0">
          <span v-if="stacked" class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-500 ring-1 ring-gray-200">
            <CalendarDaysIcon class="size-4" aria-hidden="true" />
          </span>
          <CalendarDaysIcon v-else class="size-5 shrink-0 text-gray-400" aria-hidden="true" />
          <div class="min-w-0 flex-1">
            <p class="text-xs/5 text-gray-500">{{ nights ? `${nights} night${nights === 1 ? '' : 's'}` : 'Stay' }}</p>
            <p class="truncate text-sm/6 font-medium text-gray-900">{{ stayLabel }}</p>
          </div>
        </PopoverButton>
        <PopoverPanel v-slot="{ close }" class="stay-calendar absolute top-full left-0 z-20 mt-2 rounded-xl border border-gray-200 bg-white shadow-lg">
          <VueDatePicker
              v-model="dates"
              inline
              range
              :multi-calendars="months"
              :min-date="new Date()"
              :max-date="latestDate"
              :max-range="MAX_STAY_NIGHTS"
              :enable-time-picker="false"
              :clearable="false"
              auto-apply
              @range-end="close()"
          />
        </PopoverPanel>
      </Popover>
      <!-- Occupancy -->
      <Popover as="div" :class="[stacked ? 'rounded-xl bg-white ring-1 ring-gray-200 transition hover:ring-gray-300' : '', 'relative flex flex-1']" v-slot="{ open }">
        <PopoverButton class="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left focus-visible:outline-0">
          <span v-if="stacked" class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-500 ring-1 ring-gray-200">
            <UserGroupIcon class="size-4" aria-hidden="true" />
          </span>
          <UserGroupIcon v-else class="size-5 shrink-0 text-gray-400" aria-hidden="true" />
          <div class="min-w-0 flex-1">
            <p class="text-xs/5 text-gray-500">{{ $t('travel.guests') }}</p>
            <p class="truncate text-sm/6 font-medium text-gray-900">{{ occupancyLabel }}</p>
          </div>
          <ChevronDownIcon :class="[open ? 'rotate-180' : '', 'size-4 shrink-0 text-gray-400 transition']" aria-hidden="true" />
        </PopoverButton>
        <PopoverPanel v-slot="{ close }" :class="[stacked ? 'left-0' : 'right-0', 'absolute top-full z-20 mt-2 flex max-h-96 w-80 flex-col rounded-xl border border-gray-200 bg-white shadow-lg']">
          <!-- Rooms are only separated by a dashed rule, so the panel stays shallow. -->
          <div class="flex-1 divide-y divide-dashed divide-gray-200 overflow-y-auto px-4">
            <section v-for="(room, index) in guests" :key="index" class="py-3">
              <header class="flex items-baseline justify-between gap-3">
                <h4 class="text-xs/5 font-semibold tracking-wide text-gray-500 uppercase">Room {{ index + 1 }}</h4>
                <button
                    v-if="guests.length > 1"
                    type="button"
                    @click="removeRoom(index)"
                    class="cursor-pointer text-xs/5 font-medium text-danger-600 transition hover:text-danger-700"
                >{{ $t('travel.remove') }}</button>
              </header>
              <!-- Counters -->
              <div v-for="item in OCCUPANCY" :key="item.key" class="mt-2 flex items-center justify-between gap-3">
                <p class="truncate text-sm/6 text-gray-700">
                  {{ item.label }}
                  <span class="ml-0.5 text-xs/5 text-gray-500">{{ item.hint }}</span>
                </p>
                <div class="flex shrink-0 items-center gap-2.5">
                  <button
                      type="button"
                      :disabled="!canDecrease(room, item.key)"
                      @click="step(room, item.key, -1)"
                      class="flex size-6 cursor-pointer items-center justify-center rounded-full border border-gray-300 text-gray-600 transition hover:border-gray-400 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-30"
                      :aria-label="`Decrease ${item.label} in room ${index + 1}`"
                  >
                    <MinusIcon class="size-3" aria-hidden="true" />
                  </button>
                  <span class="w-4 text-center text-sm/6 font-medium tabular-nums">{{ countOf(room, item.key) }}</span>
                  <button
                      type="button"
                      :disabled="!canIncrease(room, item.key)"
                      @click="step(room, item.key, 1)"
                      class="flex size-6 cursor-pointer items-center justify-center rounded-full border border-gray-300 text-gray-600 transition hover:border-gray-400 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-30"
                      :aria-label="`Increase ${item.label} in room ${index + 1}`"
                  >
                    <PlusIcon class="size-3" aria-hidden="true" />
                  </button>
                </div>
              </div>
              <!-- Ages step like the counters above. -->
              <div v-if="room.children.length" class="mt-2 space-y-2">
                <div v-for="(childAge, childIndex) in room.children" :key="childIndex" class="flex items-center justify-between gap-3">
                  <p class="truncate text-sm/6 text-gray-500">
                    Child {{ childIndex + 1 }}
                    <span class="ml-0.5 text-xs/5 text-gray-500">{{ $t('travel.age') }}</span>
                  </p>
                  <div class="flex shrink-0 items-center gap-2.5">
                    <button
                        type="button"
                        :disabled="childAge <= 0"
                        @click="stepAge(room, childIndex, -1)"
                        class="flex size-6 cursor-pointer items-center justify-center rounded-full border border-gray-300 text-gray-600 transition hover:border-gray-400 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-30"
                        :aria-label="`Decrease age of child ${childIndex + 1} in room ${index + 1}`"
                    >
                      <MinusIcon class="size-3" aria-hidden="true" />
                    </button>
                    <span class="w-6 text-center text-sm/6 font-medium tabular-nums">{{ childAge === 0 ? '<1' : childAge }}</span>
                    <button
                        type="button"
                        :disabled="childAge >= MAX_CHILD_AGE"
                        @click="stepAge(room, childIndex, 1)"
                        class="flex size-6 cursor-pointer items-center justify-center rounded-full border border-gray-300 text-gray-600 transition hover:border-gray-400 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-30"
                        :aria-label="`Increase age of child ${childIndex + 1} in room ${index + 1}`"
                    >
                      <PlusIcon class="size-3" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
              <p v-if="roomWarning(room)" class="mt-2 text-xs/5 font-medium text-danger-600">{{ roomWarning(room) }}</p>
            </section>
          </div>
          <!-- Actions -->
          <div class="border-t border-gray-200 px-4 py-3">
            <p v-if="hasUnevenRooms" class="mb-2.5 text-xs/5 text-gray-500">{{ $t('travel.forBestResultsWithMultiple') }}</p>
            <div class="flex items-center justify-between gap-3">
              <button
                  type="button"
                  :disabled="guests.length >= MAX_ROOMS"
                  @click="addRoom"
                  class="flex cursor-pointer items-center gap-1 text-sm/6 font-medium text-brand-700 transition hover:text-brand-800 disabled:cursor-not-allowed disabled:text-gray-500"
              >
                <PlusIcon class="size-4" aria-hidden="true" />{{ $t('travel.addRoom') }}</button>
              <button
                  type="button"
                  @click="close()"
                  class="cursor-pointer rounded-xl bg-brand-700 px-4 py-2.5 text-sm/6 font-semibold text-white transition hover:bg-brand-800 focus-visible:outline-0"
              >{{ $t('wallet.done') }}</button>
            </div>
          </div>
        </PopoverPanel>
      </Popover>
      <!-- Search -->
      <div :class="[stacked ? '' : 'p-2 lg:pl-4', 'flex items-center']">
        <button type="button" @click="search" :disabled="isLoading || ! canSearch" :class="[stacked ? 'shadow-sm' : 'lg:w-auto', 'flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand-700 px-6 py-3.5 text-sm/6 font-semibold text-white transition hover:bg-brand-800 focus-visible:outline-0 disabled:cursor-not-allowed disabled:opacity-60']">
          <MagnifyingGlassIcon class="size-4" aria-hidden="true" />{{ $t('travel.search') }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* The panel already provides the chrome, so drop the picker's own frame. */
.stay-calendar :deep(.dp__menu) {
    border: 0;
}
</style>
