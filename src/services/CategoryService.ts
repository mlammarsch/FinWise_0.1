// src/services/CategoryService.ts
import { useCategoryStore } from '@/stores/categoryStore';
import { useTransactionStore } from '@/stores/transactionStore';
import { useMonthlyBalanceStore } from '@/stores/monthlyBalanceStore';
import { TransactionType, Category } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { debugLog } from '@/utils/logger';

export const CategoryService = {
  /**
   * Fügt einen Kategorietransfer hinzu
   */
  addCategoryTransfer(
    fromCategoryId: string,
    toCategoryId: string,
    amount: number,
    date: string,
    note: string = ''
  ) {
    const transactionStore = useTransactionStore();
    const categoryStore = useCategoryStore();
    const monthlyBalanceStore = useMonthlyBalanceStore();

    const fromTx = {
      type: TransactionType.CATEGORYTRANSFER,
      date,
      valueDate: date,
      accountId: '',
      categoryId: fromCategoryId,
      amount: -Math.abs(amount),
      tagIds: [],
      payee: `Kategorientransfer zu ${categoryStore.getCategoryById(toCategoryId)?.name ?? ''}`,
      note,
      counterTransactionId: null,
      planningTransactionId: null,
      isReconciliation: false,
      isCategoryTransfer: true,
      toCategoryId: toCategoryId
    };

    const toTx = {
      ...fromTx,
      categoryId: toCategoryId,
      amount: Math.abs(amount),
      payee: `Kategorientransfer von ${categoryStore.getCategoryById(fromCategoryId)?.name ?? ''}`,
      toCategoryId: fromCategoryId
    };

    // Hier verwende ich den TransactionStore direkt, in einer größeren Anwendung
    // sollte man überlegen, wie man zirkuläre Abhängigkeiten vermeidet
    const newFromTx = transactionStore.addTransaction(fromTx);
    const newToTx = transactionStore.addTransaction(toTx);

    transactionStore.updateTransaction(newFromTx.id, { counterTransactionId: newToTx.id });
    transactionStore.updateTransaction(newToTx.id, { counterTransactionId: newFromTx.id });

    // Monatliche Salden aktualisieren
    monthlyBalanceStore.calculateMonthlyBalances();

    debugLog('[CategoryService] addCategoryTransfer', { fromTransaction: newFromTx, toTransaction: newToTx });

    return { fromTransaction: newFromTx, toTransaction: newToTx };
  },

  /**
   * Aktualisiert einen Kategorietransfer
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
    const transactionStore = useTransactionStore();
    const categoryStore = useCategoryStore();
    const monthlyBalanceStore = useMonthlyBalanceStore();

    const updatedFromTx = {
      categoryId: fromCategoryId,
      amount: -Math.abs(amount),
      toCategoryId: toCategoryId,
      date,
      valueDate: date,
      payee: `Kategorientransfer zu ${categoryStore.getCategoryById(toCategoryId)?.name ?? ''}`,
      note
    };

    const updatedToTx = {
      categoryId: toCategoryId,
      amount: Math.abs(amount),
      toCategoryId: fromCategoryId,
      date,
      valueDate: date,
      payee: `Kategorientransfer von ${categoryStore.getCategoryById(fromCategoryId)?.name ?? ''}`,
      note
    };

    transactionStore.updateTransaction(transactionId, updatedFromTx);
    transactionStore.updateTransaction(gegentransactionId, updatedToTx);

    // Monatliche Salden aktualisieren
    monthlyBalanceStore.calculateMonthlyBalances();

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
      averageTransactionValue: 0
    };

    categoryStore.categories.push(newCategory);
    debugLog("[CategoryService] addCategory:", newCategory);
    categoryStore.saveCategories();

    return newCategory;
  },

  /**
   * Aktualisiert eine Kategorie
   */
  updateCategory(id: string, updates: Partial<Category>) {
    const categoryStore = useCategoryStore();

    const index = categoryStore.categories.findIndex(category => category.id === id);
    if (index !== -1) {
      categoryStore.categories[index] = { ...categoryStore.categories[index], ...updates };
      debugLog("[CategoryService] updateCategory - Updated:", categoryStore.categories[index]);
      categoryStore.saveCategories();
      return true;
    }
    return false;
  },

  /**
   * Löscht eine Kategorie
   */
  deleteCategory(id: string) {
    const categoryStore = useCategoryStore();

    // Prüfe, ob die Kategorie Kinder hat
    const hasChildren = categoryStore.categories.some(category => category.parentCategoryId === id);
    if (hasChildren) {
      return false;
    }

    categoryStore.categories = categoryStore.categories.filter(category => category.id !== id);
    debugLog("[CategoryService] deleteCategory - Deleted category id:", id);
    categoryStore.saveCategories();
    return true;
  }
};
