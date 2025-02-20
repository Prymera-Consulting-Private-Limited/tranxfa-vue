import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import axios from "axios";

const app = createApp(App)

app.use(createPinia())
app.use(router)

axios.defaults.baseURL = import.meta.env.VITE_APP_BASE_URL
axios.interceptors.request.use((config) => {
    config.headers['Accept'] = 'application/json'
    config.headers['X-App-User'] = import.meta.env.VITE_APP_USERNAME
    config.headers['X-App-Password'] = import.meta.env.VITE_APP_PASSWORD
    config.headers['ngrok-skip-browser-warning'] = 'yes'

    return config;
})

axios.interceptors.response.use(null, function (e) {
    if (e.status === 401) {
        router.push('/');
    }
    throw e;
})

app.provide('axios', axios)

app.mount('#app')


