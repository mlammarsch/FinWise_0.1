// Datei: src/services/TransactionService.ts
// Zentrale Drehscheibe für alle Transaktionen, Transfers & Reconcile‑Buchungen.

import { useTransactionStore } from '@/stores/transactionStore';
import { useAccountStore }     from '@/stores/accountStore';
import { useCategoryStore }    from '@/stores/categoryStore';
import { useMonthlyBalanceStore } from '@/stores/monthlyBalanceStore';
import { Transaction, TransactionType } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { debugLog } from '@/utils/logger';
import { toDateOnlyString } from '@/utils/formatters';
import { CategoryService } from './CategoryService';
import { useRuleStore } from '@/stores/ruleStore';    // neu

export const TransactionService = {
/* ------------------------------------------------------------------ */
/* --------------------------- Read APIs ---------------------------- */
/* ------------------------------------------------------------------ */
  getAllTransactions(): Transaction[] {
    return useTransactionStore().transactions;
  },

  getTransactionById(id: string): Transaction | null {
    const tx = useTransactionStore().getTransactionById(id);
    if (!tx) debugLog('[TransactionService] getTransactionById – not found', id);
    return tx;
  },

/* ------------------------------------------------------------------ */
/* --------------------------- Write APIs --------------------------- */
/* ------------------------------------------------------------------ */

  addTransaction(txData: Omit<Transaction, 'id' | 'runningBalance'>): Transaction {
    const txStore = useTransactionStore();
    const mbStore = useMonthlyBalanceStore();
    const catStore = useCategoryStore();
    const ruleStore = useRuleStore();                // neu

    // Basiskontrolle
    if (!txData.accountId && txData.type !== TransactionType.CATEGORYTRANSFER) {
      throw new Error('Account ID erforderlich.');
    }

    // Normalisieren & anlegen
    const newTx: Transaction = {
      ...txData,
      id: uuidv4(),
      date:      toDateOnlyString(txData.date),
      valueDate: txData.valueDate
        ? toDateOnlyString(txData.valueDate)
        : toDateOnlyString(txData.date),
      runningBalance: 0,
    };

    const added = txStore.addTransaction(newTx);

    // → Regeln anwenden & speichern
    ruleStore.applyRulesToTransaction(added);

    mbStore.calculateMonthlyBalances();
    debugLog('[TransactionService] addTransaction', added);

    /* Automatischer Kategorie‑Transfer bei Einnahmen */
    if (
      added.type === TransactionType.INCOME &&
      added.amount > 0 &&
      added.categoryId
    ) {
      const available = catStore.getAvailableFundsCategory();
      if (!available) throw new Error("Kategorie 'Verfügbare Mittel' fehlt");
      CategoryService.addCategoryTransfer(
        added.categoryId,
        available.id,
        added.amount,
        added.date,
        'Automatischer Transfer von Einnahmen'
      );
    }
    return added;
  },

/* -------------------- Konto‑zu‑Konto‑Transfer -------------------- */

  addAccountTransfer(
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    date: string,
    valueDate: string | null = null,
    note = '',
    planningTransactionId: string | null = null
  ) {
    if (fromAccountId === toAccountId) throw new Error('Quell = Zielkonto');
    if (amount === 0) throw new Error('Betrag 0');

    const accStore = useAccountStore();
    const mbStore  = useMonthlyBalanceStore();

    const fromName = accStore.getAccountById(fromAccountId)?.name ?? '';
    const toName   = accStore.getAccountById(toAccountId)?.name ?? '';
    const dt       = toDateOnlyString(date);
    const vdt      = toDateOnlyString(valueDate ?? date);
    const abs      = Math.abs(amount);

    const base: Omit<Transaction, 'id' | 'runningBalance'> = {
      type: TransactionType.ACCOUNTTRANSFER,
      date: dt,
      valueDate: vdt,
      categoryId: null,
      tagIds: [],
      payee: '',
      note,
      counterTransactionId: null,
      planningTransactionId,
      isReconciliation: false,
      isCategoryTransfer: false,
      reconciled: false,
      transferToAccountId: undefined,
      accountId: '', // wird weiter unten gesetzt
      amount: 0,
    };

    const fromTx = this.addTransaction({
      ...base,
      accountId: fromAccountId,
      amount: -abs,
      payee: `Transfer zu ${toName}`,
      transferToAccountId: toAccountId,
    });
    const toTx = this.addTransaction({
      ...base,
      accountId: toAccountId,
      amount: abs,
      payee: `Transfer von ${fromName}`,
      transferToAccountId: fromAccountId,
    });

    // Verlinken
    this.updateTransaction(fromTx.id, { counterTransactionId: toTx.id });
    this.updateTransaction(toTx.id,   { counterTransactionId: fromTx.id });

    mbStore.calculateMonthlyBalances();
    debugLog('[TransactionService] addAccountTransfer', { fromTx, toTx });
    return { fromTransaction: fromTx, toTransaction: toTx };
  },

/* --------------------- Ausgleichs‑Buchung ------------------------ */

  addReconcileTransaction(
    accountId: string,
    amount: number,
    date: string,
    note = ''
  ) {
    if (amount === 0) return null;
    const catStore = useCategoryStore();
    const mbStore  = useMonthlyBalanceStore();

    const catId =
      catStore.categories.find(c => c.name === 'Ausgleichskorrekturen')?.id ??
      null;

    const tx = this.addTransaction({
      type: TransactionType.RECONCILE,
      date: toDateOnlyString(date),
      valueDate: toDateOnlyString(date),
      accountId,
      categoryId: catId,
      amount,
      tagIds: [],
      payee: 'Kontoabgleich',
      note: note || (amount > 0 ? 'Korrektur Gutschrift' : 'Korrektur Belastung'),
      counterTransactionId: null,
      planningTransactionId: null,
      isReconciliation: true,
      isCategoryTransfer: false,
      reconciled: true,
    });

    mbStore.calculateMonthlyBalances();
    return tx;
  },

/* ------------------------- Update / Delete ----------------------- */

updateTransaction(
    id: string,
    updates: Partial<Omit<Transaction, 'id' | 'runningBalance'>>
  ): boolean {
    const txStore = useTransactionStore();
    const mbStore = useMonthlyBalanceStore();
    const catStore = useCategoryStore();

    if (updates.date) updates.date = toDateOnlyString(updates.date);
    if (updates.valueDate) updates.valueDate = toDateOnlyString(updates.valueDate);

    const original = txStore.getTransactionById(id);

    // Datums­wechsel bei Einnahmen → Category‑Transfer umbuchen
    const originalMonthKey = original?.date?.substring(0, 7);
    const newDateAfterUpdate = updates.date ?? original?.date ?? '';
    const newMonthKey = newDateAfterUpdate.substring(0, 7);

    if (
      original &&
      original.type === TransactionType.INCOME &&
      original.amount > 0 &&
      original.categoryId &&
      originalMonthKey !== newMonthKey
    ) {
      const available = catStore.getAvailableFundsCategory();
      if (!available) throw new Error("Kategorie 'Verfügbare Mittel' fehlt");

      // Rücktransfer (alte Buchung rückgängig machen)
      CategoryService.addCategoryTransfer(
        available.id,
        original.categoryId,
        original.amount,
        original.date,
        'Automatischer Rücktransfer wegen Datumsänderung'
      );

      // Neuer Transfer am neuen Datum
      CategoryService.addCategoryTransfer(
        original.categoryId,
        available.id,
        original.amount,
        newDateAfterUpdate,
        'Automatischer Transfer wegen Datumsänderung'
      );
    }

    const ok = txStore.updateTransaction(id, updates);
    if (!ok) return false;

    /* Auto‑Transfer bei INCOME‑Diff (bestehend) --------------------------- */
    if (
      original &&
      original.type === TransactionType.INCOME &&
      updates.amount !== undefined
    ) {
      const diff = updates.amount - original.amount;
      if (diff !== 0 && original.categoryId) {
        const available = catStore.getAvailableFundsCategory();
        if (!available) throw new Error("Kategorie 'Verfügbare Mittel' fehlt");

        CategoryService.addCategoryTransfer(
          diff > 0 ? original.categoryId : available.id,
          diff > 0 ? available.id : original.categoryId,
          Math.abs(diff),
          updates.date ?? original.date,
          'Automatischer Transfer bei Betragsanpassung'
        );
      }
    }

    mbStore.calculateMonthlyBalances();
    return true;
  },

  deleteTransaction(id: string): boolean {
    const txStore = useTransactionStore();
    const mbStore = useMonthlyBalanceStore();
    const catStore = useCategoryStore();

    const tx = txStore.getTransactionById(id);
    if (!tx) return false;

    // Einnahme‑Löschung → Mittel zurück transferieren
    if (
      tx.type === TransactionType.INCOME &&
      tx.amount > 0 &&
      tx.categoryId
    ) {
      const available = catStore.getAvailableFundsCategory();
      if (!available) throw new Error("Kategorie 'Verfügbare Mittel' fehlt");
      CategoryService.addCategoryTransfer(
        available.id,
        tx.categoryId,
        tx.amount,
        tx.date,
        'Automatischer Transfer bei Löschung der Einnahme'
      );
    }

    const okPrimary = txStore.deleteTransaction(id);
    if (!okPrimary) return false;

    if (tx.counterTransactionId)
      txStore.deleteTransaction(tx.counterTransactionId);

    mbStore.calculateMonthlyBalances();
    return true;
  },

  deleteMultipleTransactions(ids: string[]) {
    const unique = [...new Set(ids)];
    let deleted = 0;
    unique.forEach(id => this.deleteTransaction(id) && deleted++);
    const success = deleted === unique.length;
    debugLog('[TransactionService] deleteMultipleTransactions', { requested: unique.length, deleted });
    return { success, deletedCount: deleted };
  },
};
