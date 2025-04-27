/**
 * Pfad: src/stores/planningStore.ts
 * Store für geplante Transaktionen, sorgt für CRUD und Aktualisierung der Monatsbilanzen über BalanceService.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import dayjs from 'dayjs'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import weekday from 'dayjs/plugin/weekday'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
dayjs.extend(isSameOrBefore)
dayjs.extend(weekday)
dayjs.extend(isSameOrAfter)

import {
  PlanningTransaction,
  RecurrencePattern,
  TransactionType,
  AmountType,
  RecurrenceEndType,
  WeekendHandlingType
} from '../types'
import { useTransactionStore } from './transactionStore'
import { useRuleStore } from './ruleStore'
import { toDateOnlyString } from '@/utils/formatters'
import { debugLog } from '@/utils/logger'
import { BalanceService } from '@/services/BalanceService'
import { TransactionService } from '@/services/TransactionService'

export const usePlanningStore = defineStore('planning', () => {
  const planningTransactions = ref<PlanningTransaction[]>([])
  const transactionStore = useTransactionStore()

  const getPlanningTransactionById = computed(() => {
    return (id: string) => planningTransactions.value.find(tx => tx.id === id)
  })

  const getUpcomingTransactions = computed(() => {
    return (days: number = 30) => {
      return planningTransactions.value
        .filter(tx => tx.isActive)
        .sort((a, b) => a.startDate.localeCompare(b.startDate))
    }
  })

  function addPlanningTransaction(planning: Partial<PlanningTransaction>) {
    const txId = uuidv4()
    const newPlanning: PlanningTransaction = {
      id: txId,
      name: planning.name || '',
      accountId: planning.accountId || '',
      categoryId: planning.categoryId || null,
      tagIds: planning.tagIds || [],
      recipientId: planning.recipientId || null,
      amount: planning.amount || 0,
      amountType: planning.amountType || AmountType.EXACT,
      approximateAmount: planning.approximateAmount,
      minAmount: planning.minAmount,
      maxAmount: planning.maxAmount,
      note: planning.note || '',
      startDate: planning.startDate || new Date().toISOString(),
      valueDate: planning.valueDate || planning.startDate || new Date().toISOString(),
      endDate: planning.endDate || null,
      recurrencePattern: planning.recurrencePattern || RecurrencePattern.ONCE,
      recurrenceEndType: planning.recurrenceEndType || RecurrenceEndType.NEVER,
      recurrenceCount: planning.recurrenceCount || null,
      executionDay: planning.executionDay || null,
      weekendHandling: planning.weekendHandling || WeekendHandlingType.NONE,
      isActive: planning.isActive !== undefined ? planning.isActive : true,
      forecastOnly: planning.forecastOnly !== undefined ? planning.forecastOnly : false,
      transactionType: planning.transactionType || TransactionType.EXPENSE,
      // Wichtig: Übernehme explizit die Transfer-Felder
      transferToAccountId: planning.transferToAccountId,
      transferToCategoryId: planning.transferToCategoryId,
      counterPlanningTransactionId: planning.counterPlanningTransactionId || null,
      autoExecute: planning.autoExecute || false
    }
    planningTransactions.value.push(newPlanning)
    savePlanningTransactions()
    debugLog('[planningStore] addPlanningTransaction', {
      id: newPlanning.id,
      name: newPlanning.name,
      amount: newPlanning.amount,
      transactionType: newPlanning.transactionType,
      transferToAccountId: newPlanning.transferToAccountId,
      transferToCategoryId: newPlanning.transferToCategoryId
    })
    BalanceService.calculateMonthlyBalances()
    return newPlanning
  }

  function updatePlanningTransaction(id: string, planning: Partial<PlanningTransaction>) {
    const index = planningTransactions.value.findIndex(p => p.id === id)
    if (index !== -1) {
      planningTransactions.value[index] = {
        ...planningTransactions.value[index],
        ...planning
      }
      savePlanningTransactions()
      debugLog('[planningStore] updatePlanningTransaction', {
        id,
        name: planningTransactions.value[index].name,
        updates: Object.keys(planning).join(', '),
        transferToAccountId: planningTransactions.value[index].transferToAccountId,
        transferToCategoryId: planningTransactions.value[index].transferToCategoryId
      })
      BalanceService.calculateMonthlyBalances()
      return true
    }
    return false
  }

  function deletePlanningTransaction(id: string) {
    const planToDelete = planningTransactions.value.find(p => p.id === id)
    if (planToDelete) {
      debugLog('[planningStore] deletePlanningTransaction', {
        id,
        name: planToDelete.name
      })
    }
    planningTransactions.value = planningTransactions.value.filter(p => p.id !== id)
    savePlanningTransactions()
    BalanceService.calculateMonthlyBalances()
  }

  function savePlanningTransactions() {
    localStorage.setItem('finwise_planning_transactions', JSON.stringify(planningTransactions.value))
    debugLog('[planningStore] savePlanningTransactions - Saved', planningTransactions.value.length, 'transactions')
  }

  function loadPlanningTransactions() {
    const saved = localStorage.getItem('finwise_planning_transactions')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        planningTransactions.value = parsed.map((tx: any) => ({
          ...tx,
          amountType: tx.amountType || AmountType.EXACT,
          weekendHandling: tx.weekendHandling || WeekendHandlingType.NONE,
          recurrenceEndType: tx.recurrenceEndType || RecurrenceEndType.NEVER,
          isActive: tx.isActive !== undefined ? tx.isActive : true,
          forecastOnly: tx.forecastOnly !== undefined ? tx.forecastOnly : false,
          name: tx.name || tx.payee || '',
          valueDate: tx.valueDate || tx.date
        }))
        debugLog('[planningStore] loadPlanningTransactions - Loaded', planningTransactions.value.length, 'transactions')
      } catch (error) {
        debugLog('[planningStore] loadPlanningTransactions - Error parsing data', error)
        planningTransactions.value = []
      }
    }
  }

  function reset() {
    planningTransactions.value = []
    localStorage.removeItem('finwise_last_forecast_update')
    loadPlanningTransactions()
    debugLog('[planningStore] reset')
  }

  loadPlanningTransactions()

  return {
    planningTransactions,
    getPlanningTransactionById,
    getUpcomingTransactions,
    addPlanningTransaction,
    updatePlanningTransaction,
    deletePlanningTransaction,
    loadPlanningTransactions,
    reset
  }
})
