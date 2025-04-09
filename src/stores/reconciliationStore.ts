// src/stores/reconciliationStore.ts
import { defineStore } from 'pinia';
import { Account, Transaction } from '@/types';
import { useTransactionStore } from './transactionStore';
import { toDateOnlyString } from '@/utils/formatters';
import { debugLog } from '@/utils/logger';

interface ReconciliationState {
  currentAccount: Account | null;
  reconcileDate: string; // YYYY-MM-DD
  actualBalance: number; // Tatsächlicher Kontostand von der Bank
  note: string;          // Notiz für die Ausgleichsbuchung
}

export const useReconciliationStore = defineStore('reconciliation', {
  state: (): ReconciliationState => ({
    currentAccount: null,
    reconcileDate: toDateOnlyString(new Date()), // Default to today
    actualBalance: 0,
    note: '',
  }),

  getters: {
     /**
     * Berechnet den aktuellen Kontostand in der App *bis* zum Abgleichsdatum
     * basierend auf dem Startsaldo und den Transaktionen.
     * Nur für Anzeige im Modal relevant. Die tatsächliche Kontobilanz ist im AccountStore.
     */
    currentBalance(state): number {
      if (!state.currentAccount) return 0;
      const transactionStore = useTransactionStore();
      const targetDate = new Date(state.reconcileDate);

      // Start with the account's initial balance
      let balance = state.currentAccount.startBalance || 0;

       // Add amounts of all transactions up to and including the reconcile date
       transactionStore.transactions
        .filter(tx => tx.accountId === state.currentAccount?.id && new Date(toDateOnlyString(tx.date)) <= targetDate)
        .forEach(tx => {
            balance += tx.amount;
        });

        debugLog("[ReconciliationStore] Calculated currentBalance up to date", { accountId: state.currentAccount.id, date: state.reconcileDate, balance });
        return balance;
    },

    /**
     * Berechnet die Differenz zwischen dem tatsächlichen Kontostand und dem App-Kontostand.
     */
    differenceValue(state): number {
       if (!state.currentAccount) return 0;
       const diff = state.actualBalance - this.currentBalance; // Use the getter for current balance
       // Round to avoid floating point issues with currency
       return Math.round(diff * 100) / 100;
    },
  },

  actions: {
    /**
     * Wird vom ReconciliationService aufgerufen, um den Abgleich zu starten.
     */
    startReconciliation(account: Account) {
      this.currentAccount = account;
      // Set default date to today, actualBalance might be pre-filled or zeroed
      this.reconcileDate = toDateOnlyString(new Date());
      this.actualBalance = 0; // Reset actual balance input
      this.note = ''; // Reset note
      debugLog("[ReconciliationStore] startReconciliation", { accountId: account.id });
    },

    /**
     * Wird vom ReconciliationService aufgerufen, wenn der Abgleich abgebrochen wird.
     */
    cancelReconciliation() {
       debugLog("[ReconciliationStore] cancelReconciliation - Resetting state");
       this.reset();
    },

     /**
     * Setzt den Store-Zustand zurück (nach erfolgreichem Abgleich oder Abbruch).
     * Wird intern oder vom Service aufgerufen.
     */
    reset() {
      this.$reset(); // Pinia's built-in reset
      debugLog("[ReconciliationStore] State reset");
    },

     // updateBalancesAfterReconciliation() - Removed: Balance updates are handled by the stores/services reacting to new/updated transactions.
  }
});
