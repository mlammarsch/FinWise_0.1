// src/services/AccountService.ts
import { useAccountStore } from '@/stores/accountStore';
import { useTransactionStore } from '@/stores/transactionStore'; // Needed for getAccountInfo
import { Account, AccountGroup, Transaction } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { debugLog } from '@/utils/logger';

interface AccountInfo {
    id: string;
    name: string;
    balance: number;
    // Add other quickly accessible info if needed
}

export const AccountService = {
    // --- Account CRUD ---

    /**
     * Holt alle Konten.
     */
    getAllAccounts(): Account[] {
        const accountStore = useAccountStore();
        return accountStore.accounts; // Directly return from store state
    },

    /**
     * Holt ein Konto anhand seiner ID.
     */
    getAccountById(id: string): Account | null {
        const accountStore = useAccountStore();
        const account = accountStore.getAccountById(id);
        if (!account) {
            debugLog("[AccountService] getAccountById - Account not found:", id);
        }
        return account;
    },

     /**
     * Fügt ein neues Konto hinzu.
     */
    addAccount(accountData: Omit<Account, 'id' | 'balance' | 'reconcilliationDate' | 'reconcilliationBalance' | 'isClosed'>): Account | null {
        const accountStore = useAccountStore();
        const newAccount: Account = {
            ...accountData,
            id: uuidv4(),
            balance: accountData.startBalance || 0,
            reconcilliationDate: null,
            reconcilliationBalance: null,
            isClosed: false,
            // Default image or handle missing image
            image: accountData.image || undefined,
        };
        const added = accountStore.addAccount(newAccount); // Use store action
        if (added) {
            debugLog("[AccountService] addAccount - Added:", added);
             return added;
        } else {
             debugLog("[AccountService] addAccount - Failed to add account");
             return null;
        }
    },

    /**
     * Aktualisiert ein Konto.
     */
    updateAccount(id: string, updates: Partial<Omit<Account, 'id' | 'balance'>>): boolean {
        const accountStore = useAccountStore();
        const success = accountStore.updateAccount(id, updates); // Use store action
        if (success) {
            debugLog("[AccountService] updateAccount - Updated:", id);
        } else {
            debugLog("[AccountService] updateAccount - Failed to update:", id);
        }
        return success;
    },

    /**
     * Löscht ein Konto (nur wenn keine Transaktionen vorhanden sind).
     */
    deleteAccount(id: string): boolean {
        const accountStore = useAccountStore();
        const transactionStore = useTransactionStore();

        // Check if account has transactions
        const hasTransactions = transactionStore.transactions.some(tx => tx.accountId === id);
        if (hasTransactions) {
            debugLog("[AccountService] deleteAccount - Failed: Account has transactions:", id);
            // Optional: throw an error or return a specific code
            return false;
        }

        const success = accountStore.deleteAccount(id); // Use store action
         if (success) {
             debugLog("[AccountService] deleteAccount - Deleted:", id);
         } else {
              debugLog("[AccountService] deleteAccount - Failed to delete:", id);
         }
        return success;
    },

     /**
     * Holt grundlegende Kontoinformationen (z.B. für Kartenanzeige).
     * Berechnet den aktuellen Saldo aus dem Startsaldo und den Transaktionen.
     * Deprecated or needs rework: Balance calculation should happen in store or fetch logic.
     * Keeping it simple for now, assuming AccountStore keeps balance updated.
     */
    getAccountInfo(accountId: string): AccountInfo | null {
        const account = this.getAccountById(accountId);
        if (!account) return null;

        // Direct return, assuming balance in store is up-to-date
        return {
            id: account.id,
            name: account.name,
            balance: account.balance,
        };

        /* // --- Alternative: Recalculate Balance ---
        const transactionStore = useTransactionStore();
        const transactions = transactionStore.getTransactionsByAccount(accountId);
        const currentBalance = transactions.reduce(
            (sum, tx) => sum + tx.amount,
            account.startBalance || 0 // Start from startBalance if available
        );
        // This requires updating the account object in the store if we want consistency
        // It's better if the store handles balance updates reactively.
        return { id: account.id, name: account.name, balance: currentBalance };
        // --- End Alternative --- */
    },

     /**
     * Holt den Namen eines Kontos anhand seiner ID.
     */
    getAccountName(id: string | null): string {
        if (!id) return 'Kein Konto';
        const accountStore = useAccountStore();
        return accountStore.getAccountById(id)?.name || 'Unbekanntes Konto';
    },


    // --- Account Group CRUD ---

    /**
     * Holt alle Kontogruppen.
     */
     getAllAccountGroups(): AccountGroup[] {
        const accountStore = useAccountStore();
        return accountStore.accountGroups;
    },


    /**
     * Holt eine Kontogruppe anhand ihrer ID.
     */
    getAccountGroupById(id: string): AccountGroup | null {
        const accountStore = useAccountStore();
        const group = accountStore.getAccountGroupById(id);
         if (!group) {
             debugLog("[AccountService] getAccountGroupById - Group not found:", id);
         }
        return group;
    },

    /**
     * Fügt eine neue Kontogruppe hinzu.
     */
    addAccountGroup(groupData: Omit<AccountGroup, 'id'>): AccountGroup | null {
        const accountStore = useAccountStore();
        const newGroup: AccountGroup = {
            ...groupData,
            id: uuidv4(),
        };
        const added = accountStore.addAccountGroup(newGroup);
        if (added) {
             debugLog("[AccountService] addAccountGroup - Added:", added);
             return added;
        } else {
             debugLog("[AccountService] addAccountGroup - Failed to add group");
             return null;
        }
    },

    /**
     * Aktualisiert eine Kontogruppe.
     */
    updateAccountGroup(id: string, updates: Partial<Omit<AccountGroup, 'id'>>): boolean {
        const accountStore = useAccountStore();
        const success = accountStore.updateAccountGroup(id, updates);
        if (success) {
            debugLog("[AccountService] updateAccountGroup - Updated:", id);
        } else {
            debugLog("[AccountService] updateAccountGroup - Failed to update:", id);
        }
        return success;
    },

    /**
     * Löscht eine Kontogruppe (nur wenn keine Konten zugeordnet sind).
     */
    deleteAccountGroup(id: string): boolean {
        const accountStore = useAccountStore();

        // Check if group has accounts
        const hasAccounts = accountStore.accounts.some(acc => acc.accountGroupId === id);
        if (hasAccounts) {
            debugLog("[AccountService] deleteAccountGroup - Failed: Group has accounts:", id);
            return false;
        }

        const success = accountStore.deleteAccountGroup(id);
        if (success) {
            debugLog("[AccountService] deleteAccountGroup - Deleted:", id);
        } else {
             debugLog("[AccountService] deleteAccountGroup - Failed to delete:", id);
        }
        return success;
    },
};
