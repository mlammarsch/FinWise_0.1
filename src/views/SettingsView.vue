<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useThemeStore } from "@/stores/themeStore";
import { useReconciliationStore } from "@/stores/reconciliationStore";
import { LogConfig, LogLevel, historyManager } from "@/utils/logger";
import { debugLog } from "@/utils/logger";

/**
 * Pfad zur Komponente: src/views/SettingsView.vue
 * Einstellungen der Anwendung.
 *
 * Komponenten-Props:
 * - Keine Props vorhanden
 *
 * Emits:
 * - Keine Emits vorhanden
 */

// State
const activeTab = ref("general");
const themeStore = useThemeStore();
const reconciliationStore = useReconciliationStore();
const defaultCurrency = ref("EUR");

// Logger Einstellungen
const logLevel = ref(LogConfig.level);
const logRetention = ref(LogConfig.historyRetentionDays);
const enabledLogCategories = ref(new Set([...LogConfig.enabledCategories]));

// History-Einträge für die Anzeige
const historyEntries = ref<any[]>([]);

// Formular-Status
const settingsSaved = ref(false);

// Mapping für Log-Level-Anzeige
const logLevelLabels = {
  [LogLevel.DEBUG]: "Debug",
  [LogLevel.INFO]: "Info",
  [LogLevel.WARN]: "Warnung",
  [LogLevel.ERROR]: "Fehler",
};

// Verfügbare Log-Kategorien zur Auswahl
const availableLogCategories = [
  { value: "store", label: "Datenspeicher" },
  { value: "ui", label: "Benutzeroberfläche" },
  { value: "service", label: "Dienste" },
  { value: "api", label: "API-Aufrufe" },
  { value: "import", label: "Importe" },
  { value: "export", label: "Exporte" },
];

// Datenimport/-export Demo-Funktionen
function handleFileImport(event: Event) {
  const fileInput = event.target as HTMLInputElement;
  if (fileInput.files && fileInput.files.length > 0) {
    alert(`Datei "${fileInput.files[0].name}" würde importiert werden.`);
    fileInput.value = ""; // Zurücksetzen
  }
}

function exportData() {
  const demoData = {
    exportDate: new Date().toISOString(),
    version: "1.0",
    data: {
      transactions: "...",
      accounts: "...",
      categories: "...",
    },
  };

  const dataStr =
    "data:text/json;charset=utf-8," +
    encodeURIComponent(JSON.stringify(demoData, null, 2));
  const downloadAnchorNode = document.createElement("a");
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", "finwise_export.json");
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}

// Logger-Einstellungen speichern
function saveLoggerSettings() {
  LogConfig.level = logLevel.value;
  LogConfig.historyRetentionDays = logRetention.value;
  LogConfig.enabledCategories = new Set([...enabledLogCategories.value]);
  settingsSaved.value = true;

  // Log-Eintrag für die Änderung
  debugLog(
    "[settings]",
    `Logger-Einstellungen aktualisiert: Level=${LogConfig.level}, Retention=${LogConfig.historyRetentionDays}`
  );

  setTimeout(() => {
    settingsSaved.value = false;
  }, 2000);
}

// Log-Tab aktivieren und History laden
function activateLogTab() {
  activeTab.value = "logs";
  loadHistory();
}

// Logdaten laden
function loadHistory() {
  historyEntries.value = historyManager
    .getEntries()
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 200);
}

// History löschen
function clearHistory() {
  if (confirm("Möchten Sie wirklich die gesamte Log-Historie löschen?")) {
    historyManager.clear();
    historyEntries.value = [];
  }
}

// Alte Einträge bereinigen
function cleanupHistory() {
  historyManager.cleanupOldEntries();
  loadHistory();
}

// Initialisieren
onMounted(() => {
  debugLog("[settings]", "SettingsView geladen");
  // Wir laden nicht sofort die History, sondern erst wenn der Tab aktiviert wird
});

// Formatierung der Zeitstempel
function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString("de-DE");
}

// Loglevelnamen formatieren
function getLogLevelName(level: LogLevel): string {
  return logLevelLabels[level] || `Level ${level}`;
}

