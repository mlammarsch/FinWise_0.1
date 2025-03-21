import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { Transaction, TransactionType } from '../types'
import { useAccountStore } from './accountStore'
import { useCategoryStore } from './categoryStore'

// Erweiterter Transaction-Typ
export interface ExtendedTransaction extends Transaction {
  type: TransactionType,
  valueDate: string,
  tagIds: string[],
  payee: string,
  counterTransactionId: string | null,
  planningTransactionId: string | null,
  isReconciliation: boolean,
  runningBalance: number,
  transferToAccountId?: string | null
}

export const useTransactionStore = defineStore('transaction', () => {
  // State
  const transactions = ref<ExtendedTransaction[]>([])

  // Stores
  const accountStore = useAccountStore()
  const categoryStore = useCategoryStore()

  // Getters
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
    return [...transactions.value]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit)
  }

  // Actions
  function addTransaction(transaction: Omit<ExtendedTransaction, 'id' | 'runningBalance'>) {
    // Berechne den laufenden Saldo
    const accountTransactions = getTransactionsByAccount.value(transaction.accountId)
    const runningBalance = accountTransactions.length > 0
      ? accountTransactions[0].runningBalance + transaction.amount
      : transaction.amount

    const newTransaction: ExtendedTransaction = {
      ...transaction,
      id: uuidv4(),
      runningBalance
    }

    transactions.value.push(newTransaction)

    // Aktualisiere den Kontostand
    accountStore.updateAccountBalance(transaction.accountId, runningBalance)

    // Aktualisiere den Kategoriesaldo, wenn eine Kategorie angegeben ist und es keine Transferbuchung ist
    if (transaction.categoryId && !transaction.isReconciliation && transaction.type !== TransactionType.TRANSFER) {
      categoryStore.updateCategoryBalance(transaction.categoryId, transaction.amount)
    }

    saveTransactions()
    return newTransaction
  }

  function addTransferTransaction(
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    date: string,
    valueDate: string | null = null,
    note: string = ''
  ) {
    // Erstelle zwei Transaktionen für den Transfer
    const fromTransaction: Omit<ExtendedTransaction, 'id' | 'runningBalance'> = {
      type: TransactionType.TRANSFER,
      date,
      valueDate: valueDate || date,
      accountId: fromAccountId,
      transferToAccountId: toAccountId,
      categoryId: null,
      tagIds: [],
      payee: `Transfer zu ${accountStore.getAccountById(toAccountId)?.name || 'Konto'}`,
      amount: -Math.abs(amount),
      note,
      counterTransactionId: null,
      planningTransactionId: null,
      isReconciliation: false,
    }

    const toTransaction: Omit<ExtendedTransaction, 'id' | 'runningBalance'> = {
      type: TransactionType.TRANSFER,
      date,
      valueDate: valueDate || date,
      accountId: toAccountId,
      transferToAccountId: fromAccountId,
      categoryId: null,
      tagIds: [],
      payee: `Transfer von ${accountStore.getAccountById(fromAccountId)?.name || 'Konto'}`,
      amount: Math.abs(amount),
      note,
      counterTransactionId: null,
      planningTransactionId: null,
      isReconciliation: false,
    }

    // Füge die Transaktionen hinzu
    const newFromTx = addTransaction(fromTransaction)
    const newToTx = addTransaction(toTransaction)

    // Aktualisiere die Gegenbuchungs-IDs
    updateTransaction(newFromTx.id, { counterTransactionId: newToTx.id })
    updateTransaction(newToTx.id, { counterTransactionId: newFromTx.id })

    return { fromTransaction: newFromTx, toTransaction: newToTx }
  }

  function updateTransferTransaction(
    id: string,
    updates: { fromAccountId: string, toAccountId: string, amount: number, date: string, valueDate: string, note: string }
  ) {
    const originalTx = transactions.value.find(tx => tx.id === id)
    if (!originalTx || !originalTx.counterTransactionId) {
      return false
    }

    let fromTx: ExtendedTransaction | undefined, toTx: ExtendedTransaction | undefined
    if (originalTx.amount < 0) {
      fromTx = originalTx
      toTx = transactions.value.find(tx => tx.id === originalTx!.counterTransactionId)
    } else {
      toTx = originalTx
      fromTx = transactions.value.find(tx => tx.id === originalTx!.counterTransactionId)
    }
    if (!fromTx || !toTx) {
      return false
    }

    // Update from transaction
    fromTx.accountId = updates.fromAccountId
    fromTx.transferToAccountId = updates.toAccountId
    fromTx.amount = -Math.abs(updates.amount)
    fromTx.date = updates.date
    fromTx.valueDate = updates.valueDate
    fromTx.note = updates.note
    fromTx.payee = `Transfer zu ${accountStore.getAccountById(updates.toAccountId)?.name || 'Konto'}`

    // Update to transaction
    toTx.accountId = updates.toAccountId
    toTx.transferToAccountId = updates.fromAccountId
    toTx.amount = Math.abs(updates.amount)
    toTx.date = updates.date
    toTx.valueDate = updates.valueDate
    toTx.note = updates.note
    toTx.payee = `Transfer von ${accountStore.getAccountById(updates.fromAccountId)?.name || 'Konto'}`

    saveTransactions()
    updateRunningBalances(updates.fromAccountId)
    updateRunningBalances(updates.toAccountId)

    return true
  }

  function addCategoryTransfer(
    fromCategoryId: string,
    toCategoryId: string,
    amount: number,
    date: string,
    note: string = ''
  ) {
    // Aktualisiere die Kategoriesalden
    categoryStore.updateCategoryBalance(fromCategoryId, -Math.abs(amount))
    categoryStore.updateCategoryBalance(toCategoryId, Math.abs(amount))

    // Erstelle virtuelle Transaktionen für die Kategorieübertragung
    const fromCategory = categoryStore.getCategoryById.value(fromCategoryId)
    const toCategory = categoryStore.getCategoryById.value(toCategoryId)

    const transferId = uuidv4()

    // Speichere die Kategorieübertragung
    const categoryTransfer = {
      id: transferId,
      date,
      fromCategoryId,
      toCategoryId,
      amount: Math.abs(amount),
      note,
      fromCategoryName: fromCategory?.name || 'Unbekannte Kategorie',
      toCategoryName: toCategory?.name || 'Unbekannte Kategorie'
    }

    const savedTransfers = localStorage.getItem('finwise_category_transfers') || '[]'
    const transfers = JSON.parse(savedTransfers)
    transfers.push(categoryTransfer)
    localStorage.setItem('finwise_category_transfers', JSON.stringify(transfers))

    return categoryTransfer
  }

  function addReconciliationTransaction(
    accountId: string,
    actualBalance: number,
    date: string,
    note: string = 'Kontoabgleich'
  ) {
    const account = accountStore.getAccountById(accountId)
    if (!account) return null

    // Berechne die Differenz zwischen dem aktuellen und dem tatsächlichen Kontostand
    const currentBalance = account.balance
    const difference = actualBalance - currentBalance

    if (difference === 0) return null // Keine Anpassung notwendig

    // Erstelle eine Ausgleichsbuchung
    const reconciliation: Omit<ExtendedTransaction, 'id' | 'runningBalance'> = {
      type: TransactionType.EXPENSE,
      date,
      valueDate: date,
      accountId,
      categoryId: null,
      tagIds: [],
      payee: 'Kontoabgleich',
      amount: difference,
      note,
      counterTransactionId: null,
      planningTransactionId: null,
      isReconciliation: true,
    }

    return addTransaction(reconciliation)
  }

  function updateTransaction(id: string, updates: Partial<ExtendedTransaction>) {
    const index = transactions.value.findIndex(transaction => transaction.id === id)
    if (index !== -1) {
      transactions.value[index] = { ...transactions.value[index], ...updates }
      saveTransactions()

      // Aktualisiere die laufenden Salden für alle nachfolgenden Transaktionen
      updateRunningBalances(transactions.value[index].accountId)

      return true
    }
    return false
  }

  function deleteTransaction(id: string) {
    const transaction = transactions.value.find(tx => tx.id === id)
    if (!transaction) return false

    const accountId = transaction.accountId

    // Lösche die Transaktion
    transactions.value = transactions.value.filter(tx => tx.id !== id)

    // Wenn es eine Gegenbuchung gibt, lösche diese auch
    if (transaction.counterTransactionId) {
      transactions.value = transactions.value.filter(tx => tx.id !== transaction.counterTransactionId)
    }

    // Aktualisiere die laufenden Salden
    updateRunningBalances(accountId)

    saveTransactions()
    return true
  }

  function updateRunningBalances(accountId: string) {
    // Hole alle Transaktionen für dieses Konto und sortiere sie nach Datum (aufsteigend)
    const accountTxs = [...transactions.value]
      .filter(tx => tx.accountId === accountId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    let balance = 0

    // Aktualisiere die laufenden Salden
    accountTxs.forEach(tx => {
      balance += tx.amount
      tx.runningBalance = balance
    })

    // Aktualisiere den Kontostand
    if (accountTxs.length > 0) {
      accountStore.updateAccountBalance(accountId, balance)
    }

    saveTransactions()
  }

  // Persistenz
  function loadTransactions() {
    const savedTransactions = localStorage.getItem('finwise_transactions')
    if (savedTransactions) {
      transactions.value = JSON.parse(savedTransactions)
    }
  }

  function saveTransactions() {
    localStorage.setItem('finwise_transactions', JSON.stringify(transactions.value))
  }

  // Initialisiere beim ersten Laden
  loadTransactions()

  function reset() {
    transactions.value = []
    loadTransactions()
  }
  
  return {
    transactions,
    getTransactionById,
    getTransactionsByAccount,
    getTransactionsByCategory,
    getTransactionsByDateRange,
    getRecentTransactions,
    addTransaction,
    addTransferTransaction,
    updateTransferTransaction,
    addCategoryTransfer,
    addReconciliationTransaction,
    updateTransaction,
    deleteTransaction,
    loadTransactions,
    reset
  }
})
