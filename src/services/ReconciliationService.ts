// src/services/ReconciliationService.ts
import { useReconciliationStore } from '@/stores/reconciliationStore';
import { useTransactionStore } from '@/stores/transactionStore';
import { useMonthlyBalanceStore } from '@/stores/monthlyBalanceStore'; // Import MonthlyBalanceStore
import { Account, TransactionType, Transaction } from '@/types';
import { debugLog } from '@/utils/logger';
import { TransactionService } from './TransactionService'; // Import TransactionService

export const ReconciliationService = {

  /**
   * Startet den Abgleichprozess für ein Konto.
   */
  startReconciliation(account: Account) {
    const reconciliationStore = useReconciliationStore();
    reconciliationStore.startReconciliation(account);
    debugLog('[ReconciliationService] startReconciliation', { accountId: account.id });
  },

  /**
   * Bricht den aktuellen Abgleichprozess ab.
   */
  cancelReconciliation() {
    const reconciliationStore = useReconciliationStore();
    reconciliationStore.cancelReconciliation();
    debugLog('[ReconciliationService] cancelReconciliation');
  },

  /**
   * Führt den Kontoabgleich durch, erstellt ggf. eine Ausgleichsbuchung.
   */
  reconcileAccount(): boolean {
    const reconciliationStore = useReconciliationStore();
    const monthlyBalanceStore = useMonthlyBalanceStore(); // Add MonthlyBalanceStore

    if (!reconciliationStore.currentAccount || reconciliationStore.differenceValue === 0) {
      debugLog('[ReconciliationService] reconcileAccount - Aborted: No account or difference is zero.');
      return false;
    }

    const { currentAccount, differenceValue, reconcileDate, note } = reconciliationStore;

    // Use TransactionService to add the reconciliation transaction
    const newTx = TransactionService.addReconcileTransaction(
      currentAccount.id,
      differenceValue,
      reconcileDate,
      note
    );

    if (newTx) {
      debugLog('[ReconciliationService] reconcileAccount - Reconciliation transaction added:', newTx);
      reconciliationStore.reset(); // Reset store state after successful reconciliation

       // Optional: Manually trigger balance recalculation if addTransaction doesn't cover it fully
       // This might be redundant if addTransaction correctly updates monthly balances
       monthlyBalanceStore.calculateMonthlyBalances();

      return true;
    } else {
       debugLog('[ReconciliationService] reconcileAccount - Failed to add reconciliation transaction.');
       return false;
    }
  },

  /**
   * Markiert alle Transaktionen bis zu einem bestimmten Datum als abgeglichen.
   */
  reconcileAllTransactionsUntilDate(accountId: string, date: string): number {
    const transactionStore = useTransactionStore();
    let count = 0;
    const targetDate = new Date(date);

    transactionStore.transactions.forEach(tx => {
      if (tx.accountId === accountId && !tx.reconciled) {
        const txDate = new Date(tx.date);
        if (txDate <= targetDate) {
          // Use TransactionService to update reconciliation status
           TransactionService.updateTransaction(tx.id, { reconciled: true });
           count++;
        }
      }
    });

    // Optional: Trigger balance update if reconciliation status affects balances
    // reconciliationStore.updateBalancesAfterReconciliation(); // Assuming such a method exists or logic is handled elsewhere

    debugLog('[ReconciliationService] reconcileAllTransactionsUntilDate', { accountId, date, count });
    return count;
  },

   /**
   * Wechselt den Abgleichstatus einer einzelnen Transaktion.
   */
  toggleTransactionReconciled(transactionId: string) {
    const transactionStore = useTransactionStore();
    const tx = transactionStore.getTransactionById(transactionId);
    if (tx) {
       TransactionService.updateTransaction(transactionId, { reconciled: !tx.reconciled });
       debugLog('[ReconciliationService] toggleTransactionReconciled', { transactionId, newStatus: !tx.reconciled });
    } else {
        debugLog('[ReconciliationService] toggleTransactionReconciled - Transaction not found:', transactionId);
    }
  }
};
