// src/services/BudgetService.ts
import { useCategoryStore } from "@/stores/categoryStore";
import { useTransactionStore } from "@/stores/transactionStore";
import { useMonthlyBalanceStore } from "@/stores/monthlyBalanceStore";
import { usePlanningStore } from "@/stores/planningStore";
import { PlanningService } from "./PlanningService"; // <‑‑ neu
import { Category, TransactionType } from "@/types";
import { toDateOnlyString } from "@/utils/formatters";
import { debugLog } from "@/utils/logger";
import { CategoryService } from "./CategoryService";

interface MonthlyBudgetData {
  budgeted: number; // Summe der Planbuchungen
  spent: number;    // Summe der tatsächlichen Transaktionen (Expenses bzw. Incomes)
  saldo: number;    // Endsaldo der Kategorie
}

interface MonthlySummary {
  budgeted: number;
  spentMiddle: number;
  saldoFull: number;
}

/**
 * Ermittelt die Summe aller Planbuchungen (aktive Planung) für eine Kategorie
 * (inkl. untergeordneter Kategorien) im angegebenen Zeitraum.
 */
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

  planningStore.planningTransactions.forEach((planTx) => {
    if (planTx.isActive && planTx.categoryId === categoryId) {
      const occurrences = PlanningService.calculateNextOccurrences(           // geändert
        planTx,
        startStr,
        endStr
      );
      // Planbuchungen addieren
      amount += planTx.amount * occurrences.length;
    }
  });

  // Kinder der Kategorie rekursiv einbeziehen
  const children = categoryStore
    .getChildCategories(categoryId)
    .filter((c) => c.isActive);
  children.forEach((child) => {
    amount += getPlannedAmountForCategory(child.id, monthStart, monthEnd);
  });

  return amount;
}

/**
 * Berechnet die Daten für eine Ausgabenkategorie (inkl. Kinder):
 * - budgeted: Summe CATEGORYTRANSFER (positiv) + ggf. Planbuchungen, falls man das dort einbezieht
 * - spent: Summe EXPENSE (in der Regel negative), + Planbuchungen als Ausgabe
 * - saldo: Vormonatssaldo (ggf. prognostiziert) + budget + spent
 */
function computeExpenseCategoryData(
  categoryId: string,
  monthStart: Date,
  monthEnd: Date
): MonthlyBudgetData {
  const categoryStore = useCategoryStore();
  const transactionStore = useTransactionStore();
  const monthlyBalanceStore = useMonthlyBalanceStore();
  const cat = categoryStore.getCategoryById(categoryId);
  if (!cat) return { budgeted: 0, spent: 0, saldo: 0 };

  // Prognostizierten Vormonatssaldo holen (falls vorhanden)
  // 1) Versuche, den projected-Balance aus dem monthlyBalanceStore zu bekommen
  const prevDate = new Date(monthStart);
  prevDate.setMonth(prevDate.getMonth() - 1);
  let previousSaldo =
    monthlyBalanceStore.getProjectedCategoryBalanceForDate(
      categoryId,
      prevDate
    ) || 0;

  // Alle Transaktionen des aktuellen Monats
  const txs = transactionStore.transactions.filter((tx) => {
    const txDate = new Date(toDateOnlyString(tx.date));
    return (
      tx.categoryId === categoryId && txDate >= monthStart && txDate <= monthEnd
    );
  });

  // Summe positiver CATEGORYTRANSFER (Budget-Transfers)
  const budgetAmount = txs
    .filter(
      (tx) => tx.type === TransactionType.CATEGORYTRANSFER && tx.amount > 0
    )
    .reduce((sum, tx) => sum + tx.amount, 0);

  // EXPENSE-Transaktionen
  const expenseAmount = txs
    .filter((tx) => tx.type === TransactionType.EXPENSE)
    .reduce((sum, tx) => sum + tx.amount, 0);

  // Planbuchungen in diesem Zeitraum
  const plannedAmount = getPlannedAmountForCategory(
    categoryId,
    monthStart,
    monthEnd
  );

  // spent = Summe realer Ausgaben plus Plan-Ausgaben
  const spent = expenseAmount + plannedAmount;
  // Saldo = Vormonat + Budget + Ausgaben
  let saldo = previousSaldo + budgetAmount + spent;

  // Kinderkategorien addieren
  const children = categoryStore
    .getChildCategories(categoryId)
    .filter((c) => c.isActive);
  let totalBudget = budgetAmount;
  let totalSpent = spent;
  let totalSaldo = saldo;

  children.forEach((child) => {
    const childData = computeExpenseCategoryData(
      child.id,
      monthStart,
      monthEnd
    );
    totalBudget += childData.budgeted;
    totalSpent += childData.spent;
    totalSaldo += childData.saldo - previousSaldo;
    // childData.saldo enthält bereits child-previousSaldo.
    // Wir addieren nur die Differenz!
  });

  return {
    budgeted: totalBudget,
    spent: totalSpent,
    saldo: totalSaldo,
  };
}

