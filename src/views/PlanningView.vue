<script setup lang="ts">
import { ref, computed } from "vue";
import { usePlanningStore } from "@/stores/planningStore";
import PlanningTransactionForm from "@/components/planning/PlanningTransactionForm.vue";
import { PlanningTransaction } from "@/types";
import CurrencyDisplay from "@/components/ui/CurrencyDisplay.vue";
import { debugLog } from "@/utils/logger";

const planningStore = usePlanningStore();
const showNewPlanningModal = ref(false);
const showEditPlanningModal = ref(false);
const selectedPlanning = ref<PlanningTransaction | null>(null);

const planningTransactions = computed(() => planningStore.planningTransactions);
const upcomingTransactions = computed(() =>
  planningStore.getUpcomingTransactions(30)
);

const createPlanning = () => {
  selectedPlanning.value = null;
  showNewPlanningModal.value = true;
};

const editPlanning = (planning: PlanningTransaction) => {
  selectedPlanning.value = planning;
  showEditPlanningModal.value = true;
  debugLog("[PlanningView] Edit planning", planning);
};

const savePlanning = (data: any) => {
  const tx = data as PlanningTransaction;
  if (selectedPlanning.value) {
    planningStore.updatePlanningTransaction(selectedPlanning.value.id, tx);
    debugLog("[PlanningView] Updated planning", tx);
  } else {
    planningStore.addPlanningTransaction(tx);
    debugLog("[PlanningView] Added planning", tx);
  }
  showNewPlanningModal.value = false;
  showEditPlanningModal.value = false;
};

const deletePlanning = (planning: PlanningTransaction) => {
  if (confirm("Möchten Sie diese geplante Transaktion wirklich löschen?")) {
    planningStore.deletePlanningTransaction(planning.id);
    debugLog("[PlanningView] Deleted planning", planning.id);
  }
};

const executePlanning = (planningId: string, date: string) => {
  planningStore.executePlanningTransaction(planningId, date);
};
</script>

<template>
  <div>
    <h2 class="text-xl font-bold mb-2">Geplante Transaktionen</h2>
    <button class="btn btn-soft btn-primary mb-4" @click="createPlanning">
      Neue geplante Transaktion
    </button>

    <div v-if="upcomingTransactions.length > 0" class="space-y-2">
      <div class="font-semibold">Anstehend in den nächsten 30 Tagen:</div>
      <ul class="list-disc list-inside">
        <li
          v-for="entry in upcomingTransactions"
          :key="entry.transaction.id + entry.date"
        >
          {{ entry.date }} – {{ entry.transaction.payee }}
          <span
            v-if="entry.transaction.transferToAccountId"
            class="ml-2 text-xs italic"
          >
            (Transfer → {{ entry.transaction.transferToAccountId }})
          </span>
          –
          <CurrencyDisplay
            :amount="entry.transaction.amount"
            :show-zero="true"
          />
          <button
            class="btn btn-xs ml-2"
            @click="executePlanning(entry.transaction.id, entry.date)"
          >
            Ausführen
          </button>
          <button
            class="btn btn-xs ml-2"
            @click="editPlanning(entry.transaction)"
          >
            Bearbeiten
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
      v-if="showEditPlanningModal && selectedPlanning"
      :transaction="selectedPlanning"
      isEdit
      @save="savePlanning"
      @cancel="showEditPlanningModal = false"
    />
  </div>
</template>
