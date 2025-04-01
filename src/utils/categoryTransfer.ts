// Datei: src/utils/categoryTransfer.ts
import { useTransactionStore } from '@/stores/transactionStore';
import { useCategoryStore } from '@/stores/categoryStore';
import { TransactionType } from '@/types';
import { debugLog } from '@/utils/logger';
import { v4 as uuidv4 } from 'uuid';

export function addCategoryTransfer(
  fromCategoryId: string,
  toCategoryId: string,
  amount: number,
  date: string,
  note: string = ''
) {
  const transactionStore = useTransactionStore();
  const categoryStore = useCategoryStore();

  const fromTx = {
    type: TransactionType.CATEGORYTRANSFER,
    date,
    valueDate: date,
    accountId: '',
    categoryId: fromCategoryId,
    amount: -Math.abs(amount),
    tagIds: [],
    payee: `Kategorientransfer zu ${categoryStore.getCategoryById(toCategoryId)?.name ?? ''}`,
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
    payee: `Kategorientransfer von ${categoryStore.getCategoryById(fromCategoryId)?.name ?? ''}`,
    toCategoryId: fromCategoryId
  };

  const newFromTx = transactionStore.addTransaction(fromTx);
  const newToTx = transactionStore.addTransaction(toTx);

  transactionStore.updateTransaction(newFromTx.id, { counterTransactionId: newToTx.id });
  transactionStore.updateTransaction(newToTx.id, { counterTransactionId: newFromTx.id });

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
  const transactionStore = useTransactionStore();
  const categoryStore = useCategoryStore();

  const updatedFromTx = {
    categoryId: fromCategoryId,
    amount: -Math.abs(amount),
    toCategoryId: toCategoryId,
    date,
    valueDate: date,
    payee: `Kategorientransfer zu ${categoryStore.getCategoryById(toCategoryId)?.name ?? ''}`,
    note
  };
  const updatedToTx = {
    categoryId: toCategoryId,
    amount: Math.abs(amount),
    toCategoryId: fromCategoryId,
    date,
    valueDate: date,
    payee: `Kategorientransfer von ${categoryStore.getCategoryById(fromCategoryId)?.name ?? ''}`,
    note
  };

  transactionStore.updateTransaction(transactionId, updatedFromTx);
  transactionStore.updateTransaction(gegentransactionId, updatedToTx);

  debugLog('[utils] updateCategoryTransfer', { transactionId, gegentransactionId, updatedFromTx, updatedToTx });
}
