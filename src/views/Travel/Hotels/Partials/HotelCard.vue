<script setup>
import {computed} from 'vue';
import {MapPinIcon} from "@heroicons/vue/24/outline";
import HotelImage from "@/views/Travel/Hotels/Partials/HotelImage.vue";
import HotelRating from "@/views/Travel/Hotels/Partials/HotelRating.vue";
import HotelRoomType from "@/views/Travel/Hotels/Partials/HotelRoomType.vue";
import HotelMealBadge from "@/views/Travel/Hotels/Partials/HotelMealBadge.vue";
import HotelAmenities from "@/views/Travel/Hotels/Partials/HotelAmenities.vue";
import HotelCancellationBadge from "@/views/Travel/Hotels/Partials/HotelCancellationBadge.vue";
import HotelAvailability from "@/views/Travel/Hotels/Partials/HotelAvailability.vue";
import HotelPrice from "@/views/Travel/Hotels/Partials/HotelPrice.vue";
import HotelAction from "@/views/Travel/Hotels/Partials/HotelAction.vue";

const props = defineProps({
  /**
   * @type {Hotel}
   */
  hotel: {
    type: Object,
    required: true,
  },

  /**
   * The response's currency and decimal places, which every amount below needs.
   */
  money: {
    type: Object,
    required: true,
  },

  labels: {
    type: Object,
    default: () => ({}),
  },

  nights: {
    type: Number,
    default: 0,
  },
});

const emit = defineEmits([
  'select',
]);

// The search returns one rate per hotel, and a hotel with none never reaches us.
const rate = computed(() => props.hotel.cheapestRate);
</script>

<template>
  <!-- The lift stays neutral, so the only colour the hover adds is on the name. -->
  <article class="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs transition duration-200 hover:border-gray-300 hover:shadow-lg hover:shadow-gray-200/70">
    <div class="grid grid-cols-1 lg:grid-cols-12">
      <!-- Photo -->
      <div class="lg:col-span-3">
        <HotelImage :hotel="hotel" />
      </div>
      <!-- Details -->
      <div class="flex flex-col gap-4 p-5 lg:col-span-6">
        <!-- Heading -->
        <div>
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h3 class="text-lg font-semibold text-gray-900 transition group-hover:text-brand-800">{{ hotel.name }}</h3>
            <HotelRating :stars="hotel.starRating" />
          </div>
          <p class="mt-1.5 flex items-start gap-1 text-sm text-gray-500">
            <MapPinIcon class="mt-0.5 size-4 shrink-0 text-gray-400" aria-hidden="true" />
            <span>{{ hotel.address || hotel.region }}</span>
          </p>
        </div>
        <!-- Room -->
        <HotelRoomType :rate="rate" />
        <!-- Rate Highlights -->
        <div class="flex flex-wrap items-center gap-2">
          <HotelMealBadge :meal="rate.meal" :labels="labels" />
          <HotelCancellationBadge :cancellation="rate.cancellation" />
          <HotelAvailability :allotment="rate.allotment" />
        </div>
        <!-- Amenities -->
        <HotelAmenities :amenities="hotel.amenities" :labels="labels" />
      </div>
      <!-- Price -->
      <aside class="flex flex-col justify-between gap-4 border-t border-gray-100 bg-gray-50/70 p-5 lg:col-span-3 lg:border-t-0 lg:border-l">
        <HotelPrice :rate="rate" :money="money" :nights="nights" />
        <HotelAction :rate-count="hotel.rateCount" @select="$emit('select', hotel)" />
      </aside>
    </div>
  </article>
</template>
