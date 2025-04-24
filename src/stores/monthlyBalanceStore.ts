// Pfad: src/stores/monthlyBalanceStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAccountStore } from './accountStore'
import { useCategoryStore } from './categoryStore'
import { useTransactionStore } from './transactionStore'
import { usePlanningStore } from './planningStore'
import { PlanningService } from '@/services/PlanningService'
import { toDateOnlyString } from '@/utils/formatters'
import { debugLog } from '@/utils/logger'
import type { Category } from '@/types'

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

  function calculateMonthlyBalances() {
    debugLog('[monthlyBalanceStore] calculateMonthlyBalances - Start calculation')

    const months: Set<string> = new Set()
    if (transactionStore.transactions && transactionStore.transactions.length > 0) {
      transactionStore.transactions.forEach(tx => {
        const date = new Date(tx.date)
        const key = `${date.getFullYear()}-${date.getMonth()}`
        months.add(key)
      })
    } else {
      debugLog('[monthlyBalanceStore] Keine Transaktionen gefunden - Erstelle nur Zukunftsmonate')
    }

    const now = new Date()
    for (let i = 0; i < 24; i++) {
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
    const endDate   = new Date(year, month + 1, 0)
    const startDateStr = toDateOnlyString(startDate)
    const endDateStr   = toDateOnlyString(endDate)

    // Für Konten: Nach date filtern
    const txsForAccountsUntilEnd = transactionStore.transactions
      ? transactionStore.transactions.filter(tx => toDateOnlyString(tx.date) <= endDateStr)
      : []

    // Für Kategorien: Nach valueDate filtern
    const txsForCategoriesUntilEnd = transactionStore.transactions
      ? transactionStore.transactions.filter(tx => toDateOnlyString(tx.valueDate || tx.date) <= endDateStr)
      : []

    const accountBalances: Record<string, number> = {}
    const categoryBalances: Record<string, number> = {}

    // Kontosalden berechnen (nach date)
    accountStore.accounts.forEach(account => {
      const accountTxs = txsForAccountsUntilEnd.filter(tx => tx.accountId === account.id)
      const balance = accountTxs.reduce((sum, tx) => sum + tx.amount, 0)
      accountBalances[account.id] = balance
    })

    // Kategoriesalden berechnen (nach valueDate)
    categoryStore.categories.forEach(cat => {
      const categoryTxs = txsForCategoriesUntilEnd.filter(tx => tx.categoryId === cat.id)
      const balance = categoryTxs.reduce((sum, tx) => sum + tx.amount, 0)
      categoryBalances[cat.id] = balance
    })

    // Kopien für projizierte Salden
    const projectedAccountBalances  = { ...accountBalances }
    const projectedCategoryBalances = { ...categoryBalances }

    // Vormonat ermitteln
    const prevMonth = month === 0 ? 11 : month - 1
    const prevYear  = month === 0 ? year - 1 : year
    const prevMonthBalance = monthlyBalances.value.find(
      mb => mb.year === prevYear && mb.month === prevMonth
    )

    if (prevMonthBalance) {
      // Kategorieprognose für den aktuellen Monat
      categoryStore.categories.forEach((cat: Category) => {
        // Transaktionen dieses Monats (mit valueDate)
        const monthTxs = transactionStore.transactions.filter(tx => {
          const valueDate = new Date(toDateOnlyString(tx.valueDate || tx.date))
          return tx.categoryId === cat.id &&
                 valueDate >= startDate &&
                 valueDate <= endDate
        })

        // Summe der Transaktionen dieses Monats
        const monthTxSum = monthTxs.reduce((sum, tx) => sum + tx.amount, 0)

        // Prognosebuchungen für diesen Monat
        const plannedAmount = planningStore.planningTransactions
          .filter(pt => pt.isActive && pt.categoryId === cat.id)
          .reduce((sum, pt) => {
            const occ = PlanningService
              .calculateNextOccurrences(pt, startDateStr, endDateStr)
              .length
            return sum + pt.amount * occ
          }, 0)

        // Monatssaldo = Vormonatssaldo + aktuelle Buchungen + Prognosen
        projectedCategoryBalances[cat.id] =
          (prevMonthBalance.projectedCategoryBalances[cat.id] || 0) +
          monthTxSum +
          plannedAmount;

        debugLog(`[MonthlyBalanceStore] Category ${cat.name} Month ${year}-${month+1}`, {
          prevMonthSaldo: prevMonthBalance.projectedCategoryBalances[cat.id] || 0,
          monthTxSum,
          plannedAmount,
          newSaldo: projectedCategoryBalances[cat.id]
        });
      })

      // Kontenprognose für den aktuellen Monat
      accountStore.accounts.forEach(account => {
        // Transaktionen dieses Monats
        const monthTxs = transactionStore.transactions.filter(tx => {
          const date = new Date(toDateOnlyString(tx.date))
          return tx.accountId === account.id &&
                 date >= startDate &&
                 date <= endDate
        })

        // Summe der Transaktionen dieses Monats
        const monthTxSum = monthTxs.reduce((sum, tx) => sum + tx.amount, 0)

        // Prognosebuchungen für diesen Monat
        const plannedAmount = planningStore.planningTransactions
          .filter(pt => pt.isActive && pt.accountId === account.id)
          .reduce((sum, pt) => {
            const occ = PlanningService
              .calculateNextOccurrences(pt, startDateStr, endDateStr)
              .length
            return sum + pt.amount * occ
          }, 0)

        // Monatssaldo = Vormonatssaldo + aktuelle Buchungen + Prognosen
        projectedAccountBalances[account.id] =
          (prevMonthBalance.projectedAccountBalances[account.id] || 0) +
          monthTxSum +
          plannedAmount;
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

  const getAccountBalanceForDate = computed(() => {
    return (accountId: string, date: Date): number => {
      const year  = date.getFullYear()
      const month = date.getMonth()
      const mb    = monthlyBalances.value.find(mb => mb.year === year && mb.month === month)
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
      const year  = date.getFullYear()
      const month = date.getMonth()
      const mb    = monthlyBalances.value.find(mb => mb.year === year && mb.month === month)
      if (mb && mb.projectedAccountBalances[accountId] !== undefined) {
        return mb.projectedAccountBalances[accountId]
      }
      return getAccountBalanceForDate.value(accountId, date)
    }
  })

  const getCategoryBalanceForDate = computed(() => {
    return (categoryId: string, date: Date): number => {
      const year  = date.getFullYear()
      const month = date.getMonth()
      const mb    = monthlyBalances.value.find(mb => mb.year === year && mb.month === month)
      if (mb && mb.categoryBalances[categoryId] !== undefined) {
        return mb.categoryBalances[categoryId]
      }
      const dateStr = toDateOnlyString(date)
      const txs = transactionStore.transactions.filter(
        tx => tx.categoryId === categoryId && toDateOnlyString(tx.date) <= dateStr
      )
      return txs.reduce((sum, tx) => sum + tx.amount, 0)
    }
  })

  const getProjectedCategoryBalanceForDate = computed(() => {
    return (categoryId: string, date: Date): number => {
      const year  = date.getFullYear()
      const month = date.getMonth()
      const mb    = monthlyBalances.value.find(mb => mb.year === year && mb.month === month)
      if (mb && mb.projectedCategoryBalances[categoryId] !== undefined) {
        return mb.projectedCategoryBalances[categoryId]
      }
      return getCategoryBalanceForDate.value(categoryId, date)
    }
  })

  const getLatestPersistedCategoryBalance = computed(() => {
    return (categoryId: string, date: Date): BalanceInfo | null => {
      const targetYear  = date.getFullYear()
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
