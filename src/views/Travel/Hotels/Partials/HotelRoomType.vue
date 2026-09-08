<script setup>
const props = defineProps({
  /**
   * @type {HotelRate}
   */
  rate: {
    type: Object,
    required: true,
  },
});
</script>

<template>
  <div>
    <p class="text-xs font-medium tracking-wide text-gray-500 uppercase">Room</p>
    <h4 class="mt-1 font-medium text-gray-900">{{ rate.roomName }}</h4>
  </div>
</template>
