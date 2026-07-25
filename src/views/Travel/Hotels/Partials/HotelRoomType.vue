<script setup>
import {computed} from 'vue';
import {prettifyLabel} from "@/composables/travel/hotels/hotel_utils.js";

const props = defineProps({
  rate: {
    type: Object,
    required: true,
  },
});

// room_name repeats every caveat in brackets; main_room_type is the clean form.
const name = computed(() => {
  return props.rate.roomDataTranslation?.mainRoomType || props.rate.roomName;
});

const features = computed(() => {
  const features = [];

  if (props.rate.roomDataTranslation?.beddingType) {
    features.push(prettifyLabel(props.rate.roomDataTranslation.beddingType));
  }

  if (props.rate.roomExtension?.capacity) {
    features.push(`Sleeps ${props.rate.roomExtension.capacity}`);
  }

  return features;
});
</script>

<template>
  <div>
    <p class="text-xs font-medium tracking-wide text-gray-400 uppercase">Room</p>
    <div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
      <h4 class="font-medium text-gray-900">{{ name }}</h4>
      <span v-for="feature in features" :key="feature" class="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">{{ feature }}</span>
    </div>
  </div>
</template>
