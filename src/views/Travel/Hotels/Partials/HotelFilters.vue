<script setup>
import {computed, ref} from 'vue';
import {formatMoney, getFilters, hasFilters} from "@/composables/travel/hotels/hotel_utils.js";
import {AdjustmentsHorizontalIcon} from "@heroicons/vue/24/outline";
import {StarIcon} from "@heroicons/vue/24/solid";

const props = defineProps({
  /**
   * Built from the unfiltered results, so the options never disappear as they are used.
   */
  facets: {
    type: Object,
    required: true,
  },

  filters: {
    type: Object,
    required: true,
  },

  /**
   * The response's currency and decimal places — the price range is in minor
   * units like every other amount a search carries.
   */
  money: {
    type: Object,
    required: true,
  },

  matchCount: {
    type: Number,
    default: 0,
  },

  totalCount: {
    type: Number,
    default: 0,
  },
});

const emit = defineEmits([
  'update:filters',
]);

// The sidebar is a panel on its own row until there is room beside the results.
const isOpen = ref(false);

const AMENITY_LIMIT = 6;

const showAllAmenities = ref(false);

const amenities = computed(() => {
  if (showAllAmenities.value) {
    return props.facets.amenities;
  }

  return props.facets.amenities.slice(0, AMENITY_LIMIT);
});

const isActive = computed(() => hasFilters(props.filters));

const hasPriceRange = computed(() => props.facets.price.max > props.facets.price.min);

// An untouched slider sits at the top of the range, which means no limit at all.
const maxPrice = computed(() => props.filters.maxPrice ?? props.facets.price.max);

function update(patch) {
  emit('update:filters', {...props.filters, ...patch});
}

function toggle(key, value) {
  const values = props.filters[key];

  update({
    [key]: values.includes(value) ? values.filter(item => item !== value) : [...values, value],
  });
}

const PHOTO_OPTIONS = [
  {value: 'with', label: 'With photos'},
  {value: 'without', label: 'No photos'},
];

// Picking the option that is already on means no preference either way.
function togglePhotos(value) {
  update({photos: props.filters.photos === value ? null : value});
}

function setMaxPrice(value) {
  const price = Number(value);

  update({maxPrice: price >= props.facets.price.max ? null : price});
}

function clear() {
  emit('update:filters', getFilters());
}

function formatPrice(amount) {
  return formatMoney(amount, props.money);
}
</script>

