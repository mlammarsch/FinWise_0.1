<!-- src/views/admin/AdminPlanningView.vue -->
<script setup lang="ts">
import { ref, computed } from "vue";
import { usePlanningStore } from "@/stores/planningStore";
import { useAccountStore } from "@/stores/accountStore";
import { useCategoryStore } from "@/stores/categoryStore";
import { useRecipientStore } from "@/stores/recipientStore";
import { PlanningTransaction, RecurrencePattern } from "@/types";
import CurrencyDisplay from "@/components/ui/CurrencyDisplay.vue";
import SearchGroup from "@/components/ui/SearchGroup.vue";
import PlanningTransactionForm from "@/components/planning/PlanningTransactionForm.vue";
import { debugLog } from "@/utils/logger";

const planningStore = usePlanningStore();
const accountStore = useAccountStore();
const categoryStore = useCategoryStore();
const recipientStore = useRecipientStore();

const showNewPlanningModal = ref(false);
const showEditPlanningModal = ref(false);
const selectedPlanning = ref<PlanningTransaction | null>(null);
const searchQuery = ref("");

// Gefilterte Planungen
const filteredPlannings = computed(() => {
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

// Neue Planung erstellen
const createPlanning = () => {
  selectedPlanning.value = null;
  showNewPlanningModal.value = true;
};

// Planung bearbeiten
const editPlanning = (planning: PlanningTransaction) => {
  selectedPlanning.value = planning;
  showEditPlanningModal.value = true;
  debugLog("[AdminPlanningView] Edit planning", planning);
};

// Planung speichern
const savePlanning = (data: any) => {
  if (selectedPlanning.value) {
    planningStore.updatePlanningTransaction(selectedPlanning.value.id, data);
    debugLog("[AdminPlanningView] Updated planning", data);
  } else {
    planningStore.addPlanningTransaction(data);
    debugLog("[AdminPlanningView] Added planning", data);
  }
  showNewPlanningModal.value = false;
  showEditPlanningModal.value = false;
};

// Planung löschen
const deletePlanning = (planning: PlanningTransaction) => {
  if (confirm("Möchten Sie diese geplante Transaktion wirklich löschen?")) {
    planningStore.deletePlanningTransaction(planning.id);
    debugLog("[AdminPlanningView] Deleted planning", planning.id);
  }
};

// Planung deaktivieren/aktivieren
const toggleActivation = (planning: PlanningTransaction) => {
  planningStore.updatePlanningTransaction(planning.id, {
    isActive: !planning.isActive,
  });
  debugLog("[AdminPlanningView] Toggled activation", {
    id: planning.id,
    isActive: !planning.isActive,
  });
};

// Hilfsfunktionen
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

// Automatische Ausführung aller fälligen Planungen
function executeAllDuePlannings() {
  const count = planningStore.executeAllDuePlanningTransactions();
  alert(`${count} automatische Planungsbuchungen ausgeführt.`);
  debugLog("[AdminPlanningView] Executed all due plannings", { count });
}
</script>

<template>
  <div class="container mx-auto p-4">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">Planungsverwaltung</h1>
      <div class="flex space-x-2">
        <button class="btn btn-outline" @click="executeAllDuePlannings">
          <Icon icon="mdi:play-circle" class="mr-2" />
          Alle fälligen ausführen
        </button>
        <button class="btn btn-primary" @click="createPlanning">
          <Icon icon="mdi:plus" class="mr-2" />
          Neue Planung
        </button>
      </div>
    </div>

    <SearchGroup @search="(query) => (searchQuery = query)" />

    <div class="overflow-x-auto">
      <table class="table w-full">
        <thead>
          <tr>
            <th>Name</th>
            <th>Empfänger</th>
            <th>Konto</th>
            <th>Kategorie</th>
            <th>Intervall</th>
            <th>Start</th>
            <th class="text-right">Betrag</th>
            <th>Status</th>
            <th class="text-right">Aktionen</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="planning in filteredPlannings" :key="planning.id">
            <td>{{ planning.name }}</td>
            <td>
              {{
                recipientStore.getRecipientById(planning.recipientId || "")
                  ?.name || "-"
              }}
            </td>
            <td>
              {{
                accountStore.getAccountById(planning.accountId)?.name ||
                "Unbekannt"
              }}
              <span
                v-if="planning.transferToAccountId"
                class="text-xs text-base-content/60 ml-1"
              >
                →
                {{
                  accountStore.getAccountById(planning.transferToAccountId)
                    ?.name || "Unbekannt"
                }}
              </span>
            </td>
            <td>
              {{
                planning.categoryId
                  ? categoryStore.getCategoryById(planning.categoryId)?.name ||
                    "-"
                  : "-"
              }}
            </td>
            <td>{{ formatRecurrencePattern(planning.recurrencePattern) }}</td>
            <td>{{ planning.startDate }}</td>
            <td class="text-right">
              <CurrencyDisplay :amount="planning.amount" :show-zero="true" />
            </td>
            <td>
              <div class="flex space-x-1">
                <span
                  class="badge"
                  :class="planning.isActive ? 'badge-success' : 'badge-error'"
                >
                  {{ planning.isActive ? "Aktiv" : "Inaktiv" }}
                </span>
                <span v-if="planning.autoExecute" class="badge badge-info">
                  Auto
                </span>
              </div>
            </td>
            <td class="text-right">
              <div class="flex justify-end space-x-1">
                <button
                  class="btn btn-ghost btn-xs border-none"
                  @click="toggleActivation(planning)"
                  :title="planning.isActive ? 'Deaktivieren' : 'Aktivieren'"
                >
                  <Icon
                    :icon="
                      planning.isActive
                        ? 'mdi:toggle-switch'
                        : 'mdi:toggle-switch-off'
                    "
                    class="text-base"
                    :class="planning.isActive ? 'text-success' : 'text-error'"
                  />
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
          <tr v-if="filteredPlannings.length === 0">
            <td colspan="9" class="text-center py-4">
              Keine geplanten Transaktionen vorhanden. Erstellen Sie eine mit
              dem Button "Neue Planung".
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
