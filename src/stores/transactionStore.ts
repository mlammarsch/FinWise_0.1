// Datei: src/stores/transactionStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { Transaction, TransactionType } from '../types'
import { useAccountStore } from './accountStore'
import { useCategoryStore } from './categoryStore'
import { debugLog } from '@/utils/logger'
import { addAccountTransfer } from '@/utils/accountTransfers'
import { calculateRunningBalances } from '@/utils/runningBalances'

export interface ExtendedTransaction extends Transaction {
  tagIds: string[],
  payee: string,
  counterTransactionId: string | null,
  planningTransactionId: string | null,
  isReconciliation: boolean,
  runningBalance: number,
  transferToAccountId?: string | null
}

export const useTransactionStore = defineStore('transaction', () => {
  const transactions = ref<ExtendedTransaction[]>([])
  const accountStore = useAccountStore()
  const categoryStore = useCategoryStore()

  const getTransactionById = computed(() => {
    return (id: string) => transactions.value.find(transaction => transaction.id === id)
  })

  const getTransactionsByAccount = computed(() => {
    return (accountId: string) => transactions.value
      .filter(transaction => transaction.accountId === accountId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  })

  const getTransactionsByCategory = computed(() => {
    return (categoryId: string) => transactions.value
      .filter(transaction => transaction.categoryId === categoryId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  })

  const getTransactionsByDateRange = computed(() => {
    return (startDate: string, endDate: string) => {
      const start = new Date(startDate).getTime()
      const end = new Date(endDate).getTime()
      return transactions.value
        .filter(transaction => {
          const txDate = new Date(transaction.valueDate || transaction.date).getTime()
          return txDate >= start && txDate <= end
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    }
  })

  const getRecentTransactions = (limit: number = 10) => {
    debugLog("[transactionStore] getRecentTransactions called", { limit })
    return [...transactions.value]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit)
  }

  function addTransaction(transaction: Omit<ExtendedTransaction, 'id' | 'runningBalance'>) {
    let runningBalance = 0

    if (transaction.type !== TransactionType.CATEGORYTRANSFER) {
      const accountTransactions = getTransactionsByAccount.value(transaction.accountId)
      runningBalance = accountTransactions.length > 0
        ? accountTransactions[0].runningBalance + transaction.amount
        : transaction.amount
      accountStore.updateAccountBalance(transaction.accountId, runningBalance)
    }

    const newTransaction: ExtendedTransaction = {
      ...transaction,
      id: uuidv4(),
      runningBalance
    }

    transactions.value.push(newTransaction)
    debugLog("[transactionStore] addTransaction:", newTransaction)

    if (transaction.categoryId) {
      if (transaction.type === TransactionType.CATEGORYTRANSFER) {
        categoryStore.updateCategoryBalance(transaction.categoryId, transaction.amount)
      } else if (!transaction.isReconciliation && transaction.type !== TransactionType.ACCOUNTTRANSFER) {
        categoryStore.updateCategoryBalance(transaction.categoryId, transaction.amount)
      }
    }

    if (newTransaction.type === TransactionType.INCOME) {
      const verfgMittel = categoryStore.categories.find((c) => c.name === "Verfügbare Mittel")
      const incomeCat = categoryStore.findCategoryById(newTransaction.categoryId!)
      if (verfgMittel && incomeCat?.isIncomeCategory) {
        import('@/utils/categoryTransfer').then(module => {
          module.addCategoryTransfer(
            incomeCat.id,
            verfgMittel.id,
            newTransaction.amount,
            newTransaction.date,
            `Auto-Kategorientransfer von ${incomeCat.name} zu Verfügbare Mittel`
          )
        })
      }
    }

    saveTransactions()
    return newTransaction
  }

  function updateTransaction(id: string, updates: Partial<ExtendedTransaction>) {
    const index = transactions.value.findIndex(transaction => transaction.id === id)
    if (index !== -1) {
      transactions.value[index] = { ...transactions.value[index], ...updates }

      if (updates.hasOwnProperty("reconciled")) {
        const counterId = transactions.value[index].counterTransactionId
        if (counterId) {
          const counterIndex = transactions.value.findIndex(tx => tx.id === counterId)
          if (counterIndex !== -1) {
            transactions.value[counterIndex] = {
              ...transactions.value[counterIndex],
              reconciled: updates.reconciled
            }
          }
        }
      }

      saveTransactions()
      updateRunningBalances(transactions.value[index].accountId)
      debugLog("[transactionStore] updateTransaction", { id, updates })
      return true
    }
    return false
  }

  function deleteTransaction(id: string) {
    const transaction = transactions.value.find(tx => tx.id === id)
    if (!transaction) return false

    const accountId = transaction.accountId
    transactions.value = transactions.value.filter(tx => tx.id !== id)

    if (transaction.counterTransactionId) {
      transactions.value = transactions.value.filter(tx => tx.id !== transaction.counterTransactionId)
    }

    updateRunningBalances(accountId)
    saveTransactions()
    debugLog("[transactionStore] deleteTransaction", id)
    return true
  }

  // Nutzt die zentrale Berechnung für laufende Salden
  function updateRunningBalances(accountId: string) {
    const accountTxs = transactions.value.filter(tx => tx.accountId === accountId)
    const { updatedTransactions, finalBalance } = calculateRunningBalances(accountTxs)
    // Aktualisiere die betroffenen Transaktionen in transactions.value
    updatedTransactions.forEach(updatedTx => {
      const index = transactions.value.findIndex(tx => tx.id === updatedTx.id)
      if (index !== -1) {
        transactions.value[index] = updatedTx
      }
    })
    if (accountTxs.length > 0) {
      accountStore.updateAccountBalance(accountId, finalBalance)
    }
    saveTransactions()
    debugLog("[transactionStore] updateRunningBalances", { accountId, finalBalance })
  }

  function loadTransactions() {
    const savedTransactions = localStorage.getItem('finwise_transactions')
    if (savedTransactions) {
      transactions.value = JSON.parse(savedTransactions)
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
    getTransactionsByDateRange,
    getRecentTransactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    updateRunningBalances,
    loadTransactions,
    reset,
  }
})
