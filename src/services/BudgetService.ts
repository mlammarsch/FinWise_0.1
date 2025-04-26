// src/services/BudgetService.ts
import { useCategoryStore } from "@/stores/categoryStore";
import { useTransactionStore } from "@/stores/transactionStore";
import { usePlanningStore } from "@/stores/planningStore";
import { PlanningService } from "./PlanningService";
import { Category, TransactionType } from "@/types";
import { toDateOnlyString } from "@/utils/formatters";
import { debugLog } from "@/utils/logger";
import { BalanceService } from "./BalanceService";

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
      const occurrences = PlanningService.calculateNextOccurrences(
        planTx,
        startStr,
        endStr
      );
      amount += planTx.amount * occurrences.length;
    }
  });

  // Kinder rekursiv
  categoryStore
    .getChildCategories(categoryId)
    .filter(c => c.isActive)
    .forEach(child => {
      amount += getPlannedAmountForCategory(child.id, monthStart, monthEnd);
    });

  return amount;
}

/* ----------------------- Expense‑Kategorie‑Berechnung ----------------------- */

function computeExpenseCategoryData(
  categoryId: string,
  monthStart: Date,
  monthEnd: Date
): MonthlyBudgetData {
  const categoryStore = useCategoryStore();
  const transactionStore = useTransactionStore();
  const cat = categoryStore.getCategoryById(categoryId);
  if (!cat) return { budgeted: 0, spent: 0, saldo: 0 };

  // Vormonats‑Saldo (prognostiziert oder 0) über BalanceService
  const prev = new Date(monthStart);
  prev.setDate(prev.getDate() - 1); // Tag vor Monatsstart
  const previousSaldo = BalanceService.getProjectedBalance('category', categoryId, prev);

  // Buchungen dieses Monats - KORRIGIERT: valueDate statt date verwenden
  const txs = transactionStore.transactions.filter(tx => {
    const d = new Date(toDateOnlyString(tx.valueDate));
    return tx.categoryId === categoryId && d >= monthStart && d <= monthEnd;
  });

  // Budget‑Transfers (positiv)
  const budgetAmount = txs
    .filter(tx => tx.type === TransactionType.CATEGORYTRANSFER)
    .reduce((s, tx) => s + tx.amount, 0);

  // echte Ausgaben
  const expenseAmount = txs
    .filter(tx => tx.type === TransactionType.EXPENSE)
    .reduce((s, tx) => s + tx.amount, 0);

  const plannedAmount = getPlannedAmountForCategory(
    categoryId,
    monthStart,
    monthEnd
  );

  const spent = expenseAmount + plannedAmount;
  const saldo = previousSaldo + budgetAmount + spent;

  // Kinder
  let totalBudget = budgetAmount;
  let totalSpent = spent;
  let totalSaldo = saldo;

  categoryStore
    .getChildCategories(categoryId)
    .filter(c => c.isActive)
    .forEach(child => {
      const childData = computeExpenseCategoryData(
        child.id,
        monthStart,
        monthEnd
      );
      totalBudget += childData.budgeted;
      totalSpent += childData.spent;
      totalSaldo += childData.saldo - previousSaldo; // nur Differenz addieren
    });

  return { budgeted: totalBudget, spent: totalSpent, saldo: totalSaldo };
}

/* ------------------------ Income‑Kategorie‑Berechnung ----------------------- */

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

  // KORRIGIERT: valueDate statt date verwenden
  const txs = transactionStore.transactions.filter(tx => {
    const d = new Date(toDateOnlyString(tx.valueDate));
    return (
      tx.categoryId === categoryId &&
      d >= monthStart &&
      d <= monthEnd &&
      tx.type === TransactionType.INCOME
    );
  });
  const incomeAmount = txs.reduce((s, tx) => s + tx.amount, 0);

  let totalBudget = plannedAmount;
  let totalSpent = incomeAmount;
  let totalSaldo = incomeAmount - plannedAmount;

  categoryStore
    .getChildCategories(categoryId)
    .filter(c => c.isActive)
    .forEach(child => {
      const childData = computeIncomeCategoryData(child.id, monthStart, monthEnd);
      totalBudget += childData.budgeted;
      totalSpent += childData.spent;
      totalSaldo += childData.saldo;
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

    // Berechnung über die bestehende Funktionen, die jetzt BalanceService nutzen
    return cat.isIncomeCategory
      ? computeIncomeCategoryData(categoryId, monthStart, monthEnd)
      : computeExpenseCategoryData(categoryId, monthStart, monthEnd);
  },

  getMonthlySummary(
    monthStart: Date,
    monthEnd: Date,
    type: "expense" | "income"
  ): MonthlySummary {
    const categoryStore = useCategoryStore();
    const isIncome = type === "income";
    const roots = categoryStore.categories.filter(
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
