<script setup>
import CustomerLayout from "@/components/CustomerLayout.vue";
import { ChatBubbleBottomCenterTextIcon, EnvelopeIcon } from '@heroicons/vue/24/outline';

const whatsappNumber = "+34679605746"
const email = "support@nuvendrasl.com"
const whatsappUrl = `https://wa.me/${whatsappNumber.replace(/\+/g, '')}`;
const emailUrl = `mailto:${email}`;
</script>

<template>
  <CustomerLayout>
    <main class="-mt-24 py-8">
      <div class="mx-auto max-w-3xl lg:max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="rounded-lg bg-white px-4 sm:px-6 lg:px-8 py-6">
          
          <section aria-labelledby="support-section">
            <h1 class="sr-only" id="support-section">{{ $t('contact.heading') }}</h1>

            <div class="mb-6">
              <h2 class="text-base font-semibold text-gray-900">{{ $t('contact.title') }}</h2>
              <p class="mt-1 text-sm/6 text-gray-500">{{ $t('contact.intro') }}</p>
            </div>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2 lg:gap-8 max-w-2xl">

              <!-- WhatsApp Card -->
              <a :href="whatsappUrl" target="_blank" class="bg-white shadow-sm sm:rounded-lg border border-gray-200 p-4 flex flex-col h-full lg:px-6 lg:py-8 cursor-pointer hover:shadow-md transition">
                <ChatBubbleBottomCenterTextIcon class="h-7 w-7 text-green-600 mb-2" />
                <h3 class="text-base font-semibold text-gray-900">{{ $t('contact.whatsAppTitle') }}</h3>
                <p class="mt-2 text-sm/6 text-gray-500 flex-grow mb-3">
                  {{ $t('contact.whatsAppBody') }}
                </p>
                <span class="mt-auto text-sm/6 inline-block font-semibold text-brand-700 hover:text-brand-800">
                  {{ $t('contact.whatsAppAction') }}
                </span>
              </a>

              <!-- Email Card -->
              <a :href="emailUrl" class="bg-white shadow-sm sm:rounded-lg border border-gray-200 p-4 flex flex-col h-full lg:px-6 lg:py-8 cursor-pointer hover:shadow-md transition">
                <EnvelopeIcon class="h-7 w-7 text-brand-600 mb-2" />
                <h3 class="text-base font-semibold text-gray-900">{{ $t('contact.emailTitle') }}</h3>
                <p class="mt-2 text-sm/6 text-gray-500 flex-grow mb-3">
                  {{ $t('contact.emailBody') }}
                </p>
                <span class="mt-auto text-sm/6 inline-block font-semibold text-brand-700 hover:text-brand-800">
                  {{ $t('contact.emailAction') }}
                </span>
              </a>

            </div>
          </section>
        </div>
      </div>
    </main>
  </CustomerLayout>
</template>
