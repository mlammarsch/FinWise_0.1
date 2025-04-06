// Datei: src/stores/planningStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import dayjs from 'dayjs'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
dayjs.extend(isSameOrBefore)
import { PlanningTransaction, RecurrencePattern, TransactionType } from '../types'
import { useTransactionStore } from './transactionStore'
import { toDateOnlyString } from '@/utils/formatters'
import { debugLog } from '@/utils/logger'
import { useMonthlyBalanceStore } from '@/stores/monthlyBalanceStore'  // Neuer Import

export const usePlanningStore = defineStore('planning', () => {
  const planningTransactions = ref<PlanningTransaction[]>([])
  const transactionStore = useTransactionStore()
  const monthlyBalanceStore = useMonthlyBalanceStore()  // Instanz des neuen Stores

  const getPlanningTransactionById = computed(() => {
    return (id: string) => planningTransactions.value.find(tx => tx.id === id)
  })

  const getUpcomingTransactions = computed(() => {
    return (days: number = 30) => {
      const today = dayjs()
      const endDate = today.add(days, 'day')
      const upcoming: Array<{ date: string, transaction: PlanningTransaction }> = []

      planningTransactions.value.forEach(planTx => {
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

  function calculateNextOccurrences(
    planTx: PlanningTransaction,
    startDate: string,
    endDate: string
  ): string[] {
    const occurrences: string[] = []
    const start = dayjs(startDate)
    const end = dayjs(endDate)
    const txStart = dayjs(toDateOnlyString(planTx.startDate))

    if (txStart.isAfter(end)) return []
    if (planTx.endDate && dayjs(toDateOnlyString(planTx.endDate)).isBefore(start)) return []

    let currentDate = txStart
    let count = 0

    while (currentDate.isSameOrBefore(end)) {
      if (currentDate.isSameOrAfter(start)) {
        occurrences.push(toDateOnlyString(currentDate.toDate()))
      }

      if (planTx.recurrenceCount !== null && ++count >= planTx.recurrenceCount) break

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
          currentDate = currentDate.add(1, 'month')
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

      if (planTx.endDate && currentDate.isAfter(dayjs(toDateOnlyString(planTx.endDate)))) break
    }

    return occurrences
  }

  function addPlanningTransaction(transaction: Omit<PlanningTransaction, 'id'>) {
    const newTransaction: PlanningTransaction = {
      ...transaction,
      id: uuidv4()
    }

    planningTransactions.value.push(newTransaction)
    savePlanningTransactions()
    debugLog('[planningStore] addPlanningTransaction', newTransaction)
    monthlyBalanceStore.calculateMonthlyBalances()  // Aktualisierung auslösen
    return newTransaction
  }

  function updatePlanningTransaction(id: string, updates: Partial<PlanningTransaction>) {
    const index = planningTransactions.value.findIndex(tx => tx.id === id)
    if (index !== -1) {
      planningTransactions.value[index] = { ...planningTransactions.value[index], ...updates }
      savePlanningTransactions()
      debugLog('[planningStore] updatePlanningTransaction', { id, updates })
      monthlyBalanceStore.calculateMonthlyBalances()  // Aktualisierung auslösen
      return true
    }
    return false
  }

  function deletePlanningTransaction(id: string) {
    const transaction = planningTransactions.value.find(tx => tx.id === id)
    if (!transaction) return false

    planningTransactions.value = planningTransactions.value.filter(tx => tx.id !== id)
    savePlanningTransactions()
    debugLog('[planningStore] deletePlanningTransaction', id)
    monthlyBalanceStore.calculateMonthlyBalances()  // Aktualisierung auslösen
    return true
  }

  function executePlanningTransaction(planningId: string, executionDate: string) {
    const planTx = getPlanningTransactionById.value(planningId)
    if (!planTx) return null

    const date = toDateOnlyString(executionDate)

    if (planTx.transactionType === TransactionType.ACCOUNTTRANSFER && planTx.counterPlanningTransactionId) {
      const counterPlanTx = getPlanningTransactionById.value(planTx.counterPlanningTransactionId)
      if (counterPlanTx) {
        debugLog('[planningStore] executePlanningTransaction → ACCOUNTTRANSFER', {
          from: planTx.accountId,
          to: counterPlanTx.accountId,
          amount: planTx.amount,
          date
        })
        return transactionStore.addTransferTransaction(
          planTx.accountId,
          counterPlanTx.accountId,
          Math.abs(planTx.amount),
          date,
          date,
          planTx.description
        )
      }
    }

    const transaction = {
      date,
      valueDate: date,
      accountId: planTx.accountId,
      categoryId: planTx.categoryId,
      tagIds: planTx.tagIds,
      payee: planTx.payee,
      amount: planTx.amount,
      note: planTx.description,
      counterTransactionId: null,
      planningTransactionId: planTx.id,
      isReconciliation: false
    }

    debugLog('[planningStore] executePlanningTransaction → Einzelbuchung', transaction)
    return transactionStore.addTransaction(transaction)
  }

  function loadPlanningTransactions() {
    const saved = localStorage.getItem('finwise_planning_transactions')
    if (saved) {
      planningTransactions.value = JSON.parse(saved)
    }
  }

  function savePlanningTransactions() {
    localStorage.setItem('finwise_planning_transactions', JSON.stringify(planningTransactions.value))
  }

  function reset() {
    planningTransactions.value = []
    loadPlanningTransactions()
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
    loadPlanningTransactions,
    reset
  }
})
