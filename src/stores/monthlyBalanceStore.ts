// src/stores/monthlyBalanceStore.ts
import { defineStore }         from 'pinia'
import { ref, computed }       from 'vue'
import { useAccountStore }     from './accountStore'
import { useCategoryStore }    from './categoryStore'
import { useTransactionStore } from './transactionStore'
import { usePlanningStore }    from './planningStore'
import { PlanningService }     from '@/services/PlanningService'
import { toDateOnlyString }    from '@/utils/formatters'
import { debugLog }            from '@/utils/logger'

export interface MonthlyBalance {
  year:  number                     // Kalenderjahr
  month: number                     // 0-basiert (0 = Jan)
  accountBalances:          Record<string, number>
  categoryBalances:         Record<string, number>
  projectedAccountBalances: Record<string, number> // = accountBalances
  projectedCategoryBalances:Record<string, number> // = categoryBalances
}

export interface BalanceInfo {
  balance: number
  date:    Date
}

export const useMonthlyBalanceStore = defineStore('monthlyBalance', () => {
  const monthlyBalances = ref<MonthlyBalance[]>([])

  const accountStore     = useAccountStore()
  const categoryStore    = useCategoryStore()
  const transactionStore = useTransactionStore()
  const planningStore    = usePlanningStore()

  // --------------------------------------------------------------------
  // Hauptberechnung
  // --------------------------------------------------------------------
  function calculateMonthlyBalances() {
    debugLog('[monthlyBalanceStore] calculateMonthlyBalances – start')

    // Monats-Keys sammeln
    const months = new Set<string>()
    transactionStore.transactions.forEach(tx => {
      const d = new Date(tx.date)
      months.add(`${d.getFullYear()}-${d.getMonth()}`)
    })
    const now = new Date()
    for (let i = 0; i < 24; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
      months.add(`${d.getFullYear()}-${d.getMonth()}`)
    }

    // Chronologisch sortieren
    const sorted = Array.from(months).sort((a, b) => {
      const [ay, am] = a.split('-').map(Number)
      const [by, bm] = b.split('-').map(Number)
      return ay === by ? am - bm : ay - by
    })

    // Monat für Monat berechnen
    const result: MonthlyBalance[] = []
    sorted.forEach(key => {
      const [y, m] = key.split('-').map(Number)
      const prev   = result.at(-1) ?? null
      result.push(calcMonth(y, m, prev))
    })

    monthlyBalances.value = result
    localStorage.setItem('finwise_monthly_balances', JSON.stringify(result))
    debugLog('[monthlyBalanceStore] calculateMonthlyBalances – done', result.length, 'months')
  }

  // --------------------------------------------------------------------
  // Detailberechnung pro Monat
  // --------------------------------------------------------------------
  function calcMonth(
    year: number,
    month: number,
    prev: MonthlyBalance | null
  ): MonthlyBalance {
    const start = new Date(year, month, 1)
    const end   = new Date(year, month + 1, 0)
    const sStr  = toDateOnlyString(start)
    const eStr  = toDateOnlyString(end)

    // Konten
    const accountBalances:          Record<string, number> = {}
    const projectedAccountBalances: Record<string, number> = {}

    accountStore.accounts.forEach(acc => {
      const prevBal = prev?.accountBalances[acc.id] ?? 0

      const monthSum = transactionStore.transactions
        .filter(tx =>
          tx.accountId === acc.id &&
          new Date(tx.date) >= start &&
          new Date(tx.date) <= end
        )
        .reduce((s, t) => s + t.amount, 0)

      const planned = planningStore.planningTransactions
        .filter(p => p.isActive && p.accountId === acc.id)
        .reduce((s, p) =>
          s + p.amount *
            PlanningService.calculateNextOccurrences(p, sStr, eStr).length
        , 0)

      const newBal = prevBal + monthSum + planned
      accountBalances[acc.id]          = newBal
      projectedAccountBalances[acc.id] = newBal
    })

    // Kategorien
    const categoryBalances:          Record<string, number> = {}
    const projectedCategoryBalances: Record<string, number> = {}

    categoryStore.categories.forEach(cat => {
      const prevBal = prev?.categoryBalances[cat.id] ?? 0

      const monthSum = transactionStore.transactions
        .filter(tx => {
          const v = new Date(toDateOnlyString(tx.valueDate || tx.date))
          return tx.categoryId === cat.id && v >= start && v <= end
        })
        .reduce((s, t) => s + t.amount, 0)

      const planned = planningStore.planningTransactions
        .filter(p => p.isActive && p.categoryId === cat.id)
        .reduce((s, p) =>
          s + p.amount *
            PlanningService.calculateNextOccurrences(p, sStr, eStr).length
        , 0)

      const newBal = prevBal + monthSum + planned
      categoryBalances[cat.id]          = newBal
      projectedCategoryBalances[cat.id] = newBal
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

  // --------------------------------------------------------------------
  // Getter
  // --------------------------------------------------------------------
  const getCategoryBalanceForDate = computed(() => (
    (categoryId: string, date: Date): number => {
      const mb = monthlyBalances.value.find(
        m => m.year === date.getFullYear() && m.month === date.getMonth()
      )
      if (mb) return mb.categoryBalances[categoryId] ?? 0

      const dateStr = toDateOnlyString(date)
      return transactionStore.transactions
        .filter(tx =>
          tx.categoryId === categoryId &&
          toDateOnlyString(tx.valueDate || tx.date) <= dateStr
        )
        .reduce((s, t) => s + t.amount, 0)
    }
  ))

  const getAccountBalanceForDate = computed(() => (
    (accountId: string, date: Date): number => {
      const mb = monthlyBalances.value.find(
        m => m.year === date.getFullYear() && m.month === date.getMonth()
      )
      if (mb) return mb.accountBalances[accountId] ?? 0

      const dateStr = toDateOnlyString(date)
      return transactionStore.transactions
        .filter(tx =>
          tx.accountId === accountId &&
          toDateOnlyString(tx.date) <= dateStr
        )
        .reduce((s, t) => s + t.amount, 0)
    }
  ))

  // Projection-Getter aliasieren (BudgetService greift darauf zu)
  const getProjectedCategoryBalanceForDate = getCategoryBalanceForDate
  const getProjectedAccountBalanceForDate  = getAccountBalanceForDate

  // Für CategoryService.calculateCategorySaldo – als normale Funktion
  function getLatestPersistedCategoryBalance(
    categoryId: string,
    date: Date
  ): BalanceInfo | null {
    const targetYear  = date.getFullYear()
    const targetMonth = date.getMonth()
    const relevant = monthlyBalances.value
      .filter(mb =>
        mb.year < targetYear ||
        (mb.year === targetYear && mb.month < targetMonth)
      )
      .sort((a, b) => b.year - a.year || b.month - a.month)

    for (const mb of relevant) {
      const bal = mb.categoryBalances[categoryId]
      if (bal !== undefined) {
        return { balance: bal, date: new Date(mb.year, mb.month, 1) }
      }
    }
    return null
  }

  // --------------------------------------------------------------------
  // Laden/Reset
  // --------------------------------------------------------------------
  function loadMonthlyBalances() {
    const saved = localStorage.getItem('finwise_monthly_balances')
    if (saved) monthlyBalances.value = JSON.parse(saved)
    else calculateMonthlyBalances()
  }
  function reset() {
    monthlyBalances.value = []
    calculateMonthlyBalances()
  }

  loadMonthlyBalances()

  return {
    monthlyBalances,
    calculateMonthlyBalances,
    getCategoryBalanceForDate,
    getAccountBalanceForDate,
    getProjectedCategoryBalanceForDate,
    getProjectedAccountBalanceForDate,
    getLatestPersistedCategoryBalance,
    reset
  }
})
