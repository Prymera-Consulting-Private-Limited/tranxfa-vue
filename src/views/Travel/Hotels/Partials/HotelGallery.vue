<script setup>
import {computed, onUnmounted, ref, watch} from 'vue';
import {Dialog, DialogPanel, DialogTitle} from '@headlessui/vue';
import {BuildingOffice2Icon, ChevronLeftIcon, ChevronRightIcon, Squares2X2Icon, XMarkIcon} from '@heroicons/vue/24/outline';
import {getPhotoUrl, PHOTO_SIZE} from '@/composables/travel/hotels/hotel_utils.js';

const props = defineProps({
  /**
   * @type {HotelPhoto[]}
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

const hero = computed(() => getPhotoUrl(current.value?.url, PHOTO_SIZE.large));

// The supplier only fills hd_url for some photos, and it carries the same placeholder.
const full = computed(() => getPhotoUrl(current.value?.hdUrl ?? current.value?.url, PHOTO_SIZE.large));

const caption = computed(() => current.value?.caption ?? null);

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

function onKeydown(event) {
  if (event.key === 'ArrowRight') {
    step(1);
  }

  if (event.key === 'ArrowLeft') {
    step(-1);
  }
}

// The dialog owns Escape, but not the arrows it is browsed with.
watch(isOpen, opened => {
  if (opened) {
    window.addEventListener('keydown', onKeydown);

    return;
  }

  window.removeEventListener('keydown', onKeydown);
});

onUnmounted(() => window.removeEventListener('keydown', onKeydown));

function tile(photo, size = PHOTO_SIZE.card) {
  return getPhotoUrl(photo.url, size);
}
</script>

<template>
  <section>
    <!-- No Photo -->
    <div v-if="!photos.length" class="flex h-64 flex-col items-center justify-center gap-2 rounded-3xl bg-gradient-to-br from-gray-100 to-gray-200">
      <BuildingOffice2Icon class="size-10 text-gray-400" aria-hidden="true" />
      <p class="text-sm text-gray-500">No photos of this property yet</p>
    </div>
    <!-- Mosaic, the first photo leading four smaller ones -->
    <div v-else-if="isMosaic" class="relative">
      <div class="grid h-72 grid-cols-1 grid-rows-1 gap-2 overflow-hidden rounded-3xl sm:h-96 sm:grid-cols-4 sm:grid-rows-2">
        <button
            type="button"
            @click="open(0)"
            class="group relative cursor-pointer overflow-hidden bg-gray-100 focus-visible:outline-0 sm:col-span-2 sm:row-span-2"
            aria-label="Open photo 1"
        >
          <img :src="tile(lead, PHOTO_SIZE.large)" :alt="lead.caption ?? name" class="size-full object-cover transition duration-500 group-hover:scale-105">
        </button>
        <button
            v-for="(photo, position) in secondary"
            :key="photo.id"
            type="button"
            @click="open(position + 1)"
            class="group relative hidden cursor-pointer overflow-hidden bg-gray-100 focus-visible:outline-0 sm:block"
            :aria-label="`Open photo ${position + 2}`"
        >
          <img :src="tile(photo)" :alt="photo.caption ?? ''" class="size-full object-cover transition duration-500 group-hover:scale-105" loading="lazy">
        </button>
      </div>
      <button
          type="button"
          @click="open(0)"
          class="absolute right-4 bottom-4 flex cursor-pointer items-center gap-2 rounded-xl bg-white/95 px-3.5 py-2 text-xs font-semibold text-gray-900 shadow-lg ring-1 ring-black/5 backdrop-blur transition hover:bg-white focus-visible:outline-0"
      >
        <Squares2X2Icon class="size-4" aria-hidden="true" />
        Show all {{ photos.length }} photos
      </button>
    </div>
    <!-- One frame, browsed in place -->
    <div v-else class="group relative h-72 overflow-hidden rounded-3xl bg-gray-100 sm:h-96">
      <img v-if="hero" :src="hero" :alt="caption ?? name" class="size-full cursor-pointer object-cover" @click="isOpen = true">
      <template v-if="photos.length > 1">
        <button
            type="button"
            @click="step(-1)"
            class="absolute top-1/2 left-3 flex size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/90 text-gray-700 shadow-md transition hover:bg-white hover:text-gray-900 focus-visible:outline-0"
            aria-label="Previous photo"
        >
          <ChevronLeftIcon class="size-5" aria-hidden="true" />
        </button>
        <button
            type="button"
            @click="step(1)"
            class="absolute top-1/2 right-3 flex size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/90 text-gray-700 shadow-md transition hover:bg-white hover:text-gray-900 focus-visible:outline-0"
            aria-label="Next photo"
        >
          <ChevronRightIcon class="size-5" aria-hidden="true" />
        </button>
      </template>
      <span class="absolute bottom-4 left-4 rounded-lg bg-black/50 px-2.5 py-1 text-xs font-medium text-white tabular-nums backdrop-blur">{{ index + 1 }} / {{ photos.length }}</span>
    </div>
    <!-- Lightbox -->
    <Dialog :open="isOpen" @close="isOpen = false" class="relative z-50">
      <div class="fixed inset-0 bg-gray-950/90 backdrop-blur-sm" aria-hidden="true" />
      <div class="fixed inset-0 flex flex-col items-center justify-center gap-4 p-4 sm:p-8">
        <DialogPanel class="flex w-full max-w-6xl flex-col items-center gap-4">
          <DialogTitle class="sr-only">{{ name }} photos</DialogTitle>
          <div class="relative w-full">
            <img v-if="full" :src="full" :alt="caption ?? name" class="max-h-[70vh] w-full rounded-2xl object-contain">
            <template v-if="photos.length > 1">
              <button
                  type="button"
                  @click="step(-1)"
                  class="absolute top-1/2 left-2 flex size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/90 text-gray-900 shadow-lg transition hover:bg-white focus-visible:outline-0"
                  aria-label="Previous photo"
              >
                <ChevronLeftIcon class="size-5" aria-hidden="true" />
              </button>
              <button
                  type="button"
                  @click="step(1)"
                  class="absolute top-1/2 right-2 flex size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/90 text-gray-900 shadow-lg transition hover:bg-white focus-visible:outline-0"
                  aria-label="Next photo"
              >
                <ChevronRightIcon class="size-5" aria-hidden="true" />
              </button>
            </template>
          </div>
          <div class="flex w-full items-center justify-between gap-4">
            <p class="text-xs text-gray-400 tabular-nums">{{ index + 1 }} / {{ photos.length }}</p>
            <p v-if="caption" class="min-w-0 truncate text-sm text-gray-300">{{ caption }}</p>
          </div>
          <!-- Filmstrip -->
          <div v-if="photos.length > 1" class="flex w-full gap-2 overflow-x-auto pb-1">
            <button
                v-for="(photo, position) in photos"
                :key="photo.id"
                type="button"
                @click="index = position"
                :class="[
                  position === index ? 'ring-2 ring-white' : 'opacity-50 hover:opacity-100',
                  'h-14 w-20 shrink-0 cursor-pointer overflow-hidden rounded-lg bg-gray-800 transition focus-visible:outline-0',
                ]"
                :aria-label="`Photo ${position + 1}`"
            >
              <img :src="tile(photo, PHOTO_SIZE.thumbnail)" :alt="photo.caption ?? ''" class="size-full object-cover" loading="lazy">
            </button>
          </div>
        </DialogPanel>
      </div>
      <button
          type="button"
          @click="isOpen = false"
          class="fixed top-4 right-4 flex size-10 cursor-pointer items-center justify-center rounded-full bg-white/90 text-gray-900 shadow-lg transition hover:bg-white focus-visible:outline-0"
          aria-label="Close photos"
      >
        <XMarkIcon class="size-5" aria-hidden="true" />
      </button>
    </Dialog>
  </section>
</template>
