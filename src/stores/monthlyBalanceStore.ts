// src/stores/monthlyBalanceStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAccountStore } from './accountStore'
import { useCategoryStore } from './categoryStore'
import { useTransactionStore } from './transactionStore'
import { usePlanningStore } from './planningStore'
import { PlanningService } from '@/services/PlanningService'
import { toDateOnlyString } from '@/utils/formatters'
import { debugLog } from '@/utils/logger'
import type { Category, TransactionType } from '@/types'

export interface MonthlyBalance {
  year: number
  month: number
  accountBalances: Record<string, number>
  categoryBalances: Record<string, number>
  projectedAccountBalances: Record<string, number>
  projectedCategoryBalances: Record<string, number>
}

export interface BalanceInfo {
  balance: number
  date: Date
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

    // Sammle alle benötigten Monate
    const months: Set<string> = new Set()

    // Alle Monate mit Transaktionen
    if (transactionStore.transactions && transactionStore.transactions.length > 0) {
      transactionStore.transactions.forEach(tx => {
        const date = new Date(tx.date)
        const key = `${date.getFullYear()}-${date.getMonth()}`
        months.add(key)
      })
    }

    // Füge 24 Zukunftsmonate hinzu
    const now = new Date()
    for (let i = 0; i < 24; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1)
      const key = `${date.getFullYear()}-${date.getMonth()}`
      months.add(key)
    }

    // Sortiere Monate chronologisch (wichtig für die Rollover-Berechnung)
    const sortedMonths = Array.from(months).sort()
    const newBalances: MonthlyBalance[] = []

    // Berechne jeden Monat nacheinander
    sortedMonths.forEach(key => {
      const [year, month] = key.split('-').map(Number)
      const previousBalance = newBalances.length > 0 ? newBalances[newBalances.length - 1] : null

      const monthBalance = calculateBalanceForMonth(year, month, previousBalance)
      newBalances.push(monthBalance)
    })

    monthlyBalances.value = newBalances
    saveMonthlyBalances()
    debugLog('[monthlyBalanceStore] calculateMonthlyBalances - Calculated balances for', months.size, 'months')
  }

  /**
   * Berechnet den Saldo für einen bestimmten Monat, unter Berücksichtigung des Vormonatssaldos
   */
  function calculateBalanceForMonth(
    year: number,
    month: number,
    previousMonthBalance: MonthlyBalance | null
  ): MonthlyBalance {
    const startDate = new Date(year, month, 1)
    const endDate = new Date(year, month + 1, 0)
    const startDateStr = toDateOnlyString(startDate)
    const endDateStr = toDateOnlyString(endDate)

    debugLog(`[monthlyBalanceStore] Calculating balance for month ${year}-${month+1}`)

    // Initialisiere die Saldolisten
    const accountBalances: Record<string, number> = {}
    const categoryBalances: Record<string, number> = {}
    const projectedAccountBalances: Record<string, number> = {}
    const projectedCategoryBalances: Record<string, number> = {}

    // 1. KONTEN: Berechne aktuelle Kontosalden bis zum Monatsende (nach date)
    accountStore.accounts.forEach(account => {
      // Alle Transaktionen bis Monatsende
      const txsUntilEnd = transactionStore.transactions.filter(tx => {
        return tx.accountId === account.id && toDateOnlyString(tx.date) <= endDateStr
      })

      // Aktueller Kontosaldo (bis Monatsende)
      accountBalances[account.id] = txsUntilEnd.reduce((sum, tx) => sum + tx.amount, 0)

      // Projizierter Saldo (Vormonat + aktuelle Transaktionen)
      const prevAccountBalance = previousMonthBalance?.projectedAccountBalances[account.id] || 0

      // Transaktionen nur dieses Monats
      const monthTxs = txsUntilEnd.filter(tx => {
        const txDate = new Date(toDateOnlyString(tx.date))
        return txDate >= startDate && txDate <= endDate
      })

      // Summe nur von diesem Monat
      const monthTxSum = monthTxs.reduce((sum, tx) => sum + tx.amount, 0)

      // Prognosen für diesen Monat
      const plannedAmount = planningStore.planningTransactions
        .filter(pt => pt.isActive && pt.accountId === account.id)
        .reduce((sum, pt) => {
          const occ = PlanningService
            .calculateNextOccurrences(pt, startDateStr, endDateStr)
            .length
          return sum + pt.amount * occ
        }, 0)

      // Projizierter Saldo = Vormonatsprojizierter Saldo + Monats-TX + Monats-Prognosen
      projectedAccountBalances[account.id] = prevAccountBalance + monthTxSum + plannedAmount
    })

    // 2. KATEGORIEN: Berechne aktuelle Kategoriesalden bis zum Monatsende (nach valueDate)
    categoryStore.categories.forEach(category => {
      // Alle Transaktionen bis Monatsende (nach valueDate)
      const txsUntilEnd = transactionStore.transactions.filter(tx => {
        return ((tx.categoryId === category.id) ||
                (tx.type === "CATEGORYTRANSFER" && tx.toCategoryId === category.id)) &&
               toDateOnlyString(tx.valueDate || tx.date) <= endDateStr
      })

      // Aktueller Kategoriesaldo (bis Monatsende)
      categoryBalances[category.id] = txsUntilEnd.reduce((sum, tx) => sum + tx.amount, 0)

      // Projizierter Saldo (Vormonat + aktuelle Transaktionen)
      const prevCategoryBalance = previousMonthBalance?.projectedCategoryBalances[category.id] || 0

      // Transaktionen nur dieses Monats (nach valueDate)
      const monthTxs = transactionStore.transactions.filter(tx => {
        const valueDate = new Date(toDateOnlyString(tx.valueDate || tx.date))
        return ((tx.categoryId === category.id) ||
                (tx.type === "CATEGORYTRANSFER" && tx.toCategoryId === category.id)) &&
               valueDate >= startDate &&
               valueDate <= endDate
      })

      // Summe nur von diesem Monat
      const monthTxSum = monthTxs.reduce((sum, tx) => sum + tx.amount, 0)

      // Prognosen für diesen Monat
      const plannedAmount = planningStore.planningTransactions
        .filter(pt => pt.isActive && pt.categoryId === category.id)
        .reduce((sum, pt) => {
          const occ = PlanningService
            .calculateNextOccurrences(pt, startDateStr, endDateStr)
            .length
          return sum + pt.amount * occ
        }, 0)

      // Projizierter Saldo = Vormonatsprojizierter Saldo + Monats-TX + Monats-Prognosen
      projectedCategoryBalances[category.id] = prevCategoryBalance + monthTxSum + plannedAmount

      debugLog(`[monthlyBalanceStore] Category ${category.name} for ${year}-${month+1}`, {
        previousBalance: prevCategoryBalance,
        monthTransactions: monthTxSum,
        plannedAmount,
        newBalance: projectedCategoryBalances[category.id]
      })
    })

    return {
      year,
      month,
      accountBalances,
      categoryBalances,
      projectedAccountBalances,
      projectedCategoryBalances
    }
  }

  const getAccountBalanceForDate = computed(() => {
    return (accountId: string, date: Date): number => {
      const year = date.getFullYear()
      const month = date.getMonth()
      const mb = monthlyBalances.value.find(mb => mb.year === year && mb.month === month)
      if (mb && mb.accountBalances[accountId] !== undefined) {
        return mb.accountBalances[accountId]
      }
      const dateStr = toDateOnlyString(date)
      const txs = transactionStore.transactions.filter(
        tx => tx.accountId === accountId && toDateOnlyString(tx.date) <= dateStr
      )
      return txs.reduce((sum, tx) => sum + tx.amount, 0)
    }
  })

  const getProjectedAccountBalanceForDate = computed(() => {
    return (accountId: string, date: Date): number => {
      const year = date.getFullYear()
      const month = date.getMonth()
      const mb = monthlyBalances.value.find(mb => mb.year === year && mb.month === month)
      if (mb && mb.projectedAccountBalances[accountId] !== undefined) {
        return mb.projectedAccountBalances[accountId]
      }
      return getAccountBalanceForDate.value(accountId, date)
    }
  })

  const getCategoryBalanceForDate = computed(() => {
    return (categoryId: string, date: Date): number => {
      const year = date.getFullYear()
      const month = date.getMonth()
      const mb = monthlyBalances.value.find(mb => mb.year === year && mb.month === month)
      if (mb && mb.categoryBalances[categoryId] !== undefined) {
        return mb.categoryBalances[categoryId]
      }
      const dateStr = toDateOnlyString(date)
      const txs = transactionStore.transactions.filter(
        tx => (tx.categoryId === categoryId ||
              (tx.type === "CATEGORYTRANSFER" && tx.toCategoryId === categoryId)) &&
              toDateOnlyString(tx.valueDate || tx.date) <= dateStr
      )
      return txs.reduce((sum, tx) => sum + tx.amount, 0)
    }
  })

  const getProjectedCategoryBalanceForDate = computed(() => {
    return (categoryId: string, date: Date): number => {
      const year = date.getFullYear()
      const month = date.getMonth()
      const mb = monthlyBalances.value.find(mb => mb.year === year && mb.month === month)
      if (mb && mb.projectedCategoryBalances[categoryId] !== undefined) {
        return mb.projectedCategoryBalances[categoryId]
      }
      return getCategoryBalanceForDate.value(categoryId, date)
    }
  })

  const getLatestPersistedCategoryBalance = computed(() => {
    return (categoryId: string, date: Date): BalanceInfo | null => {
      const targetYear = date.getFullYear()
      const targetMonth = date.getMonth()
      const relevant = monthlyBalances.value
        .filter(mb => mb.year < targetYear || (mb.year === targetYear && mb.month < targetMonth))
        .sort((a, b) => b.year - a.year || b.month - a.month)
      for (const mb of relevant) {
        if (mb.categoryBalances[categoryId] !== undefined) {
          return {
            balance: mb.categoryBalances[categoryId],
            date: new Date(mb.year, mb.month, 1)
          }
        }
      }
      return null
    }
  })

  function saveMonthlyBalances() {
    localStorage.setItem('finwise_monthly_balances', JSON.stringify(monthlyBalances.value))
    debugLog('[monthlyBalanceStore] saveMonthlyBalances - Saved monthly balances')
  }

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

  loadMonthlyBalances()

  return {
    monthlyBalances,
    calculateMonthlyBalances,
    getAccountBalanceForDate,
    getProjectedAccountBalanceForDate,
    getCategoryBalanceForDate,
    getProjectedCategoryBalanceForDate,
    getLatestPersistedCategoryBalance,
    reset
  }
})
