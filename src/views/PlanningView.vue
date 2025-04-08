<!-- src/views/PlanningView.vue -->
<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { usePlanningStore } from "@/stores/planningStore";
import { useAccountStore } from "@/stores/accountStore";
import { useCategoryStore } from "@/stores/categoryStore";
import { useRecipientStore } from "@/stores/recipientStore";
import { useMonthlyBalanceStore } from "@/stores/monthlyBalanceStore";
import PlanningTransactionForm from "@/components/planning/PlanningTransactionForm.vue";
import AccountForecastChart from "@/components/planning/AccountForecastChart.vue";
import CategoryForecastChart from "@/components/planning/CategoryForecastChart.vue";
import { PlanningTransaction } from "@/types";
import CurrencyDisplay from "@/components/ui/CurrencyDisplay.vue";
import SearchGroup from "@/components/ui/SearchGroup.vue";
import MonthSelector from "@/components/ui/MonthSelector.vue";
import PagingComponent from "@/components/ui/PagingComponent.vue";
import { formatDate } from "@/utils/formatters";
import { debugLog } from "@/utils/logger";

// Stores
const planningStore = usePlanningStore();
const accountStore = useAccountStore();
const categoryStore = useCategoryStore();
const recipientStore = useRecipientStore();
const monthlyBalanceStore = useMonthlyBalanceStore();

// UI-Status
const showNewPlanningModal = ref(false);
const showEditPlanningModal = ref(false);
const selectedPlanning = ref<PlanningTransaction | null>(null);
const searchQuery = ref("");
const currentPage = ref(1);
const itemsPerPage = ref(25);
const itemsPerPageOptions = [10, 20, 25, 50, 100, "all"];

// Filter und Zeitbereich
const dateRange = ref<{ start: string; end: string }>({
  start: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split("T")[0],
  end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
    .toISOString()
    .split("T")[0],
});

// Kontofilter
const selectedAccountId = ref("");

// Aktive Registerkarte
const activeTab = ref<"upcoming" | "accounts" | "categories">("upcoming");

// Für die Anzeige des letzten Updates
const lastUpdateDate = computed(() => {
  const timestamp = localStorage.getItem("finwise_last_forecast_update");
  return timestamp ? new Date(parseInt(timestamp)) : null;
});

// Hilfsfunktion: Formatiert Datum
function handleDateRangeUpdate(payload: { start: string; end: string }) {
  dateRange.value = payload;
  debugLog("[PlanningView] Date range updated", payload);
}

// Anstehende Transaktionen für den ausgewählten Zeitraum
const upcomingTransactionsInRange = computed(() => {
  const startDate = new Date(dateRange.value.start);
  const endDate = new Date(dateRange.value.end);

  // Berechne die Differenz in Tagen
  const diffTime = endDate.getTime() - startDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Hole alle Vorkommen im Zeitraum
  return planningStore.getUpcomingTransactions(diffDays + 1).filter((entry) => {
    const entryDate = new Date(entry.date);
    return entryDate >= startDate && entryDate <= endDate;
  });
});

// Gefilterte Transaktionen basierend auf Suche und Kontofilter
const filteredTransactions = computed(() => {
  let filtered = [...upcomingTransactionsInRange.value];

  // Nach Konto filtern
  if (selectedAccountId.value) {
    filtered = filtered.filter(
      (entry) => entry.transaction.accountId === selectedAccountId.value
    );
  }

  // Nach Suchbegriff filtern
  if (searchQuery.value.trim()) {
    const term = searchQuery.value.toLowerCase();
    filtered = filtered.filter((entry) => {
      const transaction = entry.transaction;
      return (
        transaction.name?.toLowerCase().includes(term) ||
        recipientStore
          .getRecipientById(transaction.recipientId || "")
          ?.name.toLowerCase()
          .includes(term) ||
        accountStore
          .getAccountById(transaction.accountId)
          ?.name.toLowerCase()
          .includes(term) ||
        String(transaction.amount).includes(term)
      );
    });
  }

  return filtered;
});

