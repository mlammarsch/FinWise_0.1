<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { Account } from "@/types";
import { formatCurrency, formatDate } from "@/utils/formatters";
import { useReconciliationStore } from "@/stores/reconciliationStore";
import { useTransactionStore } from "@/stores/transactionStore";
import DatePicker from "@/components/ui/DatePicker.vue";
import CurrencyInput from "@/components/ui/CurrencyInput.vue";

/**
 * Pfad zur Komponente: src/components/account/AccountReconcileModal.vue
 * Modal zum Abgleich eines Kontos mit externem Kontostand.
 *
 * Komponenten-Props:
 * - account: Account - Das abzugleichende Konto
 * - isOpen: boolean - Ist das Modal geöffnet
 *
 * Emits:
 * - close - Modal schließen
 * - reconcile - Abgleich durchführen
 */

const props = defineProps<{
  account: Account;
  isOpen: boolean;
}>();

const emit = defineEmits(["close", "reconcile"]);

const reconciliationStore = useReconciliationStore();
const transactionStore = useTransactionStore();

// Werte aus dem ReconciliationStore
const reconcileDate = computed({
  get: () => reconciliationStore.reconcileDate,
  set: (value) => (reconciliationStore.reconcileDate = value),
});

const actualBalance = computed({
  get: () => reconciliationStore.actualBalance,
  set: (value) => (reconciliationStore.actualBalance = value),
});

const note = computed({
  get: () => reconciliationStore.note,
  set: (value) => (reconciliationStore.note = value),
});

// Differenz zwischen tatsächlichem Saldo und Kontostand
const difference = computed(() => {
  return reconciliationStore.differenceValue;
});

// Berechnet den aktuellen Kontostand für das ausgewählte Datum
const currentBalance = computed(() => {
  return reconciliationStore.currentBalance;
});

// Flag für anstehende Buchungen
const hasPendingTransactions = computed(() => {
  const transactions = transactionStore.getTransactionsByAccount(
    props.account.id
  );
  const pendingTransactions = transactions.filter((tx) => !tx.reconciled);
  return pendingTransactions.length > 0;
});

// Startet einen neuen Kontoabgleich, wenn das Modal geöffnet wird
watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen && props.account) {
      reconciliationStore.startReconciliation(props.account);
    }
  }
);

// Kontoabgleich durchführen
function reconcileAccount() {
  const success = reconciliationStore.reconcileAccount();
  if (success) {
    emit("reconcile");
    emit("close");
  }
}

// Alle Transaktionen bis zum gewählten Datum abgleichen
function reconcileAllTransactions() {
  if (
    confirm(
      "Möchten Sie wirklich alle Transaktionen bis zum gewählten Datum als abgeglichen markieren?"
    )
  ) {
    const count = reconciliationStore.reconcileAllTransactionsUntilDate(
      props.account.id,
      reconcileDate.value
    );
    alert(`${count} Transaktionen wurden als abgeglichen markiert.`);
  }
}

// Abgleich abbrechen
function cancelReconciliation() {
  reconciliationStore.cancelReconciliation();
  emit("close");
}
</script>

<template>
  <div v-if="isOpen" class="modal modal-open">
    <div class="modal-box max-w-lg">
      <!-- Header -->
      <h3 class="font-bold text-lg mb-4">Kontoabgleich: {{ account.name }}</h3>

      <div class="divider my-2"></div>

      <!-- Abgleichdatum -->
      <div class="form-control mb-4">
        <label class="label">
          <span class="label-text">Abgleichdatum</span>
        </label>
        <DatePicker v-model="reconcileDate" />
      </div>

      <!-- Aktueller Kontostand -->
      <div class="bg-base-200 p-3 rounded-md mb-4">
        <div class="text-sm opacity-75">
          Aktueller Kontostand zum gewählten Datum:
        </div>
        <div class="text-xl font-semibold">
          {{ formatCurrency(currentBalance) }}
        </div>
      </div>

      <!-- Tatsächlicher Kontostand -->
      <div class="form-control mb-4">
        <label class="label">
          <span class="label-text"
            >Tatsächlicher Kontostand laut Bankauszug</span
          >
        </label>
        <CurrencyInput v-model="actualBalance" />
      </div>

      <!-- Differenz -->
      <div
        class="flex justify-between items-center mb-4 p-3 rounded-md"
        :class="difference === 0 ? 'bg-success/20' : 'bg-error/20'"
      >
        <div>
          <div class="text-sm opacity-75">Differenz:</div>
          <div
            class="text-lg font-semibold"
            :class="difference >= 0 ? 'text-success' : 'text-error'"
          >
            {{ formatCurrency(difference) }}
          </div>
        </div>
        <div v-if="difference === 0" class="badge badge-success">
          Ausgeglichen
        </div>
        <div v-else class="badge badge-error">Nicht ausgeglichen</div>
      </div>

      <!-- Notiz -->
      <div class="form-control mb-4">
        <label class="label">
          <span class="label-text">Notiz</span>
        </label>
        <textarea
          v-model="note"
          class="textarea textarea-bordered"
          rows="2"
        ></textarea>
      </div>

      <div v-if="hasPendingTransactions" class="alert alert-info mb-4">
        <div>
          <Icon icon="mdi:information" class="text-lg" />
          <span
            >Es gibt noch nicht abgeglichene Transaktionen für dieses
            Konto.</span
          >
        </div>
        <div>
          <button class="btn btn-sm" @click="reconcileAllTransactions">
            Alle Transaktionen bis zum Datum abgleichen
          </button>
        </div>
      </div>

      <!-- Aktionen -->
      <div class="modal-action">
        <button
          class="btn btn-primary"
          @click="reconcileAccount"
          :disabled="difference === 0"
        >
          <Icon icon="mdi:check-circle" class="mr-2" />
          Abgleichen
        </button>
        <button class="btn btn-ghost" @click="cancelReconciliation">
          Abbrechen
        </button>
      </div>
    </div>
    <div class="modal-backdrop" @click="cancelReconciliation"></div>
  </div>
</template>
