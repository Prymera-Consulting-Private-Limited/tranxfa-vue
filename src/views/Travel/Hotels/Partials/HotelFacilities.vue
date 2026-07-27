<script setup>
import {computed} from 'vue';
import {CheckIcon} from '@heroicons/vue/24/outline';
import {getFacilityGroups} from '@/composables/travel/hotels/hotel_utils.js';

const props = defineProps({
  /**
   * @type {HotelFacility[]}
   */
  facilities: {
    type: Array,
    default: () => [],
  },
});

const groups = computed(() => getFacilityGroups(props.facilities));

const detailed = computed(() => groups.value.filter(group => group.items.length));

// All the supplier says about these is the category, so they only get a chip.
const categories = computed(() => {
  return groups.value.filter(group => group.items.length === 0).map(group => group.group);
});
</script>

<template>
  <!-- @container: this sits in the page's 2/3-width column, so its own width, not the
       viewport's, decides when a 2-column grid actually has room to breathe. -->
  <section v-if="groups.length" class="@container rounded-2xl bg-white p-5 ring-1 ring-gray-200 @lg:p-6">
    <h2 class="text-base font-semibold tracking-tight text-gray-900">Facilities</h2>
    <div v-if="detailed.length" class="mt-4 grid gap-5 @lg:grid-cols-2">
      <div v-for="group in detailed" :key="group.group">
        <h3 class="text-xs font-semibold tracking-wide text-gray-400 uppercase">{{ group.group }}</h3>
        <ul class="mt-2 space-y-1.5">
          <li v-for="facility in group.items" :key="facility.id" class="flex items-start gap-2 text-sm text-gray-700">
            <CheckIcon class="mt-0.5 size-4 shrink-0 text-brand-700" aria-hidden="true" />
            <span class="min-w-0">
              {{ facility.name }}
              <!-- The supplier flags what is chargeable on arrival rather than included -->
              <span v-if="facility.isPaid" class="ml-1 text-xs text-gray-400">paid</span>
            </span>
          </li>
        </ul>
      </div>
    </div>
    <!-- Groups the supplier named nothing in -->
    <div v-if="categories.length" :class="[detailed.length ? 'mt-5 border-t border-gray-100 pt-4' : 'mt-4']">
      <ul class="flex flex-wrap gap-2">
        <li
            v-for="category in categories"
            :key="category"
            class="rounded-lg bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 ring-1 ring-gray-200"
        >{{ category }}</li>
      </ul>
      <p class="mt-2.5 text-xs text-gray-500">The property lists facilities in these categories. Our travel partner hasn't sent the detail behind them yet.</p>
    </div>
  </section>
</template>
