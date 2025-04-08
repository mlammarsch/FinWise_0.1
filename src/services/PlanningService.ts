// src/services/PlanningService.ts
import { usePlanningStore } from '@/stores/planningStore';
import { useMonthlyBalanceStore } from '@/stores/monthlyBalanceStore';
import { PlanningTransaction } from '@/types';
import { debugLog } from '@/utils/logger';

export const PlanningService = {
  /**
   * Fügt eine Planungstransaktion hinzu
   */
  addPlanningTransaction(planning: Partial<PlanningTransaction>) {
    const planningStore = usePlanningStore();
    const monthlyBalanceStore = useMonthlyBalanceStore();

    const newPlanning = planningStore.addPlanningTransaction(planning);
    debugLog("[PlanningService] addPlanningTransaction", newPlanning);

    // Monatliche Saldos neu berechnen
    monthlyBalanceStore.calculateMonthlyBalances();

    return newPlanning;
  },

  /**
   * Aktualisiert eine Planungstransaktion
   */
  updatePlanningTransaction(id: string, planning: Partial<PlanningTransaction>) {
    const planningStore = usePlanningStore();
    const monthlyBalanceStore = useMonthlyBalanceStore();

    const result = planningStore.updatePlanningTransaction(id, planning);
    debugLog("[PlanningService] updatePlanningTransaction", { id, updates: planning });

    // Monatliche Saldos neu berechnen
    monthlyBalanceStore.calculateMonthlyBalances();

    return result;
  },

  /**
   * Löscht eine Planungstransaktion
   */
  deletePlanningTransaction(id: string) {
    const planningStore = usePlanningStore();
    const monthlyBalanceStore = useMonthlyBalanceStore();

    planningStore.deletePlanningTransaction(id);
    debugLog("[PlanningService] deletePlanningTransaction", id);

    // Monatliche Saldos neu berechnen
    monthlyBalanceStore.calculateMonthlyBalances();

    return true;
  },

  /**
   * Führt eine geplante Transaktion aus
   */
  executePlanningTransaction(planningId: string, executionDate: string) {
    const planningStore = usePlanningStore();
    const result = planningStore.executePlanningTransaction(planningId, executionDate);
    debugLog("[PlanningService] executePlanningTransaction", { planningId, executionDate, result });

    return result;
  },

  /**
   * Führt alle fälligen automatischen Planungen aus
   */
  executeAllDuePlanningTransactions() {
    const planningStore = usePlanningStore();
    const count = planningStore.executeAllDuePlanningTransactions();
    debugLog("[PlanningService] executeAllDuePlanningTransactions", { executedCount: count });

    return count;
  },

  /**
   * Aktualisiert die Prognosen
   */
  updateForecasts() {
    const planningStore = usePlanningStore();
    const monthlyBalanceStore = useMonthlyBalanceStore();

    if (planningStore.checkAndUpdateForecast) {
      planningStore.checkAndUpdateForecast();
      debugLog("[PlanningService] updateForecasts - used checkAndUpdateForecast");
    } else {
      monthlyBalanceStore.calculateMonthlyBalances();
      debugLog("[PlanningService] updateForecasts - used calculateMonthlyBalances");
    }

    return true;
  }
};
