<!-- src/views/PlanningView.vue -->
<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { usePlanningStore } from "@/stores/planningStore";
import { useAccountStore } from "@/stores/accountStore";
import { useCategoryStore } from "@/stores/categoryStore";
import { useRecipientStore } from "@/stores/recipientStore";
import PlanningTransactionForm from "@/components/planning/PlanningTransactionForm.vue";
import {
  PlanningTransaction,
  TransactionType,
  RecurrencePattern,
} from "@/types";
import CurrencyDisplay from "@/components/ui/CurrencyDisplay.vue";
import SearchGroup from "@/components/ui/SearchGroup.vue";
import { formatDate } from "@/utils/formatters";
import { debugLog } from "@/utils/logger";

const planningStore = usePlanningStore();
const accountStore = useAccountStore();
const categoryStore = useCategoryStore();
const recipientStore = useRecipientStore();

const showNewPlanningModal = ref(false);
const showEditPlanningModal = ref(false);
const selectedPlanning = ref<PlanningTransaction | null>(null);
const searchQuery = ref("");

const planningTransactions = computed(() => {
  if (!searchQuery.value.trim()) {
    return planningStore.planningTransactions;
  }

  const term = searchQuery.value.toLowerCase();
  return planningStore.planningTransactions.filter((plan) => {
    return (
      plan.name?.toLowerCase().includes(term) ||
      recipientStore
        .getRecipientById(plan.recipientId || "")
        ?.name.toLowerCase()
        .includes(term) ||
      accountStore
        .getAccountById(plan.accountId)
        ?.name.toLowerCase()
        .includes(term) ||
      String(plan.amount).includes(term)
    );
  });
});

const upcomingTransactions = computed(() =>
  planningStore.getUpcomingTransactions(30)
);

// Füge nur neue Planungen hinzu, die in den nächsten 30 Tagen anstehen
const createPlanning = () => {
  selectedPlanning.value = null;
  showNewPlanningModal.value = true;
};

// Bearbeitung einer Planung
const editPlanning = (planning: PlanningTransaction) => {
  selectedPlanning.value = planning;
  showEditPlanningModal.value = true;
  debugLog("[PlanningView] Edit planning", planning);
};

// Speichern einer Planung
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
};

// Löschen einer Planung
const deletePlanning = (planning: PlanningTransaction) => {
  if (confirm("Möchten Sie diese geplante Transaktion wirklich löschen?")) {
    planningStore.deletePlanningTransaction(planning.id);
    debugLog("[PlanningView] Deleted planning", planning.id);
  }
};

// Ausführen einer Planung
const executePlanning = (planningId: string, date: string) => {
  planningStore.executePlanningTransaction(planningId, date);
  debugLog("[PlanningView] Executed planning", { planningId, date });
};

// Hilfsfunktion: Formatiert das Intervall menschenlesbar
function formatRecurrencePattern(pattern: RecurrencePattern): string {
  const patterns: Record<RecurrencePattern, string> = {
    [RecurrencePattern.ONCE]: "Einmalig",
    [RecurrencePattern.DAILY]: "Täglich",
    [RecurrencePattern.WEEKLY]: "Wöchentlich",
    [RecurrencePattern.BIWEEKLY]: "Alle 2 Wochen",
    [RecurrencePattern.MONTHLY]: "Monatlich",
    [RecurrencePattern.QUARTERLY]: "Vierteljährlich",
    [RecurrencePattern.YEARLY]: "Jährlich",
  };

  return patterns[pattern] || pattern;
}

// Hilfsfunktion: Gibt den Kontonamen aus
function getAccountName(accountId: string): string {
  return accountStore.getAccountById(accountId)?.name || "Unbekanntes Konto";
}

// Ausführung automatischer Planungen
function executeAutomatic() {
  const count = planningStore.executeAllDuePlanningTransactions();
  alert(`${count} automatische Planungsbuchungen ausgeführt.`);
}

// Automatische Planungen beim Laden prüfen
onMounted(() => {
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
        executeAutomatic();
      }
    }
  }
});
</script>

