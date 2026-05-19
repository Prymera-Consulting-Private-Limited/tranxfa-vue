<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'

defineProps({
  collapsed: Boolean,
  mobileOpen: Boolean
})

const emit = defineEmits(['closeMobile'])

const router = useRouter()

function sendMoney() {
  router.push({ name: 'dashboard', hash: '#send-money' })
  emit('closeMobile')
}

/** Each item: `to` is a vue-router location; `name` is link label */
const navSections = [
  {
    id: 'core',
    label: 'Core',
    items: [
      { name: 'Dashboard', icon: 'pi pi-home', to: { name: 'dashboard' } },
      { name: 'Transfers', icon: 'pi pi-list-check', to: { name: 'transactions' } },
      { name: 'Recipients', icon: 'pi pi-users', to: { name: 'recipients' } },
      { name: 'Verification', icon: 'pi pi-shield', to: { name: 'accountVerification' } },
      { name: 'Rate Alerts', icon: 'pi pi-bell', to: { name: 'comingSoon', params: { feature: 'rate-alerts' } } },
      { name: 'Support', icon: 'pi pi-comments', to: { name: 'support' } },
    ],
  },
  {
    id: 'budget',
    label: 'Budget',
    items: [
      { name: 'Budgets', icon: 'pi pi-money-bill', to: { name: 'budgets' } },
    ],
  },
  {
    id: 'lifeStyle',
    label: 'Life Style',
    items: [
      { name: 'Flights', icon: 'pi pi-send', to: { name: 'comingSoon', params: { feature: 'flight' } } },
      { name: 'Hotels', icon: 'pi pi-building', to: { name: 'comingSoon', params: { feature: 'hotels' } } },
    ],
  },
  {
    id: 'accounts',
    label: 'Accounts',
    items: [
      { name: 'Accounts', icon: 'pi pi-user', to: { name: 'accounts' } },
      { name: 'Settings', icon: 'pi pi-cog', to: { name: 'settings' } },
    ],
  },
]

function itemClasses(isActive, collapsed) {
  return [
    'group flex items-center gap-3 rounded-lg text-sm font-medium transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
    collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5',
    isActive
      ? 'bg-brand-50 text-brand-900 shadow-sm ring-1 ring-brand-100'
      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
  ]
}

function sectionDividerClass(collapsed) {
  return collapsed ? 'mx-1.5 my-2 border-t border-gray-200' : 'mx-2 my-3 border-t border-gray-200'
}

function sectionHeadingClass(isFirst, collapsed) {
  if (collapsed) {
    return 'sr-only'
  }
  return [
    'px-3 pb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400',
    isFirst ? 'pt-0' : 'pt-2',
  ]
}

const mobileTitle = computed(() => 'Navigation')
</script>

