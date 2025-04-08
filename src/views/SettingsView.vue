<template>
  <div class="max-w-4xl mx-auto flex flex-col min-h-screen py-8 px-4">
    <!-- Header -->
    <div class="flex w-full justify-between items-center mb-6">
      <h2 class="text-xl font-bold">Einstellungen</h2>
    </div>

    <!-- Tabs -->
    <div class="tabs tabs-boxed mb-6">
      <a
        v-for="(tab, index) in tabs"
        :key="index"
        class="tab"
        :class="{ 'tab-active': activeTab === index }"
        @click="activeTab = index"
      >
        {{ tab }}
      </a>
    </div>

    <!-- Allgemeine Einstellungen -->
    <div v-if="activeTab === 0" class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <h2 class="card-title">Allgemeine Einstellungen</h2>

        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text">Design</span>
          </label>
          <select
            v-model="themeStore.currentTheme"
            class="select select-bordered w-full"
          >
            <option
              v-for="theme in availableThemes"
              :key="theme"
              :value="theme"
            >
              {{ themeNames[theme] || theme }}
            </option>
          </select>
        </div>

        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text">Standardwährung</span>
          </label>
          <select
            v-model="defaultCurrency"
            class="select select-bordered w-full"
            @change="saveDefaultCurrency"
          >
            <option value="EUR">Euro (€)</option>
            <option value="USD">US Dollar ($)</option>
            <option value="GBP">British Pound (£)</option>
            <option value="CHF">Schweizer Franken (CHF)</option>
          </select>
        </div>

        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text">Sicherheit</span>
          </label>
          <div class="form-control">
            <label class="label cursor-pointer justify-start">
              <input
                type="checkbox"
                v-model="securitySettings.autoLogout"
                class="checkbox checkbox-primary mr-2"
                @change="saveSecuritySettings"
              />
              <span class="label-text"
                >Automatisch nach 30 Minuten Inaktivität abmelden</span
              >
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- Entwickler-Einstellungen -->
    <div v-if="activeTab === 1" class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <h2 class="card-title">Entwickler-Einstellungen</h2>

        <!-- Logger-Einstellungen -->
        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text">Log-Level</span>
          </label>
          <select
            v-model="logLevel"
            class="select select-bordered"
            @change="saveLogSettings"
          >
            <option :value="LogLevel.DEBUG">DEBUG</option>
            <option :value="LogLevel.INFO">INFO</option>
            <option :value="LogLevel.WARN">WARN</option>
            <option :value="LogLevel.ERROR">ERROR</option>
          </select>
          <label class="label">
            <span class="label-text-alt"
              >Bestimmt die Detailtiefe der Protokollierung</span
            >
          </label>
        </div>

        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text">Aktivierte Logkategorien</span>
          </label>
          <div class="flex flex-wrap gap-2">
            <label
              class="label cursor-pointer inline-flex items-center gap-2"
              v-for="category in availableLogCategories"
              :key="category"
            >
              <input
                type="checkbox"
                class="checkbox checkbox-sm"
                :checked="enabledLogCategories.has(category)"
                @change="toggleLogCategory(category)"
              />
              <span class="label-text">{{ category }}</span>
            </label>
          </div>
        </div>

        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text">Debug-Modus</span>
          </label>
          <div class="form-control">
            <label class="label cursor-pointer justify-start">
              <input
                type="checkbox"
                v-model="developmentSettings.debugLogging"
                class="checkbox checkbox-primary mr-2"
                @change="saveDevelopmentSettings"
              />
              <span class="label-text">Debug-Logging aktivieren</span>
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- Daten & Testdaten -->
    <div v-if="activeTab === 2" class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <h2 class="card-title">Daten verwalten</h2>

        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text">Testdaten</span>
          </label>
          <div class="flex gap-2">
            <button class="btn btn-sm btn-outline" @click="seedTestData">
              Testdaten laden
            </button>
            <button
              class="btn btn-sm btn-outline btn-error"
              @click="confirmClearData"
            >
              Alle Daten löschen
            </button>
          </div>
        </div>

        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text">Daten Import/Export</span>
          </label>
          <div class="flex gap-2">
            <button class="btn btn-sm btn-outline" @click="exportData">
              <Icon icon="mdi:download" class="mr-2" />
              Daten exportieren
            </button>
            <div>
              <input
                type="file"
                ref="fileInput"
                class="hidden"
                accept=".json"
                @change="handleFileUpload"
              />
              <button
                class="btn btn-sm btn-outline"
                @click="$refs.fileInput.click()"
              >
                <Icon icon="mdi:upload" class="mr-2" />
                Daten importieren
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Transaktionshistorie -->
    <div v-if="activeTab === 3" class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <h2 class="card-title">Transaktionshistorie</h2>

        <div class="form-control mb-4">
          <label class="label">
            <span class="label-text">Aufbewahrungsdauer:</span>
          </label>
          <div class="flex items-center gap-2">
            <input
              type="number"
              v-model="historyRetentionDays"
              class="input input-bordered input-sm w-24"
              min="7"
              max="365"
              @change="saveLogSettings"
            />
            <span class="text-sm">Tage</span>
            <button
              class="btn btn-sm btn-outline ml-2"
              @click="historyManager.cleanupOldEntries()"
            >
              Bereinigen
            </button>
          </div>
        </div>

        <!-- Anzeige der Historieneinträge -->
        <div class="overflow-y-auto max-h-96 mt-4">
          <table class="table table-zebra w-full">
            <thead>
              <tr>
                <th>Zeitpunkt</th>
                <th>Level</th>
                <th>Kategorie</th>
                <th>Nachricht</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="entry in historyEntries" :key="entry.timestamp">
                <td>{{ new Date(entry.timestamp).toLocaleString("de-DE") }}</td>
                <td>{{ LogLevel[entry.level] }}</td>
                <td>{{ entry.category }}</td>
                <td>{{ entry.message }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="flex justify-end gap-2 mt-4">
          <button
            class="btn btn-outline btn-sm"
            @click="historyManager.clear()"
          >
            Historie löschen
          </button>
          <button
            class="btn btn-outline btn-sm"
            @click="refreshHistoryEntries()"
          >
            Aktualisieren
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Bestätigungs-Modal für Datenlöschung (wird nur angezeigt, wenn showConfirmModal=true) -->
  <template v-if="showConfirmModal">
    <ConfirmationModal
      title="Daten löschen"
      message="Sind Sie sicher, dass Sie alle Daten löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden."
      confirm-text="Ja, alle Daten löschen"
      cancel-text="Abbrechen"
      @confirm="clearData"
      @cancel="cancelDeleteData"
    />
  </template>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useThemeStore } from "../stores/themeStore";
