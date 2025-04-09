<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import { Account } from "@/types";
import {
  formatCurrency,
  formatDate,
  toDateOnlyString,
} from "@/utils/formatters";
import { useReconciliationStore } from "@/stores/reconciliationStore"; // Keep for UI state access (date, actualBalance, note, difference, currentBalance)
import { useTransactionStore } from "@/stores/transactionStore"; // Keep for pending transactions check
import { ReconciliationService } from "@/services/ReconciliationService"; // Use the service for actions
import DatePicker from "@/components/ui/DatePicker.vue";
import CurrencyInput from "@/components/ui/CurrencyInput.vue";
import { Icon } from "@iconify/vue";
import { debugLog } from "@/utils/logger";

/**
 * Pfad zur Komponente: src/components/account/AccountReconcileModal.vue
 * Modal zum Abgleich eines Kontos mit externem Kontostand. Nutzt ReconciliationService.
 *
 * Komponenten-Props:
 * - account: Account - Das abzugleichende Konto (wird an Service übergeben beim Start)
 * - isOpen: boolean - Ist das Modal geöffnet
 *
 * Emits:
 * - close - Modal schließen
 * - reconciled - Abgleich erfolgreich durchgeführt
 */

const props = defineProps<{
  account: Account; // Account is still needed for display and initial start
  isOpen: boolean;
}>();

const emit = defineEmits(["close", "reconciled"]); // Changed 'reconcile' to 'reconciled' for clarity

const reconciliationStore = useReconciliationStore(); // Access store for reactive state
const transactionStore = useTransactionStore(); // Access store for transaction list
const reconciliationService = ReconciliationService; // Use the service for actions

const isProcessing = ref(false); // Loading state for async operations
const dateInputRef = ref<InstanceType<typeof DatePicker> | null>(null); // Ref for focus

// --- Computed properties reading from the ReconciliationStore ---
const reconcileDate = computed({
  get: () => reconciliationStore.reconcileDate,
  set: (value) => (reconciliationStore.reconcileDate = value), // Allow UI to update store date
});

const actualBalance = computed({
  get: () => reconciliationStore.actualBalance,
  set: (value) => (reconciliationStore.actualBalance = value), // Allow UI to update store balance
});

const note = computed({
  get: () => reconciliationStore.note,
  set: (value) => (reconciliationStore.note = value), // Allow UI to update store note
});

// Difference and current balance directly from the store's getters
const difference = computed(() => reconciliationStore.differenceValue);
const currentBalance = computed(() => reconciliationStore.currentBalance); // Balance *before* reconciliation

// Pending transactions check (still needs direct access to transactionStore or a dedicated service method)
const hasPendingTransactions = computed(() => {
  if (!props.account) return false;
  const transactions = transactionStore.getTransactionsByAccount(
    props.account.id
  );
  const pendingTransactions = transactions.filter((tx) => !tx.reconciled);
  return pendingTransactions.length > 0;
});

// --- Watchers ---
watch(
  () => props.isOpen,
  (newVal) => {
    if (newVal) {
      isProcessing.value = false; // Reset processing state
      // ReconciliationStore state should be set by the 'startReconciliation' service call
      // which happens *before* this modal opens (e.g., in AccountCard)
      debugLog("[AccountReconcileModal] Opened. Reconciliation store state:", {
        ...reconciliationStore.$state,
      });
      // Set focus on mount
      nextTick(() => {
        dateInputRef.value?.focusInput();
      });
    } else {
      // Call service to cancel/clean up if the modal is closed without reconciling
      // reconciliationService.cancelReconciliation(); // Cancel only if not reconciled
    }
  }
);

// --- Actions using the ReconciliationService ---

// Function to perform the reconciliation via the service
async function performReconciliation() {
  if (isProcessing.value || difference.value === 0) return;
  isProcessing.value = true;
  try {
    // Call the service method - it handles transaction creation and store reset
    const success = await reconciliationService.reconcileAccount();
    if (success) {
      debugLog("[AccountReconcileModal] Reconciliation successful via service");
      emit("reconciled"); // Signal success
      closeModal(); // Close after success
    } else {
      debugLog("[AccountReconcileModal] Reconciliation failed via service");
      // TODO: Show error message to user
    }
  } catch (error) {
    debugLog("[AccountReconcileModal] Error during reconciliation:", error);
    // TODO: Show error message to user
  } finally {
    isProcessing.value = false;
  }
}

