<script setup lang="ts">
import { ref, computed } from "vue";
import { usePlanningStore } from "../stores/planningStore";
import PlanningTransactionForm from "../components/planning/PlanningTransactionForm.vue";
import { PlanningTransaction } from "../types";
import CurrencyDisplay from "../components/ui/CurrencyDisplay.vue";
import Badge from "../components/ui/BadgeSoft.vue";
import ColorPicker from "../components/ui/ColorPicker.vue";

// Stores
const planningStore = usePlanningStore();

// State für Modals
const showNewPlanningModal = ref(false);
const showEditPlanningModal = ref(false);

// Ausgewählte Plantransaktion
const selectedPlanning = ref<PlanningTransaction | null>(null);

// Alle Plantransaktionen
const planningTransactions = computed(() => {
  return planningStore.planningTransactions;
});

// Anstehende Transaktionen für die nächsten 30 Tage
const upcomingTransactions = computed(() => {
  return planningStore.getUpcomingTransactions(30); // Call the function directly
});

// Neue Plantransaktion erstellen
const createPlanning = () => {
  selectedPlanning.value = null;
  showNewPlanningModal.value = true;
};

// Plantransaktion bearbeiten
const editPlanning = (planning: PlanningTransaction) => {
  selectedPlanning.value = planning;
  showEditPlanningModal.value = true;
};

// Plantransaktion speichern
const savePlanning = (data: any) => {
  if (selectedPlanning.value) {
    planningStore.updatePlanningTransaction(
      selectedPlanning.value.id,
      data.planningTransaction
    );
  } else {
    planningStore.addPlanningTransaction(data.planningTransaction);
  }

  showNewPlanningModal.value = false;
  showEditPlanningModal.value = false;
};

// Plantransaktion löschen
const deletePlanning = (planning: PlanningTransaction) => {
  if (confirm("Möchten Sie diese geplante Transaktion wirklich löschen?")) {
    planningStore.deletePlanningTransaction(planning.id);
  }
};

// Plantransaktion ausführen
const executePlanning = (planningId: string, date: string) => {
  planningStore.executePlanningTransaction(planningId, date);
};

const showPicker = ref(false)
const badgeColor = ref('slate-700/45') // Defaultfarbe

function openPicker() {
  showPicker.value = true
}

function updateColor(newColor) {
  badgeColor.value = `${newColor}/45` // oder dynamisch per zusätzlicher Auswahl
  showPicker.value = false
}

function cancelPicker() {
  showPicker.value = false
}
</script>

<template>
  <div>
    <h2 class="text-xl font-bold">Finanzplanung</h2>
    <button class="btn btn-soft btn-primary" @click="createPlanning">
      Neue geplante Transaktion
    </button>

    <div v-if="upcomingTransactions.length > 0">
      <h3>Anstehende Transaktionen</h3>
      <ul>
        <li v-for="transaction in upcomingTransactions" :key="transaction.id">
          {{ transaction.description }} -
          <CurrencyDisplay
            :amount="transaction.amount"
            :show-zero="true"
            :asInteger="false"
          />
          <button @click="executePlanning(transaction.id, transaction.date)">
            Ausführen
          </button>
        </li>
      </ul>
    </div>

    <PlanningTransactionForm
      v-if="showNewPlanningModal"
      @save="savePlanning"
      @cancel="showNewPlanningModal = false"
    />
    <PlanningTransactionForm
      v-if="showEditPlanningModal"
      :planning-transaction="selectedPlanning"
      @save="savePlanning"
      @cancel="showEditPlanningModal = false"
    />
  </div>

  <div class="inline-block relative">
  <!-- Overlay mit Text -->
  <div class="absolute inset-0 flex items-center justify-center rounded-full bg-blue-400/45 text-sm font-medium pointer-events-none z-10">
    
  </div>

  <!-- Unsichtbarer Badge zur Struktur -->
  <div class="badge text-white badge-soft opacity-80 rounded-full ">
    Beispiel
  </div>
</div>

<!-- Picker -->
<div>
    <Badge label="Kategorie" :colorIntensity="badgeColor" @click="openPicker" class="cursor-pointer" />

    <div v-if="showPicker" class="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <ColorPicker @cancel="cancelPicker" @farbe-intensity="updateColor" />
    </div>
  </div>
</template>
