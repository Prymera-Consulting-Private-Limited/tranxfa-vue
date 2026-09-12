<script setup>
defineEmits(['close']);
</script>

<template>
  <button
    type="button"
    class="absolute right-4 top-4 z-10 cursor-pointer text-gray-500 transition-colors hover:text-gray-600"
    aria-label="Cerrar"
    @click="$emit('close')"
  >
    <i class="pi pi-times text-2xl"></i>
  </button>
</template>
