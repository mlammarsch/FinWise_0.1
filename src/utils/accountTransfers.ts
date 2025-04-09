// Datei: src/utils/accountTransfers.ts
import { debugLog } from '@/utils/logger';
import { TransactionService } from '@/services/TransactionService';

/**
 * Führt einen Kontotransfer durch.
 * Dieser Wrapper leitet den Aufruf an den TransactionService weiter.
 */
export function addAccountTransfer(
  fromAccountId: string,
  toAccountId: string,
  amount: number,
  date: string,
  valueDate: string | null,
  note: string
) {
  debugLog("[accountTransfers] addAccountTransfer called", { fromAccountId, toAccountId, amount, date, valueDate, note });
  return TransactionService.addAccountTransfer(fromAccountId, toAccountId, amount, date, valueDate, note);
}