/**
 * Berechnet die Daten für eine Einnahmekategorie (inkl. Kinder):
 * - budgeted: Summe der Planbuchungen
 * - spent: Summe der realen INCOME-Transaktionen
 * - saldo: spent - budgeted (keine Vormonatsfortführung)
 */
function computeIncomeCategoryData(
  categoryId: string,
  monthStart: Date,
  monthEnd: Date
): MonthlyBudgetData {
  const categoryStore = useCategoryStore();
  const transactionStore = useTransactionStore();
  const cat = categoryStore.getCategoryById(categoryId);
  if (!cat) return { budgeted: 0, spent: 0, saldo: 0 };

  // Planbuchungen im Zeitraum
  const plannedAmount = getPlannedAmountForCategory(categoryId, monthStart, monthEnd);

  // Reale INCOME-Transaktionen
  const txs = transactionStore.transactions.filter((tx) => {
    const txDate = new Date(toDateOnlyString(tx.date));
    return (
      tx.categoryId === categoryId &&
      txDate >= monthStart &&
      txDate <= monthEnd &&
      tx.type === TransactionType.INCOME
    );
  });
  const incomeAmount = txs.reduce((sum, tx) => sum + tx.amount, 0);

  // Kinder
  const children = categoryStore
    .getChildCategories(categoryId)
    .filter((c) => c.isActive);

  let totalBudget = plannedAmount;
  let totalSpent = incomeAmount;
  let totalSaldo = incomeAmount - plannedAmount;

  children.forEach((child) => {
    const childData = computeIncomeCategoryData(child.id, monthStart, monthEnd);
    totalBudget += childData.budgeted;
    totalSpent += childData.spent;
    totalSaldo += childData.saldo;
  });

  return {
    budgeted: totalBudget,
    spent: totalSpent,
    saldo: totalSaldo,
  };
}

export const BudgetService = {
  /**
   * Aggregierte Monatswerte für eine Kategorie (inkl. Kinder).
   */
  getAggregatedMonthlyBudgetData(
    categoryId: string,
    monthStart: Date,
    monthEnd: Date
  ): MonthlyBudgetData {
    const categoryStore = useCategoryStore();
    const cat = categoryStore.getCategoryById(categoryId);
    if (!cat) {
      debugLog(
        "[BudgetService] getAggregatedMonthlyBudgetData - Category not found:",
        categoryId
      );
      return { budgeted: 0, spent: 0, saldo: 0 };
    }

    if (cat.isIncomeCategory) {
      // Einnahmen: saldo = sum(INCOME) - sum(Planbuchungen)
      return computeIncomeCategoryData(categoryId, monthStart, monthEnd);
    } else {
      // Ausgaben: saldo = Vormonat + Transfers + Ausgaben(inkl. Plan)
      return computeExpenseCategoryData(categoryId, monthStart, monthEnd);
    }
  },

  /**
   * Monatsübersicht über alle Ausgaben- oder Einnahmekategorien.
   * Im UI wird Budget / Transakt. / Saldo dargestellt.
   */
  getMonthlySummary(
    monthStart: Date,
    monthEnd: Date,
    type: "expense" | "income"
  ): MonthlySummary {
    const categoryStore = useCategoryStore();
    let summary: MonthlySummary = { budgeted: 0, spentMiddle: 0, saldoFull: 0 };
    const isIncome = type === "income";

    const rootCategories = categoryStore.categories.filter(
      (c) =>
        c.isActive &&
        !c.parentCategoryId &&
        c.isIncomeCategory === isIncome &&
        c.name !== "Verfügbare Mittel"
    );

    rootCategories.forEach((cat) => {
      const data = this.getAggregatedMonthlyBudgetData(
        cat.id,
        monthStart,
        monthEnd
      );
      summary.budgeted += data.budgeted;
      summary.spentMiddle += data.spent;
      summary.saldoFull += data.saldo;
    });

    debugLog("[BudgetService] getMonthlySummary", {
      monthStart,
      monthEnd,
      type,
      result: summary,
    });
    return summary;
  },
};
