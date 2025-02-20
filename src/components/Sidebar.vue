<template>
  <aside class="hidden md:block w-1/4 py-6   shadow-[18px 0 12px -16px rgba(0,0,0,0.1)]">
    <ul class="space-y-6">
      <li>
        <a href="javascript:" class="flex items-center text-purple-700 font-medium hover:text-purple-700">
          <i class="pi pi-home text-base mr-2"></i>
          Dashboard
        </a>
      </li>
      <li>
        <a href="javascript:" class="flex items-center text-gray-700 hover:text-purple-700">
          <i class="pi pi-list-check text-base mr-2"></i>
          Your Transfers
        </a>
      </li>
      <li>
        <a href="javascript:" class="flex items-center text-gray-700 hover:text-purple-700">
          <i class="pi pi-users text-base mr-2"></i>
          Your Recipients
        </a>
      </li>
      <li>
        <a href="javascript:" class="flex items-center text-gray-700 hover:text-purple-700">
          <i class="pi pi-shield text-base mr-2"></i>
          Account Verification
        </a>
      </li>
      <li>
        <a href="javascript:" class="flex items-center text-gray-700 hover:text-purple-700">
          <i class="pi pi-cog text-base mr-2"></i>
          Account Settings
        </a>
      </li>
      <li>
        <a href="javascript:" class="flex items-center text-gray-700 hover:text-purple-700">
          <i class="pi pi-power-off text-base mr-2"></i>
          Log Out
        </a>
      </li>
    </ul>
    <div class="mt-8">
      <button class="w-full bg-purple-700 text-white py-2 px-4 rounded-[15px] hover:bg-purple-800">Send Money</button>
    </div>
  </aside>
</template>
<script setup>
</script>