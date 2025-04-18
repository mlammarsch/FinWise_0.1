// Datei: src/stores/planningStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import dayjs from 'dayjs'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import weekday from 'dayjs/plugin/weekday'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
dayjs.extend(isSameOrBefore)
dayjs.extend(weekday)
dayjs.extend(isSameOrAfter)

import {
  PlanningTransaction,
  RecurrencePattern,
  TransactionType,
  AmountType,
  RecurrenceEndType,
  WeekendHandlingType
} from '../types'
import { useTransactionStore } from './transactionStore'
import { useRuleStore } from './ruleStore'
import { toDateOnlyString } from '@/utils/formatters'
import { debugLog } from '@/utils/logger'
import { useMonthlyBalanceStore } from '@/stores/monthlyBalanceStore'

export const usePlanningStore = defineStore('planning', () => {
  const planningTransactions = ref<PlanningTransaction[]>([])
  const transactionStore = useTransactionStore()
  const monthlyBalanceStore = useMonthlyBalanceStore()

  // Neues State-Element für die Überwachung der letzten Aktualisierung
  const lastUpdateTimestamp = ref<number>(0)
  const forecastMonths = ref<number>(24) // Konfigurierbare Anzahl von Monaten für Prognosen

  const getPlanningTransactionById = computed(() => {
    return (id: string) => planningTransactions.value.find(tx => tx.id === id)
  })

  // Verbesserte Version der getUpcomingTransactions-Funktion für längere Zeiträume
  const getUpcomingTransactions = computed(() => {
    return (days: number = 30) => {
      // Prüfe, ob ein wöchentliches Update erforderlich ist
      checkAndUpdateForecast()

      const today = dayjs()
      // Bei Bedarf erlauben wir einen längeren Prognosezeitraum von bis zu forecastMonths.value
      const requestedDays = days > 0 ? days : forecastMonths.value * 30
      const endDate = today.add(requestedDays, 'day')
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

  // Funktion zur Prüfung, ob ein Datum ein Wochenende ist
  function isWeekend(date: dayjs.Dayjs): boolean {
    const day = date.day()
    return day === 0 || day === 6 // 0 ist Sonntag, 6 ist Samstag
  }

  // Funktion zur Handhabung von Wochenenden
  function applyWeekendHandling(date: dayjs.Dayjs, handling: WeekendHandlingType): dayjs.Dayjs {
    if (!isWeekend(date) || handling === WeekendHandlingType.NONE) {
      return date
    }

    const isSaturday = date.day() === 6

    switch (handling) {
      case WeekendHandlingType.BEFORE:
        return isSaturday ? date.subtract(1, 'day') : date.subtract(2, 'day') // Freitag
      case WeekendHandlingType.AFTER:
        return isSaturday ? date.add(2, 'day') : date.add(1, 'day') // Montag
      default:
        return date
    }
  }

  function daysInMonth(month: number, year: number): number {
    return new Date(year, month, 0).getDate()
  }

  function checkAndUpdateForecast() {
    const now = Date.now()
    const oneWeek = 7 * 24 * 60 * 60 * 1000

    // Prüfe, ob die letzte Aktualisierung länger als eine Woche her ist
    if (now - lastUpdateTimestamp.value > oneWeek) {
      debugLog('[planningStore] Weekly forecast update triggered', {
        lastUpdate: new Date(lastUpdateTimestamp.value).toISOString(),
        now: new Date(now).toISOString()
      })

      // Aktualisiere die Monatsbilanzen (diese enthalten Prognosen)
      monthlyBalanceStore.calculateMonthlyBalances()

      // Aktualisiere den Zeitstempel
      lastUpdateTimestamp.value = now

      // Speichere den Zeitstempel für die nächste Sitzung
      localStorage.setItem('finwise_last_forecast_update', now.toString())
    }
  }

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
    const maxIterations = 1000

    while (currentDate.isSameOrBefore(end) && count < maxIterations) {
      let adjustedDate = applyWeekendHandling(currentDate, planTx.weekendHandling)

      if (adjustedDate.isSameOrAfter(start) && adjustedDate.isSameOrBefore(end)) {
        occurrences.push(toDateOnlyString(adjustedDate.toDate()))
      }

      if (planTx.recurrenceEndType === RecurrenceEndType.COUNT &&
          planTx.recurrenceCount !== null &&
          ++count >= planTx.recurrenceCount) {
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
          currentDate = currentDate.add(2, 'week')
          break
        case RecurrencePattern.MONTHLY:
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

      if (planTx.recurrenceEndType === RecurrenceEndType.DATE && planTx.endDate &&
          currentDate.isAfter(dayjs(toDateOnlyString(planTx.endDate)))) {
        break
      }
    }

    return occurrences
  }

  // Funktion zum Hinzufügen einer Planung
  function addPlanningTransaction(planning: Partial<PlanningTransaction>) {
    const txId = uuidv4()

    const newPlanning: PlanningTransaction = {
      id: txId,
      name: planning.name || '',
      description: planning.description || '',
      amount: planning.amount || 0,
      amountType: planning.amountType || AmountType.EXACT,
      approximateAmount: planning.approximateAmount,
      minAmount: planning.minAmount,
      maxAmount: planning.maxAmount,
      type: planning.type || TransactionType.EXPENSE,
      startDate: planning.startDate || new Date().toISOString(),
      valueDate: planning.valueDate || planning.startDate || new Date().toISOString(),
      endDate: planning.endDate,
      accountId: planning.accountId || '',
      transferToAccountId: planning.transferToAccountId || '',
      categoryId: planning.categoryId || '',
      tagIds: planning.tagIds || [],
      recipientId: planning.recipientId || '',
      recurrencePattern: planning.recurrencePattern || RecurrencePattern.ONCE,
      recurrenceEndType: planning.recurrenceEndType || RecurrenceEndType.NEVER,
      recurrenceCount: planning.recurrenceCount,
      executionDay: planning.executionDay,
      weekendHandling: planning.weekendHandling || WeekendHandlingType.NONE,
      note: planning.note || '',
      isActive: planning.isActive !== undefined ? planning.isActive : true,
      autoExecute: planning.autoExecute !== undefined ? planning.autoExecute : false,
      transactionType: planning.transactionType
    }

    planningTransactions.value.push(newPlanning)
    savePlanningTransactions()

    debugLog('[planningStore] addPlanningTransaction', {
      id: newPlanning.id,
      name: newPlanning.name,
      amount: newPlanning.amount
    })

    // Monatliche Saldos nach Änderung neu berechnen
    monthlyBalanceStore.calculateMonthlyBalances()

    return newPlanning
  }

  // Funktion zum Aktualisieren einer Planung
  function updatePlanningTransaction(id: string, planning: Partial<PlanningTransaction>) {
    const index = planningTransactions.value.findIndex(p => p.id === id)
    if (index !== -1) {
      // Aktualisiere das Objekt
      planningTransactions.value[index] = {
        ...planningTransactions.value[index],
        ...planning
      }
      savePlanningTransactions()

      debugLog('[planningStore] updatePlanningTransaction', {
        id,
        name: planningTransactions.value[index].name,
        updates: Object.keys(planning).join(', ')
      })

      // Monatliche Saldos nach Änderung neu berechnen
      monthlyBalanceStore.calculateMonthlyBalances()

      return true
    }
    return false
  }

  // Funktion zum Löschen einer Planung
  function deletePlanningTransaction(id: string) {
    const planToDelete = planningTransactions.value.find(p => p.id === id)
    if (planToDelete) {
      debugLog('[planningStore] deletePlanningTransaction', {
        id,
        name: planToDelete.name
      })
    }

    planningTransactions.value = planningTransactions.value.filter(p => p.id !== id)
    savePlanningTransactions()

    // Monatliche Saldos nach Änderung neu berechnen
    monthlyBalanceStore.calculateMonthlyBalances()
  }

  // Funktion zum Ausführen einer geplanten Transaktion
  function executePlanningTransaction(planningId: string, executionDate: string) {
    const planning = getPlanningTransactionById.value(planningId)
    if (!planning) {
      debugLog('[planningStore] executePlanningTransaction - Planning not found', {
        planningId
      })
      return false
    }

    // Neue Transaktion erstellen
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
      planningId: planning.id // Zuordnung zur Planung
    }

    // Transaktion hinzufügen
    const ruleStore = useRuleStore()
    const newTx = transactionStore.addTransaction(transaction, false)

    debugLog('[planningStore] executePlanningTransaction', {
      planningId: planning.id,
      name: planning.name,
      executionDate,
      transactionId: newTx.id
    })

    // Regeln anwenden
    ruleStore.applyRules()

    // Monatliche Saldos aktualisieren
    monthlyBalanceStore.calculateMonthlyBalances()

    return true
  }

  // Funktion zum Ausführen aller fälligen Auto-Ausführen-Planungen
  function executeAllDuePlanningTransactions() {
    const today = new Date()
    const todayStr = toDateOnlyString(today)

    debugLog('[planningStore] executeAllDuePlanningTransactions - Checking for due transactions', {
      todayDate: todayStr
    })

    const upcomingToday = getUpcomingTransactions.value(0)
      .filter(tx => {
        // Nur Transaktionen für heute berücksichtigen
        return tx.date === todayStr && tx.transaction.autoExecute && tx.transaction.isActive
      })

    let executedCount = 0

    // Führe jede fällige Planung aus
    upcomingToday.forEach(tx => {
      const success = executePlanningTransaction(tx.transaction.id, tx.date)
      if (success) {
        executedCount++
        debugLog('[planningStore] executeAllDuePlanningTransactions - Executed transaction', {
          id: tx.transaction.id,
          name: tx.transaction.name,
          date: tx.date
        })
      }
    })

    return executedCount
  }

  function savePlanningTransactions() {
    localStorage.setItem('finwise_planning_transactions', JSON.stringify(planningTransactions.value))
    debugLog('[planningStore] savePlanningTransactions - Saved', planningTransactions.value.length, 'transactions')
  }

  function loadPlanningTransactions() {
    const saved = localStorage.getItem('finwise_planning_transactions')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        planningTransactions.value = parsed.map((tx: any) => ({
          ...tx,
          amountType: tx.amountType || AmountType.EXACT,
          weekendHandling: tx.weekendHandling || WeekendHandlingType.NONE,
          recurrenceEndType: tx.recurrenceEndType || RecurrenceEndType.NEVER,
          isActive: tx.isActive !== undefined ? tx.isActive : true,
          autoExecute: tx.autoExecute !== undefined ? tx.autoExecute : false,
          name: tx.name || tx.payee || '',
          valueDate: tx.valueDate || tx.date // Stellt sicher, dass valueDate immer vorhanden ist
        }))

        debugLog('[planningStore] loadPlanningTransactions - Loaded', planningTransactions.value.length, 'transactions')

        // Lade den vorherigen Zeitstempel für die Prognoseaktualisierung
        const savedTimestamp = localStorage.getItem('finwise_last_forecast_update')
        if (savedTimestamp) {
          lastUpdateTimestamp.value = parseInt(savedTimestamp)
        }

        // Prüfe beim Laden, ob eine Aktualisierung erforderlich ist
        checkAndUpdateForecast()
      } catch (error) {
        debugLog('[planningStore] loadPlanningTransactions - Error parsing data', error)
        planningTransactions.value = []
      }
    }
  }

  function reset() {
    planningTransactions.value = []
    lastUpdateTimestamp.value = 0
    localStorage.removeItem('finwise_last_forecast_update')
    loadPlanningTransactions()
    debugLog('[planningStore] reset')
  }

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
    reset,
    forecastMonths,
    checkAndUpdateForecast
  }
})
