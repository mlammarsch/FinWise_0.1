<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { Account } from "../../types";
import { useTransactionStore } from "../../stores/transactionStore";
import DatePicker from "../ui/DatePicker.vue";
import CurrencyInput from "../ui/CurrencyInput.vue";
import CurrencyDisplay from "../ui/CurrencyDisplay.vue"; // Neuer Import

/**
 * Pfad zur Komponente: src/components/account/AccountReconcileModal.vue
 * Kurzbeschreibung: Modal zur Durchführung des Kontoabgleichs
 * Komponenten-Props:
 * - account: Das Konto, das abgeglichen wird
 * - isOpen: Steuerung der Sichtbarkeit
 *
 * Emits:
 * - close: Schließt das Modal
 * - reconciled: Nach erfolgreichem Abgleich
 */
const props = defineProps<{ account: Account; isOpen: boolean }>();
const emit = defineEmits(["close", "reconciled"]);
const transactionStore = useTransactionStore();

const reconcileDate = ref(new Date().toISOString().split("T")[0]);
const actualBalance = ref(0);
const note = ref("Kontoabgleich");

// Berechnet Saldo zum gewählten Datum
const currentBalance = computed(() => {
  const target = new Date(reconcileDate.value).getTime();
  const txs = transactionStore.getTransactionsByAccount(props.account.id) || [];
  const validTxs = txs.filter((tx) => {
    const date = new Date(tx.valueDate || tx.date).getTime();
    return !isNaN(date) && date <= target;
  });
  if (validTxs.length === 0) return props.account.balance;
  validTxs.sort(
    (a, b) =>
      new Date(b.valueDate || b.date).getTime() -
      new Date(a.valueDate || a.date).getTime()
  );
  return validTxs[0].runningBalance;
});

// Differenz zwischen tatsächlichem und aktuellem Saldo
const differenceValue = computed({
  get: () => actualBalance.value - currentBalance.value,
  set: (val) => (actualBalance.value = currentBalance.value + val),
});

// Datum ändert -> actualBalance anpassen
watch(reconcileDate, () => {
  actualBalance.value = currentBalance.value;
});
watch(
  () => props.isOpen,
  (open) => {
    if (open) actualBalance.value = currentBalance.value;
  }
);

const reconcileAccount = () => {
  if (differenceValue.value === 0) {
    emit("close");
    return;
  }

  const altSaldo = formatCurrency(currentBalance.value);
  note.value = `Kontostandsabgleich: Altsaldo war: ${altSaldo}`;

  const result = transactionStore.addReconciliationTransaction(
    props.account.id,
    actualBalance.value,
    reconcileDate.value,
    note.value
  );
  if (result) emit("reconciled");
  emit("close");
};
</script>

<template>
  <div v-if="props.isOpen" class="modal modal-open">
    <div class="modal-box">
      <h3 class="font-bold text-lg mb-4">
        Kontoabgleich: {{ props.account.name }}
      </h3>
      <form @submit.prevent="reconcileAccount">
        <div class="space-y-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text">Aktueller Kontostand laut FinWise</span>
            </label>
            <!-- Verwendung von CurrencyDisplay statt Input -->
            <CurrencyDisplay :amount="currentBalance" />
          </div>
          <div class="form-control">
            <label class="label">
              <span class="label-text">Tatsächlicher Kontostand</span>
              <span class="text-error">*</span>
            </label>
            <CurrencyInput v-model="actualBalance" borderless required />
          </div>
          <div class="form-control">
            <label class="label">
              <span class="label-text">Differenz</span>
            </label>
            <CurrencyInput v-model="differenceValue" borderless readonly />
          </div>
          <DatePicker
            v-model="reconcileDate"
            label="Datum des Abgleichs"
            required
          />
          <div class="form-control">
            <label class="label">
              <span class="label-text">Notiz</span>
            </label>
            <input
              type="text"
              v-model="note"
              class="input input-bordered"
              placeholder="Grund für den Abgleich"
            />
          </div>
        </div>
        <div class="modal-action">
          <button type="button" class="btn" @click="emit('close')">
            Abbrechen
          </button>
          <button
            type="submit"
            class="btn btn-primary"
            :disabled="differenceValue === 0"
          >
            Abgleichen
          </button>
        </div>
      </form>
    </div>
    <div class="modal-backdrop" @click="emit('close')"></div>
  </div>
</template>
