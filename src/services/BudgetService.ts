// Pfad: src/services/BudgetService.ts
import { useCategoryStore } from "@/stores/categoryStore";
import { useTransactionStore } from "@/stores/transactionStore";
import { useMonthlyBalanceStore } from "@/stores/monthlyBalanceStore";
import { usePlanningStore } from "@/stores/planningStore";
import { PlanningService } from "./PlanningService";
import { Category, TransactionType } from "@/types";
import { toDateOnlyString } from "@/utils/formatters";
import { debugLog } from "@/utils/logger";

interface MonthlyBudgetData {
  budgeted: number;
  spent: number;
  saldo: number;
}
interface MonthlySummary {
  budgeted: number;
  spentMiddle: number;
  saldoFull: number;
}

/* ----------------------------- Hilfsfunktionen ----------------------------- */
function getPlannedAmountForCategory(
  categoryId: string,
  monthStart: Date,
  monthEnd: Date
): number {
  const planningStore = usePlanningStore();
  const categoryStore = useCategoryStore();
  let amount = 0;
  const startStr = toDateOnlyString(monthStart);
  const endStr = toDateOnlyString(monthEnd);

  planningStore.planningTransactions.forEach(planTx => {
    if (planTx.isActive && planTx.categoryId === categoryId) {
      const occ = PlanningService
        .calculateNextOccurrences(planTx, startStr, endStr)
        .length;
      amount += planTx.amount * occ;
    }
  });

  categoryStore
    .getChildCategories(categoryId)
    .filter(c => c.isActive)
    .forEach(child => {
      amount += getPlannedAmountForCategory(child.id, monthStart, monthEnd);
    });

  return amount;
}

/* ----------------------- Expense-Kategorie-Berechnung ----------------------- */
function computeExpenseCategoryData(
  categoryId: string,
  monthStart: Date,
  monthEnd: Date
): MonthlyBudgetData {
  const categoryStore = useCategoryStore();
  const transactionStore = useTransactionStore();
  const mbStore = useMonthlyBalanceStore();
  const cat = categoryStore.getCategoryById(categoryId);
  if (!cat) return { budgeted: 0, spent: 0, saldo: 0 };

  // Vormonats-Saldo
  const prev = new Date(monthStart);
  prev.setMonth(prev.getMonth() - 1);
  const previousSaldo =
    mbStore.getProjectedCategoryBalanceForDate(categoryId, prev) ?? 0;

  // Alle Buchungen des Monats
  const txs = transactionStore.transactions.filter(tx => {
    const d = new Date(toDateOnlyString(tx.date));
    return tx.categoryId === categoryId && d >= monthStart && d <= monthEnd;
  });

  // Budget-Transfers (nur CATEGORYTRANSFER)
  const budgetAmount = txs
    .filter(tx => tx.type === TransactionType.CATEGORYTRANSFER)
    .reduce((sum, tx) => sum + tx.amount, 0);

  // Ausgaben
  const expenseAmount = txs
    .filter(tx => tx.type === TransactionType.EXPENSE)
    .reduce((sum, tx) => sum + tx.amount, 0);

  // Geplante Ausgaben
  const plannedAmount = getPlannedAmountForCategory(
    categoryId,
    monthStart,
    monthEnd
  );

  // Transaktionen (Ausgaben + Planung)
  const spent = expenseAmount + plannedAmount;
  const saldo = previousSaldo + budgetAmount + spent;

  // Unterkategorien rekursiv addieren
  let totalBudget = budgetAmount;
  let totalSpent = spent;
  let totalSaldo = saldo;

  categoryStore
    .getChildCategories(categoryId)
    .filter(c => c.isActive)
    .forEach(child => {
      const d = computeExpenseCategoryData(child.id, monthStart, monthEnd);
      totalBudget += d.budgeted;
      totalSpent += d.spent;
      totalSaldo += d.saldo - previousSaldo;
    });

  return { budgeted: totalBudget, spent: totalSpent, saldo: totalSaldo };
}

/* ------------------------ Income-Kategorie-Berechnung ----------------------- */
function computeIncomeCategoryData(
  categoryId: string,
  monthStart: Date,
  monthEnd: Date
): MonthlyBudgetData {
  const categoryStore = useCategoryStore();
  const transactionStore = useTransactionStore();
  const cat = categoryStore.getCategoryById(categoryId);
  if (!cat) return { budgeted: 0, spent: 0, saldo: 0 };

  const plannedAmount = getPlannedAmountForCategory(
    categoryId,
    monthStart,
    monthEnd
  );

  const txs = transactionStore.transactions.filter(tx => {
    const d = new Date(toDateOnlyString(tx.date));
    return (
      tx.categoryId === categoryId &&
      d >= monthStart &&
      d <= monthEnd &&
      tx.type === TransactionType.INCOME
    );
  });
  const incomeAmount = txs.reduce((sum, tx) => sum + tx.amount, 0);

  const totalBudget = plannedAmount;
  const totalSpent = incomeAmount;
  const totalSaldo = incomeAmount - plannedAmount;

  categoryStore
    .getChildCategories(categoryId)
    .filter(c => c.isActive)
    .forEach(child => {
      const d = computeIncomeCategoryData(child.id, monthStart, monthEnd);
      totalBudget += d.budgeted;
      totalSpent += d.spent;
      totalSaldo += d.saldo;
    });

  return { budgeted: totalBudget, spent: totalSpent, saldo: totalSaldo };
}

/* ------------------------------ Public API ---------------------------------- */
export const BudgetService = {
  getAggregatedMonthlyBudgetData(
    categoryId: string,
    monthStart: Date,
    monthEnd: Date
  ): MonthlyBudgetData {
    const cat = useCategoryStore().getCategoryById(categoryId);
    if (!cat) {
      debugLog("[BudgetService] Category not found", categoryId);
      return { budgeted: 0, spent: 0, saldo: 0 };
    }
    return cat.isIncomeCategory
      ? computeIncomeCategoryData(categoryId, monthStart, monthEnd)
      : computeExpenseCategoryData(categoryId, monthStart, monthEnd);
  },

  getMonthlySummary(
    monthStart: Date,
    monthEnd: Date,
    type: "expense" | "income"
  ): MonthlySummary {
    const store = useCategoryStore();
    const isIncome = type === "income";
    const roots = store.categories.filter(
      c =>
        c.isActive &&
        !c.parentCategoryId &&
        c.isIncomeCategory === isIncome &&
        c.name !== "Verfügbare Mittel"
    );

    const sum: MonthlySummary = { budgeted: 0, spentMiddle: 0, saldoFull: 0 };
    roots.forEach(cat => {
      const d = this.getAggregatedMonthlyBudgetData(
        cat.id,
        monthStart,
        monthEnd
      );
      sum.budgeted += d.budgeted;
      sum.spentMiddle += d.spent;
      sum.saldoFull += d.saldo;
    });
    debugLog("[BudgetService] Monthly summary", { monthStart, monthEnd, type, sum });
    return sum;
  },
};
