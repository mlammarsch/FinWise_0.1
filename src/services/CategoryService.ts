// src/services/CategoryService.ts
import { useCategoryStore } from '@/stores/categoryStore';
import { useTransactionStore } from '@/stores/transactionStore';
import { TransactionType, Category, Transaction } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { debugLog } from '@/utils/logger';
import { TransactionService } from './TransactionService';
import { toDateOnlyString } from '@/utils/formatters';
import { BalanceService } from './BalanceService';

interface CategorySaldoData {
  budgeted: number;
  spent: number;
  saldo: number;
}

export const CategoryService = {
  /**
   * Fügt einen Kategorientransfer hinzu
   */
  addCategoryTransfer(
    fromCategoryId: string,
    toCategoryId: string,
    amount: number,
    date: string,
    note: string = ''
  ) {
    const categoryStore = useCategoryStore();
    const fromCategoryName = categoryStore.getCategoryById(fromCategoryId)?.name ?? '';
    const toCategoryName = categoryStore.getCategoryById(toCategoryId)?.name ?? '';
    const normalizedDate = toDateOnlyString(date);

    const fromTx = {
      type: TransactionType.CATEGORYTRANSFER,
      date: normalizedDate,
      valueDate: normalizedDate,
      accountId: '',
      categoryId: fromCategoryId,
      amount: -Math.abs(amount),
      tagIds: [],
      payee: `Kategorientransfer zu ${toCategoryName}`,
      note,
      counterTransactionId: null,
      planningTransactionId: null,
      isReconciliation: false,
      isCategoryTransfer: true,
      toCategoryId: toCategoryId,
      reconciled: false,
    };

    const toTx = {
      ...fromTx,
      categoryId: toCategoryId,
      amount: Math.abs(amount),
      payee: `Kategorientransfer von ${fromCategoryName}`,
      toCategoryId: fromCategoryId,
    };

    const newFromTx = TransactionService.addTransaction(fromTx as Omit<Transaction, 'id' | 'runningBalance'>);
    const newToTx = TransactionService.addTransaction(toTx as Omit<Transaction, 'id' | 'runningBalance'>);

    TransactionService.updateTransaction(newFromTx.id, { counterTransactionId: newToTx.id });
    TransactionService.updateTransaction(newToTx.id, { counterTransactionId: newFromTx.id });

    debugLog('[CategoryService] addCategoryTransfer', { fromTransaction: newFromTx, toTransaction: newToTx });

    return { fromTransaction: newFromTx, toTransaction: newToTx };
  },

  /**
   * Fügt eine Income-Transaktion hinzu und verteilt automatisch zur Kategorie "Verfügbare Mittel".
   */
  async handleIncomeTransaction(transaction: Transaction) {
    const categoryStore = useCategoryStore();
    const availableFundsCategory = categoryStore.getAvailableFundsCategory();

    if (!availableFundsCategory) {
      throw new Error("Kategorie 'Verfügbare Mittel' nicht gefunden.");
    }

    const savedIncome = TransactionService.addTransaction(transaction);

    if (transaction.categoryId && savedIncome.amount > 0) {
      CategoryService.addCategoryTransfer(
        transaction.categoryId,
        availableFundsCategory.id,
        savedIncome.amount,
        savedIncome.date,
        `Automatischer Transfer von Einnahmen`
      );
    }

    debugLog('[CategoryService] handleIncomeTransaction - Income transaction and auto-transfer executed.', { transaction });
  },

  /**
   * Aktualisiert einen Kategorientransfer
   */
  updateCategoryTransfer(
    transactionId: string,
    gegentransactionId: string,
    fromCategoryId: string,
    toCategoryId: string,
    amount: number,
    date: string,
    note: string = ''
  ) {
    const categoryStore = useCategoryStore();
    const fromCategoryName = categoryStore.getCategoryById(fromCategoryId)?.name ?? '';
    const toCategoryName = categoryStore.getCategoryById(toCategoryId)?.name ?? '';
    const normalizedDate = toDateOnlyString(date);

    const updatedFromTx: Partial<Transaction> = {
      categoryId: fromCategoryId,
      amount: -Math.abs(amount),
      toCategoryId: toCategoryId,
      date: normalizedDate,
      valueDate: normalizedDate,
      payee: `Kategorientransfer zu ${toCategoryName}`,
      note
    };

    const updatedToTx: Partial<Transaction> = {
      categoryId: toCategoryId,
      amount: Math.abs(amount),
      toCategoryId: fromCategoryId,
      date: normalizedDate,
      valueDate: normalizedDate,
      payee: `Kategorientransfer von ${fromCategoryName}`,
      note
    };

    TransactionService.updateTransaction(transactionId, updatedFromTx);
    TransactionService.updateTransaction(gegentransactionId, updatedToTx);

    debugLog('[CategoryService] updateCategoryTransfer', { transactionId, gegentransactionId, updatedFromTx, updatedToTx });

    return true;
  },

  /**
   * Fügt eine Kategorie hinzu
   */
  addCategory(category: Omit<Category, 'id' | 'balance' | 'startBalance' | 'transactionCount' | 'averageTransactionValue'>) {
    const categoryStore = useCategoryStore();

    const newCategory: Category = {
      ...category,
      id: uuidv4(),
      balance: 0,
      startBalance: 0,
      transactionCount: 0,
      averageTransactionValue: 0,
      sortOrder: category.sortOrder ?? categoryStore.categories.length
    };

    const addedCategory = categoryStore.addCategory(newCategory);
    if (addedCategory) {
      debugLog("[CategoryService] addCategory:", addedCategory);
      return addedCategory;
    } else {
      debugLog("[CategoryService] addCategory - Failed to add category");
      return null;
    }
  },

  /**
   * Aktualisiert eine Kategorie
   */
  updateCategory(id: string, updates: Partial<Category>) {
    const categoryStore = useCategoryStore();
    const success = categoryStore.updateCategory(id, updates);
    if (success) {
      debugLog("[CategoryService] updateCategory - Updated:", id);
    } else {
      debugLog("[CategoryService] updateCategory - Failed to update:", id);
    }
    return success;
  },

  /**
   * Löscht eine Kategorie
   */
  deleteCategory(id: string) {
    const categoryStore = useCategoryStore();

    const hasChildren = categoryStore.categories.some(category => category.parentCategoryId === id);
    if (hasChildren) {
      debugLog("[CategoryService] deleteCategory - Failed: Category has children:", id);
      return false;
    }

    const success = categoryStore.deleteCategory(id);
    if (success) {
      debugLog("[CategoryService] deleteCategory - Deleted category id:", id);
    } else {
      debugLog("[CategoryService] deleteCategory - Failed to delete category id:", id);
    }
    return success;
  },

  /**
   * Holt den Namen einer Kategorie anhand ihrer ID.
   */
  getCategoryName(id: string | null): string {
    if (!id) return 'Keine Kategorie';
    const categoryStore = useCategoryStore();
    return categoryStore.getCategoryById(id)?.name || 'Unbekannte Kategorie';
  },

  /**
   * Berechnet den Saldo einer Ausgabenkategorie für einen Zeitraum.
   */
  calculateCategorySaldo(
    categoryId: string,
    monthStart: Date,
    monthEnd: Date
  ): CategorySaldoData {
    const transactionStore = useTransactionStore();
    const categoryStore = useCategoryStore();

    const normalizedMonthStart = new Date(toDateOnlyString(monthStart));
    const normalizedMonthEnd = new Date(toDateOnlyString(monthEnd));

    // Saldoabfrage über BalanceService
    const startSaldo = BalanceService.getTodayBalance('category', categoryId, new Date(normalizedMonthStart.getTime() - 1));
    const endSaldo = BalanceService.getTodayBalance('category', categoryId, normalizedMonthEnd);

    // Zur Berechnung der Ausgaben für diesen Monat
    const filteredTxsForSpent = transactionStore.transactions.filter(tx => {
      const txDate = new Date(toDateOnlyString(tx.valueDate));
      return tx.categoryId === categoryId &&
             txDate >= normalizedMonthStart && txDate <= normalizedMonthEnd &&
             tx.type === TransactionType.EXPENSE;
    });

    const spentAmount = filteredTxsForSpent.reduce((sum, tx) => sum + tx.amount, 0);

    const result: CategorySaldoData = {
      budgeted: 0, // Wird vom BudgetService separat berechnet
      spent: Math.abs(spentAmount),
      saldo: endSaldo
    };
    return result;
  },

  /**
   * Berechnet den Saldo einer Einnahmenkategorie für einen Zeitraum.
   */
  calculateIncomeCategorySaldo(
    categoryId: string,
    monthStart: Date,
    monthEnd: Date
  ): CategorySaldoData {
    const transactionStore = useTransactionStore();

    const normalizedMonthStart = new Date(toDateOnlyString(monthStart));
    const normalizedMonthEnd = new Date(toDateOnlyString(monthEnd));

    // Saldoabfrage über BalanceService
    const startSaldo = BalanceService.getTodayBalance('category', categoryId, new Date(normalizedMonthStart.getTime() - 1));
    const endSaldo = BalanceService.getTodayBalance('category', categoryId, normalizedMonthEnd);

    // Zur Berechnung der Einnahmen für diesen Monat
    const filteredTxsForSpent = transactionStore.transactions.filter(tx => {
      const txDate = new Date(toDateOnlyString(tx.valueDate));
      return tx.categoryId === categoryId &&
             txDate >= normalizedMonthStart && txDate <= normalizedMonthEnd &&
             tx.type === TransactionType.INCOME;
    });

    const receivedAmount = filteredTxsForSpent.reduce((sum, tx) => sum + tx.amount, 0);

    const result: CategorySaldoData = {
      budgeted: 0, // Wird vom BudgetService separat berechnet
      spent: receivedAmount,
      saldo: endSaldo
    };
    return result;
  },

  /**
   * Holt Optionen für das Kategorie-Transfer-Modal, inklusive Salden.
   */
  getCategoryTransferOptions(
    monthStart: Date,
    monthEnd: Date
  ): Array<{ id: string; name: string; saldo: number }> {
    const categoryStore = useCategoryStore();
    const availableFundsCategory = categoryStore.getAvailableFundsCategory();

    return categoryStore.categories
      .filter(cat => cat.isActive)
      .map(cat => {
        // Saldo über BalanceService abfragen
        const saldo = BalanceService.getTodayBalance('category', cat.id, monthEnd);
        return {
          id: cat.id,
          name: cat.name,
          saldo: saldo
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }
};
