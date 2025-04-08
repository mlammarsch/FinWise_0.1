// src/stores/reconciliationStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useTransactionStore } from './transactionStore'
import { useAccountStore } from './accountStore'
import { Account, TransactionType } from '@/types'
import { debugLog } from '@/utils/logger'

export const useReconciliationStore = defineStore('reconciliation', () => {
  const transactionStore = useTransactionStore();
  const accountStore = useAccountStore();

  // State für Kontoabgleich
  const accountBeingReconciled = ref<Account | null>(null);
  const reconcileDate = ref(new Date().toISOString().split("T")[0]);
  const actualBalance = ref(0);
  const note = ref("Kontoabgleich");

  // Berechnet Saldo zum gewählten Datum für das aktuell abgeglichene Konto
  const currentBalance = computed(() => {
    if (!accountBeingReconciled.value) return 0;

    const target = new Date(reconcileDate.value).getTime();
    const txs = transactionStore.getTransactionsByAccount(accountBeingReconciled.value.id) || [];

    const validTxs = txs.filter((tx) => {
      const date = new Date(tx.valueDate || tx.date).getTime();
      return !isNaN(date) && date <= target;
    });

    if (validTxs.length === 0) return accountBeingReconciled.value.balance;

    validTxs.sort(
      (a, b) =>
        new Date(b.valueDate || b.date).getTime() -
        new Date(a.valueDate || a.date).getTime()
    );

    return validTxs[0].runningBalance;
  });

  // Differenz zwischen tatsächlichem und aktuellem Saldo
  const differenceValue = computed(() => {
    return actualBalance.value - currentBalance.value;
  });

  // Startet einen Kontoabgleich
  function startReconciliation(account: Account) {
    accountBeingReconciled.value = account;
    reconcileDate.value = new Date().toISOString().split("T")[0];
    actualBalance.value = account.balance; // Startpunkt: aktueller Kontostand
    note.value = "Kontoabgleich";

    debugLog('[reconciliationStore] startReconciliation', {
      accountId: account.id,
      currentBalance: account.balance,
      date: reconcileDate.value
    });
  }

  // Führt den Kontoabgleich durch
  function reconcileAccount() {
    if (!accountBeingReconciled.value) return false;
    if (differenceValue.value === 0) return true; // Keine Änderung nötig

    const accountId = accountBeingReconciled.value.id;
    const altSaldo = formatCurrency(currentBalance.value);
    const reconcileNote = `Kontostandsabgleich: Altsaldo war: ${altSaldo}`;

    const newTx = transactionStore.addReconcileTransaction(
      accountId,
      differenceValue.value,
      reconcileDate.value,
      reconcileNote
    );

    accountBeingReconciled.value = null;

    debugLog('[reconciliationStore] reconcileAccount', {
      amount: differenceValue.value,
      newTransactionId: newTx?.id
    });

    return !!newTx;
  }

  // Bricht den Kontoabgleich ab
  function cancelReconciliation() {
    accountBeingReconciled.value = null;
    debugLog('[reconciliationStore] cancelReconciliation');
  }

  function formatCurrency(amount: number): string {
    return amount.toLocaleString('de-DE', {
      style: 'currency',
      currency: 'EUR'
    });
  }

  // Toggles den Reconciled-Status einer Transaktion
  function toggleTransactionReconciled(transactionId: string) {
    const transaction = transactionStore.getTransactionById(transactionId);
    if (!transaction) return false;

    const newValue = !transaction.reconciled;
    const result = transactionStore.updateTransaction(transactionId, { reconciled: newValue });

    debugLog('[reconciliationStore] toggleTransactionReconciled', {
      transactionId,
      newStatus: newValue,
      success: result
    });

    return result;
  }

  // Markiert alle Transaktionen eines Kontos bis zu einem bestimmten Datum als abgeglichen
  function reconcileAllTransactionsUntilDate(accountId: string, date: string) {
    const txs = transactionStore.getTransactionsByAccount(accountId) || [];
    const targetDate = new Date(date).getTime();

    let updatedCount = 0;

    txs.forEach(tx => {
      const txDate = new Date(tx.date).getTime();
      if (txDate <= targetDate && !tx.reconciled) {
        transactionStore.updateTransaction(tx.id, { reconciled: true });
        updatedCount++;
      }
    });

    debugLog('[reconciliationStore] reconcileAllTransactionsUntilDate', {
      accountId,
      date,
      updatedCount
    });

    return updatedCount;
  }

  return {
    // State
    accountBeingReconciled,
    reconcileDate,
    actualBalance,
    note,

    // Computed
    currentBalance,
    differenceValue,

    // Actions
    startReconciliation,
    reconcileAccount,
    cancelReconciliation,
    toggleTransactionReconciled,
    reconcileAllTransactionsUntilDate
  }
});
