// Datei: src/utils/accountTransfers.ts
import { debugLog } from '@/utils/logger'
import { v4 as uuidv4 } from 'uuid'
import { TransactionType } from '@/types'

/**
 * Führt einen Kontotransfer durch.
 *
 * Erforderliche Funktionen werden als Parameter injiziert, um
 * Abhängigkeiten zum Store zu vermeiden:
 * - addTransaction: Funktion zum Hinzufügen einer Transaktion.
 * - updateTransaction: Funktion zum Aktualisieren einer Transaktion.
 * - getAccountName: Funktion, die anhand der Account-ID den Namen liefert.
 */
export function addAccountTransfer(
  fromAccountId: string,
  toAccountId: string,
  amount: number,
  date: string,
  valueDate: string | null,
  note: string,
  addTransaction: (tx: any) => any,
  updateTransaction: (id: string, updates: any) => boolean,
  getAccountName: (accountId: string) => string
) {
  debugLog("[accountTransfers] addAccountTransfer called", { fromAccountId, toAccountId, amount, date, valueDate, note })

  const fromTransaction = {
    type: TransactionType.ACCOUNTTRANSFER,
    date,
    valueDate: valueDate || date,
    accountId: fromAccountId,
    categoryId: null,
    transferToAccountId: toAccountId,
    tagIds: [],
    payee: `Transfer zu ${getAccountName(toAccountId) || 'Konto'}`,
    amount: -Math.abs(amount),
    note,
    counterTransactionId: null,
    planningTransactionId: null,
    isReconciliation: false,
  }

  const toTransaction = {
    ...fromTransaction,
    accountId: toAccountId,
    transferToAccountId: fromAccountId,
    amount: Math.abs(amount),
    payee: `Transfer von ${getAccountName(fromAccountId) || 'Konto'}`
  }

  const newFromTx = addTransaction(fromTransaction)
  const newToTx = addTransaction(toTransaction)
  updateTransaction(newFromTx.id, { counterTransactionId: newToTx.id })
  updateTransaction(newToTx.id, { counterTransactionId: newFromTx.id })

  debugLog("[accountTransfers] addAccountTransfer", { fromTransaction: newFromTx, toTransaction: newToTx })
  return { fromTransaction: newFromTx, toTransaction: newToTx }
}
