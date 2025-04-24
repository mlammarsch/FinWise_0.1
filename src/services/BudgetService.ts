// src/services/BudgetService.ts
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
 * Berechnet die geplanten Beträge für eine Kategorie aus Plan- und Prognosebuchungen
 */
function getPlannedAmountForCategory(
  categoryId: string,
  monthStart: Date,
  monthEnd: Date,
  transactionType: TransactionType | null = null
): number {
  const planningStore = usePlanningStore();
  const categoryStore = useCategoryStore();
  let amount = 0;
  const startStr = toDateOnlyString(monthStart);
  const endStr = toDateOnlyString(monthEnd);

  // Filter Planbuchungen nach Typ (wenn angegeben)
  const filteredPlans = transactionType === null
    ? planningStore.planningTransactions.filter(pt => pt.isActive && pt.categoryId === categoryId)
    : planningStore.planningTransactions.filter(pt =>
        pt.isActive && pt.categoryId === categoryId && pt.transactionType === transactionType
      );

  filteredPlans.forEach(planTx => {
    const occurrences = PlanningService.calculateNextOccurrences(
      planTx,
      startStr,
      endStr
    );
    amount += planTx.amount * occurrences.length;
  });

  // Kinder rekursiv
  categoryStore
    .getChildCategories(categoryId)
    .filter(c => c.isActive)
    .forEach(child => {
      amount += getPlannedAmountForCategory(child.id, monthStart, monthEnd, transactionType);
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

  // Vormonats-Saldo aus dem monatlichen Balance Store holen
  const prev = new Date(monthStart);
  prev.setDate(0); // Letzter Tag des Vormonats
  const previousMonthSaldo = mbStore.getProjectedCategoryBalanceForDate(categoryId, prev) ?? 0;

  // BUDGET-SPALTE: Nur CATEGORYTRANSFER
  // Filter Transaktionen nach valueDate und CATEGORYTRANSFER
  const categoryTransfers = transactionStore.transactions.filter(tx => {
    const valueDate = new Date(toDateOnlyString(tx.valueDate || tx.date));
    return tx.categoryId === categoryId &&
           valueDate >= monthStart &&
           valueDate <= monthEnd &&
           tx.type === TransactionType.CATEGORYTRANSFER;
  });

  // Summe der CATEGORYTRANSFER-Beträge
  const budgetAmount = categoryTransfers.reduce((sum, tx) => sum + tx.amount, 0);

  // Geplante CATEGORYTRANSFER
  const plannedCategoryTransfers = getPlannedAmountForCategory(
    categoryId,
    monthStart,
    monthEnd,
    TransactionType.CATEGORYTRANSFER
  );

  // Gesamtsumme Budget-Spalte
  const totalBudget = budgetAmount + plannedCategoryTransfers;

  // TRANSAKTIONS-SPALTE: Nur reale EXPENSE und INCOME (keine CATEGORYTRANSFER)
  // Filter Transaktionen nach valueDate und EXPENSE/INCOME (keine CATEGORYTRANSFER/ACCOUNTTRANSFER)
  const expenseIncomeTxs = transactionStore.transactions.filter(tx => {
    const valueDate = new Date(toDateOnlyString(tx.valueDate || tx.date));
    return tx.categoryId === categoryId &&
           valueDate >= monthStart &&
           valueDate <= monthEnd &&
           (tx.type === TransactionType.EXPENSE || tx.type === TransactionType.INCOME) &&
           tx.type !== TransactionType.CATEGORYTRANSFER &&
           tx.type !== TransactionType.ACCOUNTTRANSFER;
  });

  // Summe der Transaktionen
  const transactionsAmount = expenseIncomeTxs.reduce((sum, tx) => sum + tx.amount, 0);

  // SALDO-SPALTE: Vormonatssaldo + Budget + Transaktionen
  const saldo = previousMonthSaldo + totalBudget + transactionsAmount;

  // Rekursive Berechnung für Kinderkategorien
  let childBudget = 0;
  let childTransactions = 0;
  let childSaldo = 0;

  categoryStore
    .getChildCategories(categoryId)
    .filter(c => c.isActive)
    .forEach(child => {
      const childData = computeExpenseCategoryData(child.id, monthStart, monthEnd);
      childBudget += childData.budgeted;
      childTransactions += childData.spent;
      childSaldo += childData.saldo;
    });

  // Wenn Elternkategorie: Eigene Werte + Summe der Kinderwerte
  const finalBudget = totalBudget + childBudget;
  const finalTransactions = transactionsAmount + childTransactions;
  const finalSaldo = saldo + childSaldo - (previousMonthSaldo * categoryStore.getChildCategories(categoryId).length);

  debugLog(`[BudgetService] Expense category ${cat.name}`, {
    month: `${monthStart.getFullYear()}-${monthStart.getMonth() + 1}`,
    previousMonthSaldo,
    budget: finalBudget,
    transactions: finalTransactions,
    saldo: finalSaldo
  });

  return {
    budgeted: finalBudget,
    spent: finalTransactions,
    saldo: finalSaldo
  };
}

/* ------------------------ Income-Kategorie-Berechnung ----------------------- */

function computeIncomeCategoryData(
  categoryId: string,
  monthStart: Date,
  monthEnd: Date
): MonthlyBudgetData {
  const categoryStore = useCategoryStore();
  const transactionStore = useTransactionStore();
  const mbStore = useMonthlyBalanceStore();
  const cat = categoryStore.getCategoryById(categoryId);
  if (!cat) return { budgeted: 0, spent: 0, saldo: 0 };

  // Vormonats-Saldo aus dem monatlichen Balance Store holen
  const prev = new Date(monthStart);
  prev.setDate(0); // Letzter Tag des Vormonats
  const previousMonthSaldo = mbStore.getProjectedCategoryBalanceForDate(categoryId, prev) ?? 0;

  // BUDGET-SPALTE: Nur CATEGORYTRANSFER
  // Filter Transaktionen nach valueDate und CATEGORYTRANSFER
  const categoryTransfers = transactionStore.transactions.filter(tx => {
    const valueDate = new Date(toDateOnlyString(tx.valueDate || tx.date));
    return tx.categoryId === categoryId &&
           valueDate >= monthStart &&
           valueDate <= monthEnd &&
           tx.type === TransactionType.CATEGORYTRANSFER;
  });

  // Summe der CATEGORYTRANSFER-Beträge
  const budgetAmount = categoryTransfers.reduce((sum, tx) => sum + tx.amount, 0);

  // Geplante CATEGORYTRANSFER
  const plannedCategoryTransfers = getPlannedAmountForCategory(
    categoryId,
    monthStart,
    monthEnd,
    TransactionType.CATEGORYTRANSFER
  );

  // Gesamtsumme Budget-Spalte
  const totalBudget = budgetAmount + plannedCategoryTransfers;

  // TRANSAKTIONS-SPALTE: Nur reale INCOME (keine CATEGORYTRANSFER)
  // Filter Transaktionen nach valueDate und INCOME (keine CATEGORYTRANSFER/ACCOUNTTRANSFER)
  const incomeTxs = transactionStore.transactions.filter(tx => {
    const valueDate = new Date(toDateOnlyString(tx.valueDate || tx.date));
    return tx.categoryId === categoryId &&
           valueDate >= monthStart &&
           valueDate <= monthEnd &&
           tx.type === TransactionType.INCOME &&
           tx.type !== TransactionType.CATEGORYTRANSFER &&
           tx.type !== TransactionType.ACCOUNTTRANSFER;
  });

  // Summe der Transaktionen
  const transactionsAmount = incomeTxs.reduce((sum, tx) => sum + tx.amount, 0);

  // SALDO-SPALTE: Vormonatssaldo + Budget + Transaktionen
  const saldo = previousMonthSaldo + totalBudget + transactionsAmount;

  // Rekursive Berechnung für Kinderkategorien
  let childBudget = 0;
  let childTransactions = 0;
  let childSaldo = 0;

  categoryStore
    .getChildCategories(categoryId)
    .filter(c => c.isActive)
    .forEach(child => {
      const childData = computeIncomeCategoryData(child.id, monthStart, monthEnd);
      childBudget += childData.budgeted;
      childTransactions += childData.spent;
      childSaldo += childData.saldo;
    });

  // Wenn Elternkategorie: Eigene Werte + Summe der Kinderwerte
  const finalBudget = totalBudget + childBudget;
  const finalTransactions = transactionsAmount + childTransactions;
  const finalSaldo = saldo + childSaldo - (previousMonthSaldo * categoryStore.getChildCategories(categoryId).length);

  debugLog(`[BudgetService] Income category ${cat.name}`, {
    month: `${monthStart.getFullYear()}-${monthStart.getMonth() + 1}`,
    previousMonthSaldo,
    budget: finalBudget,
    transactions: finalTransactions,
    saldo: finalSaldo
  });

  return {
    budgeted: finalBudget,
    spent: finalTransactions,
    saldo: finalSaldo
  };
}

/* ------------------------------ Public API ---------------------------------- */

export const BudgetService = {
  /**
   * Ermittelt die Budget-, Transaktions- und Saldodaten für eine Kategorie
   */
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

  /**
   * Ermittelt die zusammengefassten Werte für Einnahmen oder Ausgaben
   */
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

  /**
   * Liefert Kategorieoptionen für Transfer-Dialoge
   */
  getCategoryTransferOptions(monthStart: Date, monthEnd: Date) {
    const categoryStore = useCategoryStore();
    return categoryStore.categories
      .filter(c => c.isActive && c.name !== "Verfügbare Mittel")
      .map(c => {
        const data = this.getAggregatedMonthlyBudgetData(c.id, monthStart, monthEnd);
        return {
          id: c.id,
          name: c.name,
          saldo: data.saldo,
          color: c.color,
          isIncome: c.isIncomeCategory
        };
      });
  }
};
