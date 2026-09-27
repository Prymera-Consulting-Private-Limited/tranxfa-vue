<template>
  <aside class="hidden md:block md:w-1/4 lg:w-1/5 xl:w-1/6 py-6 tracking-wider">
    <ul class="space-y-6">
      <li>
        <a href="javascript:" class="flex items-center text-brand-700 font-medium hover:text-brand-800">
          <i class="pi pi-home text-base mr-2"></i>{{ $t('account.dashboard') }}</a>
      </li>
      <li>
        <a href="javascript:" class="flex items-center text-gray-700 hover:text-brand-800">
          <i class="pi pi-list-check text-base mr-2"></i>{{ $t('account.yourTransfers') }}</a>
      </li>
      <li>
        <a href="javascript:" class="flex items-center text-gray-700 hover:text-brand-800">
          <i class="pi pi-users text-base mr-2"></i>{{ $t('recipient.yourRecipients') }}</a>
      </li>
      <li>
        <a href="javascript:" class="flex items-center text-gray-700 hover:text-brand-800">
          <i class="pi pi-shield text-base mr-2"></i>{{ $t('verification.verificationHeading') }}</a>
      </li>
      <li>
        <a href="javascript:" class="flex items-center text-gray-700 hover:text-brand-800">
          <i class="pi pi-cog text-base mr-2"></i>{{ $t('account.accountSettings') }}</a>
      </li>
      <li>
        <a href="javascript:" class="flex items-center text-gray-700 hover:text-brand-800">
          <i class="pi pi-power-off text-base mr-2"></i>{{ $t('account.logOut') }}</a>
      </li>
    </ul>
    <div class="mt-8">
      <button class="w-full bg-brand-700 text-white py-3.5 px-4 rounded-xl hover:bg-brand-800">{{ $t('calculator.sendMoney') }}</button>
    </div>
  </aside>
</template>
<script setup>
</script>