import { seedData, clearData as clearAllData } from "../mock/seed";
import { Icon } from "@iconify/vue";
import { LogConfig, LogLevel, historyManager } from "../utils/logger";
import ConfirmationModal from "../components/ui/ConfirmationModal.vue";

const themeStore = useThemeStore();
const showConfirmModal = ref(false); // Initialisiere mit false
const defaultCurrency = ref("EUR");
const fileInput = ref<HTMLInputElement | null>(null);
const activeTab = ref(0);
const tabs = ["Allgemein", "Entwickler", "Daten", "Historie"];

// Sicherheitseinstellungen
const securitySettings = ref({
  autoLogout: false,
});

// Entwickler-Einstellungen
const developmentSettings = ref({
  debugLogging: false,
});

// Logger-Einstellungen
const logLevel = ref<LogLevel>(LogConfig.level);
const availableLogCategories = ref<string[]>([
  "store",
  "ui",
  "service",
  "calculation",
  "data",
  "system",
]);
const enabledLogCategories = ref<Set<string>>(
  new Set(LogConfig.enabledCategories)
);
const historyRetentionDays = ref<number>(LogConfig.historyRetentionDays);
const historyEntries = ref<any[]>([]);

// Verfügbare Themes
const availableThemes = [
  "light",
  "dark",
  "cupcake",
  "bumblebee",
  "emerald",
  "corporate",
  "synthwave",
  "retro",
  "cyberpunk",
  "valentine",
  "halloween",
  "garden",
  "forest",
  "aqua",
  "lofi",
  "pastel",
  "fantasy",
  "wireframe",
  "black",
  "luxury",
  "dracula",
  "cmyk",
  "autumn",
  "business",
  "acid",
  "lemonade",
  "night",
  "coffee",
  "winter",
];

// Benutzerfreundliche Themanamen
const themeNames: Record<string, string> = {
  light: "Hell",
  dark: "Dunkel",
  cupcake: "Cupcake",
  bumblebee: "Hummel",
  emerald: "Smaragd",
  corporate: "Business",
  synthwave: "Synthwave",
  retro: "Retro",
  cyberpunk: "Cyberpunk",
  valentine: "Valentine",
  halloween: "Halloween",
  garden: "Garten",
  forest: "Wald",
  aqua: "Aqua",
  lofi: "Lo-Fi",
  pastel: "Pastell",
  fantasy: "Fantasy",
  wireframe: "Wireframe",
  black: "Schwarz",
  luxury: "Luxus",
  dracula: "Dracula",
  cmyk: "CMYK",
  autumn: "Herbst",
  business: "Geschäftlich",
  acid: "Acid",
  lemonade: "Limonade",
  night: "Nacht",
  coffee: "Kaffee",
  winter: "Winter",
};

onMounted(() => {
  // Lade gespeicherte Einstellungen
  loadSettings();
  // Lade Historie-Einträge
  refreshHistoryEntries();
});

function refreshHistoryEntries() {
  historyEntries.value = historyManager
    .getEntries()
    .sort((a, b) => b.timestamp - a.timestamp); // Neueste zuerst
}

