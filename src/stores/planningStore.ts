// Datei: src/stores/planningStore.ts (vollständig)
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import dayjs from 'dayjs'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import weekday from 'dayjs/plugin/weekday'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter' // NEUE ZEILE: Plugin importieren
dayjs.extend(isSameOrBefore)
dayjs.extend(weekday)
dayjs.extend(isSameOrAfter) // NEUE ZEILE: Plugin erweitern

import {
  PlanningTransaction,
  RecurrencePattern,
  TransactionType,
  AmountType,
  RecurrenceEndType,
  WeekendHandlingType
} from '../types'
import { useTransactionStore } from './transactionStore'
import { toDateOnlyString } from '@/utils/formatters'
import { debugLog } from '@/utils/logger'
import { useMonthlyBalanceStore } from '@/stores/monthlyBalanceStore'

export const usePlanningStore = defineStore('planning', () => {
  const planningTransactions = ref<PlanningTransaction[]>([])
  const transactionStore = useTransactionStore()
  const monthlyBalanceStore = useMonthlyBalanceStore()

  const getPlanningTransactionById = computed(() => {
    return (id: string) => planningTransactions.value.find(tx => tx.id === id)
  })

  /**
   * Gibt alle bevorstehenden Transaktionen für einen bestimmten Zeitraum zurück
   */
  const getUpcomingTransactions = computed(() => {
    return (days: number = 30) => {
      const today = dayjs()
      const endDate = today.add(days, 'day')
      const upcoming: Array<{ date: string, transaction: PlanningTransaction }> = []

      planningTransactions.value
        .filter(planTx => planTx.isActive)
        .forEach(planTx => {
          const occurrences = calculateNextOccurrences(
            planTx,
            toDateOnlyString(today.toDate()),
            toDateOnlyString(endDate.toDate())
          )

          occurrences.forEach(date => {
            upcoming.push({ date, transaction: planTx })
          })
        })

      return upcoming.sort((a, b) => a.date.localeCompare(b.date))
    }
  })

  /**
   * Berechnet alle Vorkommen einer Planungsbuchung in einem Zeitraum
   * unter Berücksichtigung von Wochenendbehandlung
   */
  function calculateNextOccurrences(
    planTx: PlanningTransaction,
    startDate: string,
    endDate: string
  ): string[] {
    if (!planTx.isActive) return []

    const occurrences: string[] = []
    const start = dayjs(startDate)
    const end = dayjs(endDate)
    const txStart = dayjs(toDateOnlyString(planTx.startDate))

    if (txStart.isAfter(end)) return []
    if (planTx.endDate && dayjs(toDateOnlyString(planTx.endDate)).isBefore(start)) return []

    let currentDate = txStart
    let count = 0
    const maxIterations = 1000 // Schutz vor Endlosschleifen

    while (currentDate.isSameOrBefore(end) && count < maxIterations) {
      // Wochenendbehandlung anwenden
      let adjustedDate = applyWeekendHandling(currentDate, planTx.weekendHandling)

      // Wenn das angepasste Datum im gewünschten Bereich liegt, hinzufügen
      if (adjustedDate.isSameOrAfter(start) && adjustedDate.isSameOrBefore(end)) {
        occurrences.push(toDateOnlyString(adjustedDate.toDate()))
      }

      // Abbruchbedingung bei COUNT-basierter Wiederholung
      if (planTx.recurrenceEndType === RecurrenceEndType.COUNT &&
          planTx.recurrenceCount !== null &&
          ++count >= planTx.recurrenceCount) {
        break
      }

      // Nächstes Datum basierend auf dem Wiederholungsmuster berechnen
      switch (planTx.recurrencePattern) {
        case RecurrencePattern.DAILY:
          currentDate = currentDate.add(1, 'day')
          break
        case RecurrencePattern.WEEKLY:
          currentDate = currentDate.add(1, 'week')
          break
        case RecurrencePattern.BIWEEKLY:
          currentDate = currentDate.add(2, 'week')
          break
        case RecurrencePattern.MONTHLY:
          // Wenn ein spezifischer Tag vorgegeben ist, diesen verwenden
          if (planTx.executionDay && planTx.executionDay > 0 && planTx.executionDay <= 31) {
            currentDate = dayjs(new Date(
              currentDate.year(),
              currentDate.month() + 1,
              Math.min(planTx.executionDay, daysInMonth(currentDate.month() + 1, currentDate.year()))
            ))
          } else {
            currentDate = currentDate.add(1, 'month')
          }
          break
        case RecurrencePattern.QUARTERLY:
          currentDate = currentDate.add(3, 'month')
          break
        case RecurrencePattern.YEARLY:
          currentDate = currentDate.add(1, 'year')
          break
        case RecurrencePattern.ONCE:
          return occurrences
      }

      // Abbruchbedingung bei DATE-basierter Wiederholung
      if (planTx.recurrenceEndType === RecurrenceEndType.DATE && planTx.endDate &&
          currentDate.isAfter(dayjs(toDateOnlyString(planTx.endDate)))) {
        break
      }
    }

    return occurrences
  }

  /**
   * Wendet die Wochenendbehandlung auf ein Datum an
   */
  function applyWeekendHandling(date: dayjs.Dayjs, handling: WeekendHandlingType): dayjs.Dayjs {
    const dayOfWeek = date.day() // 0 = Sonntag, 6 = Samstag

    if (handling === WeekendHandlingType.NONE || (dayOfWeek !== 0 && dayOfWeek !== 6)) {
      return date // Kein Wochenende oder keine Behandlung nötig
    }

    if (handling === WeekendHandlingType.BEFORE) {
      // Auf den vorherigen Freitag verschieben
      return dayOfWeek === 0 ? date.subtract(2, 'day') : date.subtract(1, 'day')
    } else {
      // Auf den nächsten Montag verschieben
      return dayOfWeek === 0 ? date.add(1, 'day') : date.add(2, 'day')
    }
  }

  /**
   * Hilfsfunktion: Gibt die Anzahl der Tage in einem Monat zurück
   */
  function daysInMonth(month: number, year: number): number {
    return new Date(year, month + 1, 0).getDate()
  }

  /**
   * Fügt eine neue Planungstransaktion hinzu
   */
  function addPlanningTransaction(transaction: Omit<PlanningTransaction, 'id'>) {
    const newTransaction: PlanningTransaction = {
      ...transaction,
      id: uuidv4(),
      amountType: transaction.amountType || AmountType.EXACT,
      weekendHandling: transaction.weekendHandling || WeekendHandlingType.NONE,
      recurrenceEndType: transaction.recurrenceEndType || RecurrenceEndType.NEVER,
      isActive: transaction.isActive !== undefined ? transaction.isActive : true,
      autoExecute: transaction.autoExecute !== undefined ? transaction.autoExecute : false
    }

    planningTransactions.value.push(newTransaction)
    savePlanningTransactions()
    debugLog('[planningStore] addPlanningTransaction', newTransaction)
    monthlyBalanceStore.calculateMonthlyBalances()
    return newTransaction
  }

  /**
   * Aktualisiert eine vorhandene Planungstransaktion
   */
  function updatePlanningTransaction(id: string, updates: Partial<PlanningTransaction>) {
    const index = planningTransactions.value.findIndex(tx => tx.id === id)
    if (index !== -1) {
      planningTransactions.value[index] = { ...planningTransactions.value[index], ...updates }
      savePlanningTransactions()
      debugLog('[planningStore] updatePlanningTransaction', { id, updates })
      monthlyBalanceStore.calculateMonthlyBalances()
      return true
    }
    return false
  }

  /**
   * Löscht eine Planungstransaktion
   */
  function deletePlanningTransaction(id: string) {
    const transaction = planningTransactions.value.find(tx => tx.id === id)
    if (!transaction) return false

    planningTransactions.value = planningTransactions.value.filter(tx => tx.id !== id)
    savePlanningTransactions()
    debugLog('[planningStore] deletePlanningTransaction', id)
    monthlyBalanceStore.calculateMonthlyBalances()
    return true
  }

  /**
   * Führt eine Planungstransaktion manuell aus
   */
  function executePlanningTransaction(planningId: string, executionDate: string) {
    const planTx = getPlanningTransactionById.value(planningId)
    if (!planTx) return null

    const date = toDateOnlyString(executionDate)

    // Betrag basierend auf dem AmountType bestimmen
    let effectiveAmount = planTx.amount
    if (planTx.amountType === AmountType.APPROXIMATE && planTx.approximateAmount) {
      // Zufällige Abweichung im Bereich von ±10% der angegebenen Schwankung
      const variation = (Math.random() * 2 - 1) * planTx.approximateAmount
      effectiveAmount = Math.round((planTx.amount + variation) * 100) / 100
    } else if (planTx.amountType === AmountType.RANGE && planTx.minAmount && planTx.maxAmount) {
      // Zufälliger Betrag im angegebenen Bereich
      const range = planTx.maxAmount - planTx.minAmount
      effectiveAmount = Math.round((planTx.minAmount + Math.random() * range) * 100) / 100
      // Vorzeichen beibehalten
      if (planTx.amount < 0) effectiveAmount = -Math.abs(effectiveAmount)
    }

    if (planTx.transactionType === TransactionType.ACCOUNTTRANSFER && planTx.counterPlanningTransactionId) {
      const counterPlanTx = getPlanningTransactionById.value(planTx.counterPlanningTransactionId)
      if (counterPlanTx) {
        debugLog('[planningStore] executePlanningTransaction → ACCOUNTTRANSFER', {
          from: planTx.accountId,
          to: counterPlanTx.accountId,
          amount: effectiveAmount,
          date
        })
        return transactionStore.addTransferTransaction(
          planTx.accountId,
          counterPlanTx.accountId,
          Math.abs(effectiveAmount),
          date,
          date,
          planTx.note || planTx.name || ''
        )
      }
    }

    const transaction = {
      date,
      valueDate: date,
      accountId: planTx.accountId,
      categoryId: planTx.categoryId,
      tagIds: planTx.tagIds,
      payee: planTx.recipientId || planTx.name || '',
      amount: effectiveAmount,
      note: planTx.note || '',
      counterTransactionId: null,
      planningTransactionId: planTx.id,
      isReconciliation: false
    }

    debugLog('[planningStore] executePlanningTransaction → Einzelbuchung', transaction)
    return transactionStore.addTransaction(transaction)
  }

  /**
   * Führt alle fälligen Planungstransaktionen aus
   */
  function executeAllDuePlanningTransactions() {
    const today = dayjs()
    const upcomingTransactions = getUpcomingTransactions.value(0) // Nur heutige Transaktionen

    let executedCount = 0
    upcomingTransactions.forEach(({ date, transaction }) => {
      if (transaction.autoExecute) {
        executePlanningTransaction(transaction.id, date)
        executedCount++
      }
    })

    debugLog('[planningStore] executeAllDuePlanningTransactions', {
      date: today.format('YYYY-MM-DD'),
      executedCount
    })

    return executedCount
  }

  /**
   * Lädt Planungstransaktionen aus dem LocalStorage
   */
  function loadPlanningTransactions() {
    const saved = localStorage.getItem('finwise_planning_transactions')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)

        // Konvertiere alte Datenformate in das neue Format (falls nötig)
        planningTransactions.value = parsed.map((tx: any) => ({
          ...tx,
          amountType: tx.amountType || AmountType.EXACT,
          weekendHandling: tx.weekendHandling || WeekendHandlingType.NONE,
          recurrenceEndType: tx.recurrenceEndType || RecurrenceEndType.NEVER,
          isActive: tx.isActive !== undefined ? tx.isActive : true,
          autoExecute: tx.autoExecute !== undefined ? tx.autoExecute : false,
          name: tx.name || tx.payee || ''
        }))

        debugLog('[planningStore] loadPlanningTransactions - Loaded', planningTransactions.value.length, 'transactions')
      } catch (error) {
        debugLog('[planningStore] loadPlanningTransactions - Error parsing data', error)
        planningTransactions.value = []
      }
    }
  }

  /**
   * Speichert Planungstransaktionen im LocalStorage
   */
  function savePlanningTransactions() {
    localStorage.setItem('finwise_planning_transactions', JSON.stringify(planningTransactions.value))
    debugLog('[planningStore] savePlanningTransactions - Saved', planningTransactions.value.length, 'transactions')
  }

  /**
   * Setzt den planningStore zurück
   */
  function reset() {
    planningTransactions.value = []
    loadPlanningTransactions()
    debugLog('[planningStore] reset')
  }

  // Initialisierung
  loadPlanningTransactions()

  return {
    planningTransactions,
    getPlanningTransactionById,
    getUpcomingTransactions,
    addPlanningTransaction,
    updatePlanningTransaction,
    deletePlanningTransaction,
    executePlanningTransaction,
    executeAllDuePlanningTransactions,
    loadPlanningTransactions,
    reset
  }
})
