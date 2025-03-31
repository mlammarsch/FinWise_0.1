<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useAccountStore } from "../stores/accountStore";
import { useTagStore } from "../stores/tagStore";
import { useCategoryStore } from "../stores/categoryStore";
import { useRecipientStore } from "../stores/recipientStore";
import AccountGroupCard from "../components/account/AccountGroupCard.vue";
import AccountForm from "../components/account/AccountForm.vue";
import AccountGroupForm from "../components/account/AccountGroupForm.vue";
import CurrencyDisplay from "../components/ui/CurrencyDisplay.vue";
import TransactionCard from "../components/transaction/TransactionCard.vue";
import TransactionForm from "../components/transaction/TransactionForm.vue";
import SearchGroup from "../components/ui/SearchGroup.vue";
import { formatDate } from "../utils/formatters";
import { groupTransactionsByDateWithRunningBalance } from "../utils/runningBalances";
import { useTransactionStore } from "../stores/transactionStore";
import { TransactionType } from "../types";
import { addAccountTransfer } from "@/utils/accountTransfers";
import { Icon } from "@iconify/vue";
import { debugLog } from "@/utils/logger";

const accountStore = useAccountStore();
const router = useRouter();
const tagStore = useTagStore();
const categoryStore = useCategoryStore();
const recipientStore = useRecipientStore();
const transactionStore = useTransactionStore();

const showNewAccountModal = ref(false);
const showNewGroupModal = ref(false);
const showTransactionFormModal = ref(false);

const selectedAccount = ref<any>(null);
const selectedTransaction = ref<any>(null);

const accountGroups = computed(() => accountStore.accountGroups);
const totalBalance = computed(() => accountStore.totalBalance);

const selectedTransactionType = ref("");
const selectedReconciledFilter = ref("");
const selectedTagId = ref("");
const selectedCategoryId = ref("");
const searchQuery = ref("");
const dateRange = ref({
  start: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split("T")[0],
  end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
    .toISOString()
    .split("T")[0],
});

onMounted(() => {
  const savedTag = localStorage.getItem("accountsView_selectedTagId");
  if (savedTag !== null) selectedTagId.value = savedTag;
  const savedCat = localStorage.getItem("accountsView_selectedCategoryId");
  if (savedCat !== null) selectedCategoryId.value = savedCat;
  if (!selectedAccount.value && accountStore.activeAccounts.length > 0) {
    selectedAccount.value = accountStore.activeAccounts[0];
    debugLog(
      "[AccountView] onMounted: Selected account set",
      selectedAccount.value
    );
  }
});
watch(selectedTagId, (newVal) => {
  localStorage.setItem("accountsView_selectedTagId", newVal);
});
watch(selectedCategoryId, (newVal) => {
  localStorage.setItem("accountsView_selectedCategoryId", newVal);
});

// Filterung der Transaktionen: Zeige ACCOUNTTRANSFER, EXPENSE und INCOME
const filteredTransactions = computed(() => {
  if (!selectedAccount.value) return [];

  const accountId = selectedAccount.value.id;
  const start = dateRange.value.start;
  const end = dateRange.value.end;

  let txs = transactionStore.transactions.filter((tx) => {
    // Nur Transaktionen, bei denen das eigene Konto führend ist
    if (tx.accountId !== accountId) return false;

    // Nur Datum ohne Uhrzeit vergleichen
    const txDate = tx.date.split("T")[0];
    return txDate >= start && txDate <= end;
  });

  if (selectedTransactionType.value) {
    const typeMap: Record<string, string> = {
      ausgabe: "EXPENSE",
      einnahme: "INCOME",
      transfer: "ACCOUNTTRANSFER",
    };
    const desired = typeMap[selectedTransactionType.value];
    if (desired) {
      txs = txs.filter((tx) => tx.type === desired);
    }
  }

  if (selectedReconciledFilter.value) {
    txs = txs.filter((tx) =>
      selectedReconciledFilter.value === "abgeglichen"
        ? tx.reconciled
        : !tx.reconciled
    );
  }

  if (selectedTagId.value) {
    txs = txs.filter(
      (tx) =>
        Array.isArray(tx.tagIds) && tx.tagIds.includes(selectedTagId.value)
    );
  }

  if (selectedCategoryId.value) {
    txs = txs.filter((tx) => tx.categoryId === selectedCategoryId.value);
  }

  if (searchQuery.value.trim()) {
    const lower = searchQuery.value.toLowerCase();
    const numeric = lower.replace(",", ".");
    txs = txs.filter((tx) => {
      const recipientName = tx.recipientId
        ? (
            recipientStore.getRecipientById(tx.recipientId)?.name || ""
          ).toLowerCase()
        : "";
      const categoryName = tx.categoryId
        ? (
            categoryStore.getCategoryById(tx.categoryId)?.name || ""
          ).toLowerCase()
        : "";
      const tags = Array.isArray(tx.tagIds)
        ? tx.tagIds
            .map((id) => (tagStore.getTagById(id)?.name || "").toLowerCase())
            .join(" ")
        : "";
      const formattedAmount = ("" + tx.amount)
        .replace(/\./g, "")
        .replace(/,/g, ".");
      const note = tx.note ? tx.note.toLowerCase() : "";
      return [recipientName, categoryName, tags, formattedAmount, note].some(
        (field) => field.includes(lower) || field.includes(numeric)
      );
    });
  }

  txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  debugLog("[AccountView] filteredTransactions count", txs.length);
  return txs;
});

