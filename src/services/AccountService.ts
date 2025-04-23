// src/services/AccountService.ts
import { useAccountStore } from '@/stores/accountStore';
import { useTransactionStore } from '@/stores/transactionStore';
import { useMonthlyBalanceStore } from '@/stores/monthlyBalanceStore';
import { Account, AccountGroup } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { debugLog } from '@/utils/logger';

interface AccountInfo {
  id: string;
  name: string;
  balance: number;
}

export const AccountService = {
  // ------------------------------------------------------------------ CRUD

  getAllAccounts(): Account[] {
    return useAccountStore().accounts;
  },

  getAccountById(id: string): Account | null {
    const acc = useAccountStore().getAccountById(id);
    if (!acc) debugLog('[AccountService] Account not found', id);
    return acc;
  },

  addAccount(accountData: Omit<Account, 'id' | 'balance'>): Account | null {
    const accountStore = useAccountStore();
    const newAccount: Account = {
      ...accountData,
      id: uuidv4(),
      balance: 0,
    };
    return accountStore.addAccount(newAccount);
  },

  updateAccount(id: string, updates: Partial<Omit<Account, 'id'>>): boolean {
    return useAccountStore().updateAccount(id, updates);
  },

  deleteAccount(id: string): boolean {
    const txStore = useTransactionStore();
    if (txStore.transactions.some(tx => tx.accountId === id)) return false;
    return useAccountStore().deleteAccount(id);
  },

  // -------------------------------------------------------- Zentrale Salden

  /**
   * Liefert den Saldo eines Kontos zum Stichtag (default = heute).
   * Berücksichtigt nur Transaktionen bis zum angegebenen Datum.
   */
  getCurrentBalance(accountId: string, asOf: Date = new Date()): number {
    const mbStore = useMonthlyBalanceStore();
    const bal = mbStore.getAccountBalanceForDate(accountId, asOf);
    return bal ?? 0;
  },

  /**
   * Liefert den projizierten Saldo eines Kontos zum Stichtag (default = heute).
   * Berücksichtigt auch zukünftige geplante Transaktionen.
   */
  getProjectedBalance(accountId: string, asOf: Date = new Date()): number {
    const mbStore = useMonthlyBalanceStore();
    const bal = mbStore.getProjectedAccountBalanceForDate(accountId, asOf);
    return bal ?? 0;
  },

  /**
   * Gesamtsaldo aller aktiven Konten zum Stichtag.
   */
  getTotalBalance(asOf: Date = new Date()): number {
    const accStore = useAccountStore();
    return accStore.activeAccounts
      .filter(a => !a.isOfflineBudget)
      .reduce((sum, a) => sum + this.getCurrentBalance(a.id, asOf), 0);
  },

  /**
   * Salden je Kontogruppe; liefert Objekt { groupId: balance }.
   */
  getGroupBalances(asOf: Date = new Date()): Record<string, number> {
    const accStore = useAccountStore();
    const result: Record<string, number> = {};
    accStore.accountGroups.forEach(g => {
      const groupAccounts = accStore.accounts.filter(
        a => a.accountGroupId === g.id && a.isActive && !a.isOfflineBudget
      );
      const bal = groupAccounts.reduce(
        (s, a) => s + this.getCurrentBalance(a.id, asOf),
        0
      );
      result[g.id] = bal;
    });
    return result;
  },

  // --------------------------------------------------------- Convenience —

  getAccountInfo(accountId: string): AccountInfo | null {
    const acc = this.getAccountById(accountId);
    if (!acc) return null;
    return {
      id: acc.id,
      name: acc.name,
      balance: this.getCurrentBalance(acc.id),
    };
  },

  getAccountName(id: string | null): string {
    if (!id) return 'Kein Konto';
    return this.getAccountById(id)?.name || 'Unbekanntes Konto';
  },

  // ---------------------------------------------------- Account‑Groups CRUD

  getAllAccountGroups(): AccountGroup[] {
    return useAccountStore().accountGroups;
  },

  getAccountGroupById(id: string): AccountGroup | null {
    return useAccountStore().getAccountGroupById(id);
  },

  addAccountGroup(groupData: Omit<AccountGroup, 'id'>): AccountGroup | null {
    const newGroup: AccountGroup = { ...groupData, id: uuidv4() };
    return useAccountStore().addAccountGroup(newGroup);
  },

  updateAccountGroup(id: string, updates: Partial<Omit<AccountGroup, 'id'>>): boolean {
    return useAccountStore().updateAccountGroup(id, updates);
  },

  deleteAccountGroup(id: string): boolean {
    const accStore = useAccountStore();
    if (accStore.accounts.some(acc => acc.accountGroupId === id)) return false;
    return accStore.deleteAccountGroup(id);
  },
};
