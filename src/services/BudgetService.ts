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
 * Ermittelt geplante Kategorie-Transfers für eine Kategorie innerhalb eines Monatszeitraums.
 * Berücksichtigt nur CATEGORYTRANSFER Planungstransaktionen.
 */
function getPlannedCategoryTransfersForCategory(
  categoryId: string,
  monthStart: Date,
  monthEnd: Date
): number {
  const planningStore = usePlanningStore();
  let amount = 0;
  const startStr = toDateOnlyString(monthStart);
  const endStr = toDateOnlyString(monthEnd);

  // Eigene Plantransaktionen berechnen (nur CATEGORYTRANSFER)
  planningStore.planningTransactions.forEach(planTx => {
    // Nur aktive CATEGORYTRANSFER Planungen berücksichtigen
    if (planTx.isActive && planTx.transactionType === TransactionType.CATEGORYTRANSFER) {
      // Transaktion betrifft diese Kategorie als Quelle oder Ziel
      const isSource = planTx.categoryId === categoryId;
      const isTarget = (planTx as any).transferToCategoryId === categoryId;

      if (isSource || isTarget) {
        const occurrences = PlanningService.calculateNextOccurrences(planTx, startStr, endStr);

        // Für jedes Vorkommen im Zeitraum
        occurrences.forEach(() => {
          if (isSource) {
            // Als Quelle negative Beträge
            amount += planTx.amount < 0 ? planTx.amount : -Math.abs(planTx.amount);
          } else if (isTarget) {
            // Als Ziel positive Beträge
            amount += planTx.amount < 0 ? Math.abs(planTx.amount) : planTx.amount;
          }
        });
      }
    }
  });

  return amount;
}

/**
 * Ermittelt geplante Beträge (EXPENSE/INCOME) für eine Kategorie innerhalb eines Monatszeitraums.
 * Berücksichtigt alle EXPENSE und INCOME Planungstransaktionen.
 */
function getPlannedExpenseIncomeForCategory(
  categoryId: string,
  monthStart: Date,
  monthEnd: Date
): number {
  const planningStore = usePlanningStore();
  let amount = 0;
  const startStr = toDateOnlyString(monthStart);
  const endStr = toDateOnlyString(monthEnd);

  // Nur EXPENSE und INCOME Planungen berücksichtigen
  planningStore.planningTransactions.forEach(planTx => {
    if (planTx.isActive && planTx.categoryId === categoryId) {
      if (planTx.transactionType === TransactionType.EXPENSE ||
          planTx.transactionType === TransactionType.INCOME) {

        const occurrences = PlanningService.calculateNextOccurrences(planTx, startStr, endStr);
        occurrences.forEach(() => {
          amount += planTx.amount;
        });
      }
    }
  });

  return amount;
}

/**
 * Berechnet den Budget-Wert (linke Spalte) einer Kategorie.
 * Berücksichtigt nur CATEGORYTRANSFER Transaktionen und Planungen.
 */
function computeCategoryBudgetedAmount(
  categoryId: string,
  monthStart: Date,
  monthEnd: Date,
  includeSubcategories: boolean = false
): number {
  const categoryStore = useCategoryStore();
  const transactionStore = useTransactionStore();
  const category = categoryStore.getCategoryById(categoryId);
  if (!category) return 0;

  // 1. Reale CATEGORYTRANSFER Transaktionen im Zeitraum
  const txs = transactionStore.transactions.filter(tx => {
    const txDate = new Date(toDateOnlyString(tx.valueDate || tx.date));
    return (
      (tx.categoryId === categoryId || tx.toCategoryId === categoryId) &&
      tx.type === TransactionType.CATEGORYTRANSFER &&
      txDate >= monthStart && txDate <= monthEnd
    );
  });

  // Budget aus realen Transaktionen
  let budgetAmount = txs.reduce((sum, tx) => {
    if (tx.categoryId === categoryId) {
      return sum + tx.amount; // Wenn diese Kategorie Quelle ist
    }
    if (tx.toCategoryId === categoryId) {
      return sum + Math.abs(tx.amount); // Wenn diese Kategorie Ziel ist (immer positiv)
    }
    return sum;
  }, 0);

  // 2. Geplante CATEGORYTRANSFER hinzufügen
  budgetAmount += getPlannedCategoryTransfersForCategory(categoryId, monthStart, monthEnd);

  // 3. Unterkategorien rekursiv einbeziehen, wenn gewünscht
  if (includeSubcategories) {
    categoryStore
      .getChildCategories(categoryId)
      .filter(c => c.isActive)
      .forEach(child => {
        budgetAmount += computeCategoryBudgetedAmount(child.id, monthStart, monthEnd, true);
      });
  }

  return budgetAmount;
}

/**
 * Berechnet Transaktionsbeträge (mittlere Spalte) einer Kategorie.
 * Berücksichtigt nur EXPENSE und INCOME Transaktionen und Planungen.
 */
