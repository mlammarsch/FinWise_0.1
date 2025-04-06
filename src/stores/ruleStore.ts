// src/stores/ruleStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { AutomationRule, RuleConditionType, RuleActionType, Transaction } from '../types'
import { debugLog } from '@/utils/logger'

export const useRuleStore = defineStore('rule', () => {
  const rules = ref<AutomationRule[]>([])

  /**
   * Fügt eine neue Automatisierungsregel hinzu
   */
  function addRule(rule: Omit<AutomationRule, 'id'>) {
    const newRule: AutomationRule = {
      ...rule,
      id: uuidv4()
    }
    rules.value.push(newRule)
    saveRules()
    debugLog('[ruleStore] addRule', newRule)
    return newRule
  }

  /**
   * Gibt eine Regel anhand ihrer ID zurück
   */
  const getRuleById = computed(() => {
    return (id: string) => rules.value.find(rule => rule.id === id)
  })

  /**
   * Aktualisiert eine vorhandene Regel
   */
  function updateRule(id: string, updates: Partial<AutomationRule>) {
    const index = rules.value.findIndex(rule => rule.id === id)
    if (index !== -1) {
      rules.value[index] = { ...rules.value[index], ...updates }
      saveRules()
      debugLog('[ruleStore] updateRule', { id, updates })
      return true
    }
    return false
  }

  /**
   * Löscht eine Regel
   */
  function deleteRule(id: string) {
    rules.value = rules.value.filter(rule => rule.id !== id)
    saveRules()
    debugLog('[ruleStore] deleteRule', id)
    return true
  }

  /**
   * Wendet alle passenden Regeln auf eine Transaktion an
   */
  function applyRulesToTransaction(transaction: Transaction, stage: 'PRE' | 'DEFAULT' | 'POST' = 'DEFAULT') {
    // Sortiere Regeln nach Priorität
    const sortedRules = [...rules.value]
      .filter(rule => rule.isActive && rule.stage === stage)
      .sort((a, b) => a.priority - b.priority)

    let modifiedTransaction = { ...transaction }
    let rulesApplied = 0

    for (const rule of sortedRules) {
      if (checkConditions(rule, modifiedTransaction)) {
        modifiedTransaction = applyActions(rule, modifiedTransaction)
        rulesApplied++
      }
    }

    debugLog('[ruleStore] applyRulesToTransaction', {
      transactionId: transaction.id,
      stage,
      rulesApplied
    })

    return modifiedTransaction
  }

  /**
   * Prüft, ob alle Bedingungen einer Regel auf eine Transaktion zutreffen
   */
  function checkConditions(rule: AutomationRule, transaction: Transaction): boolean {
    // Wenn keine Bedingungen definiert sind, trifft die Regel immer zu
    if (!rule.conditions || rule.conditions.length === 0) return true

    return rule.conditions.every(condition => {
      switch (condition.type) {
        case RuleConditionType.ACCOUNT_IS:
          return transaction.accountId === condition.value

        case RuleConditionType.PAYEE_EQUALS:
          return transaction.payee === condition.value

        case RuleConditionType.PAYEE_CONTAINS:
          return transaction.payee?.toLowerCase().includes(String(condition.value).toLowerCase())

        case RuleConditionType.AMOUNT_EQUALS:
          return transaction.amount === Number(condition.value)

        case RuleConditionType.AMOUNT_GREATER:
          return transaction.amount > Number(condition.value)

        case RuleConditionType.AMOUNT_LESS:
          return transaction.amount < Number(condition.value)

        case RuleConditionType.DATE_IS:
          return transaction.date === condition.value

        case RuleConditionType.DESCRIPTION_CONTAINS:
          return transaction.note?.toLowerCase().includes(String(condition.value).toLowerCase())

        default:
          return false
      }
    })
  }

  /**
   * Wendet die Aktionen einer Regel auf eine Transaktion an
   */
  function applyActions(rule: AutomationRule, transaction: Transaction): Transaction {
    let updatedTransaction = { ...transaction }

    rule.actions.forEach(action => {
      switch (action.type) {
        case RuleActionType.SET_CATEGORY:
          updatedTransaction.categoryId = String(action.value)
          break

        case RuleActionType.ADD_TAG:
          if (!updatedTransaction.tagIds) updatedTransaction.tagIds = []
          if (Array.isArray(action.value)) {
            updatedTransaction.tagIds = [...new Set([...updatedTransaction.tagIds, ...action.value])]
          } else {
            if (!updatedTransaction.tagIds.includes(String(action.value))) {
              updatedTransaction.tagIds.push(String(action.value))
            }
          }
          break

        case RuleActionType.SET_NOTE:
          updatedTransaction.note = String(action.value)
          break
      }
    })

    return updatedTransaction
  }

  /**
   * Speichert die Regeln im LocalStorage
   */
  function saveRules() {
    localStorage.setItem('finwise_rules', JSON.stringify(rules.value))
  }

  /**
   * Lädt die Regeln aus dem LocalStorage
   */
  function loadRules() {
    const saved = localStorage.getItem('finwise_rules')
    if (saved) {
      try {
        rules.value = JSON.parse(saved)
        debugLog('[ruleStore] loadRules - Loaded', rules.value.length, 'rules')
      } catch (error) {
        debugLog('[ruleStore] loadRules - Error parsing data', error)
        rules.value = []
      }
    }
  }

  /**
   * Setzt den Regelstore zurück
   */
  function reset() {
    rules.value = []
    loadRules()
    debugLog('[ruleStore] reset')
  }

  // Initialisierung
  loadRules()

  return {
    rules,
    addRule,
    getRuleById,
    updateRule,
    deleteRule,
    applyRulesToTransaction,
    reset
  }
})
