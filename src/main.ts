import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { createPinia } from 'pinia';
import './style.css';
import './daisyui.css';
import { seedData } from './mock/seed';
import { Icon } from '@iconify/vue';
import ApexCharts from 'apexcharts';
import { useSettingsStore } from '@/stores/settingsStore'; // Settings-Store importieren
import { initializeLogger } from '@/utils/logger'; // Logger-Initialisierung importieren

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

// Settings laden (unmittelbar nach Pinia und VOR Logger!)
const settingsStore = useSettingsStore();
settingsStore.loadFromStorage();

// Logger initialisieren (mit geladenen Settings)
initializeLogger();

// Seed-Daten laden (erst danach, damit Logger läuft!)
seedData(pinia);

app.mount('#app');

// Setup für regelmäßige Aktualisierung der Prognosen
let updateTimer: number | null = null;

document.addEventListener('DOMContentLoaded', () => {
  if (updateTimer) {
    clearInterval(updateTimer);
  }

  updateTimer = window.setInterval(() => {
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
  }, 24 * 60 * 60 * 1000); // Alle 24h
});