const groupedTransactions = computed(() => {
  if (!selectedAccount.value) return [];
  const allTxs = transactionStore.getTransactionsByAccount(
    selectedAccount.value.id
  );
  const fullGrouped = groupTransactionsByDateWithRunningBalance(
    allTxs,
    selectedAccount.value
  );
  const groups = fullGrouped
    .map((group) => {
      const filtered = group.transactions.filter((tx) =>
        filteredTransactions.value.some((f) => f.id === tx.id)
      );
      return {
        date: group.date,
        runningBalance: group.runningBalance,
        transactions: filtered,
      };
    })
    .filter((group) => group.transactions.length > 0);
  debugLog("[AccountView] groupedTransactions groups", groups.length);
  return groups;
});

const clearFilters = () => {
  selectedTransactionType.value = "";
  selectedReconciledFilter.value = "";
  selectedTagId.value = "";
  selectedCategoryId.value = "";
  searchQuery.value = "";
};

const createAccount = () => {
  selectedAccount.value = null;
  showNewAccountModal.value = true;
};

const createAccountGroup = () => {
  selectedAccount.value = null;
  showNewGroupModal.value = true;
};

const onAccountSaved = async (accountData: any) => {
  if (selectedAccount.value?.id) {
    accountStore.updateAccount(selectedAccount.value.id, accountData);
  } else {
    accountStore.addAccount(accountData);
  }
  showNewAccountModal.value = false;
  selectedAccount.value = null;
  debugLog("[AccountView] onAccountSaved executed");
};

const onGroupSaved = async (groupData: any) => {
  const group = accountStore.accountGroups.find(
    (g) => g.name === groupData.name
  );
  if (group) {
    accountStore.updateAccountGroup(group.id, groupData);
  } else {
    accountStore.addAccountGroup(groupData);
  }
  showNewGroupModal.value = false;
  debugLog("[AccountView] onGroupSaved executed");
};

const onSelectAccount = (account: any) => {
  selectedAccount.value = account;
  debugLog("[AccountView] Selected account changed", account);
};

const handleDateRangeUpdate = (payload: { start: string; end: string }) => {
  dateRange.value = payload;
  debugLog("[AccountView] Date range updated", payload);
};

const createTransaction = () => {
  selectedTransaction.value = null;
  showTransactionFormModal.value = true;
};

const editTransaction = (transaction: any) => {
  debugLog("[AccountView] TransactionCard clicked", transaction);
  selectedTransaction.value = transaction;
  showTransactionFormModal.value = true;
};

const handleTransactionSave = (payload: any) => {
  if (payload.type === TransactionType.ACCOUNTTRANSFER) {
    const getAccountName = (accountId: string) => {
      const account = accountStore.activeAccounts.find(
        (a) => a.id === accountId
      );
      return account ? account.name : "";
    };
    addAccountTransfer(
      payload.fromAccountId,
      payload.toAccountId,
      payload.amount,
      payload.date,
      payload.valueDate,
      payload.note,
      transactionStore.addTransaction,
      transactionStore.updateTransaction,
      getAccountName
    );
    debugLog("[AccountView] Added ACCOUNTTRANSFER", payload);
  } else {
    const tx = {
      ...payload,
      payee: recipientStore.getRecipientById(payload.recipientId)?.name || "",
    };
    if (selectedTransaction.value) {
      transactionStore.updateTransaction(selectedTransaction.value.id, tx);
      debugLog("[AccountView] Updated transaction", tx);
    } else {
      transactionStore.addTransaction(tx);
      debugLog("[AccountView] Added transaction", tx);
    }
  }
  showTransactionFormModal.value = false;
  selectedTransaction.value = null;
};
</script>

