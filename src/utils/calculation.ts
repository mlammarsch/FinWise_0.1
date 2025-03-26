// calculation.ts

import { Transaction } from "../types";

/**
 * Gruppiert Transaktionen nach Datum (YYYY-MM-DD) und berechnet den laufenden Saldo pro Konto ab 0 €.
 * Gibt eine sortierte Liste von Gruppenobjekten zurück.
 */
export function calculateRunningBalancesByDate(
  transactions: Transaction[],
  accountId: string
): {
  date: string;
  transactions: Transaction[];
  runningBalance: number;
}[] {
  const filtered = transactions.filter((tx) => tx.accountId === accountId);

  const sorted = [...filtered].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
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
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let balance = 0;
  for (const group of groupList) {
    for (const tx of group.transactions) {
      balance += tx.amount;
    }
    (group as any)["runningBalance"] = balance;
  }

  return groupList.reverse(); // nach Datum absteigend zurückgeben
}
