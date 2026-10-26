<script setup>
import {computed, ref, watch} from 'vue';
import {BuildingOffice2Icon, ChevronLeftIcon, ChevronRightIcon, Squares2X2Icon} from '@heroicons/vue/24/outline';
import HotelPhotoLightbox from '@/views/Travel/Hotels/Partials/HotelPhotoLightbox.vue';

const props = defineProps({
  /**
   * Ordered server-side and never sorted here — the order is the hotel's own
   * idea of which photo leads. Each is ready to request at every size.
   *
   * @type {Array<{thumbnail: string, card: string, large: string, xlarge: string}>}
   */
  photos: {
    type: Array,
    default: () => [],
  },

  name: {
    type: String,
    default: null,
  },
});

const index = ref(0);

const isOpen = ref(false);

// A new hotel can have fewer photos than the one that was on screen.
watch(() => props.photos, () => {
  index.value = 0;
});

// Five is what the mosaic needs; below that a single frame reads better than a
// grid with holes in it.
const isMosaic = computed(() => props.photos.length >= 5);

const lead = computed(() => props.photos[0] ?? null);

const secondary = computed(() => props.photos.slice(1, 5));

const current = computed(() => props.photos[index.value] ?? null);

/**
 * @param {number} amount
 */
function step(amount) {
  if (props.photos.length < 2) {
    return;
  }

  // Wraps, so the arrows never dead-end on a long gallery.
  index.value = (index.value + amount + props.photos.length) % props.photos.length;
}

function open(position = 0) {
  index.value = position;
  isOpen.value = true;
}
</script>

<template>
  <section>
    <!-- No Photo -->
    <div v-if="!photos.length" class="flex h-64 flex-col items-center justify-center gap-2 rounded-3xl bg-gradient-to-br from-gray-100 to-gray-200">
      <BuildingOffice2Icon class="size-10 text-gray-400" aria-hidden="true" />
      <p class="text-sm/6 text-gray-500">{{ $t('travel.noPhotosOfThisProperty') }}</p>
    </div>
    <!-- Mosaic, the first photo leading four smaller ones -->
    <div v-else-if="isMosaic" class="relative">
      <div class="grid h-72 grid-cols-1 grid-rows-1 gap-2 overflow-hidden rounded-3xl sm:h-96 sm:grid-cols-4 sm:grid-rows-2">
        <button
            type="button"
            @click="open(0)"
            class="group relative cursor-pointer overflow-hidden bg-gray-100 focus-visible:outline-0 sm:col-span-2 sm:row-span-2"
            :aria-label="$t('travel.openPhoto')"
        >
          <img :src="lead.large" :alt="name" class="size-full object-cover transition duration-500 group-hover:scale-105">
        </button>
        <button
            v-for="(photo, position) in secondary"
            :key="position"
            type="button"
            @click="open(position + 1)"
            class="group relative hidden cursor-pointer overflow-hidden bg-gray-100 focus-visible:outline-0 sm:block"
            :aria-label="`Open photo ${position + 2}`"
        >
          <img :src="photo.card" alt="" class="size-full object-cover transition duration-500 group-hover:scale-105" loading="lazy">
        </button>
      </div>
      <button
          type="button"
          @click="open(0)"
          class="absolute right-4 bottom-4 flex cursor-pointer items-center gap-2 rounded-xl bg-white/95 px-3.5 py-2 text-xs/5 font-semibold text-gray-900 shadow-lg ring-1 ring-black/5 backdrop-blur transition hover:bg-white focus-visible:outline-0"
      >
        <Squares2X2Icon class="size-4" aria-hidden="true" />{{ $t('travel.showAllLengthPhotos', {length: photos.length}) }}</button>
    </div>
    <!-- One frame, browsed in place -->
    <div v-else class="group relative h-72 overflow-hidden rounded-3xl bg-gray-100 sm:h-96">
      <img v-if="current" :src="current.large" :alt="name" class="size-full cursor-pointer object-cover" @click="isOpen = true">
      <template v-if="photos.length > 1">
        <button
            type="button"
            @click="step(-1)"
            class="absolute top-1/2 left-3 flex size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/90 text-gray-700 shadow-md transition hover:bg-white hover:text-gray-900 focus-visible:outline-0"
            :aria-label="$t('travel.previousPhoto')"
        >
          <ChevronLeftIcon class="size-5" aria-hidden="true" />
        </button>
        <button
            type="button"
            @click="step(1)"
            class="absolute top-1/2 right-3 flex size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/90 text-gray-700 shadow-md transition hover:bg-white hover:text-gray-900 focus-visible:outline-0"
            :aria-label="$t('travel.nextPhoto')"
        >
          <ChevronRightIcon class="size-5" aria-hidden="true" />
        </button>
      </template>
      <span class="absolute bottom-4 left-4 rounded-lg bg-black/50 px-2.5 py-1 text-xs/5 font-medium text-white tabular-nums backdrop-blur">{{ index + 1 }} / {{ photos.length }}</span>
    </div>
    <HotelPhotoLightbox v-model:open="isOpen" v-model:index="index" :photos="photos" :name="name" />
  </section>
</template>
