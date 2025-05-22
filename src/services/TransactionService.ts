// src/services/TransactionService.ts
import { useTransactionStore } from '@/stores/transactionStore';
import { useAccountStore } from '@/stores/accountStore'; // Needed for account transfers
import { useCategoryStore } from '@/stores/categoryStore'; // Needed for category transfers/validation?
import { useMonthlyBalanceStore } from '@/stores/monthlyBalanceStore'; // To trigger balance updates
import { Transaction, TransactionType, Account, Category } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { debugLog } from '@/utils/logger';
import { toDateOnlyString } from '@/utils/formatters';
import { CategoryService } from './CategoryService';

export const TransactionService = {

    /**
     * Holt alle Transaktionen.
     */
    getAllTransactions(): Transaction[] {
        const transactionStore = useTransactionStore();
        return transactionStore.transactions;
    },

    /**
     * Holt eine Transaktion anhand ihrer ID.
     */
    getTransactionById(id: string): Transaction | null {
        const transactionStore = useTransactionStore();
        const tx = transactionStore.getTransactionById(id);
        if (!tx) {
            debugLog("[TransactionService] getTransactionById - Transaction not found:", id);
        }
        return tx;
    },

    /**
     * Fügt eine neue Standardtransaktion hinzu (Expense, Income).
     * Beinhaltet Validierung und Aktualisierung der Salden.
     */
    addTransaction(txData: Omit<Transaction, 'id' | 'runningBalance'>): Transaction {
        const transactionStore = useTransactionStore();
        const monthlyBalanceStore = useMonthlyBalanceStore();

        // Basic Validation
        if (!txData.accountId && txData.type !== TransactionType.CATEGORYTRANSFER) {
             throw new Error("Account ID is required for this transaction type.");
        }
        if (!txData.categoryId && txData.type !== TransactionType.ACCOUNTTRANSFER && txData.type !== TransactionType.RECONCILE) {
             // Allow missing category for these types initially
        }

        const newTx: Transaction = {
            ...txData,
            id: uuidv4(),
            date: toDateOnlyString(txData.date),
            valueDate: txData.valueDate ? toDateOnlyString(txData.valueDate) : toDateOnlyString(txData.date),
            runningBalance: 0,
        };

        // Transaktion zum Store hinzufügen und Salden aktualisieren
        const addedTx = transactionStore.addTransaction(newTx);
        debugLog("[TransactionService] addTransaction - Added:", addedTx);
        monthlyBalanceStore.calculateMonthlyBalances();

        // Neue Logik: Falls es sich um eine INCOME-Buchung handelt, CATEGORYTRANSFER erzeugen
        if (addedTx.type === TransactionType.INCOME && addedTx.amount > 0 && addedTx.categoryId) {
            const categoryStore = useCategoryStore();
            const availableFunds = categoryStore.getAvailableFundsCategory();
            if (!availableFunds) {
                throw new Error("Kategorie 'Verfügbare Mittel' nicht gefunden.");
            }
            CategoryService.addCategoryTransfer(
                addedTx.categoryId,
                availableFunds.id,
                addedTx.amount,
                addedTx.date,
                "Automatischer Transfer von Einnahmen"
            );
        }

        return addedTx;
    },

    /**
     * Erstellt einen Kontotransfer (zwei spiegelnde Buchungen).
     * @param planningTransactionId   Optionale Verknüpfung zu einer Planbuchung
     */
    addAccountTransfer(
        fromAccountId: string,
        toAccountId: string,
        amount: number,
        date: string,
        note: string = '',
        planningTransactionId: string | null = null
    ): { fromTransaction: Transaction; toTransaction: Transaction } | null {
        const accountStore = useAccountStore();
        const monthlyBalanceStore = useMonthlyBalanceStore();

        if (fromAccountId === toAccountId) {
            throw new Error("Quell- und Zielkonto dürfen nicht identisch sein.");
        }
        if (amount === 0) {
            throw new Error("Betrag darf nicht 0 sein.");
        }

        const fromAccountName = accountStore.getAccountById(fromAccountId)?.name ?? 'Unbekannt';
        const toAccountName = accountStore.getAccountById(toAccountId)?.name ?? 'Unbekannt';
        const normalizedDate = toDateOnlyString(date);
        const absAmount = Math.abs(amount);

        const baseTx: Omit<Transaction, 'id' | 'runningBalance'> = {
            type: TransactionType.ACCOUNTTRANSFER,
            date: normalizedDate,
            valueDate: normalizedDate,
            categoryId: null,
            amount: 0,                   // wird weiter unten überschrieben
            tagIds: [],
            payee: '',
            note,
            counterTransactionId: null,
            planningTransactionId,       // << Verknüpfung
            isReconciliation: false,
            isCategoryTransfer: false,
            toAccountId: '',
            reconciled: false,
            accountId: ''                // Placeholder
        };

        const fromTxData = {
            ...baseTx,
            accountId: fromAccountId,
            amount: -absAmount,
            payee: `Transfer zu ${toAccountName}`,
            toAccountId: toAccountId
        };

        const toTxData = {
            ...baseTx,
            accountId: toAccountId,
            amount: absAmount,
            payee: `Transfer von ${fromAccountName}`,
            toAccountId: fromAccountId
        };

        try {
            const newFromTx = this.addTransaction(fromTxData);
            const newToTx   = this.addTransaction(toTxData);

            // Gegenseitig verlinken
            this.updateTransaction(newFromTx.id, { counterTransactionId: newToTx.id });
            this.updateTransaction(newToTx.id,   { counterTransactionId: newFromTx.id });

            debugLog('[TransactionService] addAccountTransfer', { fromTransaction: newFromTx, toTransaction: newToTx });
            monthlyBalanceStore.calculateMonthlyBalances();
            return { fromTransaction: newFromTx, toTransaction: newToTx };
        } catch (error) {
            debugLog('[TransactionService] addAccountTransfer - Error:', error);
            return null;
        }
    },

    /**
     * Fügt eine Ausgleichsbuchung hinzu.
     */
    addReconcileTransaction(
        accountId: string,
        amount: number,
        date: string,
        note: string = ''
    ): Transaction | null {
        const categoryStore = useCategoryStore();
        const monthlyBalanceStore = useMonthlyBalanceStore();

        if (amount === 0) {
            debugLog("[TransactionService] addReconcileTransaction - Amount is zero, skipping.");
             return null;
        }

        const reconciliationCategory = categoryStore.categories.find(c => c.name === 'Ausgleichskorrekturen');
        const categoryId = reconciliationCategory?.id || null;

        const txData: Omit<Transaction, 'id' | 'runningBalance'> = {
            type: TransactionType.RECONCILE,
            date: toDateOnlyString(date),
            valueDate: toDateOnlyString(date),
            accountId: accountId,
            categoryId: categoryId,
            amount: amount,
            tagIds: [],
            payee: "Kontoabgleich",
            note: note || (amount > 0 ? "Korrektur Gutschrift" : "Korrektur Belastung"),
            counterTransactionId: null,
            planningTransactionId: null,
            isReconciliation: true,
            isCategoryTransfer: false,
            reconciled: true,
        };

        try {
            const newTx = this.addTransaction(txData);
            debugLog("[TransactionService] addReconcileTransaction - Added:", newTx);
            monthlyBalanceStore.calculateMonthlyBalances();
            return newTx;
        } catch (error) {
            debugLog('[TransactionService] addReconcileTransaction - Error:', error);
            return null;
        }
    },

    /**
     * Aktualisiert eine Transaktion.
     */
    updateTransaction(id: string, updates: Partial<Omit<Transaction, 'id' | 'runningBalance'>>): boolean {
        const transactionStore = useTransactionStore();
        const monthlyBalanceStore = useMonthlyBalanceStore();

        if (updates.date) updates.date = toDateOnlyString(updates.date);
        if (updates.valueDate) updates.valueDate = toDateOnlyString(updates.valueDate);

        const originalTx = transactionStore.getTransactionById(id);
        const success = transactionStore.updateTransaction(id, updates);
        if (success) {
            debugLog("[TransactionService] updateTransaction - Updated:", id);
            monthlyBalanceStore.calculateMonthlyBalances();

            if (originalTx && originalTx.type === TransactionType.INCOME && updates.amount !== undefined) {
                const diff = updates.amount - originalTx.amount;
                if (diff !== 0 && originalTx.categoryId) {
                    const categoryStore = useCategoryStore();
                    const availableFunds = categoryStore.getAvailableFundsCategory();
                    if (!availableFunds) {
                        throw new Error("Kategorie 'Verfügbare Mittel' nicht gefunden.");
                    }
                    const fromCategoryId = diff > 0 ? originalTx.categoryId : availableFunds.id;
                    const toCategoryId = diff > 0 ? availableFunds.id : originalTx.categoryId;
                    CategoryService.addCategoryTransfer(
                        fromCategoryId,
                        toCategoryId,
                        Math.abs(diff),
                        updates.date ? updates.date : originalTx.date,
                        "Automatischer Transfer bei Betragsanpassung"
                    );
                }
            }
        } else {
            debugLog("[TransactionService] updateTransaction - Failed to update or no changes:", id);
        }
        return success;
    },

    /**
     * Löscht eine Transaktion. Bei Transfers wird auch die Gegentransaktion gelöscht.
     */
    deleteTransaction(id: string): boolean {
        const transactionStore = useTransactionStore();
        const monthlyBalanceStore = useMonthlyBalanceStore();
        const txToDelete = transactionStore.getTransactionById(id);

        if (!txToDelete) {
            debugLog("[TransactionService] deleteTransaction - Transaction not found:", id);
            return false;
        }

        if (txToDelete.type === TransactionType.INCOME && txToDelete.amount > 0 && txToDelete.categoryId) {
            const categoryStore = useCategoryStore();
            const availableFunds = categoryStore.getAvailableFundsCategory();
            if (!availableFunds) {
                throw new Error("Kategorie 'Verfügbare Mittel' nicht gefunden.");
            }
            CategoryService.addCategoryTransfer(
                availableFunds.id,
                txToDelete.categoryId,
                txToDelete.amount,
                txToDelete.date,
                "Automatischer Transfer bei Löschung der Einnahme"
            );
        }

        let success = false;
        let counterTxId = txToDelete.counterTransactionId;
        success = transactionStore.deleteTransaction(id);

        if (success) {
            debugLog("[TransactionService] deleteTransaction - Deleted primary transaction:", id);
            if (counterTxId) {
                const counterTxDeleted = transactionStore.deleteTransaction(counterTxId);
                if (counterTxDeleted) {
                    debugLog("[TransactionService] deleteTransaction - Deleted counter transaction:", counterTxId);
                } else {
                    debugLog("[TransactionService] deleteTransaction - Failed to delete counter transaction:", counterTxId);
                }
            }
            monthlyBalanceStore.calculateMonthlyBalances();
        } else {
            debugLog("[TransactionService] deleteTransaction - Failed to delete primary transaction:", id);
        }
        return success;
    },

    /**
     * Löscht mehrere Transaktionen.
     */
    deleteMultipleTransactions(ids: string[]): { success: boolean; deletedCount: number } {
         let deletedCount = 0;
         let allSuccess = true;
         const uniqueIds = [...new Set(ids)];
         uniqueIds.forEach(id => {
             const success = this.deleteTransaction(id);
             if (success) {
                 deletedCount++;
             } else {
                 allSuccess = false;
             }
         });
         debugLog("[TransactionService] deleteMultipleTransactions - Attempted:", uniqueIds.length, "Deleted:", deletedCount);
         return { success: allSuccess && deletedCount > 0, deletedCount };
    }
};