// Close modal and cancel reconciliation via service
function closeModal() {
  // Only cancel if not already reconciled (might be redundant if performReconciliation resets)
  if (!isProcessing.value && reconciliationStore.currentAccount) {
    reconciliationService.cancelReconciliation(); // Clean up store state
  }
  emit("close");
}
</script>

<template>
  <div v-if="isOpen" class="modal modal-open" @keydown.esc="closeModal">
    <div class="modal-box max-w-lg">
      <h3 class="font-bold text-lg mb-4">
        Konto abgleichen: {{ account.name }}
      </h3>

      <form @submit.prevent="performReconciliation" class="space-y-4">
        <!-- Date -->
        <fieldset>
          <legend class="text-sm font-semibold mb-1">
            Datum <span class="text-error">*</span>
          </legend>
          <DatePicker
            ref="dateInputRef"
            v-model="reconcileDate"
            class="input input-bordered w-full"
          />
          <p class="text-xs text-gray-500 mt-1">
            Datum des externen Kontoauszugs oder aktuellen Stands.
          </p>
        </fieldset>

        <!-- Actual Balance -->
        <fieldset>
          <legend class="text-sm font-semibold mb-1">
            Externer Kontostand <span class="text-error">*</span>
          </legend>
          <CurrencyInput v-model="actualBalance" required />
          <p class="text-xs text-gray-500 mt-1">
            Der tatsächliche Kontostand laut Ihrer Bank.
          </p>
        </fieldset>

        <!-- Balance Summary & Difference -->
        <div class="bg-base-200 p-3 rounded-md text-sm space-y-1">
          <div class="flex justify-between">
            <span>Aktueller Kontostand (App):</span>
            <span class="font-medium">
              <CurrencyDisplay :amount="currentBalance" :showZero="true" />
            </span>
          </div>
          <div class="flex justify-between border-t border-base-300 pt-1">
            <span>Differenz:</span>
            <span
              class="font-bold"
              :class="{
                'text-success': difference === 0,
                'text-error': difference !== 0,
              }"
            >
              <CurrencyDisplay
                :amount="difference"
                :showZero="true"
                :showSign="true"
              />
            </span>
          </div>
        </div>

        <!-- Reconciliation Note (optional) -->
        <fieldset v-if="difference !== 0">
          <legend class="text-sm font-semibold mb-1">
            Notiz (Ausgleichsbuchung)
          </legend>
          <input
            type="text"
            v-model="note"
            class="input input-bordered w-full"
            placeholder="z.B. Korrektur Rundungsdifferenz"
          />
          <p class="text-xs text-gray-500 mt-1">
            Grund für die Differenz. Wird zur Notiz der Ausgleichsbuchung.
          </p>
        </fieldset>

        <!-- Pending Transactions Warning -->
        <div
          v-if="hasPendingTransactions"
          class="alert alert-warning text-xs p-2 mt-4"
        >
          <Icon icon="mdi:alert-outline" class="text-lg" />
          <span
            >Es gibt noch nicht abgeglichene Transaktionen. Der "Aktuelle
            Kontostand (App)" enthält diese bereits.</span
          >
        </div>

        <!-- Actions -->
        <div class="modal-action mt-6">
          <button type="button" class="btn btn-ghost" @click="closeModal">
            Abbrechen
          </button>
          <button
            type="submit"
            class="btn btn-primary"
            :disabled="difference === 0 || isProcessing"
          >
            <span
              v-if="isProcessing"
              class="loading loading-spinner loading-xs"
            ></span>
            {{ difference === 0 ? "Abgeglichen" : "Ausgleich buchen" }}
          </button>
        </div>
      </form>
    </div>
    <div class="modal-backdrop bg-black/30" @click="closeModal"></div>
  </div>
</template>