function loadSettings() {
  // Lade Währung
  const savedCurrency = localStorage.getItem("finwise_default_currency");
  if (savedCurrency) {
    defaultCurrency.value = savedCurrency;
  }

  // Lade Sicherheitseinstellungen
  const savedSecurity = localStorage.getItem("finwise_security_settings");
  if (savedSecurity) {
    try {
      securitySettings.value = JSON.parse(savedSecurity);
    } catch (e) {
      console.error("Fehler beim Laden der Sicherheitseinstellungen:", e);
    }
  }

  // Lade Entwicklereinstellungen
  const savedDev = localStorage.getItem("finwise_development_settings");
  if (savedDev) {
    try {
      developmentSettings.value = JSON.parse(savedDev);
    } catch (e) {
      console.error("Fehler beim Laden der Entwicklereinstellungen:", e);
    }
  }

  // Lade Logger-Einstellungen
  try {
    if (localStorage.getItem("finwise_log_level")) {
      logLevel.value = parseInt(
        localStorage.getItem("finwise_log_level") || LogLevel.INFO.toString()
      );
    }

    if (localStorage.getItem("finwise_log_categories")) {
      const savedCategories = JSON.parse(
        localStorage.getItem("finwise_log_categories") || "[]"
      );
      enabledLogCategories.value = new Set<string>(savedCategories);
    }

    if (localStorage.getItem("finwise_history_retention_days")) {
      historyRetentionDays.value = parseInt(
        localStorage.getItem("finwise_history_retention_days") || "60"
      );
    }
  } catch (error) {
    console.error("Fehler beim Laden der Logger-Einstellungen:", error);
  }
}

function saveDefaultCurrency() {
  localStorage.setItem("finwise_default_currency", defaultCurrency.value);
}

function saveSecuritySettings() {
  localStorage.setItem(
    "finwise_security_settings",
    JSON.stringify(securitySettings.value)
  );
}

function saveDevelopmentSettings() {
  localStorage.setItem(
    "finwise_development_settings",
    JSON.stringify(developmentSettings.value)
  );
}

// Logger-Einstellungen speichern
function toggleLogCategory(category: string) {
  if (enabledLogCategories.value.has(category)) {
    enabledLogCategories.value.delete(category);
  } else {
    enabledLogCategories.value.add(category);
  }
  saveLogSettings();
}

function saveLogSettings() {
  // Speichere Log-Level
  LogConfig.level = logLevel.value;
  localStorage.setItem("finwise_log_level", logLevel.value.toString());

  // Speichere aktivierte Kategorien
  LogConfig.enabledCategories = new Set(enabledLogCategories.value);
  localStorage.setItem(
    "finwise_log_categories",
    JSON.stringify([...enabledLogCategories.value])
  );

  // Speichere Aufbewahrungsdauer
  LogConfig.historyRetentionDays = historyRetentionDays.value;
  localStorage.setItem(
    "finwise_history_retention_days",
    historyRetentionDays.value.toString()
  );

  // Bereinige veraltete Einträge
  historyManager.cleanupOldEntries();
}

function seedTestData() {
  seedData();
}

// Funktion zum Anzeigen des Bestätigungsdialogs
function confirmClearData() {
  showConfirmModal.value = true;
}

// Funktion für die Bestätigung der Datenlöschung
function clearData() {
  clearAllData();
  showConfirmModal.value = false;
}

// Funktion für den Abbruch der Datenlöschung
function cancelDeleteData() {
  showConfirmModal.value = false;
}

function exportData() {
  // Sammle alle Daten aus dem localStorage
  const data: Record<string, any> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("finwise_")) {
      try {
        data[key] = JSON.parse(localStorage.getItem(key) || "");
      } catch (e) {
        data[key] = localStorage.getItem(key);
      }
    }
  }

  // Erstelle Download-Link
  const dataStr = JSON.stringify(data, null, 2);
  const dataUri =
    "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

  const exportFileDefaultName = `finwise_backup_${
    new Date().toISOString().split("T")[0]
  }.json`;

  const linkElement = document.createElement("a");
  linkElement.setAttribute("href", dataUri);
  linkElement.setAttribute("download", exportFileDefaultName);
  linkElement.click();
  linkElement.remove();
}

function handleFileUpload(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;

  const file = input.files[0];
  const reader = new FileReader();

  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target?.result as string);

      // Daten in localStorage speichern
      for (const key in data) {
        if (key.startsWith("finwise_")) {
          localStorage.setItem(
            key,
            typeof data[key] === "string"
              ? data[key]
              : JSON.stringify(data[key])
          );
        }
      }

      alert("Daten erfolgreich importiert. Die Seite wird neu geladen.");
      location.reload();
    } catch (error) {
      console.error("Fehler beim Importieren der Daten:", error);
      alert("Fehler beim Importieren der Daten: " + (error as Error).message);
    }
  };

  reader.readAsText(file);
}
</script>
