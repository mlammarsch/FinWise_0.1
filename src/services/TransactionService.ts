// Datei: src/services/TransactionService.ts
import { useTransactionStore } from '@/stores/transactionStore'
import { useAccountStore }     from '@/stores/accountStore'
import { useCategoryStore }    from '@/stores/categoryStore'
import { useMonthlyBalanceStore } from '@/stores/monthlyBalanceStore'
import { Transaction, TransactionType } from '@/types'
import { v4 as uuidv4 } from 'uuid'
import { debugLog } from '@/utils/logger'
import { toDateOnlyString } from '@/utils/formatters'
import { useRuleStore } from '@/stores/ruleStore'

export const TransactionService = {
  /* ------------------------------------------------------------------ */
  /* --------------------------- Read APIs ---------------------------- */
  /* ------------------------------------------------------------------ */
  getAllTransactions(): Transaction[] {
    return useTransactionStore().transactions
  },

  getTransactionById(id: string): Transaction | null {
    const tx = useTransactionStore().getTransactionById(id)
    if (!tx) debugLog('[TransactionService] getTransactionById – not found', id)
    return tx
  },

  /* ------------------------------------------------------------------ */
  /* --------------------------- Write APIs --------------------------- */
  /* ------------------------------------------------------------------ */

  addTransaction(txData: Omit<Transaction, 'id' | 'runningBalance'>): Transaction {
    const txStore = useTransactionStore()
    const mbStore = useMonthlyBalanceStore()
    const catStore = useCategoryStore()
    const ruleStore = useRuleStore()

    // Basiskontrolle
    if (!txData.accountId && txData.type !== TransactionType.CATEGORYTRANSFER) {
      throw new Error('Account ID erforderlich.')
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
    }

    const added = txStore.addTransaction(newTx)

    // → Regeln anwenden & speichern
    ruleStore.applyRulesToTransaction(added)

    mbStore.calculateMonthlyBalances()
    debugLog('[TransactionService] addTransaction', added)

    /* Automatischer Kategorie-Transfer bei Einnahmen, ABER NUR FÜR EINNAHMEKATEGORIEN */
    if (
      added.type === TransactionType.INCOME &&
      added.amount > 0 &&
      added.categoryId
    ) {
      const category = catStore.getCategoryById(added.categoryId)
      if (category && category.isIncomeCategory) {
        const available = catStore.getAvailableFundsCategory()
        if (!available) throw new Error("Kategorie 'Verfügbare Mittel' fehlt")
        this.addCategoryTransfer(
          added.categoryId,
          available.id,
          added.amount,
          added.date,
          'Automatischer Transfer von Einnahmen'
        )
      }
    }

    return added
  },

  /* -------------------- Konto-zu-Konto-Transfer -------------------- */

  addAccountTransfer(
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    date: string,
    note = '',
    planningTransactionId: string | null = null
  ) {
    if (fromAccountId === toAccountId) throw new Error('Quell = Zielkonto')
    if (amount === 0) throw new Error('Betrag 0')

    const accStore = useAccountStore()
    const mbStore  = useMonthlyBalanceStore()

    const fromName = accStore.getAccountById(fromAccountId)?.name ?? ''
    const toName   = accStore.getAccountById(toAccountId)?.name ?? ''
    const dt       = toDateOnlyString(date)
    const vdt      = toDateOnlyString(date)
    const abs      = Math.abs(amount)

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
      accountId: '',
      amount: 0,
    }

    const fromTx = this.addTransaction({
      ...base,
      accountId: fromAccountId,
      amount: -abs,
      payee: `Transfer zu ${toName}`,
      transferToAccountId: toAccountId,
    })
    const toTx = this.addTransaction({
      ...base,
      accountId: toAccountId,
      amount: abs,
      payee: `Transfer von ${fromName}`,
      transferToAccountId: fromAccountId,
    })

    // Verlinken
    this.updateTransaction(fromTx.id, { counterTransactionId: toTx.id })
    this.updateTransaction(toTx.id,   { counterTransactionId: fromTx.id })

    mbStore.calculateMonthlyBalances()
    debugLog('[TransactionService] addAccountTransfer', { fromTx, toTx })
    return { fromTransaction: fromTx, toTransaction: toTx }
  },

  /* ---------------- Kategori­e­transfer ---------------- */

  addCategoryTransfer(
    fromCategoryId: string,
    toCategoryId: string,
    amount: number,
    date: string,
    note: string = ''
  ) {
    const categoryStore = useCategoryStore()
    const fromName = categoryStore.getCategoryById(fromCategoryId)?.name ?? ''
    const toName   = categoryStore.getCategoryById(toCategoryId)?.name ?? ''
    const dt       = toDateOnlyString(date)
    const abs      = Math.abs(amount)

    // “Von”-Buchung
    const fromTx = this.addTransaction({
      type: TransactionType.CATEGORYTRANSFER,
      date: dt,
      valueDate: dt,
      accountId: '',
      categoryId: fromCategoryId,
      amount: -abs,
      tagIds: [],
      payee: `Kategorientransfer zu ${toName}`,
      note,
      counterTransactionId: null,
      planningTransactionId: null,
      isReconciliation: false,
      isCategoryTransfer: true,
      toCategoryId: toCategoryId,
      reconciled: false,
    })

    // “Zu”-Buchung
    const toTx = this.addTransaction({
      ...fromTx,
      categoryId: toCategoryId,
      amount: abs,
      payee: `Kategorientransfer von ${fromName}`,
      toCategoryId: fromCategoryId,
    } as Omit<Transaction, 'id' | 'runningBalance'>)

    // Verlinken
    this.updateTransaction(fromTx.id, { counterTransactionId: toTx.id })
    this.updateTransaction(toTx.id,   { counterTransactionId: fromTx.id })

    debugLog('[TransactionService] addCategoryTransfer', { fromTx, toTx })
    return { fromTransaction: fromTx, toTransaction: toTx }
  },

  updateCategoryTransfer(
    transactionId: string,
    counterTransactionId: string,
    fromCategoryId: string,
    toCategoryId: string,
    amount: number,
    date: string,
    note: string = ''
  ) {
    const categoryStore = useCategoryStore()
    const fromName = categoryStore.getCategoryById(fromCategoryId)?.name ?? ''
    const toName   = categoryStore.getCategoryById(toCategoryId)?.name ?? ''
    const dt       = toDateOnlyString(date)
    const abs      = Math.abs(amount)

    // Aktualisiere “Von”
    this.updateTransaction(transactionId, {
      categoryId: fromCategoryId,
      amount: -abs,
      toCategoryId,
      date: dt,
      valueDate: dt,
      payee: `Kategorientransfer zu ${toName}`,
      note
    })

    // Aktualisiere “Zu”
    this.updateTransaction(counterTransactionId, {
      categoryId: toCategoryId,
      amount: abs,
      toCategoryId: fromCategoryId,
      date: dt,
      valueDate: dt,
      payee: `Kategorientransfer von ${fromName}`,
      note
    })

    debugLog('[TransactionService] updateCategoryTransfer', { transactionId, counterTransactionId })
    return true
  },

  /* --------------------- Ausgleichs-Buchung ------------------------ */

  addReconcileTransaction(
    accountId: string,
    amount: number,
    date: string,
    note = ''
  ) {
    if (amount === 0) return null
    const catStore = useCategoryStore()
    const mbStore  = useMonthlyBalanceStore()

    const catId =
      catStore.categories.find(c => c.name === 'Ausgleichskorrekturen')?.id ??
      null

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
    })

    mbStore.calculateMonthlyBalances()
    return tx
  },

  /* ------------------------- Update / Delete ----------------------- */

  updateTransaction(
    id: string,
    updates: Partial<Omit<Transaction, 'id' | 'runningBalance'>>
  ): boolean {
    const txStore = useTransactionStore()
    const mbStore = useMonthlyBalanceStore()
    const catStore = useCategoryStore()

    if (updates.date) updates.date = toDateOnlyString(updates.date)
    if (updates.valueDate) updates.valueDate = toDateOnlyString(updates.valueDate)

    const original = txStore.getTransactionById(id)

    // Datumswechsel bei Einnahmen → Category-Transfer umbuchen
    const originalMonthKey = original?.date?.substring(0, 7)
    const newDate = updates.date ?? original?.date ?? ''
    const newMonthKey = newDate.substring(0, 7)

    if (
      original &&
      original.type === TransactionType.INCOME &&
      original.amount > 0 &&
      original.categoryId &&
      originalMonthKey !== newMonthKey
    ) {
      const available = catStore.getAvailableFundsCategory()
      if (!available) throw new Error("Kategorie 'Verfügbare Mittel' fehlt")

      this.addCategoryTransfer(available.id, original.categoryId, original.amount, original.date,
        'Automatischer Rücktransfer wegen Datumsänderung')
      this.addCategoryTransfer(original.categoryId, available.id, original.amount, newDate,
        'Automatischer Transfer wegen Datumsänderung')
    }

    const ok = txStore.updateTransaction(id, updates)
    if (!ok) return false

    // Auto-Transfer bei Betragsanpassung
    if (
      original &&
      original.type === TransactionType.INCOME &&
      updates.amount !== undefined
    ) {
      const category = catStore.getCategoryById(original.categoryId)
      if (category && category.isIncomeCategory) {
        const diff = updates.amount - original.amount
        if (diff !== 0 && original.categoryId) {
          const available = catStore.getAvailableFundsCategory()
          if (!available) throw new Error("Kategorie 'Verfügbare Mittel' fehlt")

          this.addCategoryTransfer(
            diff > 0 ? original.categoryId : available.id,
            diff > 0 ? available.id : original.categoryId,
            Math.abs(diff),
            updates.date ?? original.date,
            'Automatischer Transfer bei Betragsanpassung'
          )
        }
      }
    }

    mbStore.calculateMonthlyBalances()
    return true
  },

  deleteTransaction(id: string): boolean {
    const txStore = useTransactionStore()
    const mbStore = useMonthlyBalanceStore()
    const catStore = useCategoryStore()

    const tx = txStore.getTransactionById(id)
    if (!tx) return false

    // Einnahme-Löschung → Mittel zurück transferieren
    if (
      tx.type === TransactionType.INCOME &&
      tx.amount > 0 &&
      tx.categoryId
    ) {
      const available = catStore.getAvailableFundsCategory()
      if (!available) throw new Error("Kategorie 'Verfügbare Mittel' fehlt")

      this.addCategoryTransfer(
        available.id,
        tx.categoryId,
        tx.amount,
        tx.date,
        'Automatischer Transfer bei Löschung der Einnahme'
      )
    }

    const okPrimary = txStore.deleteTransaction(id)
    if (!okPrimary) return false

    if (tx.counterTransactionId)
      txStore.deleteTransaction(tx.counterTransactionId)

    mbStore.calculateMonthlyBalances()
    return true
  },

  deleteMultipleTransactions(ids: string[]) {
    const unique = [...new Set(ids)]
    let deleted = 0
    unique.forEach(id => this.deleteTransaction(id) && deleted++)
    const success = deleted === unique.length
    debugLog('[TransactionService] deleteMultipleTransactions', { requested: unique.length, deleted })
    return { success, deletedCount: deleted }
  },
}