// Daten exportieren für Logger Doku
function exportLoggerDocs() {
  const docs = `# Logger-Dokumentation für FinWise

## Verwendung des Logger-Moduls

\`\`\`typescript
// Importieren
import { debugLog, infoLog, warnLog, errorLog } from "@/utils/logger";

// Verwendung in Funktionen
function myFunction() {
  // Debug-Ausgabe (nur für Entwickler)
  debugLog("[modulName]", "Beschreibung", optionalesObjekt);

  // Info-Ausgabe (allgemeine Informationen)
  infoLog("[modulName]", "Beschreibung", optionalesObjekt);

  // Warnungs-Ausgabe (potenzielle Probleme)
  warnLog("[modulName]", "Beschreibung", optionalesObjekt);

  // Fehler-Ausgabe (schwerwiegende Probleme)
  errorLog("[modulName]", "Beschreibung", optionalesObjekt);
}
\`\`\`

## Log-Kategorien

Die folgenden Kategorien stehen zur Verfügung:
- \`store\`: Datenspeicher-Operationen (Hinzufügen, Aktualisieren, Löschen)
- \`ui\`: Benutzeroberflächen-Aktionen und Ereignisse
- \`service\`: Dienst-Operationen und Hintergrundprozesse
- \`api\`: API-Anfragen und Antworten
- \`import\`: Daten-Import-Prozesse
- \`export\`: Daten-Export-Prozesse

## Best Practices

1. Verwende immer eine konsistente Kategorie-Kennung im Format \`[kategorie]\`
2. Logge bei wichtigen Aktionen wie:
   - Hinzufügen von Objekten
   - Aktualisieren von Objekten
   - Löschen von Objekten
   - Laden von Daten
   - Wichtige Berechnungen
3. Füge relevante Daten als drittes Argument hinzu
4. Vermeide übermäßiges Logging in UI-Rendering-Zyklen

## Beispiele

\`\`\`typescript
// Transaktion hinzufügen
debugLog("[transactionStore]", "Transaktion hinzugefügt", { id: tx.id, amount: tx.amount });

// Fehler beim Laden von Daten
errorLog("[accountService]", "Fehler beim Laden der Konten", error);

// Benutzeraktion
debugLog("[ui]", "Benutzer hat Datei ausgewählt", { filename: file.name, size: file.size });
\`\`\`

## Aktivierung und Konfiguration

Die Logger-Konfiguration kann in den Einstellungen unter "Entwicklereinstellungen" angepasst werden:
1. Log-Level einstellen (Debug, Info, Warnung, Fehler)
2. Relevante Kategorien aktivieren
3. Aufbewahrungszeit für Logs festlegen
`;

  const dataStr =
    "data:text/markdown;charset=utf-8," + encodeURIComponent(docs);
  const downloadAnchorNode = document.createElement("a");
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", "logger_documentation.md");
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}
</script>

