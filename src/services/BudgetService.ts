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

/**
 * Ermittelt geplante Beträge für eine Kategorie innerhalb eines Monatszeitraums.
 * Berücksichtigt wiederkehrende Planungstransaktionen und summiert deren Beträge.
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

  // Eigene Plantransaktionen berechnen
  planningStore.planningTransactions.forEach(planTx => {
    if (planTx.isActive && planTx.categoryId === categoryId) {
      // Nur INCOME und EXPENSE berücksichtigen, keine ACCOUNTTRANSFER
      if (planTx.transactionType !== TransactionType.ACCOUNTTRANSFER) {
        const occ = PlanningService
          .calculateNextOccurrences(planTx, startStr, endStr)
          .length;
        amount += planTx.amount * occ;
      }
    }
  });

  // Kind-Kategorien rekursiv einbeziehen
  categoryStore
    .getChildCategories(categoryId)
    .filter(c => c.isActive)
    .forEach(child => {
      amount += getPlannedAmountForCategory(child.id, monthStart, monthEnd);
    });

  return amount;
}

/**
 * Berechnet den Budget-Wert (linke Spalte) einer Ausgabekategorie.
 * Berücksichtigt nur CATEGORYTRANSFER Transaktionen (positiv und negativ).
 */
function computeCategoryBudgetedAmount(
  categoryId: string,
  monthStart: Date,
  monthEnd: Date
): number {
  const categoryStore = useCategoryStore();
  const transactionStore = useTransactionStore();
  const category = categoryStore.getCategoryById(categoryId);
  if (!category) return 0;

  // Nur CATEGORYTRANSFER Transaktionen im Zeitraum
  const txs = transactionStore.transactions.filter(tx => {
    const txDate = new Date(toDateOnlyString(tx.valueDate || tx.date));  // valueDate für Kategorien
    return (
      (tx.categoryId === categoryId || tx.toCategoryId === categoryId) &&
      tx.type === TransactionType.CATEGORYTRANSFER &&
      txDate >= monthStart && txDate <= monthEnd
    );
  });

  // Budget = Summe aller Category-Transfers
  let budgetAmount = txs.reduce((sum, tx) => sum + (tx.categoryId === categoryId ? tx.amount : 0), 0);

  // Unterkategorien rekursiv einbeziehen
  categoryStore
    .getChildCategories(categoryId)
    .filter(c => c.isActive)
    .forEach(child => {
      budgetAmount += computeCategoryBudgetedAmount(child.id, monthStart, monthEnd);
    });

  return budgetAmount;
}

/**
 * Berechnet Transaktionsbeträge (mittlere Spalte) einer Ausgabekategorie.
 * Berücksichtigt nur EXPENSE und INCOME Transaktionen.
 */
function computeCategoryTransactionsAmount(
  categoryId: string,
  monthStart: Date,
  monthEnd: Date
): number {
  const categoryStore = useCategoryStore();
  const transactionStore = useTransactionStore();
  const planningStore = usePlanningStore();
  const category = categoryStore.getCategoryById(categoryId);
  if (!category) return 0;

  // Reale Transaktionen im Zeitraum (nur EXPENSE und INCOME)
  const txs = transactionStore.transactions.filter(tx => {
    const txDate = new Date(toDateOnlyString(tx.valueDate || tx.date));  // valueDate für Kategorien
    return (
      tx.categoryId === categoryId &&
      (tx.type === TransactionType.EXPENSE || tx.type === TransactionType.INCOME) &&
      txDate >= monthStart && txDate <= monthEnd
    );
  });

  // Transaktionsbetrag
  let transactionsAmount = txs.reduce((sum, tx) => sum + tx.amount, 0);

  // Geplante Beträge (optional, falls gewünscht)
  const plannedAmount = getPlannedAmountForCategory(categoryId, monthStart, monthEnd);

  // Gesamte Transaktionen für diese Kategorie
  let totalTransactionsAmount = transactionsAmount + plannedAmount;  // let statt const korrigiert

  // Unterkategorien rekursiv einbeziehen
  categoryStore
    .getChildCategories(categoryId)
    .filter(c => c.isActive)
    .forEach(child => {
      totalTransactionsAmount += computeCategoryTransactionsAmount(child.id, monthStart, monthEnd);
    });

  return totalTransactionsAmount;
}

/**
 * Berechnet den Monatssaldo (rechte Spalte) einer Ausgabekategorie.
 * Berücksichtigt Vormonatssaldo + aktuelle Transaktionen + Budget-Transfers.
 */
function computeCategorySaldo(
  categoryId: string,
  monthStart: Date,
  monthEnd: Date
): number {
  const mbStore = useMonthlyBalanceStore();
  const categoryStore = useCategoryStore();

  // Vormonatsberechnung
  const prev = new Date(monthStart);
  prev.setDate(0); // Letzter Tag des Vormonats
  const previousSaldo = mbStore.getProjectedCategoryBalanceForDate(categoryId, prev) ?? 0;

  // Aktuelle Transaktionen (EXPENSE & INCOME)
  const transactionsAmount = computeCategoryTransactionsAmount(categoryId, monthStart, monthEnd);

  // Budget-Transfers (CATEGORYTRANSFER)
  const budgetAmount = computeCategoryBudgetedAmount(categoryId, monthStart, monthEnd);

  // Saldo = Vormonatssaldo + aktuelle Transaktionen + Budget-Transfers
  let saldo = previousSaldo + transactionsAmount + budgetAmount;

  // Unterkategorien rekursiv einbeziehen
  categoryStore
    .getChildCategories(categoryId)
    .filter(c => c.isActive)
    .forEach(child => {
      saldo += computeCategorySaldo(child.id, monthStart, monthEnd) - previousSaldo;
    });

  return saldo;
}

/* ----------------------- Expense-Kategorie-Berechnung ----------------------- */
function computeExpenseCategoryData(
  categoryId: string,
  monthStart: Date,
  monthEnd: Date
): MonthlyBudgetData {
  const categoryStore = useCategoryStore();
  const category = categoryStore.getCategoryById(categoryId);

  if (!category) return { budgeted: 0, spent: 0, saldo: 0 };

  // Budget (linke Spalte): Nur CATEGORYTRANSFER (positiv/negativ)
  const budgeted = computeCategoryBudgetedAmount(categoryId, monthStart, monthEnd);

  // Transaktionen (mittlere Spalte): Nur EXPENSE und INCOME
  const spent = computeCategoryTransactionsAmount(categoryId, monthStart, monthEnd);

  // Saldo (rechte Spalte): Vormonats + Transaktionen + Budget
  const saldo = computeCategorySaldo(categoryId, monthStart, monthEnd);

  return { budgeted, spent, saldo };
}

/* ------------------------ Income-Kategorie-Berechnung ----------------------- */
function computeIncomeCategoryData(
  categoryId: string,
  monthStart: Date,
  monthEnd: Date
): MonthlyBudgetData {
  // Für Einnahmekategorien verwenden wir die gleiche Berechnungslogik
  // mit Anpassungen für positive/negative Beträge
  const data = computeExpenseCategoryData(categoryId, monthStart, monthEnd);

  return {
    budgeted: data.budgeted,
    spent: data.spent,
    saldo: data.saldo
  };
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
