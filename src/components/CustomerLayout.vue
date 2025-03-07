<script setup>
import Footer from "@/components/Footer.vue";
import Header from "@/components/Header.vue";
</script>

<template>
  <div class="min-h-full">
    <Header />
    <slot />
    <Footer />
  </div>
</template>