<template>
  <div class="container mx-auto py-8 max-w-4xl">
    <h1 class="text-2xl font-bold mb-6">Einstellungen</h1>

    <div class="tabs tabs-boxed mb-6">
      <a
        class="tab"
        :class="{ 'tab-active': activeTab === 'general' }"
        @click="activeTab = 'general'"
      >
        <Icon icon="mdi:cog" class="mr-2" />
        Allgemein
      </a>
      <a
        class="tab"
        :class="{ 'tab-active': activeTab === 'import-export' }"
        @click="activeTab = 'import-export'"
      >
        <Icon icon="mdi:database-import" class="mr-2" />
        Import / Export
      </a>
      <a
        class="tab"
        :class="{ 'tab-active': activeTab === 'developer' }"
        @click="activeTab = 'developer'"
      >
        <Icon icon="mdi:developer-board" class="mr-2" />
        Entwickler
      </a>
      <a
        class="tab"
        :class="{ 'tab-active': activeTab === 'logs' }"
        @click="activateLogTab"
      >
        <Icon icon="mdi:text-box-outline" class="mr-2" />
        Logs
      </a>
    </div>

    <!-- Allgemeine Einstellungen -->
    <div v-if="activeTab === 'general'" class="space-y-6">
      <!-- Allgemeine Einstellungen Card -->
      <div class="card bg-base-100 shadow-md border border-base-300">
        <div class="card-body">
          <h2 class="card-title">Design & Darstellung</h2>

          <!-- Theme Toggle -->
          <div class="form-control">
            <label class="label cursor-pointer">
              <div class="flex items-center space-x-2">
                <Icon icon="mdi:weather-night" class="text-lg" />
                <span class="label-text">Dunkles Design</span>
              </div>
              <input
                type="checkbox"
                class="toggle"
                :checked="themeStore.theme === 'dark'"
                @change="themeStore.toggleTheme()"
              />
            </label>
          </div>
        </div>
      </div>

      <!-- Kontoabstimmung Card -->
      <div class="card bg-base-100 shadow-md border border-base-300">
        <div class="card-body">
          <h2 class="card-title">Kontoabstimmung</h2>

          <div class="form-control">
            <label class="label cursor-pointer">
              <span class="label-text"
                >Automatisch bei Saldoabgleich markieren</span
              >
              <input
                type="checkbox"
                class="toggle"
                v-model="reconciliationStore.autoMarkAsReconciledOnBalanceMatch"
              />
            </label>
          </div>
        </div>
      </div>

      <!-- History-Legende -->
      <div class="card bg-base-100 shadow-md border border-base-300">
        <div class="card-body">
          <h2 class="card-title flex items-center gap-2 text-info">
            <Icon icon="mdi:information" class="text-xl" />
            History-Logging aktivieren
          </h2>
          <p>
            Damit die History-Logeinträge ordnungsgemäß befüllt werden, müssen
            Sie:
          </p>
          <ol class="list-decimal ml-6 space-y-2 mt-2">
            <li>
              Im Tab "Entwickler" ein Log-Level von mindestens "Debug" auswählen
            </li>
            <li>
              Die Kategorie "store" unter "Aktivierte Kategorien" aktivieren
            </li>
            <li>
              Bei Bedarf die Kategorie "service" für Dienstaufrufe aktivieren
            </li>
            <li>
              Eine angemessene Aufbewahrungszeit für die Logs festlegen (z.B. 60
              Tage)
            </li>
          </ol>
          <p class="mt-2">
            Die History dokumentiert automatisch jede Änderung an Transaktionen,
            Kategorien und Planungen, solange die oben genannten Einstellungen
            aktiviert sind.
          </p>
        </div>
      </div>
    </div>

    <!-- Import / Export -->
    <div v-if="activeTab === 'import-export'" class="space-y-6">
      <div class="card bg-base-100 shadow-md border border-base-300">
        <div class="card-body">
          <h2 class="card-title">Datenimport</h2>
          <p class="mb-4">
            Importieren Sie Daten aus einer Datei. Unterstützte Formate: JSON.
          </p>
          <label class="form-control w-full">
            <div class="label">
              <span class="label-text">JSON-Datei auswählen</span>
            </div>
            <input
              type="file"
              class="file-input file-input-bordered w-full"
              accept=".json"
              @change="handleFileImport"
            />
          </label>
        </div>
      </div>

      <div class="card bg-base-100 shadow-md border border-base-300">
        <div class="card-body">
          <h2 class="card-title">Datenexport</h2>
          <p class="mb-4">
            Exportieren Sie alle Ihre Daten in eine JSON-Datei zur Sicherung.
          </p>
          <button class="btn btn-primary w-full md:w-auto" @click="exportData">
            <Icon icon="mdi:download" class="mr-2" />
            Alle Daten exportieren
          </button>
        </div>
      </div>
    </div>

    <!-- Entwicklereinstellungen -->
    <div v-if="activeTab === 'developer'" class="space-y-6">
      <div class="card bg-base-100 shadow-md border border-base-300">
        <div class="card-body">
          <h2 class="card-title">Logger-Einstellungen</h2>

          <div class="form-control">
            <label class="label">
              <span class="label-text">Log-Level</span>
            </label>
            <select v-model="logLevel" class="select select-bordered w-full">
              <option :value="LogLevel.DEBUG">Debug (Alles)</option>
              <option :value="LogLevel.INFO">Info (ohne Debug)</option>
              <option :value="LogLevel.WARN">
                Warnung (nur Warnungen und Fehler)
              </option>
              <option :value="LogLevel.ERROR">Fehler (nur Fehler)</option>
            </select>
          </div>

          <div class="form-control mt-4">
            <label class="label">
              <span class="label-text">Aufbewahrungszeit (Tage)</span>
            </label>
            <input
              type="number"
              v-model.number="logRetention"
              min="1"
              max="365"
              class="input input-bordered w-full"
            />
          </div>

          <div class="form-control mt-4">
            <label class="label">
              <span class="label-text">Aktivierte Kategorien</span>
            </label>
            <div class="flex flex-wrap gap-2">
              <label
                v-for="category in availableLogCategories"
                :key="category.value"
                class="label cursor-pointer inline-flex items-center p-2 border rounded-lg"
                :class="
                  enabledLogCategories.has(category.value)
                    ? 'border-primary bg-primary/10'
                    : 'border-base-300'
                "
              >
                <span class="label-text mr-2">{{ category.label }}</span>
                <input
                  type="checkbox"
                  class="checkbox checkbox-primary checkbox-sm"
                  :checked="enabledLogCategories.has(category.value)"
                  @change="
                    (e) => {
                      if (e.target.checked) {
                        enabledLogCategories.add(category.value);
                      } else {
                        enabledLogCategories.delete(category.value);
                      }
                    }
                  "
                />
              </label>
            </div>
          </div>

          <div class="form-control mt-6 flex-row justify-between">
            <button class="btn btn-primary" @click="saveLoggerSettings">
              <Icon icon="mdi:content-save" class="mr-2" />
              Speichern
            </button>
            <button class="btn btn-outline" @click="exportLoggerDocs">
              <Icon icon="mdi:file-download" class="mr-2" />
              Logger-Dokumentation exportieren
            </button>
          </div>

          <div v-if="settingsSaved" class="alert alert-success mt-4">
            <Icon icon="mdi:check-circle" class="text-lg" />
            <span>Einstellungen gespeichert</span>
          </div>
        </div>
      </div>

      <!-- Logging-Kategorien Erklärung -->
      <div class="card bg-base-100 shadow-md border border-base-300">
        <div class="card-body">
          <h2 class="card-title flex items-center gap-2 text-info">
            <Icon icon="mdi:information" class="text-xl" />
            Logging-Kategorien erklärt
          </h2>
          <div class="overflow-x-auto">
            <table class="table table-zebra w-full">
              <thead>
                <tr>
                  <th>Kategorie</th>
                  <th>Beschreibung</th>
                  <th>Typische Ereignisse</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>store</code></td>
                  <td>Datenspeicher-Operationen</td>
                  <td>
                    Hinzufügen, Aktualisieren und Löschen von Objekten in Stores
                  </td>
                </tr>
                <tr>
                  <td><code>ui</code></td>
                  <td>Benutzeroberflächen-Aktionen</td>
                  <td>Benutzerinteraktionen, UI-Zustandsänderungen</td>
                </tr>
                <tr>
                  <td><code>service</code></td>
                  <td>Dienst-Operationen</td>
                  <td>Hintergrundprozesse, Berechnungen, Datenoperationen</td>
                </tr>
                <tr>
                  <td><code>api</code></td>
                  <td>API-Kommunikation</td>
                  <td>Externe API-Aufrufe, Antworten und Fehler</td>
                </tr>
                <tr>
                  <td><code>import</code></td>
                  <td>Datenimport-Prozesse</td>
                  <td>Datei-Importe, Daten-Parsing, Importfehler</td>
                </tr>
                <tr>
                  <td><code>export</code></td>
                  <td>Datenexport-Prozesse</td>
                  <td>Datei-Exporte, Daten-Serialisierung</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="mt-4">
            <strong>Hinweis:</strong> Die Kategorien sind bereits aktiv und
            werden genutzt, sobald Sie sie in den Logger-Einstellungen
            aktivieren und das entsprechende Log-Level auswählen.
          </p>
        </div>
      </div>
    </div>

    <!-- Logs & Historie -->
    <div v-if="activeTab === 'logs'" class="space-y-6">
      <div class="card bg-base-100 shadow-md border border-base-300">
        <div class="card-body">
          <div class="flex justify-between items-center mb-4">
            <h2 class="card-title">Logs & Änderungshistorie</h2>
            <div class="flex gap-2">
              <button class="btn btn-sm" @click="loadHistory">
                <Icon icon="mdi:refresh" class="mr-1" />
                Aktualisieren
              </button>
              <button
                class="btn btn-sm btn-outline btn-warning"
                @click="cleanupHistory"
              >
                <Icon icon="mdi:broom" class="mr-1" />
                Alte löschen
              </button>
              <button
                class="btn btn-sm btn-outline btn-error"
                @click="clearHistory"
              >
                <Icon icon="mdi:delete" class="mr-1" />
                Alle löschen
              </button>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="table table-zebra w-full">
              <thead>
                <tr>
                  <th>Zeitstempel</th>
                  <th>Level</th>
                  <th>Kategorie</th>
                  <th>Nachricht</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(entry, index) in historyEntries" :key="index">
                  <td>{{ formatTimestamp(entry.timestamp) }}</td>
                  <td>
                    <span
                      class="badge"
                      :class="{
                        'badge-info': entry.level === LogLevel.DEBUG,
                        'badge-success': entry.level === LogLevel.INFO,
                        'badge-warning': entry.level === LogLevel.WARN,
                        'badge-error': entry.level === LogLevel.ERROR,
                      }"
                    >
                      {{ getLogLevelName(entry.level) }}
                    </span>
                  </td>
                  <td>
                    <code>{{ entry.category }}</code>
                  </td>
                  <td>{{ entry.message }}</td>
                  <td>
                    <button
                      v-if="entry.data"
                      class="btn btn-ghost btn-xs"
                      @click="
                        () => {
                          alert(JSON.stringify(entry.data, null, 2));
                        }
                      "
                    >
                      <Icon icon="mdi:information-outline" />
                    </button>
                  </td>
                </tr>
                <tr v-if="historyEntries.length === 0">
                  <td colspan="5" class="text-center py-8">
                    <div class="flex flex-col items-center">
                      <Icon
                        icon="mdi:text-box-remove-outline"
                        class="text-4xl opacity-50 mb-2"
                      />
                      <span>Keine Log-Einträge vorhanden.</span>
                      <span class="text-sm opacity-75 mt-1">
                        Aktivieren Sie das Logging in den
                        Entwicklereinstellungen.
                      </span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
