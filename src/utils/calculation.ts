// src/utils/calculation.ts — groupTransactionsByDateWithBalance angepasst
export function groupTransactionsByDateWithBalance(
  transactions,
  account
) {
  const offset = account.offset || 0;
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();

  const groups = transactions
    .filter(tx => tx.accountId === account.id)
    .sort((a,b) => new Date(a.date) - new Date(b.date))
    .reduce((acc, tx) => {
      const key = tx.date.split("T")[0];
      (acc[key] ??= { date: key, transactions: [] }).transactions.push(tx);
      return acc;
    }, {});

  return Object.values(groups)
    .map(group => {
      const lastTx = group.transactions[group.transactions.length - 1];
      const applyOffset = new Date(group.date).getTime() >= firstOfMonth ? offset : 0;
      return { ...group, runningBalance: lastTx.runningBalance - applyOffset };
    })
    .sort((a,b) => new Date(b.date) - new Date(a.date));
}
