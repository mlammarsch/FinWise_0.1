import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import dayjs from 'dayjs'
import { PlanningTransaction, RecurrencePattern, TransactionType } from '../types'
import { useTransactionStore } from './transactionStore'

export const usePlanningStore = defineStore('planning', () => {
  // State
  const planningTransactions = ref<PlanningTransaction[]>([])

  // Stores
  const transactionStore = useTransactionStore()

  // Getters
  const getPlanningTransactionById = computed(() => {
    return (id: string) => planningTransactions.value.find(tx => tx.id === id)
  })

  const getUpcomingTransactions = computed(() => {
    return (days: number = 30) => {
      const today = dayjs()
      const endDate = today.add(days, 'day')
      const upcoming: Array<{ date: string, transaction: PlanningTransaction }> = []

      planningTransactions.value.forEach(planTx => {
        // Berechne die nächsten Vorkommen basierend auf dem Wiederholungsmuster
        const occurrences = calculateNextOccurrences(planTx, today.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD'))

        occurrences.forEach(date => {
          upcoming.push({
            date,
            transaction: planTx
          })
        })
      })

      // Sortiere nach Datum
      return upcoming.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    }
  })

  // Berechnet die nächsten Vorkommen einer geplanten Transaktion
  function calculateNextOccurrences(
    planTx: PlanningTransaction,
    startDate: string,
    endDate: string
  ): string[] {
    const occurrences: string[] = []
    const start = dayjs(startDate)
    const end = dayjs(endDate)
    const txStart = dayjs(planTx.startDate)

    // Wenn die Startdaten der Plantransaktion nach dem Enddatum liegt, gibt es keine Vorkommen
    if (txStart.isAfter(end)) {
      return []
    }

    // Wenn ein Enddatum für die Plantransaktion gesetzt ist und dieses vor dem Startdatum liegt,
    // gibt es keine Vorkommen
    if (planTx.endDate && dayjs(planTx.endDate).isBefore(start)) {
      return []
    }

    let currentDate = txStart
    let count = 0

    // Berechne die Vorkommen basierend auf dem Wiederholungsmuster
    while (currentDate.isBefore(end) || currentDate.isSame(end, 'day')) {
      // Füge das Datum hinzu, wenn es nach dem Startdatum liegt
      if (currentDate.isAfter(start, 'day') || currentDate.isSame(start, 'day')) {
        occurrences.push(currentDate.format('YYYY-MM-DD'))
      }

      // Prüfe, ob die maximale Anzahl an Wiederholungen erreicht ist
      if (planTx.recurrenceCount !== null && ++count >= planTx.recurrenceCount) {
        break
      }

      // Berechne das nächste Datum basierend auf dem Wiederholungsmuster
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
          // Bei einmaligen Transaktionen gibt es nur ein Vorkommen
          return occurrences
      }

      // Prüfe, ob das Enddatum der Plantransaktion erreicht ist
      if (planTx.endDate && currentDate.isAfter(dayjs(planTx.endDate))) {
        break
      }
    }

    return occurrences
  }

  // Actions
  function addPlanningTransaction(transaction: Omit<PlanningTransaction, 'id'>) {
    const newTransaction: PlanningTransaction = {
      ...transaction,
      id: uuidv4()
    }

    planningTransactions.value.push(newTransaction)
    savePlanningTransactions()
    return newTransaction
  }

  function addPlanningTransferTransaction(
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    startDate: string,
    recurrencePattern: RecurrencePattern,
    endDate: string | null = null,
    recurrenceCount: number | null = null,
    description: string = ''
  ) {
    // Erstelle zwei Plantransaktionen für den Transfer
    const fromTransaction: Omit<PlanningTransaction, 'id'> = {
      startDate,
      accountId: fromAccountId,
      categoryId: null,
      tagIds: [],
      payee: `Transfer zu Konto`,
      amount: -Math.abs(amount),
      description,
      transactionType: TransactionType.TRANSFER,
      counterPlanningTransactionId: null, // Wird später aktualisiert
      recurrencePattern,
      endDate,
      recurrenceCount
    }

    const toTransaction: Omit<PlanningTransaction, 'id'> = {
      startDate,
      accountId: toAccountId,
      categoryId: null,
      tagIds: [],
      payee: `Transfer von Konto`,
      amount: Math.abs(amount),
      description,
      transactionType: TransactionType.TRANSFER,
      counterPlanningTransactionId: null, // Wird später aktualisiert
      recurrencePattern,
      endDate,
      recurrenceCount
    }

    // Füge die Plantransaktionen hinzu
    const newFromTx = addPlanningTransaction(fromTransaction)
    const newToTx = addPlanningTransaction(toTransaction)

    // Aktualisiere die Gegenbuchungs-IDs
    updatePlanningTransaction(newFromTx.id, { counterPlanningTransactionId: newToTx.id })
    updatePlanningTransaction(newToTx.id, { counterPlanningTransactionId: newFromTx.id })

    return { fromTransaction: newFromTx, toTransaction: newToTx }
  }

  function updatePlanningTransaction(id: string, updates: Partial<PlanningTransaction>) {
    const index = planningTransactions.value.findIndex(tx => tx.id === id)
    if (index !== -1) {
      planningTransactions.value[index] = { ...planningTransactions.value[index], ...updates }
      savePlanningTransactions()
      return true
    }
    return false
  }

  function deletePlanningTransaction(id: string) {
    const transaction = planningTransactions.value.find(tx => tx.id === id)
    if (!transaction) return false

    // Lösche die Plantransaktion
    planningTransactions.value = planningTransactions.value.filter(tx => tx.id !== id)

    // Wenn es eine Gegenbuchung gibt, lösche diese auch
    if (transaction.counterPlanningTransactionId) {
      planningTransactions.value = planningTransactions.value.filter(
        tx => tx.id !== transaction.counterPlanningTransactionId
      )
    }

    savePlanningTransactions()
    return true
  }

  function executePlanningTransaction(planningId: string, executionDate: string) {
    const planTx = getPlanningTransactionById.value(planningId)
    if (!planTx) return null

    // Erstelle eine reguläre Transaktion aus der Plantransaktion
    const transaction = {
      date: executionDate,
      valueDate: executionDate,
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

    // Wenn es sich um einen Transfer handelt, führe beide Seiten aus
    if (planTx.transactionType === TransactionType.TRANSFER && planTx.counterPlanningTransactionId) {
      const counterPlanTx = getPlanningTransactionById.value(planTx.counterPlanningTransactionId)
      if (counterPlanTx) {
        return transactionStore.addTransferTransaction(
          planTx.accountId,
          counterPlanTx.accountId,
          Math.abs(planTx.amount),
          executionDate,
          executionDate,
          planTx.description
        )
      }
    }

    // Andernfalls führe eine einzelne Transaktion aus
    return transactionStore.addTransaction(transaction)
  }

  // Persistenz
  function loadPlanningTransactions() {
    const savedTransactions = localStorage.getItem('finwise_planning_transactions')
    if (savedTransactions) {
      planningTransactions.value = JSON.parse(savedTransactions)
    }
  }

  function savePlanningTransactions() {
    localStorage.setItem('finwise_planning_transactions', JSON.stringify(planningTransactions.value))
  }

  // Initialisiere beim ersten Laden
  loadPlanningTransactions()

  function reset() {
    planningTransactions.value = []
    loadPlanningTransactions()
  }

  return {
    planningTransactions,
    getPlanningTransactionById,
    getUpcomingTransactions,
    addPlanningTransaction,
    addPlanningTransferTransaction,
    updatePlanningTransaction,
    deletePlanningTransaction,
    executePlanningTransaction,
    loadPlanningTransactions,
    reset
  }
})
