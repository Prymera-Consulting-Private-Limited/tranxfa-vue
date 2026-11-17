<script setup>
import {computed, ref, watch} from 'vue';
import HotelPhotoLightbox from '@/views/Travel/Hotels/Partials/HotelPhotoLightbox.vue';

const props = defineProps({
  /**
   * One room's photos, matched to its rates by the console and in its order.
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

// Enough to tell two rooms apart at a glance, without a strip that pushes the
// rates themselves down the card. The rest are one tap away.
const SHOWN = 4;

const index = ref(0);

const isOpen = ref(false);

watch(() => props.photos, () => {
  index.value = 0;
});

const shown = computed(() => props.photos.slice(0, SHOWN));

const hidden = computed(() => props.photos.length - shown.value.length);

/**
 * @param {number} position
 */
function open(position) {
  index.value = position;
  isOpen.value = true;
}
</script>

<template>
  <div v-if="photos.length">
    <div class="grid max-w-md grid-cols-4 gap-2">
      <button
          v-for="(photo, position) in shown"
          :key="position"
          type="button"
          @click="open(position)"
          class="group relative h-16 cursor-pointer overflow-hidden rounded-xl bg-gray-100 focus-visible:outline-0 sm:h-20"
          :aria-label="$t('travel.openPhotoNumber', {number: position + 1})"
      >
        <img :src="photo.thumbnail" alt="" class="size-full object-cover transition duration-500 group-hover:scale-105" loading="lazy">
        <span v-if="hidden && position === shown.length - 1" class="absolute inset-0 flex items-center justify-center bg-gray-950/50 text-sm/6 font-semibold text-white">{{ $t('travel.morePhotosCount', {count: hidden}) }}</span>
      </button>
    </div>
    <HotelPhotoLightbox v-model:open="isOpen" v-model:index="index" :photos="photos" :name="name" />
  </div>
</template>
