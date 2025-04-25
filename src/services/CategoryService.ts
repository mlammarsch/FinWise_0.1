// Datei: src/services/CategoryService.ts
import { useCategoryStore } from '@/stores/categoryStore'
import { TransactionType, Category } from '@/types'
import { v4 as uuidv4 } from 'uuid'
import { debugLog } from '@/utils/logger'
import { TransactionService } from './TransactionService'
import { BudgetService } from './BudgetService'

export const CategoryService = {
  /**
   * Fügt einen Kategorientransfer hinzu (delegiert an TransactionService)
   */
  addCategoryTransfer(
    fromCategoryId: string,
    toCategoryId: string,
    amount: number,
    date: string,
    note: string = ''
  ) {
    return TransactionService.addCategoryTransfer(
      fromCategoryId,
      toCategoryId,
      amount,
      date,
      note
    )
  },

  /**
   * Aktualisiert einen Kategorientransfer (delegiert an TransactionService)
   */
  updateCategoryTransfer(
    transactionId: string,
    counterTransactionId: string,
    fromCategoryId: string,
    toCategoryId: string,
    amount: number,
    date: string,
    note: string = ''
  ) {
    return TransactionService.updateCategoryTransfer(
      transactionId,
      counterTransactionId,
      fromCategoryId,
      toCategoryId,
      amount,
      date,
      note
    )
  },

  /**
   * Fügt eine Kategorie hinzu
   */
  addCategory(category: Omit<Category, 'id' | 'balance' | 'startBalance' | 'transactionCount' | 'averageTransactionValue'>) {
    const categoryStore = useCategoryStore()

    const newCategory: Category = {
      ...category,
      id: uuidv4(),
      balance: 0,
      startBalance: 0,
      transactionCount: 0,
      averageTransactionValue: 0,
      sortOrder: category.sortOrder ?? categoryStore.categories.length
    }

    const added = categoryStore.addCategory(newCategory)
    if (added) {
      debugLog("[CategoryService] addCategory:", added)
      return added
    } else {
      debugLog("[CategoryService] addCategory - Failed")
      return null
    }
  },

  /**
   * Aktualisiert eine Kategorie
   */
  updateCategory(id: string, updates: Partial<Category>) {
    const success = useCategoryStore().updateCategory(id, updates)
    debugLog("[CategoryService] updateCategory -", id, success)
    return success
  },

  /**
   * Löscht eine Kategorie
   */
  deleteCategory(id: string) {
    const store = useCategoryStore()
    const hasChildren = store.categories.some(c => c.parentCategoryId === id)
    if (hasChildren) {
      debugLog("[CategoryService] deleteCategory - Has children:", id)
      return false
    }
    const success = store.deleteCategory(id)
    debugLog("[CategoryService] deleteCategory -", id, success)
    return success
  },

  /**
   * Holt den Namen einer Kategorie anhand ihrer ID.
   */
  getCategoryName(id: string | null): string {
    if (!id) return 'Keine Kategorie'
    return useCategoryStore().getCategoryById(id)?.name || 'Unbekannte Kategorie'
  },

  /**
   * Berechnet den Saldo einer Ausgabenkategorie für einen Zeitraum.
   */
  calculateCategorySaldo(
    categoryId: string,
    monthStart: Date,
    monthEnd: Date
  ) {
    return BudgetService.getAggregatedMonthlyBudgetData(categoryId, monthStart, monthEnd)
  },

  /**
   * Berechnet den Saldo einer Einnahmenkategorie für einen Zeitraum.
   */
  calculateIncomeCategorySaldo(
    categoryId: string,
    monthStart: Date,
    monthEnd: Date
  ) {
    return BudgetService.getAggregatedMonthlyBudgetData(categoryId, monthStart, monthEnd)
  },

  /**
   * Holt Optionen für das Kategorie-Transfer-Modal, inklusive Salden.
   */
  getCategoryTransferOptions(monthStart: Date, monthEnd: Date) {
    const store = useCategoryStore()
    const available = store.getAvailableFundsCategory()
    return store.categories
      .filter(c => c.isActive)
      .map(c => {
        const data = c.isIncomeCategory && c.id !== available?.id
          ? this.calculateIncomeCategorySaldo(c.id, monthStart, monthEnd)
          : this.calculateCategorySaldo(c.id, monthStart, monthEnd)
        return { id: c.id, name: c.name, saldo: data.saldo }
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  },
}
