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

  const accountStore     = useAccountStore()
  const categoryStore    = useCategoryStore()
  const transactionStore = useTransactionStore()
  const planningStore    = usePlanningStore()

  function calculateMonthlyBalances() {
    debugLog('[monthlyBalanceStore] calculateMonthlyBalances - Start calculation')

    const months = new Set<string>()
    if (transactionStore.transactions.length) {
      transactionStore.transactions.forEach(tx => {
        const d   = new Date(tx.date)
        const key = `${d.getFullYear()}-${d.getMonth()}`
        months.add(key)
      })
    }

    // auch Zukunft 24 Monate (erhöht von ursprünglich weniger)
    const now = new Date()
    for (let i = 0; i < 24; i++) {
      const d   = new Date(now.getFullYear(), now.getMonth() + i, 1)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      months.add(key)
    }

    const newBalances: MonthlyBalance[] = []
    Array.from(months)
      .sort()
      .forEach(key => {
        const [y, m] = key.split('-').map(Number)
        newBalances.push(calculateBalanceForMonth(y, m))
      })

    monthlyBalances.value = newBalances
    saveMonthlyBalances()
  }

  function calculateBalanceForMonth(year: number, month: number): MonthlyBalance {
    const start   = new Date(year, month, 1)
    const end     = new Date(year, month + 1, 0)
    const startStr= toDateOnlyString(start)
    const endStr  = toDateOnlyString(end)

    // Konten-Salden basierend auf tx.date
    const txsUntilEnd = transactionStore.transactions.filter(
      tx => toDateOnlyString(tx.date) <= endStr
    )

    const accountBalances: Record<string, number> = {}
    accountStore.accounts.forEach(acc => {
      accountBalances[acc.id] = txsUntilEnd
        .filter(tx => tx.accountId === acc.id)
        .reduce((s, tx) => s + tx.amount, 0)
    })

    // Kategorie-Salden basierend auf tx.valueDate (wenn vorhanden, sonst tx.date)
    const categoryBalances: Record<string, number> = {}
    categoryStore.categories.forEach(cat => {
      categoryBalances[cat.id] = transactionStore.transactions
        .filter(tx => {
          const txDate = toDateOnlyString(tx.valueDate || tx.date)
          return tx.categoryId === cat.id && txDate <= endStr
        })
        .reduce((s, tx) => s + tx.amount, 0)
    })

    const projectedAccountBalances  = { ...accountBalances }
    const projectedCategoryBalances = { ...categoryBalances }

    // Vormonat finden
    const prevMonth = month === 0 ? 11 : month - 1
    const prevYear  = month === 0 ? year - 1 : year
    const prevMB    = monthlyBalances.value.find(
      mb => mb.year === prevYear && mb.month === prevMonth
    )

    if (prevMB) {
      categoryStore.categories.forEach((cat: Category) => {
        // geplante Beträge MIT Vorzeichen
        const plannedRaw = planningStore.planningTransactions
          .filter(pt => pt.isActive && pt.categoryId === cat.id)
          .reduce((sum, pt) => {
            const occ = PlanningService.calculateNextOccurrences(
              pt,
              startStr,
              endStr
            ).length
            return sum + pt.amount * occ
          }, 0)

        const prevRaw    = prevMB.categoryBalances[cat.id] || 0
        const currRaw    = categoryBalances[cat.id]   || 0
        const delta      = currRaw - prevRaw

        // Projektion = alte Projektion + Delta + Planung
        projectedCategoryBalances[cat.id] =
          (prevMB.projectedCategoryBalances[cat.id] || 0) +
          delta +
          plannedRaw
      })

      Object.keys(prevMB.projectedAccountBalances).forEach(accId => {
        if (projectedAccountBalances[accId] !== undefined) {
          projectedAccountBalances[accId] += prevMB.projectedAccountBalances[accId]
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

  // sofortige Neuberechnung nach jeder Transaktion
  transactionStore.$subscribe(() => {
    calculateMonthlyBalances()
  })

  const getAccountBalanceForDate = computed(() => {
    return (accountId: string, date: Date): number => {
      const mb = monthlyBalances.value.find(
        m => m.year === date.getFullYear() && m.month === date.getMonth()
      )
      if (mb?.accountBalances[accountId] !== undefined) {
        return mb.accountBalances[accountId]
      }
      const ds = toDateOnlyString(date)
      return transactionStore.transactions
        .filter(tx => tx.accountId === accountId && toDateOnlyString(tx.date) <= ds)
        .reduce((s, tx) => s + tx.amount, 0)
    }
  })

  const getProjectedAccountBalanceForDate = computed(() => {
    return (accountId: string, date: Date): number => {
      const mb = monthlyBalances.value.find(
        m => m.year === date.getFullYear() && m.month === date.getMonth()
      )
      return mb?.projectedAccountBalances[accountId] ?? getAccountBalanceForDate.value(accountId, date)
    }
  })

  // Getter für Kategoriesalden nach valueDate
  const getCategoryBalanceForDate = computed(() => {
    return (categoryId: string, date: Date): number => {
      const mb = monthlyBalances.value.find(
        m => m.year === date.getFullYear() && m.month === date.getMonth()
      )
      if (mb?.categoryBalances[categoryId] !== undefined) {
        return mb.categoryBalances[categoryId]
      }
      const ds = toDateOnlyString(date)
      return transactionStore.transactions
        .filter(tx => {
          const txDate = toDateOnlyString(tx.valueDate || tx.date)
          return tx.categoryId === categoryId && txDate <= ds
        })
        .reduce((s, tx) => s + tx.amount, 0)
    }
  })

  const getProjectedCategoryBalanceForDate = computed(() => {
    return (categoryId: string, date: Date): number => {
      const mb = monthlyBalances.value.find(
        m => m.year === date.getFullYear() && m.month === date.getMonth()
      )
      return mb?.projectedCategoryBalances[categoryId] ?? getCategoryBalanceForDate.value(categoryId, date)
    }
  })

  const getLatestPersistedCategoryBalance = computed(() => {
    return (categoryId: string, date: Date) => {
      const ty = date.getFullYear(), tm = date.getMonth()
      const relevant = monthlyBalances.value
        .filter(mb => mb.year < ty || (mb.year === ty && mb.month < tm))
        .sort((a, b) => b.year - a.year || b.month - a.month)
      for (const mb of relevant) {
        if (mb.categoryBalances[categoryId] !== undefined) {
          return { balance: mb.categoryBalances[categoryId], date: new Date(mb.year, mb.month, 1) }
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

  loadMonthlyBalances()

  return {
    monthlyBalances,
    calculateMonthlyBalances,
    getAccountBalanceForDate,
    getProjectedAccountBalanceForDate,
    getCategoryBalanceForDate,
    getProjectedCategoryBalanceForDate,
    getLatestPersistedCategoryBalance,
    reset: loadMonthlyBalances
  }
})
