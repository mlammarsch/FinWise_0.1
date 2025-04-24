// Pfad: src/utils/runningBalances.ts

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

export interface BalanceInfo {
  balance: number;
  date: Date;
}

/**
 * Berechnet den Budget-Wert (linke Spalte) einer Ausgabenkategorie.
 * Berücksichtigt nur CATEGORYTRANSFER Transaktionen im gegebenen Zeitraum.
 */
export function calculateCategoryBudgetedAmount(
  transactions: any[],
  categoryId: string,
  start: Date,
  end: Date
): number {
  // Nur Category-Transfers im Zeitraum (inklusive toCategoryId)
  const txs = transactions.filter(tx => {
    const txDate = new Date(tx.valueDate || tx.date);
    return (
      (tx.categoryId === categoryId || tx.toCategoryId === categoryId) &&
      tx.type === 'CATEGORYTRANSFER' &&
      txDate >= start && txDate <= end
    );
  });

  // Summe aller Transfers für diese Kategorie
  return txs.reduce((sum, tx) => {
    // Wenn diese Kategorie die Quelle ist, dann ist der Betrag negativ
    // Wenn diese Kategorie das Ziel ist, dann ist der Betrag positiv
    if (tx.categoryId === categoryId) return sum + tx.amount;
    if (tx.toCategoryId === categoryId) return sum + Math.abs(tx.amount); // Immer positiver Betrag für Empfänger
    return sum;
  }, 0);
}

/**
 * Berechnet den Transaktions-Wert (mittlere Spalte) einer Ausgabenkategorie.
 * Berücksichtigt nur EXPENSE und INCOME Transaktionen im gegebenen Zeitraum.
 */
export function calculateCategoryTransactionsAmount(
  transactions: any[],
  categoryId: string,
  start: Date,
  end: Date
): number {
  // Nur Transaktionen des Typs EXPENSE oder INCOME im Zeitraum
  const txs = transactions.filter(tx => {
    const txDate = new Date(tx.valueDate || tx.date);
    return (
      tx.categoryId === categoryId &&
      (tx.type === 'EXPENSE' || tx.type === 'INCOME') &&
      txDate >= start && txDate <= end
    );
  });

  // Summe aller Transaktionen
  return txs.reduce((sum, tx) => sum + tx.amount, 0);
}

/**
 * Berechnet den Saldo (rechte Spalte) einer Ausgabenkategorie.
 * Berücksichtigt Vormonats-Saldo + aktuelle Transaktionen + Budget-Transfers.
 */
export function calculateCategorySaldo(
  transactions: any[],
  categoryId: string,
  start: Date,
  end: Date,
  startBalanceInfo: BalanceInfo | number = 0
): { budgeted: number; spent: number; saldo: number } {
  // Vormonats-Saldo (von extern übergeben)
  const startBalance = typeof startBalanceInfo === 'number'
    ? startBalanceInfo
    : startBalanceInfo.balance;

  // Budget-Transfers berechnen (linke Spalte)
  const budgetedAmount = calculateCategoryBudgetedAmount(transactions, categoryId, start, end);

  // Transaktionen berechnen (mittlere Spalte)
  const transactionsAmount = calculateCategoryTransactionsAmount(transactions, categoryId, start, end);

  // Saldo = Vormonats-Saldo + aktuelle Transaktionen + Budget-Transfers
  const saldo = startBalance + transactionsAmount + budgetedAmount;

  return {
    budgeted: budgetedAmount,
    spent: transactionsAmount,
    saldo: saldo
  };
}

/**
 * Berechnet den Saldo für eine Einnahmekategorie.
 * Verwendet die gleiche Logik wie für Ausgabekategorien.
 */
export function calculateIncomeCategorySaldo(
  transactions: any[],
  categoryId: string,
  start: Date,
  end: Date,
  startBalanceInfo: BalanceInfo | number = 0
): { budgeted: number; spent: number; saldo: number } {
  // Einnahmen berechnen gleich wie Ausgaben, mit Vorzeichenanpassungen
  return calculateCategorySaldo(transactions, categoryId, start, end, startBalanceInfo);
}