<template>
  <!-- Desktop Sidebar -->
  <aside
    :class="[
      'fixed top-0 left-0 z-40 hidden h-screen flex-col border-r border-gray-200/90 bg-white shadow-sm transition-[width] duration-300 ease-out md:flex',
      collapsed ? 'w-20' : 'w-64',
    ]"
  >
    <div
      :class="[
        'flex items-center border-b border-gray-100',
        collapsed ? 'justify-center px-2 py-4' : 'px-4 py-4',
      ]"
    >
      <div class="flex min-h-9 w-full items-center" :class="collapsed ? 'justify-center' : ''">
        <img
          :src="collapsed ? '/fav.svg' : '/images/logo.png'"
          alt="Payvel"
          :class="[
            'object-contain transition-opacity duration-300',
            collapsed ? 'size-9' : 'h-12 w-auto max-w-[11rem]',
          ]"
        />
      </div>
    </div>

    <nav class="flex-1 overflow-y-auto px-2 py-3" aria-label="Main">
      <div
        v-for="(section, sIdx) in navSections"
        :key="section.id"
        class="min-w-0"
        role="group"
        :aria-label="section.label"
      >
        <div v-if="sIdx > 0" :class="sectionDividerClass(collapsed)" role="presentation" />

        <p :class="sectionHeadingClass(sIdx === 0, collapsed)">
          {{ section.label }}
        </p>

        <ul class="space-y-1">
          <li v-for="item in section.items" :key="`${section.id}-${item.name}`">
            <router-link
              v-slot="{ href, navigate, isActive }"
              :to="item.to"
              custom
            >
              <a
                :href="href"
                :title="collapsed ? item.name : undefined"
                @click="(e) => navigate(e)"
                :class="itemClasses(isActive, collapsed)"
              >
                <i
                  :class="[
                    item.icon,
                    'shrink-0 text-lg transition-transform duration-150',
                    isActive ? 'text-brand-700' : 'text-gray-500 group-hover:text-gray-700',
                  ]"
                  aria-hidden="true"
                />
                <span
                  v-if="!collapsed"
                  class="truncate"
                >{{ item.name }}</span>
              </a>
            </router-link>
          </li>
        </ul>
      </div>
    </nav>

    <div :class="['border-t border-gray-100', collapsed ? 'p-2' : 'p-3']">
      <button
        type="button"
        class="w-full rounded-lg bg-brand-700 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-500 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 active:scale-[0.98]"
        @click="sendMoney"
      >
        <span v-if="!collapsed" class="block truncate">Send Money</span>
        <span v-else class="text-lg leading-none" aria-hidden="true">💸</span>
        <span v-if="collapsed" class="sr-only">Send Money</span>
      </button>
    </div>
  </aside>

  <!-- Mobile drawer -->
  <teleport to="body">
    <div
      v-if="mobileOpen"
      class="fixed inset-0 z-50 md:hidden"
    >
      <div
        class="sidebar-mobile-overlay absolute inset-0 bg-gray-900/50 backdrop-blur-[2px]"
        @click="$emit('closeMobile')"
      />

      <aside
        class="sidebar-mobile-panel absolute left-0 top-0 flex h-full w-[min(20rem,88vw)] flex-col border-r border-gray-200 bg-white shadow-2xl outline-none"
        role="dialog"
        aria-modal="true"
        :aria-label="mobileTitle"
      >
          <div class="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <img src="/images/logo.png" alt="Payvel" class="h-9 w-auto max-w-[10rem] object-contain object-left" />
            <button
              type="button"
              class="inline-flex rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              aria-label="Close menu"
              @click="$emit('closeMobile')"
            >
              <span class="text-lg leading-none" aria-hidden="true">✕</span>
            </button>
          </div>

          <nav class="flex-1 overflow-y-auto px-3 py-3" aria-label="Mobile main">
            <div
              v-for="(section, sIdx) in navSections"
              :key="`m-${section.id}`"
              role="group"
              :aria-label="section.label"
            >
              <div v-if="sIdx > 0" class="mx-1 my-3 border-t border-gray-200" role="presentation" />

              <p :class="sectionHeadingClass(sIdx === 0, false)">
                {{ section.label }}
              </p>

              <ul class="space-y-1">
                <li v-for="item in section.items" :key="`m-${section.id}-${item.name}`">
                  <router-link
                    v-slot="{ href, navigate, isActive }"
                    :to="item.to"
                    custom
                  >
                    <a
                      :href="href"
                      @click="(e) => { navigate(e); $emit('closeMobile'); }"
                      :class="itemClasses(isActive, false)"
                    >
                      <i
                        :class="[
                          item.icon,
                          'shrink-0 text-lg',
                          isActive ? 'text-brand-700' : 'text-gray-500 group-hover:text-gray-700',
                        ]"
                        aria-hidden="true"
                      />
                      {{ item.name }}
                    </a>
                  </router-link>
                </li>
              </ul>
            </div>
          </nav>

          <div class="border-t border-gray-100 p-3">
            <button
              type="button"
              @click="sendMoney"
              class="w-full rounded-lg bg-brand-700 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
            >
              Send Money
            </button>
          </div>
        </aside>
    </div>
  </teleport>
</template>

<style scoped>
.sidebar-mobile-overlay {
  animation: sidebar-overlay-in 0.2s ease-out both;
}

.sidebar-mobile-panel {
  animation: sidebar-panel-in 0.28s cubic-bezier(0.32, 0.72, 0, 1) both;
}

@keyframes sidebar-overlay-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes sidebar-panel-in {
  from {
    opacity: 0;
    transform: translateX(-100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>
