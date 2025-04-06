// src/stores/monthlyBalanceStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAccountStore } from './accountStore'
import { useCategoryStore } from './categoryStore'
import { useTransactionStore } from './transactionStore'
import { usePlanningStore } from './planningStore'
import { toDateOnlyString } from '@/utils/formatters'
import { debugLog } from '@/utils/logger'

export interface MonthlyBalance {
  year: number
  month: number
  accountBalances: Record<string, number>
  categoryBalances: Record<string, number>
  projectedAccountBalances: Record<string, number>
  projectedCategoryBalances: Record<string, number>
}

export const useMonthlyBalanceStore = defineStore('monthlyBalance', () => {
  const monthlyBalances = ref<MonthlyBalance[]>([])

  const accountStore = useAccountStore()
  const categoryStore = useCategoryStore()
  const transactionStore = useTransactionStore()
  const planningStore = usePlanningStore()

  /**
   * Berechnet die monatlichen Salden für alle Konten und Kategorien
   */
  function calculateMonthlyBalances() {
    debugLog('[monthlyBalanceStore] calculateMonthlyBalances - Start calculation')
    const months: Set<string> = new Set()

    // Sammle alle vorhandenen Transaktionsmonate
    transactionStore.transactions.forEach(tx => {
      const date = new Date(tx.date)
      const key = `${date.getFullYear()}-${date.getMonth()}`
      months.add(key)
    })

    // Füge die aktuellen und kommenden Monate hinzu (für Prognosen)
    const now = new Date()
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1)
      const key = `${date.getFullYear()}-${date.getMonth()}`
      months.add(key)
    }

    // Initialisiere das monthlyBalances Array
    const newBalances: MonthlyBalance[] = []

    Array.from(months).sort().forEach(key => {
      const [year, month] = key.split('-').map(Number)
      newBalances.push(calculateBalanceForMonth(year, month))
    })

    monthlyBalances.value = newBalances
    saveMonthlyBalances()

    debugLog('[monthlyBalanceStore] calculateMonthlyBalances - Calculated balances for', months.size, 'months')
  }

  /**
   * Berechnet die Salden für einen bestimmten Monat
   */
  function calculateBalanceForMonth(year: number, month: number): MonthlyBalance {
    const startDate = new Date(year, month, 1)
    const endDate = new Date(year, month + 1, 0)

    const startDateStr = toDateOnlyString(startDate)
    const endDateStr = toDateOnlyString(endDate)

    // Sammle alle Transaktionen bis zu diesem Monat
    const txsUntilEnd = transactionStore.transactions.filter(tx => {
      return toDateOnlyString(tx.date) <= endDateStr
    })

    // Berechne aktuelle Konten- und Kategoriesalden
    const accountBalances: Record<string, number> = {}
    const categoryBalances: Record<string, number> = {}

    // Berechne Kontosalden
    accountStore.accounts.forEach(account => {
      const accountTxs = txsUntilEnd.filter(tx => tx.accountId === account.id)
      const balance = accountTxs.reduce((sum, tx) => sum + tx.amount, 0)
      accountBalances[account.id] = balance
    })

    // Berechne Kategoriesalden
    categoryStore.categories.forEach(category => {
      const categoryTxs = txsUntilEnd.filter(tx => tx.categoryId === category.id)
      const balance = categoryTxs.reduce((sum, tx) => sum + tx.amount, 0)
      categoryBalances[category.id] = balance
    })

    // Berechne Prognosen auf Basis von geplanten Transaktionen
    const projectedAccountBalances = { ...accountBalances }
    const projectedCategoryBalances = { ...categoryBalances }

    // Finde alle Planungsbuchungen, die für die kommenden Monate relevant sind
    const now = new Date()
    if (startDate >= now) {
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 12, 0)
      const futureTransactions = planningStore.getUpcomingTransactions(
        Math.ceil((monthEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      )

      futureTransactions.forEach(({ date, transaction }) => {
        const txDate = new Date(date)
        if (txDate >= startDate && txDate <= endDate) {
          // Aktualisiere die prognostizierten Kontosalden
          if (transaction.accountId) {
            projectedAccountBalances[transaction.accountId] =
              (projectedAccountBalances[transaction.accountId] || 0) + transaction.amount
          }

          // Aktualisiere die prognostizierten Kategoriesalden
          if (transaction.categoryId) {
            projectedCategoryBalances[transaction.categoryId] =
              (projectedCategoryBalances[transaction.categoryId] || 0) + transaction.amount
          }

          // Bei Transfers auch das Gegenkonto aktualisieren
          if (transaction.transactionType === 'ACCOUNTTRANSFER' && transaction.transferToAccountId) {
            projectedAccountBalances[transaction.transferToAccountId] =
              (projectedAccountBalances[transaction.transferToAccountId] || 0) + Math.abs(transaction.amount)
          }
        }
      })
    }

    return {
      year,
      month,
      accountBalances,
      categoryBalances,
      projectedAccountBalances,
      projectedCategoryBalances
    }
  }

  /**
   * Gibt den Kontosaldo für ein bestimmtes Datum zurück
   */
  const getAccountBalanceForDate = computed(() => {
    return (accountId: string, date: Date): number => {
      const year = date.getFullYear()
      const month = date.getMonth()

      const monthlyBalance = monthlyBalances.value.find(
        mb => mb.year === year && mb.month === month
      )

      if (monthlyBalance && monthlyBalance.accountBalances[accountId] !== undefined) {
        return monthlyBalance.accountBalances[accountId]
      }

      // Fallback: Berechne den Saldo anhand der Transaktionen
      const dateStr = toDateOnlyString(date)
      const txsUntilDate = transactionStore.transactions.filter(tx => {
        return tx.accountId === accountId && toDateOnlyString(tx.date) <= dateStr
      })

      return txsUntilDate.reduce((sum, tx) => sum + tx.amount, 0)
    }
  })

  /**
   * Gibt den prognostizierten Kontosaldo für ein bestimmtes Datum zurück
   */
  const getProjectedAccountBalanceForDate = computed(() => {
    return (accountId: string, date: Date): number => {
      const year = date.getFullYear()
      const month = date.getMonth()

      const monthlyBalance = monthlyBalances.value.find(
        mb => mb.year === year && mb.month === month
      )

      if (monthlyBalance && monthlyBalance.projectedAccountBalances[accountId] !== undefined) {
        return monthlyBalance.projectedAccountBalances[accountId]
      }

      // Fallback: Verwende den aktuellen Saldo
      return getAccountBalanceForDate.value(accountId, date)
    }
  })

  /**
   * Gibt den Kategoriesaldo für ein bestimmtes Datum zurück
   */
  const getCategoryBalanceForDate = computed(() => {
    return (categoryId: string, date: Date): number => {
      const year = date.getFullYear()
      const month = date.getMonth()

      const monthlyBalance = monthlyBalances.value.find(
        mb => mb.year === year && mb.month === month
      )

      if (monthlyBalance && monthlyBalance.categoryBalances[categoryId] !== undefined) {
        return monthlyBalance.categoryBalances[categoryId]
      }

      // Fallback: Berechne den Saldo anhand der Transaktionen
      const dateStr = toDateOnlyString(date)
      const txsUntilDate = transactionStore.transactions.filter(tx => {
        return tx.categoryId === categoryId && toDateOnlyString(tx.date) <= dateStr
      })

      return txsUntilDate.reduce((sum, tx) => sum + tx.amount, 0)
    }
  })

  /**
   * Gibt den prognostizierten Kategoriesaldo für ein bestimmtes Datum zurück
   */
  const getProjectedCategoryBalanceForDate = computed(() => {
    return (categoryId: string, date: Date): number => {
      const year = date.getFullYear()
      const month = date.getMonth()

      const monthlyBalance = monthlyBalances.value.find(
        mb => mb.year === year && mb.month === month
      )

      if (monthlyBalance && monthlyBalance.projectedCategoryBalances[categoryId] !== undefined) {
        return monthlyBalance.projectedCategoryBalances[categoryId]
      }

      // Fallback: Verwende den aktuellen Saldo
      return getCategoryBalanceForDate.value(categoryId, date)
    }
  })

  /**
   * Speichert die monatlichen Salden im LocalStorage
   */
  function saveMonthlyBalances() {
    localStorage.setItem('finwise_monthly_balances', JSON.stringify(monthlyBalances.value))
    debugLog('[monthlyBalanceStore] saveMonthlyBalances - Saved monthly balances')
  }

  /**
   * Lädt die monatlichen Salden aus dem LocalStorage
   */
  function loadMonthlyBalances() {
    const saved = localStorage.getItem('finwise_monthly_balances')
    if (saved) {
      monthlyBalances.value = JSON.parse(saved)
      debugLog('[monthlyBalanceStore] loadMonthlyBalances - Loaded monthly balances')
    } else {
      calculateMonthlyBalances()
    }
  }

  function reset() {
    monthlyBalances.value = []
    debugLog('[monthlyBalanceStore] reset - Reset monthly balances')
    loadMonthlyBalances()
  }

  // Initialisierung beim Laden des Stores
  loadMonthlyBalances()

  return {
    monthlyBalances,
    calculateMonthlyBalances,
    getAccountBalanceForDate,
    getProjectedAccountBalanceForDate,
    getCategoryBalanceForDate,
    getProjectedCategoryBalanceForDate,
    reset
  }
})
