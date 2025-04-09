// src/stores/transactionStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { Transaction, TransactionType } from '../types'
import { useAccountStore } from './accountStore'
import { debugLog } from '@/utils/logger'

export interface ExtendedTransaction extends Transaction {
  tagIds: string[],
  payee: string,
  counterTransactionId: string | null,
  planningTransactionId: string | null,
  isReconciliation: boolean,
  runningBalance: number,
  transferToAccountId?: string | null
}

function toDateOnlyString(input: string): string {
  return input?.split("T")[0] ?? input
}

export const useTransactionStore = defineStore('transaction', () => {
  const transactions = ref<ExtendedTransaction[]>([])
  const accountStore = useAccountStore()

  // Einfache Getter-Funktionen
  const getTransactionById = computed(() => {
    return (id: string) => transactions.value.find(transaction => transaction.id === id)
  })

  const getTransactionsByAccount = computed(() => {
    return (accountId: string) => transactions.value
      .filter(transaction => transaction.accountId === accountId)
      .sort((a, b) => b.date.localeCompare(a.date))
  })

  const getTransactionsByCategory = computed(() => {
    return (categoryId: string) => transactions.value
      .filter(transaction => transaction.categoryId === categoryId)
      .sort((a, b) => b.date.localeCompare(a.date))
  })

  const getRecentTransactions = (limit: number = 10) => {
    debugLog("[transactionStore] getRecentTransactions called", { limit })
    return [...transactions.value]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, limit)
  }

  function normalizeLoadedDates() {
    transactions.value = transactions.value.map(tx => ({
      ...tx,
      date: toDateOnlyString(tx.date),
      valueDate: toDateOnlyString(tx.valueDate || tx.date)
    }))
  }

  function loadTransactions() {
    const savedTransactions = localStorage.getItem('finwise_transactions')
    if (savedTransactions) {
      transactions.value = JSON.parse(savedTransactions)
      normalizeLoadedDates()
    }
    debugLog("[transactionStore] loadTransactions", transactions.value)
  }

  function saveTransactions() {
    localStorage.setItem('finwise_transactions', JSON.stringify(transactions.value))
    debugLog("[transactionStore] saveTransactions - Transactions saved.")
  }

  function reset() {
    transactions.value = []
    loadTransactions()
    debugLog("[transactionStore] reset - Reset transactions.")
  }

  loadTransactions()

  return {
    transactions,
    getTransactionById,
    getTransactionsByAccount,
    getTransactionsByCategory,
    getRecentTransactions,
    loadTransactions,
    saveTransactions,
    reset,
  }
})
