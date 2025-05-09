// src/stores/accountStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { Account, AccountGroup } from '../types'
import { useTransactionStore } from './transactionStore'

export const useAccountStore = defineStore('account', () => {
  // State
  const accounts = ref<Account[]>([])
  const accountGroups = ref<AccountGroup[]>([])

  // Getter: rein UI‑nahe Filterung ist weiter zulässig
  const activeAccounts = computed(() => {
    return accounts.value.filter(account => account.isActive)
  })

  /** Einzelnes Konto nach ID */
  function getAccountById(id: string) {
    return accounts.value.find(account => account.id === id)
  }

  /** Einzelne Gruppe nach ID */
  const getAccountGroupById = computed(() => {
    return (id: string) => accountGroups.value.find(group => group.id === id)
  })

  // --- CRUD‑Aktionen --------------------------------------------------------

  function addAccount(account: Omit<Account, 'id'>) {
    const newAccount: Account = { ...account, id: uuidv4() }
    accounts.value.push(newAccount)
    saveAccounts()
    return newAccount
  }

  function updateAccount(id: string, updates: Partial<Account>) {
    const index = accounts.value.findIndex(account => account.id === id)
    if (index !== -1) {
      accounts.value[index] = { ...accounts.value[index], ...updates }
      saveAccounts()
      return true
    }
    return false
  }

  function deleteAccount(id: string) {
    accounts.value = accounts.value.filter(account => account.id !== id)
    saveAccounts()
  }

  function addAccountGroup(group: Omit<AccountGroup, 'id'>) {
    const newGroup: AccountGroup = { ...group, id: uuidv4() }
    accountGroups.value.push(newGroup)
    saveAccountGroups()
    return newGroup
  }

  function updateAccountGroup(id: string, updates: Partial<AccountGroup>) {
    const index = accountGroups.value.findIndex(group => group.id === id)
    if (index !== -1) {
      accountGroups.value[index] = { ...accountGroups.value[index], ...updates }
      saveAccountGroups()
      return true
    }
    return false
  }

  function deleteAccountGroup(id: string) {
    const hasAccounts = accounts.value.some(account => account.accountGroupId === id)
    if (hasAccounts) return false
    accountGroups.value = accountGroups.value.filter(group => group.id !== id)
    saveAccountGroups()
    return true
  }

  function updateAccountBalance(id: string, newBalance: number) {
    const account = accounts.value.find(account => account.id === id)
    if (!account) return false
    account.balance = newBalance
    saveAccounts()
    return true
  }

  // --- Persistence ---------------------------------------------------------

  function loadAccounts() {
    const savedAccounts = localStorage.getItem('finwise_accounts')
    if (savedAccounts) accounts.value = JSON.parse(savedAccounts)

    const savedGroups = localStorage.getItem('finwise_account_groups')
    if (savedGroups) {
      accountGroups.value = JSON.parse(savedGroups)
    } else {
      accountGroups.value = [
        { id: uuidv4(), name: 'Girokonten',  sortOrder: 0 },
        { id: uuidv4(), name: 'Sparkonten',  sortOrder: 1 },
        { id: uuidv4(), name: 'Kreditkarten',sortOrder: 2 },
        { id: uuidv4(), name: 'Bargeld',     sortOrder: 3 }
      ]
      saveAccountGroups()
    }
  }

  function saveAccounts() {
    localStorage.setItem('finwise_accounts', JSON.stringify(accounts.value))
  }

  function saveAccountGroups() {
    localStorage.setItem('finwise_account_groups', JSON.stringify(accountGroups.value))
  }

  /** Liefert alle Transaktionen eines Kontos (reiner Pass‑Through) */
  function getTransactionByAccountId(accountId: string) {
    const transactionStore = useTransactionStore()
    return transactionStore.transactions.filter(tx => tx.accountId === accountId)
  }

  function reset() {
    accounts.value = []
    accountGroups.value = []
    loadAccounts()
  }

  loadAccounts()

  return {
    // state
    accounts,
    accountGroups,

    // getter
    activeAccounts,
    getAccountById,
    getAccountGroupById,

    // crud
    addAccount,
    updateAccount,
    deleteAccount,
    addAccountGroup,
    updateAccountGroup,
    deleteAccountGroup,
    updateAccountBalance,

    // persistence & helpers
    loadAccounts,
    getTransactionByAccountId,
    reset
  }
})