function computeCategoryTransactionsAmount(
  categoryId: string,
  monthStart: Date,
  monthEnd: Date,
  includeSubcategories: boolean = false
): number {
  const categoryStore = useCategoryStore();
  const transactionStore = useTransactionStore();
  const category = categoryStore.getCategoryById(categoryId);
  if (!category) return 0;

  // 1. Reale EXPENSE und INCOME Transaktionen im Zeitraum
  const txs = transactionStore.transactions.filter(tx => {
    const txDate = new Date(toDateOnlyString(tx.valueDate || tx.date));
    return (
      tx.categoryId === categoryId &&
      (tx.type === TransactionType.EXPENSE || tx.type === TransactionType.INCOME) &&
      txDate >= monthStart && txDate <= monthEnd
    );
  });

  // Reale Transaktionsbeträge
  let transactionsAmount = txs.reduce((sum, tx) => sum + tx.amount, 0);

  // 2. Geplante EXPENSE und INCOME hinzufügen
  transactionsAmount += getPlannedExpenseIncomeForCategory(categoryId, monthStart, monthEnd);

  // 3. Unterkategorien rekursiv einbeziehen, wenn gewünscht
  if (includeSubcategories) {
    categoryStore
      .getChildCategories(categoryId)
      .filter(c => c.isActive)
      .forEach(child => {
        transactionsAmount += computeCategoryTransactionsAmount(child.id, monthStart, monthEnd, true);
      });
  }

  return transactionsAmount;
}

/**
 * Berechnet den Monatssaldo (rechte Spalte) einer Kategorie.
 * Berücksichtigt Vormonatssaldo + aktuelle Transaktionen + Budget-Transfers.
 */
function computeCategorySaldo(
  categoryId: string,
  monthStart: Date,
  monthEnd: Date,
  includeSubcategories: boolean = false
): number {
  const mbStore = useMonthlyBalanceStore();
  const categoryStore = useCategoryStore();

  // 1. Vormonatsberechnung
  const prev = new Date(monthStart);
  prev.setDate(0); // Letzter Tag des Vormonats
  const previousSaldo = mbStore.getProjectedCategoryBalanceForDate(categoryId, prev) ?? 0;

  // 2. Aktuelle Transaktionen (EXPENSE & INCOME)
  const transactionsAmount = computeCategoryTransactionsAmount(categoryId, monthStart, monthEnd, false);

  // 3. Budget-Transfers (CATEGORYTRANSFER)
  const budgetAmount = computeCategoryBudgetedAmount(categoryId, monthStart, monthEnd, false);

  // 4. Saldo = Vormonatssaldo + aktuelle Transaktionen + Budget-Transfers
  let saldo = previousSaldo + transactionsAmount + budgetAmount;

  // 5. Unterkategorien rekursiv einbeziehen, wenn gewünscht
  if (includeSubcategories) {
    categoryStore
      .getChildCategories(categoryId)
      .filter(c => c.isActive)
      .forEach(child => {
        // Hier nur den Kindkategorie-Saldo hinzuaddieren, ohne nochmal Vormonatssaldo
        saldo += computeCategorySaldo(child.id, monthStart, monthEnd, true);
      });
  }

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

  // Eigene Werte berechnen (ohne Unterkategorien)
  const ownBudgeted = computeCategoryBudgetedAmount(categoryId, monthStart, monthEnd, false);
  const ownSpent = computeCategoryTransactionsAmount(categoryId, monthStart, monthEnd, false);
  const ownSaldo = computeCategorySaldo(categoryId, monthStart, monthEnd, false);

  // Nur wenn Elternkategorie, dann Kindwerte hinzufügen
  const hasChildren = categoryStore.getChildCategories(categoryId).some(c => c.isActive);
  if (hasChildren) {
    // Alle Kindkategorien separat berechnen
    const childCategories = categoryStore.getChildCategories(categoryId).filter(c => c.isActive);
    let totalBudgeted = ownBudgeted;
    let totalSpent = ownSpent;
    let totalSaldo = ownSaldo;

    // Kinder-Werte hinzuaddieren
    childCategories.forEach(child => {
      const childData = computeExpenseCategoryData(child.id, monthStart, monthEnd);
      totalBudgeted += childData.budgeted;
      totalSpent += childData.spent;
      totalSaldo += childData.saldo;
    });

    return { budgeted: totalBudgeted, spent: totalSpent, saldo: totalSaldo };
  } else {
    // Keine Kinder - nur eigene Werte
    return { budgeted: ownBudgeted, spent: ownSpent, saldo: ownSaldo };
  }
}

/* ------------------------ Income-Kategorie-Berechnung ----------------------- */
function computeIncomeCategoryData(
  categoryId: string,
  monthStart: Date,
  monthEnd: Date
): MonthlyBudgetData {
  // Für Einnahmekategorien verwenden wir die gleiche Berechnungslogik
  return computeExpenseCategoryData(categoryId, monthStart, monthEnd);
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
