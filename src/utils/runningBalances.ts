// src/utils/runningBalances.ts
import { debugLog } from '@/utils/logger'

/**
 * Gruppiert Transaktionen eines Kontos nach Datum und berechnet den
 * laufenden Saldo je Gruppe. Der Saldo der letzten Transaktion wird um
 * einen Offset korrigiert, falls das Datum im laufenden Monat liegt.
 */
export function groupTransactionsByDateWithRunningBalance(
  transactions: any[],
  account: any
): any[] {
  const offset = account.offset || 0
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime()

  const groups = transactions
    .filter(tx => tx.accountId === account.id)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .reduce((acc, tx) => {
      const key = tx.date.split("T")[0]
      ;(acc[key] ??= { date: key, transactions: [] }).transactions.push(tx)
      return acc
    }, {} as Record<string, { date: string; transactions: any[] }>)

  debugLog("[runningBalances] groupTransactionsByDateWithRunningBalance - Groups before runningBalance calculation:", groups)

  const finalGroups = Object.values(groups)
    .map(group => {
      const lastTx = group.transactions[group.transactions.length - 1]
      const applyOffset = new Date(group.date).getTime() >= firstOfMonth ? offset : 0
      return { ...group, runningBalance: lastTx.runningBalance - applyOffset }
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  debugLog("[runningBalances] groupTransactionsByDateWithRunningBalance - Final groups with runningBalance:", finalGroups)
  return finalGroups
}

/**
 * Berechnet den laufenden Saldo einer Liste von Transaktionen.
 * Liefert die aktualisierte Transaktionsliste und den finalen Saldo.
 */
export function calculateRunningBalances(transactions: any[]): { updatedTransactions: any[]; finalBalance: number } {
  const sortedTxs = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  let balance = 0
  sortedTxs.forEach(tx => {
    balance += tx.amount
    tx.runningBalance = balance
  })
  return { updatedTransactions: sortedTxs, finalBalance: balance }
}

/**
 * Berechnet den Saldo für eine Kategorie (Ausgaben).
 * Filtert die Transaktionen nach der Kategorie und trennt jene vor dem
 * angegebenen Startdatum von denen im Zeitraum.
 */
export function calculateCategorySaldo(
  transactions: any[],
  categoryId: string,
  start: Date,
  end: Date
): { budgeted: number; spent: number; saldo: number } {
  const txs = transactions.filter(tx => tx.categoryId === categoryId)
  const txsCurrent = txs.filter(tx => new Date(tx.date) >= start && new Date(tx.date) <= end)
  const txsBefore = txs.filter(tx => new Date(tx.date) < start)
  const spentThisMonth = txsCurrent.reduce((sum, tx) => sum + tx.amount, 0)
  const previousSaldo = txsBefore.reduce((sum, tx) => sum + tx.amount, 0)
  return { budgeted: 0, spent: spentThisMonth, saldo: previousSaldo + spentThisMonth }
}

/**
 * Berechnet den Saldo für eine Einnahmekategorie.
 * Im Unterschied zu Ausgabenkategorien wird hier ein Budgetwert von 0 angenommen.
 */
export function calculateIncomeCategorySaldo(
  transactions: any[],
  categoryId: string,
  start: Date,
  end: Date
): { budgeted: number; spent: number; saldo: number } {
  const txs = transactions.filter(tx => tx.categoryId === categoryId)
  const txsCurrent = txs.filter(tx => new Date(tx.date) >= start && new Date(tx.date) <= end)
  const sumThisMonth = txsCurrent.reduce((sum, tx) => sum + tx.amount, 0)
  const budget = 0
  return { budgeted: budget, spent: sumThisMonth, saldo: budget - sumThisMonth }
}
