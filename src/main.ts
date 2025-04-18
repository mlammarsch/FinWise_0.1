import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { createPinia } from 'pinia';
import './style.css';
import './daisyui.css';
import { seedData } from './mock/seed';
import { Icon } from '@iconify/vue';
import ApexCharts from 'apexcharts';

// Globale Flags für Statusverfolgung
window.__finwise_calculating_balances = false;
window.__finwise_direct_update = false;

const pinia = createPinia();
const app = createApp(App);

app.use(pinia);
app.use(router);

// Globale Registrierung von Iconify
app.component('Icon', Icon);

// ApexCharts global verfügbar machen
window.ApexCharts = ApexCharts;

seedData(pinia);

app.mount('#app');

// Setup für regelmäßige Aktualisierung der Prognosen
let updateTimer = null;

document.addEventListener('DOMContentLoaded', () => {
  // Cleanup vorheriger Timer
  if (updateTimer) {
    clearInterval(updateTimer);
  }

  // Überprüfe alle 24 Stunden, ob Prognosen aktualisiert werden müssen
  updateTimer = setInterval(() => {
    try {
      window.__finwise_direct_update = false;
      const { usePlanningStore } = require('./stores/planningStore');
      const planningStore = usePlanningStore();
      if (typeof planningStore.checkAndUpdateForecast === 'function') {
        planningStore.checkAndUpdateForecast();
      }
    } catch (error) {
      console.error("Failed to update forecasts:", error);
    }
  }, 24 * 60 * 60 * 1000);
});
