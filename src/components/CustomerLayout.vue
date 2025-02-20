<script setup>
import Header from "@/components/Header.vue";
import Sidebar from "@/components/Sidebar.vue";
</script>

<template>
  <Header />
  <main class="bg-gray-50 tracking-wider">
    <div class="container mx-auto flex">
      <Sidebar />
      <slot />
    </div>
  </main>
</template>
