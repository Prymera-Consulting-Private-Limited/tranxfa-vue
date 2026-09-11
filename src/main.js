import 'web-streams-polyfill'

import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import {PUBLIC_ROUTES, redirectQueryFor} from "@/router/guards.js";
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
    config.headers['ngrok-skip-browser-warning'] = 'yes'

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
        router.push({ name: 'signIn', query: PUBLIC_ROUTES.has(current.name) ? {} : redirectQueryFor(current) });
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


