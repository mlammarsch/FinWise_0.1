import { Transaction } from "../types";

/**
 * Gruppiert Transaktionen nach Datum (YYYY-MM-DD) und berechnet den laufenden Saldo.
 * Gibt eine sortierte Liste von Gruppenobjekten zurück.
 */
export function calculateRunningBalancesByDate(
  transactions: Transaction[],
  initialBalance: number
): {
  date: string;
  transactions: Transaction[];
  runningBalance: number;
}[] {
  const sorted = [...transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const groups: Record<string, { date: string; transactions: Transaction[] }> = {};

  for (const tx of sorted) {
    const key = new Date(tx.date).toISOString().split("T")[0];
    if (!groups[key]) {
      groups[key] = { date: key, transactions: [] };
    }
    groups[key].transactions.push(tx);
  }

  const groupList = Object.values(groups).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  let balance = initialBalance;
  for (const group of groupList) {
    for (const tx of group.transactions) {
      balance -= tx.amount;
    }
    group["runningBalance"] = balance;
  }

  return groupList;
}
