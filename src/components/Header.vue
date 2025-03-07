<template>
  <header class="bg-white p-4 tracking-wider">
    <div class="container mx-auto flex items-center justify-between overflow-x-auto">
      <!-- Logo -->
      <div class="flex items-center space-x-2">
        <a href="javascript:">
          <img src="/images/logo.png" alt="Tranxfa Logo" class="w-20">
        </a>
      </div>

      <!-- Profile Section / Burger Icon -->
      <div class="flex items-center space-x-4">
        <!-- Burger Icon (visible only on mobile) -->
        <button class="block md:hidden text-gray-800" id="menu-toggle">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
        </button>
      </div>
    </div>

    <nav class="fixed inset-y-0 left-0 bg-gray-100 w-64 transform -translate-x-full transition-transform duration-300 ease-in-out z-20 md:hidden min-h-screen">
      <ul class="p-6 space-y-4">
        <li>
          <a href="javascript:" class="flex items-center text-brand-700 font-medium hover:text-brand-700">
            <i class="pi pi-home text-base mr-2"></i>
            Dashboard
          </a>
        </li>
        <li>
          <a href="javascript:" class="flex items-center text-gray-700 font-medium hover:text-brand-700">
            <i class="pi pi-send text-base mr-2"></i>
            Send Money
          </a>
        </li>
        <li>
          <a href="javascript:" class="flex items-center text-gray-700 hover:text-brand-700">
            <i class="pi pi-list-check text-base mr-2"></i>
            Your Transfers
          </a>
        </li>
        <li>
          <a href="javascript:" class="flex items-center text-gray-700 hover:text-brand-700">
            <i class="pi pi-users text-base mr-2"></i>
            Your Recipients
          </a>
        </li>
        <li>
          <a href="javascript:" class="flex items-center text-gray-700 hover:text-brand-700">
            <i class="pi pi-shield text-base mr-2"></i>
            Account Verification
          </a>
        </li>
        <li>
          <a href="javascript:" class="flex items-center text-gray-700 hover:text-brand-700">
            <i class="pi pi-cog text-base mr-2"></i>
            Account Settings
          </a>
        </li>
        <li>
          <a href="javascript:" class="flex items-center text-gray-700">
            <i class="pi pi-power-off text-base mr-2"></i>
            Log Out
          </a>
        </li>
      </ul>
    </nav>
  </header>
</template>