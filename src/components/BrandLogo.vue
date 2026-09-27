<script setup>
/**
 * The brand's logo, in one place.
 *
 * The asset path and the alt text used to be written out at every call site -
 * 20 of them across 15 files - which is why 13 of 14 brand branches carry
 * diffs in Header.vue and the auth views that have nothing to do with their
 * logic. Every one of those was a merge conflict on every port.
 *
 * Keep the file names: a brand replaces the images under public/images/ and
 * changes nothing here.
 */
defineProps({
    /**
     * `light` is the reversed logo for the brand-coloured header bar;
     * `default` is the full-colour one used on white.
     */
    variant: {
        type: String,
        required: false,
        default: 'default',
        validator: (value) => ['default', 'light'].includes(value),
    },
    /**
     * `auth` is the sign-in / onboarding size, `header` the navigation bar.
     * Spacing stays with the caller - pass mb-5, mx-auto or -ml-2 as classes.
     */
    size: {
        type: String,
        required: false,
        default: 'auth',
        validator: (value) => ['auth', 'header'].includes(value),
    },
});

const sources = {
    default: '/images/logo.png',
    light: '/images/logo-white.png',
};

// VeloxPays' logo is a near-square mark with the name stacked underneath, so
// at the default heights the name is unreadably small. Larger on every screen.
const sizes = {
    auth: 'max-h-16',
    header: 'h-16 w-auto',
};

// Falls back rather than rendering an empty alt: a brand that has not set
// VITE_APP_NAME still gets a usable accessible name.
const appName = import.meta.env.VITE_APP_NAME || 'RemitSo';
</script>

<template>
    <img :src="sources[variant]" :alt="appName" :class="sizes[size]" />
</template>
