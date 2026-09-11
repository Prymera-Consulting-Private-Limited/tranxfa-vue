<script setup>
import {computed, onMounted} from "vue";
import moment from "moment";
import {ExclamationTriangleIcon, InformationCircleIcon} from "@heroicons/vue/24/outline";
import {useServiceStatus} from "@/composables/service_status.js";

/**
 * The maintenance notice the Client API reference asks every client to show:
 * the window in force (operations' own wording, and when they expect to be
 * done) or the next one declared. Renders nothing while the service is
 * available and nothing is planned, and nothing at all when the deployment
 * has not turned the feature on.
 */
const {status, start} = useServiceStatus();

onMounted(start);

const when = (iso) => (iso ? moment(iso).format('ddd D MMM, h:mm A') : null);

const active = computed(() => status.activeWindow);
const upcoming = computed(() => status.upcomingWindow);

// A window that only stops internal work reports is_available true with an
// active window: the reference says not to block anyone then, so it is shown
// as information, not as a warning.
const activeIsBlocking = computed(() => active.value !== null && ! status.isAvailable);
</script>

<template>
  <div v-if="activeIsBlocking" role="alert" class="border-b border-warning-200 bg-warning-50">
    <div class="mx-auto flex max-w-7xl items-start gap-3 px-4 py-3 sm:px-6 lg:px-8">
      <ExclamationTriangleIcon class="mt-0.5 size-5 shrink-0 text-warning-600" aria-hidden="true" />
      <div class="text-sm/6 text-warning-800">
        <p class="font-semibold">{{ active.message || 'We are doing some maintenance right now.' }}</p>
        <p v-if="active.expectedToEndAt">We expect to be back around {{ when(active.expectedToEndAt) }}. We will check again for you.</p>
        <p v-else>We will check again for you shortly.</p>
      </div>
    </div>
  </div>
  <div v-else-if="upcoming" role="status" class="border-b border-info-200 bg-info-50">
    <div class="mx-auto flex max-w-7xl items-start gap-3 px-4 py-3 sm:px-6 lg:px-8">
      <InformationCircleIcon class="mt-0.5 size-5 shrink-0 text-info-600" aria-hidden="true" />
      <div class="text-sm/6 text-info-800">
        <p class="font-semibold">Planned maintenance{{ upcoming.startsAt ? ` from ${when(upcoming.startsAt)}` : '' }}{{ upcoming.expectedToEndAt ? ` until around ${when(upcoming.expectedToEndAt)}` : '' }}.</p>
        <p v-if="upcoming.message">{{ upcoming.message }}</p>
      </div>
    </div>
  </div>
</template>
