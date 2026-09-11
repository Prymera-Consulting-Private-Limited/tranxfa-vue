import 'web-streams-polyfill'

import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import {PUBLIC_ROUTES, redirectQueryFor} from "@/router/guards.js";
import {MFA_REQUIRED_TYPE} from "@/composables/checkout_safety.js";
import {installErrorHandling} from "@/error_handling.js";
import axios from "axios";

import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import NProgress from "nprogress";

const app = createApp(App)

app.use(createPinia())
app.use(router)
installErrorHandling(app, router)

axios.defaults.baseURL = import.meta.env.VITE_APP_BASE_URL
axios.defaults.withCredentials = true;
axios.defaults.withXSRFToken = true;
axios.interceptors.request.use((config) => {
    NProgress.start()
    config.headers['Accept'] = 'application/json'
    // Only a local API sits behind ngrok; in production the custom header
    // just widens every preflight for nothing.
    if (import.meta.env.VITE_APP_ENV === 'local') {
        config.headers['ngrok-skip-browser-warning'] = 'yes'
    }

    return config;
})

axios.interceptors.response.use((response) => {
    NProgress.done();

    return response;
}, function (e) {
    NProgress.done()
    const shouldSkipAuthRedirect = e.config?.skipAuthRedirect === true;
    if (e.status === 401 && ! shouldSkipAuthRedirect) {
        // A session that expires mid-task comes back to that task after
        // signing in again.
        const current = router.currentRoute.value;
        // Already on a public page (sign-in itself, say): keep the redirect it
        // was carrying rather than replacing it with nothing.
        const carried = typeof current.query?.redirect === 'string' ? {redirect: current.query.redirect} : {};
        router.push({ name: 'signIn', query: PUBLIC_ROUTES.has(current.name) ? carried : redirectQueryFor(current) });
    }
    // A session that lost its MFA trust mid-task: any endpoint can answer
    // 412 more_authentication_required. The MFA screen sends a fresh code
    // and brings the customer back to where they were; what they had typed
    // is the caller's to keep (the transfer wizard keeps a draft).
    const shouldSkipMfaRedirect = e.config?.skipMfaRedirect === true;
    if (e.response?.status === 412 && e.response?.data?.type === MFA_REQUIRED_TYPE && ! shouldSkipMfaRedirect) {
        const current = router.currentRoute.value;
        if (current.name !== 'multiFactorAuth') {
            router.push({ name: 'multiFactorAuth', query: { ...redirectQueryFor(current), reason: 'session' } });
        }
    }
    throw e;
})

app.provide('axios', axios)

app.mount('#app')

window.Pusher = Pusher;

const isLocal = import.meta.env.VITE_APP_ENV === 'local';

if (isLocal) {
    window.Echo = new Echo({
        broadcaster: 'reverb',
        key: import.meta.env?.VITE_REVERB_APP_KEY,
        wsHost: import.meta.env?.VITE_REVERB_HOST,
        wsPort: import.meta.env?.VITE_REVERB_PORT,
        wssPort: import.meta.env?.VITE_REVERB_PORT,
        forceTLS: (import.meta.env?.VITE_REVERB_SCHEME || 'https') === 'https',
        enabledTransports: ['ws', 'wss'],
        authEndpoint: import.meta.env?.VITE_REVERB_AUTH_URL,
        auth: {
            headers: {
                'X-Customer-Token': localStorage.getItem('customerSessionToken'),
            }
        }
    });
} else {
    window.Echo = new Echo({
        broadcaster: 'pusher',
        key: import.meta.env?.VITE_PUSHER_APP_KEY,
        host: import.meta.env?.VITE_PUSHER_HOST,
        cluster: import.meta.env?.VITE_PUSHER_APP_CLUSTER,
        forceTLS: true
    });
}