<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h2 class="text-xl font-bold">Geplante Transaktionen</h2>
      <div class="flex space-x-2">
        <button class="btn btn-outline" @click="executeAutomatic">
          <Icon icon="mdi:play-circle" class="mr-2" />
          Auto-Ausführen
        </button>
        <button class="btn btn-primary" @click="createPlanning">
          <Icon icon="mdi:plus" class="mr-2" />
          Neue Planung
        </button>
      </div>
    </div>

    <SearchGroup @search="(query) => (searchQuery = query)" />

    <!-- Tabelle der Planungen -->
    <div class="overflow-x-auto">
      <table class="table w-full">
        <thead>
          <tr>
            <th>Name</th>
            <th>Empfänger</th>
            <th>Konto</th>
            <th>Intervall</th>
            <th>Nächster Termin</th>
            <th class="text-right">Betrag</th>
            <th>Status</th>
            <th class="text-right">Aktionen</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="planning in planningTransactions" :key="planning.id">
            <td>
              {{ planning.name }}
              <span
                v-if="planning.transferToAccountId"
                class="text-xs text-base-content/60 ml-1"
              >
                (Transfer)
              </span>
            </td>
            <td>
              {{
                recipientStore.getRecipientById(planning.recipientId || "")
                  ?.name || "-"
              }}
            </td>
            <td>
              {{ getAccountName(planning.accountId) }}
              <span
                v-if="planning.transferToAccountId"
                class="text-xs text-base-content/60 ml-1"
              >
                → {{ getAccountName(planning.transferToAccountId) }}
              </span>
            </td>
            <td>{{ formatRecurrencePattern(planning.recurrencePattern) }}</td>
            <td>
              {{
                upcomingTransactions.find(
                  (t) => t.transaction.id === planning.id
                )?.date || planning.startDate
              }}
            </td>
            <td class="text-right">
              <CurrencyDisplay :amount="planning.amount" :show-zero="true" />
            </td>
            <td>
              <span
                class="badge"
                :class="planning.isActive ? 'badge-success' : 'badge-error'"
              >
                {{ planning.isActive ? "Aktiv" : "Inaktiv" }}
              </span>
              <span v-if="planning.autoExecute" class="badge badge-info ml-1">
                Auto
              </span>
            </td>
            <td class="text-right">
              <div class="flex justify-end space-x-1">
                <button
                  v-if="planning.isActive"
                  class="btn btn-ghost btn-xs border-none"
                  @click="
                    executePlanning(
                      planning.id,
                      new Date().toISOString().split('T')[0]
                    )
                  "
                >
                  <Icon icon="mdi:play" class="text-base text-success" />
                </button>
                <button
                  class="btn btn-ghost btn-xs border-none"
                  @click="editPlanning(planning)"
                >
                  <Icon icon="mdi:pencil" class="text-base" />
                </button>
                <button
                  class="btn btn-ghost btn-xs border-none text-error/75"
                  @click="deletePlanning(planning)"
                >
                  <Icon icon="mdi:trash-can" class="text-base" />
                </button>
              </div>
            </td>
          </tr>
          <!-- Leere Tabelle Hinweis -->
          <tr v-if="planningTransactions.length === 0">
            <td colspan="8" class="text-center py-4">
              Keine geplanten Transaktionen vorhanden. Erstellen Sie eine mit
              dem Button "Neue Planung".
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Geplante Transaktionen für die kommenden 30 Tage -->
    <div v-if="upcomingTransactions.length > 0" class="card bg-base-200 p-4">
      <h3 class="text-lg font-semibold mb-4">Anstehende Buchungen (30 Tage)</h3>
      <table class="table">
        <thead>
          <tr>
            <th>Datum</th>
            <th>Name</th>
            <th>Empfänger</th>
            <th>Konto</th>
            <th class="text-right">Betrag</th>
            <th class="text-right">Aktionen</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="entry in upcomingTransactions"
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
            <td class="text-right">
              <CurrencyDisplay
                :amount="entry.transaction.amount"
                :show-zero="true"
              />
            </td>
            <td class="text-right">
              <button
                class="btn btn-ghost btn-xs border-none"
                @click="executePlanning(entry.transaction.id, entry.date)"
              >
                <Icon icon="mdi:play" class="text-base text-success" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
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
