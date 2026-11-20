<script setup>
/**
 * The cookie banner on app.xenvia.eu (SD-2059). The rules are in src/consent.js.
 *
 * The wording and choices are xenvia.eu's own. The one difference is that
 * "Solo esenciales" is a button the same size as "Aceptar todas", where the
 * website shows a small faint link. Spain's data protection authority expects
 * refusing to be as easy and as visible as accepting.
 */
import {ref} from 'vue';
import {ConsentLevel, chooseConsent, restoreConsent} from '@/consent.js';

// The page xenvia.eu's own banner links to.
const POLICY_URL = 'https://xenvia.eu/legal/cookies';

// Restoring runs once, as the app starts. A visitor who accepted within 90
// days gets the Pixel and Clarity back without being asked. The banner shows
// only when there is no choice to honour.
const open = ref(restoreConsent() === null);

function decide(level) {
  chooseConsent(level);
  open.value = false;
}
</script>

<template>
  <!-- z-10 keeps it under every dialog: the dialogs use z-10 or z-50 and are
       rendered after the app, so they paint over it. -->
  <section v-if="open" :aria-label="$t('cookies.label')" class="fixed inset-x-0 bottom-0 z-10 bg-gray-900 px-4 py-3 text-sm/6 text-white/80 shadow-lg sm:px-6 print:hidden">
    <div class="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p>
        {{ $t('cookies.message') }}
        <a :href="POLICY_URL" target="_blank" rel="noopener" class="text-white underline underline-offset-2 hover:text-white/90">{{ $t('cookies.readPolicy') }}</a>
      </p>
      <div class="flex shrink-0 gap-2">
        <button type="button" @click="decide(ConsentLevel.ESSENTIAL)" class="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl px-4 text-sm/6 font-semibold text-white ring-1 ring-white/40 ring-inset hover:bg-white/10 sm:flex-none">{{ $t('cookies.essentialOnly') }}</button>
        <button type="button" @click="decide(ConsentLevel.ALL)" class="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-brand-600 px-4 text-sm/6 font-semibold text-white hover:bg-brand-700 sm:flex-none">{{ $t('cookies.acceptAll') }}</button>
      </div>
    </div>
  </section>
</template>
