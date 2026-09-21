<script setup>
import CustomerLayout from "@/components/CustomerLayout.vue";
import {
    ChatBubbleBottomCenterTextIcon,
    EnvelopeIcon,
    PhoneIcon
} from '@heroicons/vue/24/outline';

// The numbers and the address are brand data, not copy: they read the same in
// every language, and they are shown as well as dialled, so they are bound
// rather than spelled out twice in the markup.
const phoneNumber = "+393773847277";
const whatsappNumber = "+393773847277";
const email = "hola@xenvia.eu";

const phoneUrl = `tel:${phoneNumber}`;
const whatsappUrl = `https://wa.me/${whatsappNumber.replace(/\+/g, '')}`;
const emailUrl = `mailto:${email}`;
</script>

<template>
    <CustomerLayout>
        <main class="-mt-24 py-8">
            <div class="mx-auto max-w-3xl lg:max-w-7xl px-4 sm:px-6 lg:px-8">
                <div class="rounded-lg bg-white px-4 sm:px-6 lg:px-8 py-6">
                    <section aria-labelledby="support-section">
                        <h1 class="sr-only" id="support-section">{{ $t('support.title') }}</h1>
                        <div class="mb-6">
                            <h2 class="text-base font-semibold text-gray-900">{{ $t('support.heading') }}</h2>

                            <p class="mt-1 text-sm/6 text-gray-500">{{ $t('support.intro') }}
                            </p>
                        </div>
                        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
                            <!-- Call Support Card -->
                            <a :href="phoneUrl"
                                class="bg-white shadow-sm sm:rounded-lg border border-gray-200 p-4 flex flex-col h-full lg:px-6 lg:py-8 cursor-pointer hover:shadow-md transition">
                                <PhoneIcon class="h-7 w-7 text-blue-600 mb-2" />
                                <h3 class="text-base font-semibold text-gray-900">
                                    {{ $t('support.phone.title') }}
                                </h3>
                                <p class="mt-2 text-sm/6 text-gray-500 flex-grow mb-1">
                                    {{ $t('support.phone.body') }}
                                </p>
                                <span class="text-sm/6 text-gray-500 mb-3">
                                    {{ phoneNumber }}
                                </span>
                                <span
                                    class="mt-auto text-sm/6 inline-block font-semibold text-blue-600 hover:text-blue-500">
                                    {{ $t('support.phone.action') }} &rarr;
                                </span>
                            </a>

                            <!-- WhatsApp Card -->
                            <a :href="whatsappUrl" target="_blank"
                                class="bg-white shadow-sm sm:rounded-lg border border-gray-200 p-4 flex flex-col h-full lg:px-6 lg:py-8 cursor-pointer hover:shadow-md transition">
                                <ChatBubbleBottomCenterTextIcon class="h-7 w-7 text-whatsapp mb-2" />
                                <h3 class="text-base font-semibold text-gray-900">
                                    {{ $t('support.whatsapp.title') }}
                                </h3>
                                <p class="mt-2 text-sm/6 text-gray-500 flex-grow mb-3">
                                    {{ $t('support.whatsapp.body') }}
                                </p>
                                <span class="text-sm/6 text-gray-500 mb-3">
                                    {{ whatsappNumber }}
                                </span>
                                <span
                                    class="mt-auto text-sm/6 inline-block font-semibold text-whatsapp hover:text-whatsapp-hover">
                                    {{ $t('support.whatsapp.action') }} &rarr;
                                </span>
                            </a>

                            <!-- Email Card -->
                            <a :href="emailUrl"
                                class="bg-white shadow-sm sm:rounded-lg border border-gray-200 p-4 flex flex-col h-full lg:px-6 lg:py-8 cursor-pointer hover:shadow-md transition">
                                <EnvelopeIcon class="h-7 w-7 text-brand-600 mb-2" />
                                <h3 class="text-base font-semibold text-gray-900">
                                    {{ $t('support.email.title') }}
                                </h3>
                                <p class="mt-2 text-sm/6 text-gray-500 flex-grow mb-2">
                                    {{ $t('support.email.body') }}
                                </p>
                                <span class="text-sm/6 text-gray-500 mb-3">
                                    {{ email }}
                                </span>
                                <span
                                    class="mt-auto text-sm/6 inline-block font-semibold text-brand-700 hover:text-brand-800">
                                    {{ $t('support.email.action') }} &rarr;
                                </span>
                            </a>
                        </div>
                    </section>
                </div>
            </div>
        </main>
    </CustomerLayout>
</template>
