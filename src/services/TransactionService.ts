// src/services/TransactionService.ts
import { useTransactionStore } from '@/stores/transactionStore';
import { useAccountStore } from '@/stores/accountStore';
import { useCategoryStore } from '@/stores/categoryStore';
import { useRuleStore } from '@/stores/ruleStore';
import { useMonthlyBalanceStore } from '@/stores/monthlyBalanceStore';
import { Transaction, TransactionType } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { debugLog } from '@/utils/logger';
import { toDateOnlyString } from '@/utils/formatters';
import { addToHistory } from '@/utils/logger'; // Add direct import if required separately

export const TransactionService = {
  /**
   * Fügt eine neue Transaktion hinzu und aktualisiert alle relevanten Informationen
   */
  addTransaction(transaction: Omit<Transaction, 'id' | 'runningBalance'>) {
    const transactionStore = useTransactionStore();
    const accountStore = useAccountStore();
    const categoryStore = useCategoryStore();
    const ruleStore = useRuleStore();
    const monthlyBalanceStore = useMonthlyBalanceStore();

    let processedTx = { ...transaction };
    if (transaction.type !== TransactionType.CATEGORYTRANSFER) {
      processedTx = ruleStore.applyRulesToTransaction({ ...transaction }, 'PRE');
      processedTx = ruleStore.applyRulesToTransaction({ ...processedTx }, 'DEFAULT');
      processedTx = ruleStore.applyRulesToTransaction({ ...processedTx }, 'POST');
      debugLog('[TransactionService] addTransaction - Applied rules to transaction', processedTx);
    }

    let runningBalance = 0;
    if (processedTx.type !== TransactionType.CATEGORYTRANSFER) {
      const accountTransactions = transactionStore.getTransactionsByAccount(processedTx.accountId);
      runningBalance = accountTransactions.length > 0
        ? accountTransactions[0].runningBalance + processedTx.amount
        : processedTx.amount;
      accountStore.updateAccountBalance(processedTx.accountId, runningBalance);
    }

    const newTransaction: Transaction = {
      ...processedTx,
      id: uuidv4(),
      runningBalance,
      date: toDateOnlyString(processedTx.date),
      valueDate: toDateOnlyString(processedTx.valueDate || processedTx.date)
    };

    transactionStore.transactions.push(newTransaction);
    debugLog('[TransactionService] addTransaction', newTransaction);
    addToHistory(0, 'service', 'Transaction hinzugefügt', [newTransaction]);

    if (processedTx.categoryId) {
      if (processedTx.type === TransactionType.CATEGORYTRANSFER) {
        categoryStore.updateCategoryBalance(processedTx.categoryId, processedTx.amount);
      } else if (!processedTx.isReconciliation && processedTx.type !== TransactionType.ACCOUNTTRANSFER) {
        categoryStore.updateCategoryBalance(processedTx.categoryId, processedTx.amount);
      }
    }

    transactionStore.saveTransactions();
    monthlyBalanceStore.calculateMonthlyBalances();

    return newTransaction;
  },

  /**
   * Aktualisiert eine Transaktion
   */
  updateTransaction(id: string, updates: Partial<Transaction>) {
    const transactionStore = useTransactionStore();
    const monthlyBalanceStore = useMonthlyBalanceStore();

    const index = transactionStore.transactions.findIndex(transaction => transaction.id === id);
    if (index !== -1) {
      if (updates.date) {
        updates.date = toDateOnlyString(updates.date);
      }
      if (updates.valueDate) {
        updates.valueDate = toDateOnlyString(updates.valueDate);
      }

      transactionStore.transactions[index] = { ...transactionStore.transactions[index], ...updates };

      if (updates.hasOwnProperty('reconciled')) {
        const counterId = transactionStore.transactions[index].counterTransactionId;
        if (counterId) {
          const counterIndex = transactionStore.transactions.findIndex(tx => tx.id === counterId);
          if (counterIndex !== -1) {
            transactionStore.transactions[counterIndex] = {
              ...transactionStore.transactions[counterIndex],
              reconciled: updates.reconciled
            };
          }
        }
      }

      transactionStore.saveTransactions();
      this.updateRunningBalances(transactionStore.transactions[index].accountId);
      debugLog('[TransactionService] updateTransaction', { id, updates });
      addToHistory(0, 'service', 'Transaction geändert', [{ id, updates }]);
      monthlyBalanceStore.calculateMonthlyBalances();
      return true;
    }
    return false;
  },

  /**
   * Löscht eine Transaktion
   */
  deleteTransaction(id: string) {
    const transactionStore = useTransactionStore();
    const monthlyBalanceStore = useMonthlyBalanceStore();

    const transaction = transactionStore.transactions.find(tx => tx.id === id);
    if (!transaction) return false;

    const accountId = transaction.accountId;
    transactionStore.transactions = transactionStore.transactions.filter(tx => tx.id !== id);

    if (transaction.counterTransactionId) {
      transactionStore.transactions = transactionStore.transactions.filter(tx => tx.id !== transaction.counterTransactionId);
    }

    this.updateRunningBalances(accountId);
    transactionStore.saveTransactions();
    debugLog('[TransactionService] deleteTransaction', id);
    addToHistory(0, 'service', 'Transaction gelöscht', [{ id }]);
    monthlyBalanceStore.calculateMonthlyBalances();
    return true;
  },

  /**
   * Aktualisiert die Running Balances für ein Konto
   */
  updateRunningBalances(accountId: string) {
    const transactionStore = useTransactionStore();
    const accountStore = useAccountStore();

    const accountTxs = transactionStore.transactions.filter(tx => tx.accountId === accountId);
    accountTxs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let balance = 0;
    accountTxs.forEach(tx => {
      balance += tx.amount;
      tx.runningBalance = balance;
    });

    if (accountTxs.length > 0) {
      accountStore.updateAccountBalance(accountId, balance);
    }

    transactionStore.saveTransactions();
    debugLog('[TransactionService] updateRunningBalances', { accountId, finalBalance: balance });
  },

  /**
   * Fügt eine Ausgleichstransaktion hinzu
   */
  addReconcileTransaction(accountId: string, amount: number, date: string, note: string) {
    const transactionPayload = {
      date: toDateOnlyString(date),
      valueDate: toDateOnlyString(date),
      accountId,
      categoryId: null,
      tagIds: [],
      amount,
      note,
      recipientId: '',
      reconciled: true,
      type: TransactionType.RECONCILE,
      counterTransactionId: null,
      planningTransactionId: null,
      isReconciliation: true
    };

    return this.addTransaction(transactionPayload);
  },

  /**
   * Fügt einen Kontotransfer hinzu
   */
  addAccountTransfer(fromAccountId: string, toAccountId: string, amount: number, date: string, valueDate: string | null, note: string) {
    const transactionStore = useTransactionStore();
    const accountStore = useAccountStore();

    debugLog('[TransactionService] addAccountTransfer called', { fromAccountId, toAccountId, amount, date, valueDate, note });

    const getAccountName = (accountId: string) => {
      const account = accountStore.getAccountById(accountId);
      return account ? account.name : '';
    };

    const fromTransaction = {
      type: TransactionType.ACCOUNTTRANSFER,
      date,
      valueDate: valueDate || date,
      accountId: fromAccountId,
      categoryId: null,
      transferToAccountId: toAccountId,
      tagIds: [],
      payee: `Transfer zu ${getAccountName(toAccountId)}`,
      amount: -Math.abs(amount),
      note,
      counterTransactionId: null,
      planningTransactionId: null,
      isReconciliation: false
    };

    const toTransaction = {
      ...fromTransaction,
      accountId: toAccountId,
      transferToAccountId: fromAccountId,
      amount: Math.abs(amount),
      payee: `Transfer von ${getAccountName(fromAccountId)}`
    };

    const newFromTx = this.addTransaction(fromTransaction);
    const newToTx = this.addTransaction(toTransaction);

    this.updateTransaction(newFromTx.id, { counterTransactionId: newToTx.id });
    this.updateTransaction(newToTx.id, { counterTransactionId: newFromTx.id });

    debugLog('[TransactionService] addAccountTransfer', { fromTransaction: newFromTx, toTransaction: newToTx });
    return { fromTransaction: newFromTx, toTransaction: newToTx };
  }
};
