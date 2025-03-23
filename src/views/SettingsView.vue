<script setup>
import CustomerLayout from "@/components/CustomerLayout.vue";
import { UserIcon, HomeIcon, PhoneIcon, LockClosedIcon, DevicePhoneMobileIcon } from '@heroicons/vue/24/outline';
</script>

<template>
  <CustomerLayout>
    <main class="-mt-24 py-8">
      <div class="mx-auto max-w-3xl lg:max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="rounded-lg bg-white px-4 sm:px-6 lg:px-8 py-6">
          <section aria-labelledby="section-2-title">
            <h1 class="sr-only" id="section-2-title">Account Settings</h1>
            <div class="mb-6">
              <h2 class="text-base font-semibold text-gray-900">Account Settings</h2>
              <p class="mt-1 text-sm text-gray-500">Manage your personal details, security settings, and connected devices all in one place.</p>
            </div>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8 max-w-4xl">
              <div class="bg-white shadow-sm sm:rounded-lg border border-gray-200 p-4 flex flex-col h-full lg:px-6 lg:py-8">
                <UserIcon class="h-6 w-6 text-purple-600 mb-2" />
                <h3 class="text-base font-semibold text-gray-900">Personal Details</h3>
                <p class="mt-2 text-sm text-gray-500 flex-grow mb-3">View and update your name, email address, and other personal information.</p>
                <a href="#" class="mt-auto text-sm inline-block font-semibold text-purple-600 hover:text-purple-500">Modify &rarr;</a>
              </div>
              <div class="bg-white shadow-sm sm:rounded-lg border border-gray-200 p-4 flex flex-col h-full lg:px-6 lg:py-8">
                <HomeIcon class="h-6 w-6 text-purple-600 mb-2" />
                <h3 class="text-base font-semibold text-gray-900">Address</h3>
                <p class="mt-2 text-sm text-gray-500 flex-grow mb-3">Ensure your billing and shipping address details are up-to-date.</p>
                <a href="#" class="mt-auto text-sm inline-block font-semibold text-purple-600 hover:text-purple-500">Modify &rarr;</a>
              </div>
              <div class="bg-white shadow-sm sm:rounded-lg border border-gray-200 p-4 flex flex-col h-full lg:px-6 lg:py-8">
                <PhoneIcon class="h-6 w-6 text-purple-600 mb-2" />
                <h3 class="text-base font-semibold text-gray-900">Mobile Number</h3>
                <p class="mt-2 text-sm text-gray-500 flex-grow mb-3">Update your phone number for account recovery and notifications.</p>
                <a href="#" class="mt-auto text-sm inline-block font-semibold text-purple-600 hover:text-purple-500">Update &rarr;</a>
              </div>
              <div class="bg-white shadow-sm sm:rounded-lg border border-gray-200 p-4 flex flex-col h-full lg:px-6 lg:py-8">
                <LockClosedIcon class="h-6 w-6 text-purple-600 mb-2" />
                <h3 class="text-base font-semibold text-gray-900">Password</h3>
                <p class="mt-2 text-sm text-gray-500 flex-grow mb-3">Change your password to keep your account secure.</p>
                <a href="#" class="mt-auto text-sm inline-block font-semibold text-purple-600 hover:text-purple-500">Change Password &rarr;</a>
              </div>
              <div class="bg-white shadow-sm sm:rounded-lg border border-gray-200 p-4 flex flex-col h-full lg:px-6 lg:py-8">
                <DevicePhoneMobileIcon class="h-6 w-6 text-purple-600 mb-2" />
                <h3 class="text-base font-semibold text-gray-900">Devices</h3>
                <p class="mt-2 text-sm text-gray-500 flex-grow mb-3">Manage devices that have access to your account.</p>
                <a href="#" class="mt-auto text-sm inline-block font-semibold text-purple-600 hover:text-purple-500">Manage Devices &rarr;</a>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  </CustomerLayout>
</template>
