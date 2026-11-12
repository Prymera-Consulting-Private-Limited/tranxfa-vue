<script setup>
const appName = import.meta.env.VITE_APP_NAME;

// The year came from whatever someone last typed into the message. It was 2025
// in September 2026 on one repository, and would have been wrong in the other
// every January.
const year = new Date().getFullYear();
</script>

<template>
  <footer class="print:hidden">
    <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:max-w-7xl lg:px-8">
      <div class="border-t border-gray-200 py-8 text-center text-sm/6 text-gray-500 sm:text-left"><span class="block sm:inline">{{ $t('account.copyright', {year: year, appName: appName}) }}</span> <span class="block sm:inline">{{ $t('account.poweredByRemitso') }}</span></div>
    </div>
  </footer>
</template>