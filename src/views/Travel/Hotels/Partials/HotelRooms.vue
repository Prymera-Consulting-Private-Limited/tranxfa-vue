<script setup>
import {computed} from 'vue';
import HotelRoomCard from "@/views/Travel/Hotels/Partials/HotelRoomCard.vue";
import EmptyHotels from "@/views/Travel/Hotels/Partials/EmptyHotels.vue";
import {getCheapestRate, getRateKey, getRoomGroups} from "@/composables/travel/hotels/hotel_utils.js";

const props = defineProps({
  /**
   * @type {CatalogHotel}
   */
  hotel: {
    type: Object,
    required: true,
  },

  nights: {
    type: Number,
    default: 0,
  },

  selectedKey: {
    type: String,
    default: null,
  },
});

defineEmits([
  'select',
]);

const groups = computed(() => getRoomGroups(props.hotel.rates));

const rateCount = computed(() => groups.value.reduce((total, group) => total + group.rates.length, 0));

const bestKey = computed(() => {
  const cheapest = getCheapestRate(props.hotel);

  return cheapest ? getRateKey(cheapest) : null;
});
</script>

<template>
  <section id="rooms" class="scroll-mt-6">
    <header class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <h2 class="text-lg font-semibold tracking-tight text-gray-900">Choose your room</h2>
      <p v-if="groups.length" class="text-sm text-gray-500">
        {{ groups.length }} room type{{ groups.length === 1 ? '' : 's' }} &middot; {{ rateCount }} rate{{ rateCount === 1 ? '' : 's' }} for your dates
      </p>
    </header>
    <div v-if="groups.length" class="mt-4 space-y-4">
      <HotelRoomCard
          v-for="group in groups"
          :key="group.name"
          :group="group"
          :nights="nights"
          :best-key="bestKey"
          :selected-key="selectedKey"
          @select="$emit('select', $event)"
      />
    </div>
    <EmptyHotels
        v-else
        class="mt-4"
        title="No rooms available for these dates"
        description="Our travel partner has nothing bookable for this stay. Try shifting your dates or changing the number of guests."
    />
  </section>
</template>
