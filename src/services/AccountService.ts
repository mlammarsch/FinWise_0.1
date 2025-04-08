// src/services/AccountService.ts
import { useAccountStore } from '@/stores/accountStore';
import { useMonthlyBalanceStore } from '@/stores/monthlyBalanceStore';
import { Account, AccountGroup } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { debugLog } from '@/utils/logger';

export const AccountService = {
  /**
   * Fügt ein neues Konto hinzu
   */
  addAccount(account: Omit<Account, 'id'>) {
    const accountStore = useAccountStore();
    const monthlyBalanceStore = useMonthlyBalanceStore();

    const newAccount: Account = {
      ...account,
      id: uuidv4()
    };

    accountStore.accounts.push(newAccount);
    debugLog("[AccountService] addAccount:", newAccount);
    accountStore.saveAccounts();

    // Monatliche Salden neu berechnen
    monthlyBalanceStore.calculateMonthlyBalances();

    return newAccount;
  },

  /**
   * Aktualisiert ein Konto
   */
  updateAccount(id: string, updates: Partial<Account>) {
    const accountStore = useAccountStore();
    const monthlyBalanceStore = useMonthlyBalanceStore();

    const index = accountStore.accounts.findIndex(account => account.id === id);
    if (index !== -1) {
      accountStore.accounts[index] = { ...accountStore.accounts[index], ...updates };
      debugLog("[AccountService] updateAccount:", accountStore.accounts[index]);
      accountStore.saveAccounts();

      // Monatliche Salden neu berechnen
      monthlyBalanceStore.calculateMonthlyBalances();

      return true;
    }
    return false;
  },

  /**
   * Löscht ein Konto
   */
  deleteAccount(id: string) {
    const accountStore = useAccountStore();
    const monthlyBalanceStore = useMonthlyBalanceStore();

    accountStore.accounts = accountStore.accounts.filter(account => account.id !== id);
    debugLog("[AccountService] deleteAccount:", id);
    accountStore.saveAccounts();

    // Monatliche Salden neu berechnen
    monthlyBalanceStore.calculateMonthlyBalances();

    return true;
  },

  /**
   * Fügt eine Kontogruppe hinzu
   */
  addAccountGroup(group: Omit<AccountGroup, 'id'>) {
    const accountStore = useAccountStore();

    const newGroup: AccountGroup = {
      ...group,
      id: uuidv4()
    };

    accountStore.accountGroups.push(newGroup);
    debugLog("[AccountService] addAccountGroup:", newGroup);
    accountStore.saveAccountGroups();

    return newGroup;
  },

  /**
   * Aktualisiert eine Kontogruppe
   */
  updateAccountGroup(id: string, updates: Partial<AccountGroup>) {
    const accountStore = useAccountStore();

    const index = accountStore.accountGroups.findIndex(group => group.id === id);
    if (index !== -1) {
      accountStore.accountGroups[index] = { ...accountStore.accountGroups[index], ...updates };
      debugLog("[AccountService] updateAccountGroup:", accountStore.accountGroups[index]);
      accountStore.saveAccountGroups();
      return true;
    }
    return false;
  },

  /**
   * Löscht eine Kontogruppe
   */
  deleteAccountGroup(id: string) {
    const accountStore = useAccountStore();

    // Prüfe, ob Konten zur Gruppe gehören
    const hasAccounts = accountStore.accounts.some(account => account.accountGroupId === id);
    if (hasAccounts) {
      return false;
    }

    accountStore.accountGroups = accountStore.accountGroups.filter(group => group.id !== id);
    debugLog("[AccountService] deleteAccountGroup:", id);
    accountStore.saveAccountGroups();
    return true;
  }
};
