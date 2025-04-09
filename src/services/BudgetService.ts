// src/services/BudgetService.ts
import { useCategoryStore } from '@/stores/categoryStore';
import { useTransactionStore } from '@/stores/transactionStore';
import { useMonthlyBalanceStore } from '@/stores/monthlyBalanceStore';
import { Category, TransactionType } from '@/types';
import {
  calculateCategorySaldo,
  calculateIncomeCategorySaldo,
} from '@/utils/runningBalances';
import { toDateOnlyString } from '@/utils/formatters';
import { debugLog } from '@/utils/logger';
import { CategoryService } from './CategoryService'; // Import CategoryService

interface MonthlyBudgetData {
  budgeted: number;
  spent: number;
  saldo: number;
}

interface MonthlySummary {
    budgeted: number;
    spentMiddle: number; // Actual transactions (spent)
    saldoFull: number;   // Balance including transfers
}


export const BudgetService = {

  /**
   * Holt die aggregierten Budgetdaten für eine spezifische Kategorie und deren Kinder für einen Monat.
   */
  getAggregatedMonthlyBudgetData(
    categoryId: string,
    monthStart: Date,
    monthEnd: Date
  ): MonthlyBudgetData {
    const categoryStore = useCategoryStore();
    const cat = categoryStore.getCategoryById(categoryId);

    if (!cat) {
      debugLog('[BudgetService] getAggregatedMonthlyBudgetData - Category not found:', categoryId);
      return { budgeted: 0, spent: 0, saldo: 0 };
    }

    const calculateFunc = cat.isIncomeCategory
      ? CategoryService.calculateIncomeCategorySaldo // Corrected call
      : CategoryService.calculateCategorySaldo;      // Corrected call

    // Calculate for the parent category
    let aggData = calculateFunc(
      categoryId,
      monthStart,
      monthEnd
    );

    // Add children data
    const children = categoryStore
      .getChildCategories(cat.id)
      .filter((c) => c.isActive); // Consider only active children

    children.forEach((child) => {
      const childData = calculateFunc(
        child.id,
        monthStart,
        monthEnd
      );
      aggData.budgeted += childData.budgeted;
      aggData.spent += childData.spent;
      aggData.saldo += childData.saldo;
    });

      //debugLog('[BudgetService] getAggregatedMonthlyBudgetData', { categoryId, monthStart, monthEnd, result: aggData });
    return aggData;
  },

  /**
  * Berechnet die Zusammenfassung für Ausgaben oder Einnahmen für einen bestimmten Monat.
  * @param monthStart - Startdatum des Monats
  * @param monthEnd - Enddatum des Monats
  * @param type - 'expense' oder 'income'
  * @returns MonthlySummary - Aggregierte Werte
  */
  getMonthlySummary(monthStart: Date, monthEnd: Date, type: 'expense' | 'income'): MonthlySummary {
      const categoryStore = useCategoryStore();
      let summary: MonthlySummary = { budgeted: 0, spentMiddle: 0, saldoFull: 0 };
      const isIncome = type === 'income';

      const rootCategories = categoryStore.categories.filter(
          c => c.isActive && !c.parentCategoryId && c.isIncomeCategory === isIncome && c.name !== 'Verfügbare Mittel'
      );

      rootCategories.forEach(cat => {
          const data = this.getAggregatedMonthlyBudgetData(cat.id, monthStart, monthEnd);
          summary.budgeted += data.budgeted;
          summary.spentMiddle += data.spent; // 'spent' from calculation maps to 'spentMiddle'
          summary.saldoFull += data.saldo;   // 'saldo' from calculation maps to 'saldoFull'
      });

      debugLog('[BudgetService] getMonthlySummary', { monthStart, monthEnd, type, result: summary });
      return summary;
  }
};
