// src/stores/monthlyBalanceStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAccountStore } from './accountStore'
import { useCategoryStore } from './categoryStore'
import { useTransactionStore } from './transactionStore'
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

export interface BalanceInfo {
  balance: number
  date: Date
}

export const useMonthlyBalanceStore = defineStore('monthlyBalance', () => {
  const monthlyBalances = ref<MonthlyBalance[]>([])

  const accountStore = useAccountStore()
  const categoryStore = useCategoryStore()
  const transactionStore = useTransactionStore()

  function calculateMonthlyBalances() {
    debugLog('[monthlyBalanceStore] calculateMonthlyBalances - Start calculation')
    const months: Set<string> = new Set()

    transactionStore.transactions.forEach(tx => {
      const date = new Date(tx.date)
      const key = `${date.getFullYear()}-${date.getMonth()}`
      months.add(key)
    })

    const now = new Date()
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1)
      const key = `${date.getFullYear()}-${date.getMonth()}`
      months.add(key)
    }

    const newBalances: MonthlyBalance[] = []

    Array.from(months).sort().forEach(key => {
      const [year, month] = key.split('-').map(Number)
      newBalances.push(calculateBalanceForMonth(year, month))
    })

    monthlyBalances.value = newBalances
    saveMonthlyBalances()

    debugLog('[monthlyBalanceStore] calculateMonthlyBalances - Calculated balances for', months.size, 'months')
  }

  function calculateBalanceForMonth(year: number, month: number): MonthlyBalance {
    const startDate = new Date(year, month, 1)
    const endDate = new Date(year, month + 1, 0)

    const startDateStr = toDateOnlyString(startDate)
    const endDateStr = toDateOnlyString(endDate)

    const txsUntilEnd = transactionStore.transactions.filter(tx => {
      return toDateOnlyString(tx.date) <= endDateStr
    })

    const accountBalances: Record<string, number> = {}
    const categoryBalances: Record<string, number> = {}

    accountStore.accounts.forEach(account => {
      const accountTxs = txsUntilEnd.filter(tx => tx.accountId === account.id)
      const balance = accountTxs.reduce((sum, tx) => sum + tx.amount, 0)
      accountBalances[account.id] = balance
    })

    categoryStore.categories.forEach(category => {
      const categoryTxs = txsUntilEnd.filter(tx => tx.categoryId === category.id)
      const balance = categoryTxs.reduce((sum, tx) => sum + tx.amount, 0)
      categoryBalances[category.id] = balance
    })

    const projectedAccountBalances = { ...accountBalances }
    const projectedCategoryBalances = { ...categoryBalances }

    const now = new Date()
    // In dieser Version importieren wir NICHT planningStore direkt, um die zirkuläre Abhängigkeit zu vermeiden
    // Stattdessen lassen wir die Prognose-Aktualisierung durch den planningStore selbst anstoßen

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

      const monthlyBalance = monthlyBalances.value.find(
        mb => mb.year === year && mb.month === month
      )

      if (monthlyBalance && monthlyBalance.accountBalances[accountId] !== undefined) {
        return monthlyBalance.accountBalances[accountId]
      }

      const dateStr = toDateOnlyString(date)
      const txsUntilDate = transactionStore.transactions.filter(tx => {
        return tx.accountId === accountId && toDateOnlyString(tx.date) <= dateStr
      })

      return txsUntilDate.reduce((sum, tx) => sum + tx.amount, 0)
    }
  })

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

      return getAccountBalanceForDate.value(accountId, date)
    }
  })

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

      const dateStr = toDateOnlyString(date)
      const txsUntilDate = transactionStore.transactions.filter(tx => {
        return tx.categoryId === categoryId && toDateOnlyString(tx.date) <= dateStr
      })

      return txsUntilDate.reduce((sum, tx) => sum + tx.amount, 0)
    }
  })

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

      return getCategoryBalanceForDate.value(categoryId, date)
    }
  })

  const getLatestPersistedCategoryBalance = computed(() => {
    return (categoryId: string, date: Date): BalanceInfo | null => {
      const targetYear = date.getFullYear()
      const targetMonth = date.getMonth()

      const relevantBalances = monthlyBalances.value
        .filter(mb => {
          return (mb.year < targetYear) ||
                 (mb.year === targetYear && mb.month < targetMonth)
        })
        .sort((a, b) => {
          if (a.year !== b.year) return b.year - a.year
          return b.month - a.month
        })

      for (const mb of relevantBalances) {
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
