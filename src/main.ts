import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { createPinia } from 'pinia';
import './style.css';
import './daisyui.css';
import { seedData } from './mock/seed';
import { Icon } from '@iconify/vue'; // Importiere Iconify

const pinia = createPinia();
const app = createApp(App);

app.use(pinia);
app.use(router);

// Globale Registrierung von Iconify
app.component('Icon', Icon);

seedData(pinia);

app.mount('#app');
