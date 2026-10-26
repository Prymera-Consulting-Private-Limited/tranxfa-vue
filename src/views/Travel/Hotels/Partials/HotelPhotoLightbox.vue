<script setup>
import {computed, onUnmounted, watch} from 'vue';
import {Dialog, DialogPanel, DialogTitle} from '@headlessui/vue';
import {ChevronLeftIcon, ChevronRightIcon, XMarkIcon} from '@heroicons/vue/24/outline';

const props = defineProps({
  /**
   * @type {Array<{thumbnail: string, card: string, large: string, xlarge: string}>}
   */
  photos: {
    type: Array,
    default: () => [],
  },

  /**
   * What the photos are of, the hotel or one of its rooms.
   */
  name: {
    type: String,
    default: null,
  },

  open: {
    type: Boolean,
    default: false,
  },

  /**
   * Shared with whatever opened it, so the photo browsed to here is still the
   * one on screen once the lightbox closes.
   */
  index: {
    type: Number,
    default: 0,
  },
});

const emit = defineEmits([
  'update:open',
  'update:index',
]);

const current = computed(() => props.photos[props.index] ?? null);

/**
 * @param {number} amount
 */
function step(amount) {
  if (props.photos.length < 2) {
    return;
  }

  // Wraps, so the arrows never dead-end on a long gallery.
  emit('update:index', (props.index + amount + props.photos.length) % props.photos.length);
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
watch(() => props.open, opened => {
  if (opened) {
    window.addEventListener('keydown', onKeydown);

    return;
  }

  window.removeEventListener('keydown', onKeydown);
});

onUnmounted(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
  <!-- Lightbox, which is where xlarge earns its place -->
  <Dialog :open="open" @close="emit('update:open', false)" class="relative z-50">
    <div class="fixed inset-0 bg-gray-950/90 backdrop-blur-sm" aria-hidden="true" />
    <div class="fixed inset-0 flex flex-col items-center justify-center gap-4 p-4 sm:p-8">
      <DialogPanel class="flex w-full max-w-6xl flex-col items-center gap-4">
        <DialogTitle class="sr-only">{{ $t('travel.hotelPhotos', {name: name}) }}</DialogTitle>
        <div class="relative w-full">
          <img v-if="current" :src="current.xlarge ?? current.large" :alt="name" class="max-h-[70vh] w-full rounded-2xl object-contain">
          <template v-if="photos.length > 1">
            <button
                type="button"
                @click="step(-1)"
                class="absolute top-1/2 left-2 flex size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/90 text-gray-900 shadow-lg transition hover:bg-white focus-visible:outline-0"
                :aria-label="$t('travel.previousPhoto')"
            >
              <ChevronLeftIcon class="size-5" aria-hidden="true" />
            </button>
            <button
                type="button"
                @click="step(1)"
                class="absolute top-1/2 right-2 flex size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/90 text-gray-900 shadow-lg transition hover:bg-white focus-visible:outline-0"
                :aria-label="$t('travel.nextPhoto')"
            >
              <ChevronRightIcon class="size-5" aria-hidden="true" />
            </button>
          </template>
        </div>
        <p class="w-full text-xs/5 text-gray-500 tabular-nums">{{ index + 1 }} / {{ photos.length }}</p>
        <!-- Filmstrip -->
        <div v-if="photos.length > 1" class="flex w-full gap-2 overflow-x-auto pb-1">
          <button
              v-for="(photo, position) in photos"
              :key="position"
              type="button"
              @click="emit('update:index', position)"
              :class="[
                position === index ? 'ring-2 ring-white' : 'opacity-50 hover:opacity-100',
                'h-14 w-20 shrink-0 cursor-pointer overflow-hidden rounded-lg bg-gray-800 transition focus-visible:outline-0',
              ]"
              :aria-label="$t('travel.photoNumber', {number: position + 1})"
          >
            <img :src="photo.thumbnail" alt="" class="size-full object-cover" loading="lazy">
          </button>
        </div>
      </DialogPanel>
    </div>
    <button
        type="button"
        @click="emit('update:open', false)"
        class="fixed top-4 right-4 flex size-10 cursor-pointer items-center justify-center rounded-full bg-white/90 text-gray-900 shadow-lg transition hover:bg-white focus-visible:outline-0"
        :aria-label="$t('travel.closePhotos')"
    >
      <XMarkIcon class="size-5" aria-hidden="true" />
    </button>
  </Dialog>
</template>
