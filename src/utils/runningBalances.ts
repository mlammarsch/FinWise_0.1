// D:/_localData/dev/FinWise/FinWise_0.1/src/utils/runningBalances.ts

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

  const finalGroups = Object.values(groups)
    .map(group => {
      const lastTx = group.transactions[group.transactions.length - 1]
      const applyOffset = new Date(group.date).getTime() >= firstOfMonth ? offset : 0
      return { ...group, runningBalance: lastTx.runningBalance - applyOffset }
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

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
 * Neuer Parameter startBalanceInfo: der Saldo des Vormonats als Zahl oder Objekt mit Balance und Datum.
 */
export function calculateCategorySaldo(
  transactions: any[],
  categoryId: string,
  start: Date,
  end: Date,
  startBalanceInfo: { balance: number; date: Date } | number = 0
): { budgeted: number; spent: number; saldo: number } {
  const startBalance = typeof startBalanceInfo === 'number'
    ? startBalanceInfo
    : startBalanceInfo.balance;

  const txs = transactions.filter(tx => tx.categoryId === categoryId);
  const txsCurrent = txs.filter(tx => new Date(tx.valueDate) >= start && new Date(tx.valueDate) <= end);
  const txsBefore = txs.filter(tx => new Date(tx.valueDate) < start);
  const previousTxsSum = txsBefore.reduce((sum, tx) => sum + tx.amount, 0);
  const spentThisMonth = txsCurrent.reduce((sum, tx) => sum + tx.amount, 0);
  const effectivePreviousSaldo = startBalance !== 0 ? startBalance : previousTxsSum;
  const saldo = effectivePreviousSaldo + spentThisMonth;

  return { budgeted: 0, spent: spentThisMonth, saldo };
}

/**
 * Berechnet den Saldo für eine Einnahmekategorie.
 * Neuer Parameter startBalanceInfo: der Saldo des Vormonats als Zahl oder Objekt mit Balance und Datum.
 */
export function calculateIncomeCategorySaldo(
  transactions: any[],
  categoryId: string,
  start: Date,
  end: Date,
  startBalanceInfo: { balance: number; date: Date } | number = 0
): { budgeted: number; spent: number; saldo: number } {
  const startBalance = typeof startBalanceInfo === 'number'
    ? startBalanceInfo
    : startBalanceInfo.balance;

  const txs = transactions.filter(tx => tx.categoryId === categoryId);
  const txsCurrent = txs.filter(tx => new Date(tx.valueDate) >= start && new Date(tx.valueDate) <= end);
  const sumThisMonth = txsCurrent.reduce((sum, tx) => sum + tx.amount, 0);
  const effectiveStart = startBalance;
  const saldo = effectiveStart - sumThisMonth;

  return { budgeted: 0, spent: sumThisMonth, saldo };
}
