<script setup>
import {computed} from 'vue';
import {StarIcon} from "@heroicons/vue/24/solid";

const props = defineProps({
  stars: {
    type: Number,
    default: null,
  },
});

// An unrated hotel arrives as null, and apartments and guest houses have come
// back as 0-star, which is not a rating either.
const rating = computed(() => Math.round(props.stars ?? 0));
</script>

<template>
  <div v-if="rating" class="flex items-center gap-1.5">
    <div class="flex items-center gap-0.5">
      <StarIcon v-for="star in rating" :key="star" class="size-3.5 text-amber-400" aria-hidden="true" />
    </div>
    <span class="text-xs font-medium text-gray-500">{{ rating }}-star</span>
  </div>
</template>
