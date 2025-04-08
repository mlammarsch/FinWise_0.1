// src/services/DataService.ts
import { Account, AccountGroup, Transaction, Category, Tag, PlanningTransaction, Recipient } from '@/types';
import { debugLog } from '@/utils/logger';

/**
 * Adapter für den Local Storage
 */
export const LocalStorageAdapter = {
  save(key: string, data: any): void {
    localStorage.setItem(`finwise_${key}`, JSON.stringify(data));
    debugLog("[LocalStorageAdapter] save", { key: `finwise_${key}`, dataSize: JSON.stringify(data).length });
  },

  load<T>(key: string): T | null {
    const data = localStorage.getItem(`finwise_${key}`);
    const result = data ? JSON.parse(data) : null;
    debugLog("[LocalStorageAdapter] load", {
      key: `finwise_${key}`,
      found: !!data,
      itemCount: Array.isArray(result) ? result.length : 0
    });
    return result;
  },

  remove(key: string): void {
    localStorage.removeItem(`finwise_${key}`);
    debugLog("[LocalStorageAdapter] remove", { key: `finwise_${key}` });
  }
};

/**
 * Datenservice für den Zugriff auf persistierte Daten
 */
export class DataService {
  private adapter = LocalStorageAdapter;

  // Account-bezogene Methoden
  saveAccounts(accounts: Account[]): void {
    this.adapter.save('accounts', accounts);
  }

  loadAccounts(): Account[] | null {
    return this.adapter.load<Account[]>('accounts');
  }

  saveAccountGroups(groups: AccountGroup[]): void {
    this.adapter.save('account_groups', groups);
  }

  loadAccountGroups(): AccountGroup[] | null {
    return this.adapter.load<AccountGroup[]>('account_groups');
  }

  // Transaktions-bezogene Methoden
  saveTransactions(transactions: Transaction[]): void {
    this.adapter.save('transactions', transactions);
  }

  loadTransactions(): Transaction[] | null {
    return this.adapter.load<Transaction[]>('transactions');
  }

  // Kategorie-bezogene Methoden
  saveCategories(categories: Category[]): void {
    this.adapter.save('categories', categories);
  }

  loadCategories(): Category[] | null {
    return this.adapter.load<Category[]>('categories');
  }

  saveCategoryGroups(groups: any[]): void {
    this.adapter.save('category_groups', groups);
  }

  loadCategoryGroups(): any[] | null {
    return this.adapter.load<any[]>('category_groups');
  }

  // Tag-bezogene Methoden
  saveTags(tags: Tag[]): void {
    this.adapter.save('tags', tags);
  }

  loadTags(): Tag[] | null {
    return this.adapter.load<Tag[]>('tags');
  }

  // Planung-bezogene Methoden
  savePlanningTransactions(plannings: PlanningTransaction[]): void {
    this.adapter.save('planning_transactions', plannings);
  }

  loadPlanningTransactions(): PlanningTransaction[] | null {
    return this.adapter.load<PlanningTransaction[]>('planning_transactions');
  }

  // Empfänger-bezogene Methoden
  saveRecipients(recipients: Recipient[]): void {
    this.adapter.save('recipients', recipients);
  }

  loadRecipients(): Recipient[] | null {
    return this.adapter.load<Recipient[]>('recipients');
  }

  // Andere Methoden
  saveItem<T>(key: string, data: T): void {
    this.adapter.save(key, data);
  }

  loadItem<T>(key: string): T | null {
    return this.adapter.load<T>(key);
  }

  removeItem(key: string): void {
    this.adapter.remove(key);
  }
}
