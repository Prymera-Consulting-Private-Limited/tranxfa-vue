<script setup>
import CustomerLayout from "@/components/CustomerLayout.vue";
import {
    ChatBubbleBottomCenterTextIcon,
    EnvelopeIcon,
    PhoneIcon
} from '@heroicons/vue/24/outline';

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
                        <h1 class="sr-only" id="support-section">Support</h1>
                        <div class="mb-6">
                            <h2 class="text-base font-semibold text-gray-900">Contactar con el soporte técnico</h2>

                            <p class="mt-1 text-sm text-gray-500">¿Necesitas ayuda? Contáctanos por WhatsApp o correo electrónico.
                            </p>
                        </div>
                        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
                            <!-- Call Support Card -->
                            <a :href="phoneUrl"
                                class="bg-white shadow-sm sm:rounded-lg border border-gray-200 p-4 flex flex-col h-full lg:px-6 lg:py-8 cursor-pointer hover:shadow-md transition">
                                <PhoneIcon class="h-7 w-7 text-blue-600 mb-2" />
                                <h3 class="text-base font-semibold text-gray-900">
                                    Llamar a soporte
                                </h3>
                                <p class="mt-2 text-sm text-gray-500 flex-grow mb-1">
                                    Hable directamente con nuestro equipo de soporte para recibir asistencia inmediata.
                                </p>
                                <span class="text-sm text-gray-500 mb-3">
                                    +393773847277
                                </span>
                                <span
                                    class="mt-auto text-sm inline-block font-semibold text-blue-600 hover:text-blue-500">
                                    Llame ahora →
                                </span>
                            </a>

                            <!-- WhatsApp Card -->
                            <a :href="whatsappUrl" target="_blank"
                                class="bg-white shadow-sm sm:rounded-lg border border-gray-200 p-4 flex flex-col h-full lg:px-6 lg:py-8 cursor-pointer hover:shadow-md transition">
                                <ChatBubbleBottomCenterTextIcon class="h-7 w-7 text-green-600 mb-2" />
                                <h3 class="text-base font-semibold text-gray-900">
                                    Chat de WhatsApp
                                </h3>
                                <p class="mt-2 text-sm text-gray-500 flex-grow mb-3">
                                    Chatea con nosotras al instante a través de WhatsApp.
                                </p>
                                <span class="text-sm text-gray-500 mb-3">
                                    +393773847277
                                </span>
                                <span
                                    class="mt-auto text-sm inline-block font-semibold text-green-600 hover:text-green-500">
                                    Chatear ahora →
                                </span>
                            </a>

                            <!-- Email Card -->
                            <a :href="emailUrl"
                                class="bg-white shadow-sm sm:rounded-lg border border-gray-200 p-4 flex flex-col h-full lg:px-6 lg:py-8 cursor-pointer hover:shadow-md transition">
                                <EnvelopeIcon class="h-7 w-7 text-brand-600 mb-2" />
                                <h3 class="text-base font-semibold text-gray-900">
                                    Soporte por correo electrónico
                                </h3>
                                <p class="mt-2 text-sm text-gray-500 flex-grow mb-2">
                                    Soporte por correo electrónico para consultas detalladas o problemas que no requieran asistencia inmediata.
                                </p>
                                <span class="text-sm text-gray-500 mb-3">
                                    hola@xenvia.eu
                                </span>
                                <span
                                    class="mt-auto text-sm inline-block font-semibold text-brand-600 hover:text-brand-500">
                                    Send Email →
                                </span>
                            </a>
                        </div>
                    </section>
                </div>
            </div>
        </main>
    </CustomerLayout>
</template>