<template>
  <div class="flex flex-col items-center">
    <div class="flex w-full">
      <!-- Linke Spalte: Kontoübersicht -->
      <div class="w-1/2 p-2">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-bold">Konten</h2>
          <div>
            <button
              class="btn btn-sm"
              @click="createAccount"
            >
              Neues Konto
            </button>
            <button
              class="btn btn-sm"
              @click="createAccountGroup"
            >
              Neue Gruppe
            </button>
          </div>
        </div>
        <div class="grid grid-cols-1 gap-2">
          <AccountGroupCard
            v-for="group in accountGroups"
            :key="group.id"
            :group="group"
            :activeAccountId="selectedAccount ? selectedAccount.id : ''"
            @selectAccount="onSelectAccount"
          />
        </div>
      </div>
      <!-- Rechte Spalte: Transaktionen des ausgewählten Kontos -->
      <div class="w-1/2 p-2">
        <div
          class="rounded-md bg-base-200/50 backdrop-blur-lg mb-6 flex justify-end p-2 items-center"
        >
          <SearchGroup
            btnRight="Neue Transaktion"
            btnRightIcon="mdi:plus"
            @search="(query) => (searchQuery = query)"
            @btn-right-click="createTransaction"
          />
        </div>
        <div>
          <div
            v-for="(group, index) in groupedTransactions"
            :key="index"
            class="mb-4"
          >
            <div class="divider">
              <div class="flex justify-start items-center">
                <Icon
                  icon="mdi:calendar-import"
                  class="mx-2 text-sm opacity-50"
                />
                <div class="text-xs font-normal">
                  {{ formatDate(group.date) }}
                </div>
              </div>
              <Icon
                icon="mdi:square-medium"
                class="text-base opacity-40"
              />
              <div class="flex justify-end items-center">
                <Icon
                  icon="mdi:scale-balance"
                  class="mr-2 opacity-50 text-sm"
                />
                <CurrencyDisplay
                  class="text-xs"
                  :amount="group.runningBalance"
                  :show-zero="true"
                  :asInteger="true"
                />
              </div>
            </div>
            <div class="grid grid-cols-1 gap-1">
              <div
                v-for="transaction in group.transactions"
                :key="transaction.id"
                @click="editTransaction(transaction)"
                class="cursor-pointer"
              >
                <TransactionCard
                  :transaction="transaction"
                  clickable
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- Modale -->
    <Teleport to="body">
      <div
        v-if="showNewAccountModal"
        class="modal modal-open"
      >
        <div class="modal-box max-w-2xl">
          <h3 class="font-bold text-lg mb-4">Neues Konto erstellen</h3>
          <AccountForm
            @save="onAccountSaved"
            @cancel="showNewAccountModal = false"
          />
        </div>
        <div
          class="modal-backdrop"
          @click="showNewAccountModal = false"
        ></div>
      </div>
    </Teleport>
    <Teleport to="body">
      <div
        v-if="showNewGroupModal"
        class="modal modal-open"
      >
        <div class="modal-box max-w-2xl">
          <h3 class="font-bold text-lg mb-4">Neue Kontogruppe erstellen</h3>
          <AccountGroupForm
            @save="onGroupSaved"
            @cancel="showNewGroupModal = false"
          />
        </div>
        <div
          class="modal-backdrop"
          @click="showNewGroupModal = false"
        ></div>
      </div>
    </Teleport>
    <Teleport to="body">
      <div
        v-if="showTransactionFormModal"
        class="modal modal-open"
      >
        <div class="modal-box overflow-visible max-w-2xl">
          <TransactionForm
            :transaction="selectedTransaction"
            @cancel="showTransactionFormModal = false"
            @save="handleTransactionSave"
          />
        </div>
        <div
          class="modal-backdrop"
          @click="showTransactionFormModal = false"
        ></div>
      </div>
    </Teleport>
  </div>
</template>
