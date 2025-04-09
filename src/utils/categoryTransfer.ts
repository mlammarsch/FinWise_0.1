// Datei: src/utils/categoryTransfer.ts
import { TransactionType } from '@/types';
import { debugLog } from '@/utils/logger';
import { TransactionService } from '@/services/TransactionService'; // Neuer Import

export function addCategoryTransfer(
  fromCategoryId: string,
  toCategoryId: string,
  amount: number,
  date: string,
  note: string = ''
) {
  // Hole Informationen aus den Stores (aus categoryStore)
  // Annahme: categoryStore.getCategoryById wird im Service intern genutzt.

  const fromTx = {
    type: TransactionType.CATEGORYTRANSFER,
    date,
    valueDate: date,
    accountId: '',
    categoryId: fromCategoryId,
    amount: -Math.abs(amount),
    tagIds: [],
    payee: `Kategorientransfer zu ${''}`,
    note,
    counterTransactionId: null,
    planningTransactionId: null,
    isReconciliation: false,
    isCategoryTransfer: true,
    toCategoryId: toCategoryId
  };

  const toTx = {
    ...fromTx,
    categoryId: toCategoryId,
    amount: Math.abs(amount),
    payee: `Kategorientransfer von ${''}`,
    toCategoryId: fromCategoryId
  };

  const newFromTx = TransactionService.addTransaction(fromTx);
  const newToTx = TransactionService.addTransaction(toTx);

  TransactionService.updateTransaction(newFromTx.id, { counterTransactionId: newToTx.id });
  TransactionService.updateTransaction(newToTx.id, { counterTransactionId: newFromTx.id });

  debugLog('[utils] addCategoryTransfer', { fromTransaction: newFromTx, toTransaction: newToTx });
}

export function updateCategoryTransfer(
  transactionId: string,
  gegentransactionId: string,
  fromCategoryId: string,
  toCategoryId: string,
  amount: number,
  date: string,
  note: string = ''
) {
  const updatedFromTx = {
    categoryId: fromCategoryId,
    amount: -Math.abs(amount),
    toCategoryId: toCategoryId,
    date,
    valueDate: date,
    payee: `Kategorientransfer zu ${''}`,
    note
  };
  const updatedToTx = {
    categoryId: toCategoryId,
    amount: Math.abs(amount),
    toCategoryId: fromCategoryId,
    date,
    valueDate: date,
    payee: `Kategorientransfer von ${''}`,
    note
  };

  TransactionService.updateTransaction(transactionId, updatedFromTx);
  TransactionService.updateTransaction(gegentransactionId, updatedToTx);

  debugLog('[utils] updateCategoryTransfer', { transactionId, gegentransactionId, updatedFromTx, updatedToTx });
}
