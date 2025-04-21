// src/services/PlanningService.ts
import { usePlanningStore } from '@/stores/planningStore';
import { useMonthlyBalanceStore } from '@/stores/monthlyBalanceStore';
import { PlanningTransaction, RecurrencePattern, TransactionType, WeekendHandlingType, RecurrenceEndType } from '@/types';
import dayjs from 'dayjs';
import { debugLog } from '@/utils/logger';
import { TransactionService } from '@/services/TransactionService';
import { useRuleStore } from '@/stores/ruleStore';
import { toDateOnlyString } from '@/utils/formatters';

export const PlanningService = {
  /**
   * Fügt eine Planungstransaktion hinzu (CRUD).
   */
  addPlanningTransaction(planning: Partial<PlanningTransaction>) {
    const planningStore = usePlanningStore();
    const monthlyBalanceStore = useMonthlyBalanceStore();
    const newPlanning = planningStore.addPlanningTransaction(planning);
    debugLog("[PlanningService] addPlanningTransaction", newPlanning);
    monthlyBalanceStore.calculateMonthlyBalances();
    return newPlanning;
  },

  /**
   * Aktualisiert eine Planungstransaktion (CRUD).
   */
  updatePlanningTransaction(id: string, planning: Partial<PlanningTransaction>) {
    const planningStore = usePlanningStore();
    const monthlyBalanceStore = useMonthlyBalanceStore();
    const success = planningStore.updatePlanningTransaction(id, planning);
    debugLog("[PlanningService] updatePlanningTransaction", { id, updates: planning });
    monthlyBalanceStore.calculateMonthlyBalances();
    return success;
  },

  /**
   * Löscht eine Planungstransaktion (CRUD).
   */
  deletePlanningTransaction(id: string) {
    const planningStore = usePlanningStore();
    const monthlyBalanceStore = useMonthlyBalanceStore();
    planningStore.deletePlanningTransaction(id);
    debugLog("[PlanningService] deletePlanningTransaction", id);
    monthlyBalanceStore.calculateMonthlyBalances();
    return true;
  },

  /**
   * Berechnet zukünftige Ausführungstermine einer Planungstransaktion.
   * Berücksichtigt dabei Wochenenden.
   */
  calculateNextOccurrences(planTx: PlanningTransaction, startDate: string, endDate: string): string[] {
    if (!planTx.isActive) return [];
    const occurrences: string[] = [];
    const start = dayjs(startDate);
    const end = dayjs(endDate);
    const txStart = dayjs(toDateOnlyString(planTx.startDate));
    if (txStart.isAfter(end)) return [];
    if (planTx.endDate && dayjs(toDateOnlyString(planTx.endDate)).isBefore(start))
      return [];
    let currentDate = txStart;
    let count = 0;
    const maxIterations = 1000;
    while (currentDate.isSameOrBefore(end) && count < maxIterations) {
      let adjustedDate = PlanningService.applyWeekendHandling(currentDate, planTx.weekendHandling);
      if (adjustedDate.isSameOrAfter(start) && adjustedDate.isSameOrBefore(end)) {
        occurrences.push(toDateOnlyString(adjustedDate.toDate()));
      }
      if (
        planTx.recurrenceEndType === RecurrenceEndType.COUNT &&
        planTx.recurrenceCount !== null &&
        ++count >= planTx.recurrenceCount
      ) {
        break;
      }
      switch (planTx.recurrencePattern) {
        case RecurrencePattern.DAILY:
          currentDate = currentDate.add(1, 'day');
          break;
        case RecurrencePattern.WEEKLY:
          currentDate = currentDate.add(1, 'week');
          break;
        case RecurrencePattern.BIWEEKLY:
          currentDate = currentDate.add(2, 'weeks');
          break;
        case RecurrencePattern.MONTHLY:
          if (planTx.executionDay && planTx.executionDay > 0 && planTx.executionDay <= 31) {
            const nextMonth = currentDate.add(1, 'month');
            const year = nextMonth.year();
            const month = nextMonth.month() + 1; // Monatsanzeige 1-indexiert
            const maxDay = new Date(year, month, 0).getDate();
            const day = Math.min(planTx.executionDay, maxDay);
            currentDate = dayjs(new Date(year, month - 1, day));
          } else {
            currentDate = currentDate.add(1, 'month');
          }
          break;
        case RecurrencePattern.QUARTERLY:
          currentDate = currentDate.add(3, 'months');
          break;
        case RecurrencePattern.YEARLY:
          currentDate = currentDate.add(1, 'year');
          break;
        case RecurrencePattern.ONCE:
          return occurrences;
      }
      if (
        planTx.recurrenceEndType === RecurrenceEndType.DATE &&
        planTx.endDate &&
        currentDate.isAfter(dayjs(toDateOnlyString(planTx.endDate)))
      ) {
        break;
      }
    }
    return occurrences;
  },

  /**
   * Verschiebt das Datum, falls es auf ein Wochenende fällt.
   */
  applyWeekendHandling(date: dayjs.Dayjs, handling: WeekendHandlingType): dayjs.Dayjs {
    const day = date.day();
    if ((day !== 0 && day !== 6) || handling === WeekendHandlingType.NONE)
      return date;
    const isSaturday = day === 6;
    switch (handling) {
      case WeekendHandlingType.BEFORE:
        return isSaturday ? date.subtract(1, 'day') : date.subtract(2, 'day');
      case WeekendHandlingType.AFTER:
        return isSaturday ? date.add(2, 'day') : date.add(1, 'day');
      default:
        return date;
    }
  },

  /**
   * Führt eine geplante Transaktion aus.
   * Bei Forecast Only wird nur das Startdatum aktualisiert.
   */
  executePlanningTransaction(planningId: string, executionDate: string) {
    const planningStore = usePlanningStore();
    const monthlyBalanceStore = useMonthlyBalanceStore();
    const planning = planningStore.getPlanningTransactionById(planningId);
    if (!planning) {
      debugLog('[PlanningService] executePlanningTransaction - Planning not found', { planningId });
      return false;
    }
    if (planning.forecastOnly) {
      planningStore.updatePlanningTransaction(planning.id, { startDate: executionDate });
      monthlyBalanceStore.calculateMonthlyBalances();
      debugLog('[PlanningService] executePlanningTransaction - Forecast Only activated', {
        planningId: planning.id,
        newStartDate: executionDate
      });
      return true;
    }
    const transaction = {
      date: executionDate,
      valueDate: planning.valueDate || executionDate,
      amount: planning.amount,
      type: planning.transactionType || (planning.amount < 0 ? TransactionType.EXPENSE : TransactionType.INCOME),
      description: planning.description || '',
      note: planning.note || '',
      accountId: planning.accountId,
      transferToAccountId: planning.transferToAccountId || '',
      categoryId: planning.categoryId || '',
      tagIds: planning.tagIds || [],
      recipientId: planning.recipientId || '',
      planningId: planning.id
    };
    const newTx = TransactionService.addTransaction(transaction);
    debugLog('[PlanningService] executePlanningTransaction', {
      planningId: planning.id,
      name: planning.name,
      executionDate,
      transactionId: newTx.id
    });
    const ruleStore = useRuleStore();
    ruleStore.applyRulesToTransaction(newTx);
    monthlyBalanceStore.calculateMonthlyBalances();
    return true;
  },

  /**
   * Führt alle fälligen Planungstransaktionen aus.
   */
  executeAllDuePlanningTransactions() {
    const planningStore = usePlanningStore();
    const today = dayjs().startOf('day');
    let executedCount = 0;
    planningStore.planningTransactions.forEach(planTx => {
      if (!planTx.isActive) return;
      const overdueOccurrences = PlanningService.calculateNextOccurrences(
        planTx,
        planTx.startDate,
        today.format("YYYY-MM-DD")
      );
      overdueOccurrences.forEach(dateStr => {
        if (dayjs(dateStr).isBefore(today) || dayjs(dateStr).isSame(today)) {
          const success = PlanningService.executePlanningTransaction(planTx.id, dateStr);
          if (success) {
            executedCount++;
          }
        }
      });
      const nextOccurrences = PlanningService.calculateNextOccurrences(
        planTx,
        today.add(1, 'day').format("YYYY-MM-DD"),
        today.add(365, 'day').format("YYYY-MM-DD")
      );
      if (nextOccurrences.length > 0) {
        PlanningService.updatePlanningTransaction(planTx.id, { startDate: nextOccurrences[0] });
      }
    });
    return executedCount;
  },

  /**
   * Aktualisiert die Prognosen, indem die Monatsbilanzen neu berechnet werden.
   */
  updateForecasts() {
    const monthlyBalanceStore = useMonthlyBalanceStore();
    monthlyBalanceStore.calculateMonthlyBalances();
    debugLog("[PlanningService] updateForecasts - Monatsbilanzen aktualisiert");
    return true;
  }
};
