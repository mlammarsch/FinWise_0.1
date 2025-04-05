import { defineStore } from 'pinia'
import { ref } from 'vue'
import dayjs from 'dayjs'
import { v4 as uuidv4 } from 'uuid'
import { debugLog } from '@/utils/logger'
import { useTransactionStore } from './transactionStore'

export interface MonthlyBalance {
  id: string
  accountId: string
  year: number
  month: number
  balance: number
  created_at: string
  updated_at: string
}

export const useMonthlyBalanceStore = defineStore('monthlyBalance', () => {
  const monthlyBalances = ref<MonthlyBalance[]>([])
  const transactionStore = useTransactionStore()

  /**
   * Berechnet die Monatssalden, indem Transaktionen nach Konto, Jahr und Monat gruppiert werden.
   * Für jede Gruppe wird der Saldo der letzten Transaktion als Monatsende-Saldo verwendet.
   */
  function calculateMonthlyBalances() {
    const transactions = transactionStore.transactions
    const groups: Record<string, any[]> = {}

    transactions.forEach(tx => {
      // Annahme: tx.date ist im Format yyyy-mm-dd
      const date = dayjs(tx.date)
      const key = `${tx.accountId}-${date.year()}-${date.month() + 1}`
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(tx)
    })

    const result: MonthlyBalance[] = []
    for (const key in groups) {
      const txs = groups[key]
      txs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      const lastTx = txs[txs.length - 1]
      const parts = key.split('-')
      const accountId = parts[0]
      const year = parseInt(parts[1])
      const month = parseInt(parts[2])
      result.push({
        id: uuidv4(),
        accountId,
        year,
        month,
        balance: lastTx.runningBalance,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    }

    monthlyBalances.value = result
    saveMonthlyBalances()
    debugLog('[monthlyBalanceStore] calculateMonthlyBalances', monthlyBalances.value)
  }

  function loadMonthlyBalances() {
    const saved = localStorage.getItem('finwise_monthly_balances')
    if (saved) {
      monthlyBalances.value = JSON.parse(saved)
    }
  }

  function saveMonthlyBalances() {
    localStorage.setItem('finwise_monthly_balances', JSON.stringify(monthlyBalances.value))
  }

  function reset() {
    monthlyBalances.value = []
    loadMonthlyBalances()
  }

  loadMonthlyBalances()

  return {
    monthlyBalances,
    calculateMonthlyBalances,
    loadMonthlyBalances,
    saveMonthlyBalances,
    reset
  }
})
