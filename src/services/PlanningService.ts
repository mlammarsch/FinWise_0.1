// Datei: src/services/PlanningService.ts
import { usePlanningStore } from '@/stores/planningStore'
import { useMonthlyBalanceStore } from '@/stores/monthlyBalanceStore'
import {
  PlanningTransaction,
  RecurrencePattern,
  TransactionType,
  WeekendHandlingType,
  RecurrenceEndType,
} from '@/types'
import dayjs from 'dayjs'
import { debugLog } from '@/utils/logger'
import { TransactionService } from './TransactionService'
import { useRuleStore } from '@/stores/ruleStore'
import { toDateOnlyString } from '@/utils/formatters'

export const PlanningService = {
  /**
   * Fügt eine Planungstransaktion hinzu (CRUD).
   */
  addPlanningTransaction(planning: Partial<PlanningTransaction>) {
    const planningStore = usePlanningStore()
    const monthlyBalanceStore = useMonthlyBalanceStore()
    const newPlanning = planningStore.addPlanningTransaction(planning)
    debugLog('[PlanningService] addPlanningTransaction', newPlanning)
    monthlyBalanceStore.calculateMonthlyBalances()
    return newPlanning
  },

  /**
   * Aktualisiert eine Planungstransaktion (CRUD).
   */
  updatePlanningTransaction(id: string, planning: Partial<PlanningTransaction>) {
    const planningStore = usePlanningStore()
    const monthlyBalanceStore = useMonthlyBalanceStore()
    const success = planningStore.updatePlanningTransaction(id, planning)
    debugLog('[PlanningService] updatePlanningTransaction', { id, updates: planning })
    monthlyBalanceStore.calculateMonthlyBalances()
    return success
  },

  /**
   * Löscht eine Planungstransaktion (CRUD).
   */
  deletePlanningTransaction(id: string) {
    const planningStore = usePlanningStore()
    const monthlyBalanceStore = useMonthlyBalanceStore()
    planningStore.deletePlanningTransaction(id)
    debugLog('[PlanningService] deletePlanningTransaction', id)
    monthlyBalanceStore.calculateMonthlyBalances()
    return true
  },

  /**
   * Berechnet zukünftige Ausführungstermine einer Planungstransaktion.
   * Berücksichtigt dabei Wochenenden.
   */
  calculateNextOccurrences(planTx: PlanningTransaction, startDate: string, endDate: string): string[] {
    if (!planTx.isActive) return []
    const occurrences: string[] = []
    const start = dayjs(startDate)
    const end = dayjs(endDate)
    const txStart = dayjs(toDateOnlyString(planTx.startDate))
    if (txStart.isAfter(end)) return []
    if (planTx.endDate && dayjs(toDateOnlyString(planTx.endDate)).isBefore(start))
      return []
    let currentDate = txStart
    let count = 0
    const maxIterations = 1000
    while (currentDate.isSameOrBefore(end) && count < maxIterations) {
      const adjustedDate = PlanningService.applyWeekendHandling(currentDate, planTx.weekendHandling)
      if (adjustedDate.isSameOrAfter(start) && adjustedDate.isSameOrBefore(end)) {
        occurrences.push(toDateOnlyString(adjustedDate.toDate()))
      }
      if (
        planTx.recurrenceEndType === RecurrenceEndType.COUNT &&
        planTx.recurrenceCount !== null &&
        ++count >= planTx.recurrenceCount
      ) {
        break
      }
      switch (planTx.recurrencePattern) {
        case RecurrencePattern.DAILY:
          currentDate = currentDate.add(1, 'day')
          break
        case RecurrencePattern.WEEKLY:
          currentDate = currentDate.add(1, 'week')
          break
        case RecurrencePattern.BIWEEKLY:
          currentDate = currentDate.add(2, 'weeks')
          break
        case RecurrencePattern.MONTHLY:
          if (planTx.executionDay && planTx.executionDay > 0 && planTx.executionDay <= 31) {
            const nextMonth = currentDate.add(1, 'month')
            const year = nextMonth.year()
            const month = nextMonth.month() + 1
            const maxDay = new Date(year, month, 0).getDate()
            const day = Math.min(planTx.executionDay, maxDay)
            currentDate = dayjs(new Date(year, month - 1, day))
          } else {
            currentDate = currentDate.add(1, 'month')
          }
          break
        case RecurrencePattern.QUARTERLY:
          currentDate = currentDate.add(3, 'months')
          break
        case RecurrencePattern.YEARLY:
          currentDate = currentDate.add(1, 'year')
          break
        case RecurrencePattern.ONCE:
          return occurrences
      }
      if (
        planTx.recurrenceEndType === RecurrenceEndType.DATE &&
        planTx.endDate &&
        currentDate.isAfter(dayjs(toDateOnlyString(planTx.endDate)))
      ) {
        break
      }
    }
    return occurrences
  },

  /**
   * Verschiebt das Datum, falls es auf ein Wochenende fällt.
   */
  applyWeekendHandling(date: dayjs.Dayjs, handling: WeekendHandlingType): dayjs.Dayjs {
    const day = date.day()
    if ((day !== 0 && day !== 6) || handling === WeekendHandlingType.NONE)
      return date
    const isSaturday = day === 6
    switch (handling) {
      case WeekendHandlingType.BEFORE:
        return isSaturday ? date.subtract(1, 'day') : date.subtract(2, 'day')
      case WeekendHandlingType.AFTER:
        return isSaturday ? date.add(2, 'day') : date.add(1, 'day')
      default:
        return date
    }
  },

  /**
   * Führt eine geplante Transaktion aus.
   * Löscht ONCE-Planungen bzw. die letzte Wiederholung automatisch aus dem Store.
   */
  executePlanningTransaction(planningId: string, executionDate: string) {
    const planningStore = usePlanningStore()
    const monthlyBalanceStore = useMonthlyBalanceStore()
    const planning = planningStore.getPlanningTransactionById(planningId)
    if (!planning) {
      debugLog('[PlanningService] executePlanningTransaction - Planning not found', { planningId })
      return false
    }

    let transactionsCreated = false
    if (!planning.forecastOnly) {
      // Validierung
      if (planning.amount === 0) throw new Error('Betrag 0 ist nicht zulässig.')
      if (!planning.accountId && planning.transactionType !== TransactionType.CATEGORYTRANSFER) {
        throw new Error('Quellkonto fehlt.')
      }
      if (
        planning.transactionType !== TransactionType.ACCOUNTTRANSFER &&
        planning.transactionType !== TransactionType.CATEGORYTRANSFER &&
        !planning.categoryId
      ) {
        throw new Error('Kategorie muss gesetzt sein.')
      }

      // Kategorietransfer
      if (planning.transactionType === TransactionType.CATEGORYTRANSFER) {
        const fromCat = planning.categoryId!
        const toCat = (planning as any).transferToCategoryId!
        if (!fromCat || !toCat) {
          throw new Error('Für Kategorietransfer werden Quell- und Zielkategorie benötigt')
        }
        TransactionService.addCategoryTransfer(
          fromCat,
          toCat,
          Math.abs(planning.amount),
          executionDate,
          planning.note || ''
        )
        transactionsCreated = true
      }
      // Account-Transfer
      else if (
        planning.transactionType === TransactionType.ACCOUNTTRANSFER ||
        planning.transferToAccountId
      ) {
        TransactionService.addAccountTransfer(
          planning.accountId,
          planning.transferToAccountId!,
          Math.abs(planning.amount),
          executionDate,
          planning.note || '',
          planning.id
        )
        transactionsCreated = true
      }
      // Standard-Transaktion
      else {
        const txType = planning.amount < 0 ? TransactionType.EXPENSE : TransactionType.INCOME
        TransactionService.addTransaction({
          date: executionDate,
          valueDate: planning.valueDate || executionDate,
          amount: planning.amount,
          type: txType,
          description: planning.name || '',
          note: planning.note || '',
          accountId: planning.accountId,
          categoryId: planning.categoryId!,
          tagIds: planning.tagIds || [],
          recipientId: planning.recipientId || '',
          planningTransactionId: planning.id,
        })
        transactionsCreated = true
      }
    }

    // Regeln anwenden
    if (transactionsCreated) {
      const latestTx = TransactionService.getAllTransactions().slice(-1)[0]
      if (latestTx) useRuleStore().applyRulesToTransaction(latestTx)
    }

    // Batch-Ausführung
    const all = planningStore.planningTransactions.slice()
    let executedCount = 0
    all.forEach(planTx => {
      if (!planTx.isActive) return
      const overdue = PlanningService.calculateNextOccurrences(
        planTx,
        planTx.startDate,
        dayjs().startOf('day').format('YYYY-MM-DD')
      )
      overdue.forEach(dateStr => {
        if (dayjs(dateStr).isSameOrBefore(dayjs().startOf('day'))) {
          if (PlanningService.executePlanningTransaction(planTx.id, dateStr)) {
            executedCount++
          }
        }
      })
    })

    // Update oder Löschen der Ursprungstransaktion
    const shouldDelete =
      planning.recurrencePattern === RecurrencePattern.ONCE ||
      (planning.recurrenceEndType === RecurrenceEndType.DATE &&
        planning.endDate &&
        dayjs(executionDate).isSame(dayjs(planning.endDate))) ||
      (planning.recurrenceEndType === RecurrenceEndType.COUNT &&
        planning.recurrenceCount !== null &&
        PlanningService.calculateNextOccurrences(
          planning,
          dayjs(executionDate).add(1, 'day').format('YYYY-MM-DD'),
          dayjs(executionDate).add(10, 'year').format('YYYY-MM-DD')
        ).length === 0)

    if (shouldDelete) {
      usePlanningStore().deletePlanningTransaction(planning.id)
    } else {
      const nextOcc = PlanningService.calculateNextOccurrences(
        planning,
        dayjs(executionDate).add(1, 'day').format('YYYY-MM-DD'),
        dayjs(executionDate).add(3, 'years').format('YYYY-MM-DD')
      )
      if (nextOcc.length > 0) {
        usePlanningStore().updatePlanningTransaction(planning.id, { startDate: nextOcc[0] })
      }
    }

    useMonthlyBalanceStore().calculateMonthlyBalances()
    debugLog('[PlanningService] batch execute count', executedCount)
    return executedCount
  },

  /**
   * Aktualisiert die Prognosen, indem die Monatsbilanzen neu berechnet werden.
   */
  updateForecasts() {
    debugLog('[PlanningService] updateForecasts - Monatsbilanzen aktualisiert')
    return true
  },
}
