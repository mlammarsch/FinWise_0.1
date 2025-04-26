// src/stores/monthlyBalanceStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
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

/**
 * Store für die Speicherung und Verwaltung von Monatsbilanzen.
 * Reine Datenlogik (CRUD), keine Berechnungslogik mehr.
 */
export const useMonthlyBalanceStore = defineStore('monthlyBalance', () => {
  const monthlyBalances = ref<MonthlyBalance[]>([])

  /**
   * Liefert alle Monatsbilanzen
   */
  function getAllMonthlyBalances(): MonthlyBalance[] {
    return monthlyBalances.value
  }

  /**
   * Liefert eine bestimmte Monatsbilanz
   */
  function getMonthlyBalance(year: number, month: number): MonthlyBalance | null {
    return monthlyBalances.value.find(mb => mb.year === year && mb.month === month) || null
  }

  /**
   * Setzt eine Monatsbilanz oder erstellt sie, falls sie nicht existiert
   */
  function setMonthlyBalance(year: number, month: number, balance: Omit<MonthlyBalance, 'year' | 'month'>): void {
    const index = monthlyBalances.value.findIndex(mb => mb.year === year && mb.month === month)

    if (index >= 0) {
      monthlyBalances.value[index] = {
        year,
        month,
        ...balance
      }
    } else {
      monthlyBalances.value.push({
        year,
        month,
        ...balance
      })
    }
  }

  /**
   * Speichert alle Monatsbilanzen im lokalen Speicher
   */
  function saveMonthlyBalances() {
    localStorage.setItem('finwise_monthly_balances', JSON.stringify(monthlyBalances.value))
    debugLog('[monthlyBalanceStore] saveMonthlyBalances - Saved monthly balances')
  }

  /**
   * Lädt alle Monatsbilanzen aus dem lokalen Speicher
   */
  function loadMonthlyBalances() {
    const saved = localStorage.getItem('finwise_monthly_balances')
    if (saved) {
      monthlyBalances.value = JSON.parse(saved)
      debugLog('[monthlyBalanceStore] loadMonthlyBalances - Loaded monthly balances')
    }
  }

  /**
   * Setzt alle Monatsbilanzen zurück
   */
  function reset() {
    monthlyBalances.value = []
    debugLog('[monthlyBalanceStore] reset - Reset monthly balances')
  }

  /**
   * Hilfsmethode: Liefert den letzten persistierten Saldo einer Kategorie vor einem Datum
   * @deprecated Verwende BalanceService.getPreviousPersistedBalance
   */
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

  /**
   * Hilfsmethode: Liefert den Kontosaldo zu einem Stichtag
   * @deprecated Verwende BalanceService.getTodayBalance
   */
  const getAccountBalanceForDate = computed(() => {
    return (accountId: string, date: Date): number | null => {
      const year = date.getFullYear()
      const month = date.getMonth()
      const mb = monthlyBalances.value.find(mb => mb.year === year && mb.month === month)

      if (mb && mb.accountBalances[accountId] !== undefined) {
        return mb.accountBalances[accountId]
      }
      return null
    }
  })

  /**
   * Hilfsmethode: Liefert den projizierten Kontosaldo zu einem Stichtag
   * @deprecated Verwende BalanceService.getProjectedBalance
   */
  const getProjectedAccountBalanceForDate = computed(() => {
    return (accountId: string, date: Date): number | null => {
      const year = date.getFullYear()
      const month = date.getMonth()
      const mb = monthlyBalances.value.find(mb => mb.year === year && mb.month === month)

      if (mb && mb.projectedAccountBalances[accountId] !== undefined) {
        return mb.projectedAccountBalances[accountId]
      }
      return null
    }
  })

  /**
   * Hilfsmethode: Liefert den Kategoriesaldo zu einem Stichtag
   * @deprecated Verwende BalanceService.getTodayBalance
   */
  const getCategoryBalanceForDate = computed(() => {
    return (categoryId: string, date: Date): number | null => {
      const year = date.getFullYear()
      const month = date.getMonth()
      const mb = monthlyBalances.value.find(mb => mb.year === year && mb.month === month)

      if (mb && mb.categoryBalances[categoryId] !== undefined) {
        return mb.categoryBalances[categoryId]
      }
      return null
    }
  })

  /**
   * Hilfsmethode: Liefert den projizierten Kategoriesaldo zu einem Stichtag
   * @deprecated Verwende BalanceService.getProjectedBalance
   */
  const getProjectedCategoryBalanceForDate = computed(() => {
    return (categoryId: string, date: Date): number | null => {
      const year = date.getFullYear()
      const month = date.getMonth()
      const mb = monthlyBalances.value.find(mb => mb.year === year && mb.month === month)

      if (mb && mb.projectedCategoryBalances[categoryId] !== undefined) {
        return mb.projectedCategoryBalances[categoryId]
      }
      return null
    }
  })

  loadMonthlyBalances()

  return {
    monthlyBalances,
    getAllMonthlyBalances,
    getMonthlyBalance,
    setMonthlyBalance,
    saveMonthlyBalances,
    loadMonthlyBalances,
    reset,

    // Legacy-Methoden für Kompatibilität, sollten später ersetzt werden
    getLatestPersistedCategoryBalance,
    getAccountBalanceForDate,
    getProjectedAccountBalanceForDate,
    getCategoryBalanceForDate,
    getProjectedCategoryBalanceForDate
  }
})