<template>
  <aside>
    <!-- Trigger, only while the sidebar has no column of its own -->
    <button
        type="button"
        @click="isOpen = !isOpen"
        class="flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-xs transition hover:border-gray-300 lg:hidden"
    >
      <span class="flex items-center gap-2 text-sm font-semibold text-gray-900">
        <AdjustmentsHorizontalIcon class="size-5 text-gray-400" aria-hidden="true" />
        Filters
      </span>
      <span class="text-xs text-gray-500">{{ matchCount }} of {{ totalCount }}</span>
    </button>
    <div :class="[isOpen ? 'mt-3 block' : 'hidden', 'divide-y divide-gray-200 rounded-2xl border border-gray-200 bg-white shadow-xs lg:sticky lg:top-6 lg:mt-0 lg:block']">
      <!-- Heading -->
      <header class="flex items-baseline justify-between gap-3 px-4 py-3">
        <div>
          <h3 class="text-sm font-semibold text-gray-900">Filters</h3>
          <p class="mt-0.5 text-xs text-gray-500">{{ matchCount }} of {{ totalCount }} hotel{{ totalCount === 1 ? '' : 's' }}</p>
        </div>
        <button
            v-if="isActive"
            type="button"
            @click="clear"
            class="cursor-pointer text-xs font-medium text-brand-700 transition hover:text-brand-800"
        >Clear all</button>
      </header>
      <!-- Price -->
      <section v-if="hasPriceRange" class="px-4 py-3">
        <div class="flex items-baseline justify-between gap-2">
          <h4 class="text-xs font-semibold tracking-wide text-gray-400 uppercase">Total price</h4>
          <p class="text-xs font-medium text-gray-900">
            up to {{ facets.price.currency }} {{ formatPrice(maxPrice) }}
          </p>
        </div>
        <input
            type="range"
            :min="facets.price.min"
            :max="facets.price.max"
            :value="maxPrice"
            @input="setMaxPrice($event.target.value)"
            class="mt-3 w-full cursor-pointer accent-brand-700"
            aria-label="Maximum total price"
        />
        <div class="mt-1 flex justify-between text-xs text-gray-400">
          <span>{{ formatPrice(facets.price.min) }}</span>
          <span>{{ formatPrice(facets.price.max) }}</span>
        </div>
      </section>
      <!-- Star rating -->
      <section v-if="facets.stars.length" class="px-4 py-3">
        <h4 class="text-xs font-semibold tracking-wide text-gray-400 uppercase">Star rating</h4>
        <div class="mt-2 space-y-1.5">
          <label v-for="star in facets.stars" :key="star.value" class="flex cursor-pointer items-center gap-2.5">
            <input
                type="checkbox"
                :checked="filters.stars.includes(star.value)"
                @change="toggle('stars', star.value)"
                class="size-4 shrink-0 cursor-pointer rounded border-gray-300 accent-brand-700"
            />
            <span class="flex items-center gap-0.5">
              <StarIcon v-for="index in star.value" :key="index" class="size-3.5 text-amber-400" aria-hidden="true" />
            </span>
            <span class="ml-auto text-xs text-gray-400 tabular-nums">{{ star.count }}</span>
          </label>
        </div>
      </section>
      <!-- Photos, only worth offering when the results are mixed -->
      <section v-if="facets.photos.with > 0 && facets.photos.without > 0" class="px-4 py-3">
        <h4 class="text-xs font-semibold tracking-wide text-gray-400 uppercase">Photos</h4>
        <div class="mt-2 grid grid-cols-2 gap-2">
          <button
              v-for="option in PHOTO_OPTIONS"
              :key="option.value"
              type="button"
              @click="togglePhotos(option.value)"
              :class="[
                filters.photos === option.value
                  ? 'border-brand-700 bg-brand-50 text-brand-800'
                  : 'border-gray-200 text-gray-700 hover:border-gray-300',
                'cursor-pointer rounded-lg border px-2 py-1.5 text-xs font-medium transition',
              ]"
          >
            {{ option.label }}
            <span class="ml-0.5 font-normal text-gray-400 tabular-nums">{{ facets.photos[option.value] }}</span>
          </button>
        </div>
      </section>
      <!-- Amenities -->
      <section v-if="facets.amenities.length" class="px-4 py-3">
        <h4 class="text-xs font-semibold tracking-wide text-gray-400 uppercase">Amenities</h4>
        <div class="mt-2 space-y-1.5">
          <label v-for="amenity in amenities" :key="amenity.value" class="flex cursor-pointer items-center gap-2.5">
            <input
                type="checkbox"
                :checked="filters.amenities.includes(amenity.value)"
                @change="toggle('amenities', amenity.value)"
                class="size-4 shrink-0 cursor-pointer rounded border-gray-300 accent-brand-700"
            />
            <span class="min-w-0 truncate text-sm text-gray-700">{{ amenity.label }}</span>
            <span class="ml-auto text-xs text-gray-400 tabular-nums">{{ amenity.count }}</span>
          </label>
        </div>
        <button
            v-if="facets.amenities.length > AMENITY_LIMIT"
            type="button"
            @click="showAllAmenities = !showAllAmenities"
            class="mt-2 cursor-pointer text-xs font-medium text-brand-700 transition hover:text-brand-800"
        >{{ showAllAmenities ? 'Show less' : `Show all ${facets.amenities.length}` }}</button>
      </section>
    </div>
  </aside>
</template>
