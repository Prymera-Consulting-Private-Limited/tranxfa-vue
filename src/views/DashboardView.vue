<script setup>
import CustomerLayout from "@/components/CustomerLayout.vue";
import { ArrowRightIcon, PaperAirplaneIcon } from '@heroicons/vue/20/solid'

const people = [
  {
    name: 'Leslie Alexander',
    email: 'leslie.alexander@example.com',
    role: 'Co-Founder / CEO',
    imageUrl:
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    lastSeen: '3h ago',
    lastSeenDateTime: '2023-01-23T13:23Z',
  },
  {
    name: 'Michael Foster',
    email: 'michael.foster@example.com',
    role: 'Co-Founder / CTO',
    imageUrl:
        'https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    lastSeen: '3h ago',
    lastSeenDateTime: '2023-01-23T13:23Z',
  },
  {
    name: 'Dries Vincent',
    email: 'dries.vincent@example.com',
    role: 'Business Relations',
    imageUrl:
        'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    lastSeen: null,
  },
  {
    name: 'Lindsay Walton',
    email: 'lindsay.walton@example.com',
    role: 'Front-end Developer',
    imageUrl:
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    lastSeen: '3h ago',
    lastSeenDateTime: '2023-01-23T13:23Z',
  },
  {
    name: 'Courtney Henry',
    email: 'courtney.henry@example.com',
    role: 'Designer',
    imageUrl:
        'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    lastSeen: '3h ago',
    lastSeenDateTime: '2023-01-23T13:23Z',
  },
  {
    name: 'Tom Cook',
    email: 'tom.cook@example.com',
    role: 'Director of Product',
    imageUrl:
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    lastSeen: null,
  },
]
</script>
<template>
  <CustomerLayout>
    <main class="-mt-24 pb-8">
      <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:max-w-7xl lg:px-8">
        <h1 class="sr-only">Dashboard</h1>
        <!-- Main 3 column grid -->
        <div class="grid grid-cols-1 items-start gap-4 lg:grid-cols-3 lg:gap-8">
          <!-- Left column -->
          <div class="grid grid-cols-1 gap-4 lg:col-span-2">
            <section aria-labelledby="section-1-title">
              <h2 class="sr-only" id="section-1-title">Section title</h2>
              <div class="overflow-hidden rounded-lg bg-white shadow-sm">
                <div class="p-6">
                  <h3 class="text-lg font-semibold text-gray-900">Welcome Dhruv!</h3>
                  <p class="mt-2 text-sm text-gray-500">Here’s what’s happening with your business today.</p>
                </div>
              </div>
            </section>
            <section aria-labelledby="section-2-title">
              <h2 class="sr-only" id="section-2-title">Section title</h2>
              <ul role="list" class="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3">
                <li v-for="person in people" :key="person.email" class="col-span-1 flex flex-col divide-y divide-gray-200 rounded-lg bg-white text-center shadow-sm">
                  <div class="flex flex-1 flex-col p-8">
                    <img class="mx-auto size-32 shrink-0 rounded-full" :src="person.imageUrl" alt="" />
                    <h3 class="mt-6 text-sm font-medium text-gray-900">{{ person.name }}</h3>
                    <dl class="mt-1 flex grow flex-col justify-between">
                      <dt class="sr-only">Title</dt>
                      <dd class="text-sm text-gray-500">{{ person.title }}</dd>
                      <dt class="sr-only">Role</dt>
                      <dd class="mt-3">
                        <span class="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-green-600/20 ring-inset">{{ person.role }}</span>
                      </dd>
                    </dl>
                  </div>
                  <div>
                    <div class="-mt-px flex divide-x divide-gray-200">
                      <div class="flex w-0 flex-1">
                        <a :href="`mailto:${person.email}`" class="relative -mr-px inline-flex w-0 flex-1 items-center justify-center gap-x-3 rounded-bl-lg border border-transparent py-4 text-sm font-semibold text-gray-700 hover:text-brand-700">
                          <ArrowRightIcon class="size-5" aria-hidden="true" />
                          View
                        </a>
                      </div>
                      <div class="-ml-px flex w-0 flex-1">
                        <a :href="`tel:${person.telephone}`" class="relative inline-flex w-0 flex-1 items-center justify-center gap-x-3 rounded-br-lg border border-transparent py-4 text-sm font-semibold text-gray-700 hover:text-brand-700">
                          <PaperAirplaneIcon class="size-5" aria-hidden="true" />
                          Repeat
                        </a>
                      </div>
                    </div>
                  </div>
                </li>
              </ul>
            </section>
          </div>

          <!-- Right column -->
          <div class="grid grid-cols-1 gap-4">
            <section aria-labelledby="section-2-title">
              <h2 class="sr-only" id="section-2-title">Section title</h2>
              <div class="overflow-hidden rounded-lg bg-white shadow-sm">
                <ul role="list" class="divide-y divide-gray-100">
                  <li v-for="person in people" :key="person.email" class="flex justify-between gap-x-6 py-5 px-6">
                    <div class="flex min-w-0 gap-x-4">
                      <img class="size-10 flex-none rounded-full bg-gray-50" :src="person.imageUrl" alt="" />
                      <div class="min-w-0 flex-auto">
                        <p class="text-sm/6 font-semibold text-gray-900">{{ person.name }}</p>
                        <p class="mt-0 truncate text-xs/5 text-gray-500">{{ person.email }}</p>
                      </div>
                    </div>
                    <div class="hidden shrink-0 sm:flex sm:flex-col sm:items-end">
                      <p v-if="person.lastSeen" class="mt-1 text-xs/5 text-gray-500">
                        Sent <time :datetime="person.lastSeenDateTime">{{ person.lastSeen }}</time>
                      </p>
                    </div>
                  </li>
                </ul>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>

  </CustomerLayout>
</template>