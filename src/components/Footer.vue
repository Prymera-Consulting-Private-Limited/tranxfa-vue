<script setup>
const appName = import.meta.env.VITE_APP_NAME;
</script>

<template>
  <footer class="print:hidden">
    <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:max-w-7xl lg:px-8">
      <div class="border-t border-gray-200 py-8 text-center text-sm text-gray-500 sm:text-left"><span class="block sm:inline">&copy; 2025 {{ appName }}</span> <span class="block sm:inline">Powered by Tuhfapay</span></div>
    </div>
  </footer>
</template>