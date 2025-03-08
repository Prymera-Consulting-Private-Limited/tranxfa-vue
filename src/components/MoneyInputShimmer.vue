<template>
  <div class="flex items-center rounded-md outline-2 outline-gray-300 bg-white">
    <div class="h-12 pulse rounded-md bg-gray-300 w-full"></div>
  </div>
</template>
<style scoped>
@keyframes heartbeat-opacity {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.pulse {
  animation: heartbeat-opacity 1.5s infinite ease-in-out;
}
</style>
<script setup>
</script>