// Paginierte Transaktionen
const paginatedTransactions = computed(() => {
  if (itemsPerPage.value === "all") return filteredTransactions.value;

  const start = (currentPage.value - 1) * Number(itemsPerPage.value);
  return filteredTransactions.value.slice(
    start,
    start + Number(itemsPerPage.value)
  );
});

// Neue Planung erstellen
const createPlanning = () => {
  selectedPlanning.value = null;
  showNewPlanningModal.value = true;
};

// Planung bearbeiten
const editPlanning = (planning: PlanningTransaction) => {
  selectedPlanning.value = planning;
  showEditPlanningModal.value = true;
  debugLog("[PlanningView] Edit planning", planning);
};

// Planung speichern
const savePlanning = (data: any) => {
  if (selectedPlanning.value) {
    planningStore.updatePlanningTransaction(selectedPlanning.value.id, data);
    debugLog("[PlanningView] Updated planning", data);
  } else {
    planningStore.addPlanningTransaction(data);
    debugLog("[PlanningView] Added planning", data);
  }
  showNewPlanningModal.value = false;
  showEditPlanningModal.value = false;

  // Monatliche Saldos neu berechnen
  monthlyBalanceStore.calculateMonthlyBalances();
};

// Planung löschen
const deletePlanning = (planning: PlanningTransaction) => {
  if (confirm("Möchten Sie diese geplante Transaktion wirklich löschen?")) {
    planningStore.deletePlanningTransaction(planning.id);
    debugLog("[PlanningView] Deleted planning", planning.id);

    // Monatliche Saldos neu berechnen
    monthlyBalanceStore.calculateMonthlyBalances();
  }
};

// Planung ausführen
const executePlanning = (planningId: string, date: string) => {
  planningStore.executePlanningTransaction(planningId, date);
  debugLog("[PlanningView] Executed planning", { planningId, date });
};

// Hilfsfunktion: Gibt den Kontonamen zurück
function getAccountName(accountId: string): string {
  return accountStore.getAccountById(accountId)?.name || "Unbekanntes Konto";
}

// Filter zurücksetzen
function clearFilters() {
  selectedAccountId.value = "";
  searchQuery.value = "";
  currentPage.value = 1;
}

// Automatische Ausführung fälliger Planungen
function executeAutomaticTransactions() {
  const count = planningStore.executeAllDuePlanningTransactions();
  alert(`${count} automatische Planungsbuchungen ausgeführt.`);
}

// Funktion zum manuellen Aktualisieren der Prognosen
const updateForecasts = () => {
  if (planningStore.checkAndUpdateForecast) {
    planningStore.checkAndUpdateForecast();
    alert("Prognosen wurden aktualisiert.");
  } else {
    monthlyBalanceStore.calculateMonthlyBalances();
    alert("Monatliche Saldi wurden aktualisiert.");
  }
};

// Beim Laden: Prüfen auf automatische Planungen
onMounted(() => {
  // Monatliche Saldos berechnen
  monthlyBalanceStore.calculateMonthlyBalances();

  // Prüfen, ob heute automatische Planungen fällig sind
  const nextExecution = planningStore.getUpcomingTransactions(0);
  if (nextExecution.length > 0) {
    const autoExecutableCount = nextExecution.filter(
      (entry) => entry.transaction.autoExecute
    ).length;

    if (autoExecutableCount > 0) {
      const executeNow = confirm(
        `Es stehen ${autoExecutableCount} automatische Planungsbuchungen für heute an. Jetzt ausführen?`
      );
      if (executeNow) {
        executeAutomaticTransactions();
      }
    }
  }
});
</script>

