<script setup>
import Header from "@/components/Header.vue";
import Sidebar from "@/components/Sidebar.vue";
</script>

<template>
  <Header />
  <main>
    <div class="container mx-auto flex">
      <Sidebar />
      <slot />
    </div>
  </main>
</template>
