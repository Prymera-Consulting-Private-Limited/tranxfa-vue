<script setup>
import CustomerLayout from '@/components/CustomerLayout.vue'
import { PhoneIcon, EnvelopeIcon } from '@heroicons/vue/24/solid'

/** Digits only, country code included (e.g. 441234567890). Override via VITE_SUPPORT_WHATSAPP_NUMBER */
const whatsappNumber =
  import.meta.env.VITE_SUPPORT_WHATSAPP_NUMBER?.replace(/\D/g, '') || '611234567890'
const phoneDisplay = import.meta.env.VITE_SUPPORT_PHONE_DISPLAY || '+61 123 456 7890'
const phoneTel = import.meta.env.VITE_SUPPORT_PHONE_TEL || '+611234567890'
const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL || 'support@payvel.com'

const whatsappHref = `https://wa.me/${whatsappNumber}`
const mailtoHref = `mailto:${supportEmail}?subject=Payvel%20support%20request`

const channels = [
  {
    id: 'whatsapp',
    title: 'Chat on WhatsApp',
    description: 'Quick questions? Instant support on the go.',
    href: whatsappHref,
    external: true,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-700',
    glow: 'from-emerald-400/20',
    borderHover: 'hover:border-emerald-200/90',
  },
  {
    id: 'phone',
    title: 'Give Us a Call',
    description: 'Speak directly with our friendly team for immediate assistance.',
    href: `tel:${phoneTel.replace(/\s/g, '')}`,
    external: false,
    iconBg: 'bg-sky-100',
    iconColor: 'text-sky-600',
    glow: 'from-sky-400/20',
    borderHover: 'hover:border-sky-200/90',
  },
  {
    id: 'email',
    title: 'Send an Email',
    description: 'Perfect for detailed inquiries and support requests.',
    href: mailtoHref,
    external: false,
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
    glow: 'from-violet-400/20',
    borderHover: 'hover:border-violet-200/90',
  },
]
</script>

<template>
  <CustomerLayout>
    <main class="relative px-4 sm:px-6 lg:px-8">
      <div
        class=" max-w-full rounded-3xl border border-sky-100/80 bg-gradient-to-b from-brand-50/90 via-white to-white px-4 py-10 shadow-sm ring-1 ring-sky-100/60 sm:px-8 sm:py-12 lg:px-12 lg:py-14"
      >
        <div
          class="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl"
          aria-hidden="true"
        >
          
        </div>

        <div class="relative mx-auto max-w-3xl text-center">
          <h1 class="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            We’re Here
            <span class="text-brand-500">to Help</span>
          </h1>
          <p class="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-gray-600 sm:text-base">
            Questions? We’ve got answers. Whether it’s a quick query or a detailed request, our team
            is ready to assist you through the method that suits you best.
          </p>
        </div>

        <ul
          class="relative mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-5 sm:mt-12 sm:grid-cols-2 sm:gap-6 lg:mt-14 lg:grid-cols-3 lg:gap-8"
        >
          <li v-for="item in channels" :key="item.id">
            <a
              :href="item.href"
              :target="item.external ? '_blank' : undefined"
              :rel="item.external ? 'noopener noreferrer' : undefined"
              class="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200/90 bg-white p-6 shadow-sm outline-none transition duration-300 hover:-translate-y-1 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 sm:p-7"
              :class="item.borderHover"
            >
              <div
                class="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-0 blur-2xl transition duration-500 group-hover:opacity-100"
                :class="['bg-gradient-to-br', item.glow, 'to-transparent']"
                aria-hidden="true"
              />

              <div
                class="relative mb-5 inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full shadow-inner ring-1 ring-black/[0.04] transition duration-300 group-hover:scale-105"
                :class="item.iconBg"
              >
                <i
                  v-if="item.id === 'whatsapp'"
                  class="pi pi-whatsapp text-2xl"
                  :class="item.iconColor"
                  aria-hidden="true"
                />
                <PhoneIcon v-else-if="item.id === 'phone'" class="h-7 w-7" :class="item.iconColor" />
                <EnvelopeIcon v-else class="h-7 w-7" :class="item.iconColor" />
              </div>

              <h2 class="relative text-lg font-bold text-gray-900">
                {{ item.title }}
              </h2>
              <p class="relative mt-2 flex-grow text-sm leading-relaxed text-gray-600">
                {{ item.description }}
              </p>

              <span
                class="relative mt-5 inline-flex items-center gap-1 text-sm font-semibold text-sky-600 transition group-hover:gap-2"
              >
                <template v-if="item.id === 'whatsapp'">Open WhatsApp</template>
                <template v-else-if="item.id === 'phone'">{{ phoneDisplay }}</template>
                <template v-else>{{ supportEmail }}</template>
                <span aria-hidden="true">→</span>
              </span>
            </a>
          </li>
        </ul>
      </div>
    </main>
  </CustomerLayout>
</template>