<template>
  <div class="space-y-6">
    <!-- Kopfzeile mit Titel und Aktionen -->
    <div class="flex justify-between items-center">
      <h2 class="text-xl font-bold">Finanzplanung und Prognose</h2>
      <div class="flex items-center gap-3">
        <div class="text-sm opacity-70" v-if="lastUpdateDate">
          Prognosen aktualisiert am: {{ formatDate(lastUpdateDate) }}
        </div>
        <button
          class="btn btn-outline"
          @click="updateForecasts"
          title="Prognosen aktualisieren"
        >
          <Icon icon="mdi:refresh" class="mr-2" />
          Prognosen aktualisieren
        </button>
        <button class="btn btn-outline" @click="executeAutomaticTransactions">
          <Icon icon="mdi:play-circle" class="mr-2" />
          Auto-Ausführen
        </button>
      </div>
    </div>

    <!-- Filter und Zeitauswahl -->
    <div class="card bg-base-100 shadow-md border border-base-300 p-4">
      <div class="flex flex-wrap justify-between items-end gap-4">
        <div class="flex items-end gap-4">
          <div>
            <MonthSelector @update-daterange="handleDateRangeUpdate" />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text text-center opacity-50">Konto</span>
            </label>
            <select
              v-model="selectedAccountId"
              class="select select-sm select-bordered rounded-full"
              :class="
                selectedAccountId
                  ? 'border-2 border-accent'
                  : 'border border-base-300'
              "
            >
              <option value="">Alle Konten</option>
              <option
                v-for="acc in accountStore.activeAccounts"
                :key="acc.id"
                :value="acc.id"
              >
                {{ acc.name }}
              </option>
            </select>
          </div>

          <button
            class="btn btn-sm btn-ghost btn-circle self-end"
            @click="clearFilters"
          >
            <Icon icon="mdi:filter-off" class="text-xl" />
          </button>
        </div>

        <SearchGroup
          btnRight="Neue Planung"
          btnRightIcon="mdi:plus"
          @btn-right-click="createPlanning"
          @search="(query) => (searchQuery = query)"
        />
      </div>
    </div>

    <!-- Tabs für Navigation -->
    <div class="tabs tabs-boxed bg-base-200">
      <a
        class="tab"
        :class="{ 'tab-active': activeTab === 'upcoming' }"
        @click="activeTab = 'upcoming'"
      >
        <Icon icon="mdi:calendar-clock" class="mr-2" />
        Anstehende Buchungen
      </a>
      <a
        class="tab"
        :class="{ 'tab-active': activeTab === 'accounts' }"
        @click="activeTab = 'accounts'"
      >
        <Icon icon="mdi:chart-line" class="mr-2" />
        Kontenprognose
      </a>
      <a
        class="tab"
        :class="{ 'tab-active': activeTab === 'categories' }"
        @click="activeTab = 'categories'"
      >
        <Icon icon="mdi:chart-areaspline" class="mr-2" />
        Kategorienprognose
      </a>
    </div>

    <!-- Inhaltsbereich basierend auf aktiver Tab -->
    <div
      v-if="activeTab === 'upcoming'"
      class="card bg-base-100 shadow-md border border-base-300 p-4"
    >
      <!-- Tabelle der anstehenden Planungen -->
      <div class="overflow-x-auto">
        <table class="table w-full">
          <thead>
            <tr>
              <th>Datum</th>
              <th>Name</th>
              <th>Empfänger</th>
              <th>Konto</th>
              <th>Kategorie</th>
              <th class="text-right">Betrag</th>
              <th class="text-center">Status</th>
              <th class="text-right">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="entry in paginatedTransactions"
              :key="`${entry.transaction.id}-${entry.date}`"
            >
              <td>{{ formatDate(entry.date) }}</td>
              <td>{{ entry.transaction.name }}</td>
              <td>
                {{
                  recipientStore.getRecipientById(
                    entry.transaction.recipientId || ""
                  )?.name || "-"
                }}
              </td>
              <td>
                {{ getAccountName(entry.transaction.accountId) }}
                <span
                  v-if="entry.transaction.transferToAccountId"
                  class="text-xs text-base-content/60 ml-1"
                >
                  → {{ getAccountName(entry.transaction.transferToAccountId) }}
                </span>
              </td>
              <td>
                {{
                  entry.transaction.categoryId
                    ? categoryStore.getCategoryById(
                        entry.transaction.categoryId
                      )?.name || "-"
                    : "-"
                }}
              </td>
              <td class="text-right">
                <CurrencyDisplay
                  :amount="entry.transaction.amount"
                  :show-zero="true"
                />
              </td>
              <td class="text-center">
                <span
                  class="badge"
                  :class="
                    entry.transaction.isActive ? 'badge-success' : 'badge-error'
                  "
                >
                  {{ entry.transaction.isActive ? "Aktiv" : "Inaktiv" }}
                </span>
                <span
                  v-if="entry.transaction.autoExecute"
                  class="badge badge-info ml-1"
                >
                  Auto
                </span>
              </td>
              <td class="text-right">
                <div class="flex justify-end space-x-1">
                  <button
                    class="btn btn-ghost btn-xs border-none"
                    @click="executePlanning(entry.transaction.id, entry.date)"
                  >
                    <Icon icon="mdi:play" class="text-base text-success" />
                  </button>
                  <button
                    class="btn btn-ghost btn-xs border-none"
                    @click="editPlanning(entry.transaction)"
                  >
                    <Icon icon="mdi:pencil" class="text-base" />
                  </button>
                  <button
                    class="btn btn-ghost btn-xs border-none text-error/75"
                    @click="deletePlanning(entry.transaction)"
                  >
                    <Icon icon="mdi:trash-can" class="text-base" />
                  </button>
                </div>
              </td>
            </tr>
            <!-- Leere Tabelle Hinweis -->
            <tr v-if="paginatedTransactions.length === 0">
              <td colspan="8" class="text-center py-4">
                Keine anstehenden Transaktionen im ausgewählten Zeitraum.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Paginierung -->
      <PagingComponent
        v-model:currentPage="currentPage"
        v-model:itemsPerPage="itemsPerPage"
        :totalPages="
          itemsPerPage === 'all'
            ? 1
            : Math.ceil(filteredTransactions.length / Number(itemsPerPage))
        "
        :itemsPerPageOptions="itemsPerPageOptions"
      />
    </div>

    <!-- Kontenprognose -->
    <div
      v-if="activeTab === 'accounts'"
      class="card bg-base-100 shadow-md border border-base-300 p-4"
    >
      <AccountForecastChart
        :start-date="dateRange.start"
        :filtered-account-id="selectedAccountId"
      />
    </div>

    <!-- Kategorienprognose -->
    <div
      v-if="activeTab === 'categories'"
      class="card bg-base-100 shadow-md border border-base-300 p-4"
    >
      <CategoryForecastChart :start-date="dateRange.start" />
    </div>

    <!-- Modals -->
    <div v-if="showNewPlanningModal" class="modal modal-open">
      <div class="modal-box max-w-3xl">
        <h3 class="font-bold text-lg mb-4">Neue geplante Transaktion</h3>
        <PlanningTransactionForm
          @save="savePlanning"
          @cancel="showNewPlanningModal = false"
        />
      </div>
      <div
        class="modal-backdrop bg-black/30"
        @click="showNewPlanningModal = false"
      ></div>
    </div>

    <div
      v-if="showEditPlanningModal && selectedPlanning"
      class="modal modal-open"
    >
      <div class="modal-box max-w-3xl">
        <h3 class="font-bold text-lg mb-4">Geplante Transaktion bearbeiten</h3>
        <PlanningTransactionForm
          :transaction="selectedPlanning"
          :is-edit="true"
          @save="savePlanning"
          @cancel="showEditPlanningModal = false"
        />
      </div>
      <div
        class="modal-backdrop bg-black/30"
        @click="showEditPlanningModal = false"
      ></div>
    </div>
  </div>
</template>
