<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useAccountStore } from "../stores/accountStore";
import { useTagStore } from "../stores/tagStore";
import { useCategoryStore } from "../stores/categoryStore";
import { useRecipientStore } from "../stores/recipientStore";
import AccountCard from "../components/account/AccountCard.vue";
import AccountGroupCard from "../components/account/AccountGroupCard.vue";
import AccountForm from "../components/account/AccountForm.vue";
import AccountGroupForm from "../components/account/AccountGroupForm.vue";
import CurrencyDisplay from "../components/ui/CurrencyDisplay.vue";
import TransactionCard from "../components/transaction/TransactionCard.vue";
import TransactionForm from "../components/transaction/TransactionForm.vue";
import MonthSelector from "../components/ui/MonthSelector.vue";
import SearchGroup from "../components/ui/SearchGroup.vue";
import SearchableSelectLite from "../components/ui/SearchableSelectLite.vue";
import { formatCurrency, formatDate } from "../utils/formatters";
import { groupTransactionsByDateWithBalance } from "../utils/calculation";
import { useTransactionStore } from "../stores/transactionStore";

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

const accountsByGroup = computed(() => accountStore.accountsByGroup);
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
  }
});
watch(selectedTagId, (newVal) => {
  localStorage.setItem("accountsView_selectedTagId", newVal);
});
watch(selectedCategoryId, (newVal) => {
  localStorage.setItem("accountsView_selectedCategoryId", newVal);
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
};

const onGroupSaved = async (groupData: any) => {
  const group = accountGroups.value.find((g) => g.name === groupData.name);
  if (group) {
    accountStore.updateAccountGroup(group.id, groupData);
  } else {
    accountStore.addAccountGroup(groupData);
  }
  showNewGroupModal.value = false;
};

const onSelectAccount = (account: any) => {
  selectedAccount.value = account;
};

const handleDateRangeUpdate = (payload: { start: string; end: string }) => {
  dateRange.value = payload;
};

const filteredTransactions = computed(() => {
  if (!selectedAccount.value) return [];
  let txs = accountStore.getTransactionByAccountId(selectedAccount.value.id);
  if (selectedTransactionType.value) {
    const typeMap: Record<string, string> = {
      ausgabe: "EXPENSE",
      einnahme: "INCOME",
      transfer: "TRANSFER",
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
  if (dateRange.value.start && dateRange.value.end) {
    const startTime = new Date(dateRange.value.start).getTime();
    const endTime = new Date(dateRange.value.end).getTime();
    txs = txs.filter((tx) => {
      const txTime = new Date(tx.date).getTime();
      return txTime >= startTime && txTime <= endTime;
    });
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
      const formattedAmount = formatCurrency(tx.amount)
        .replace(/\./g, "")
        .replace(/,/g, ".");
      const note = tx.note ? tx.note.toLowerCase() : "";
      return [recipientName, categoryName, tags, formattedAmount, note].some(
        (field) => field.includes(lower) || field.includes(numeric)
      );
    });
  }
  txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return txs;
});

const groupedTransactions = computed(() => {
  if (!selectedAccount.value) return [];
  const allTxs = accountStore.getTransactionByAccountId(
    selectedAccount.value.id
  );
  const fullGrouped = groupTransactionsByDateWithBalance(
    allTxs,
    selectedAccount.value
  );
  return fullGrouped
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
});

const createTransaction = () => {
  selectedTransaction.value = null;
  showTransactionFormModal.value = true;
};

const editTransaction = (transaction: any) => {
  selectedTransaction.value = transaction;
  showTransactionFormModal.value = true;
};

const handleTransactionSave = (payload: any) => {
  if (selectedTransaction.value && selectedTransaction.value.id) {
    transactionStore.updateTransaction(selectedTransaction.value.id, payload);
  } else {
    transactionStore.addTransaction(payload);
  }
  showTransactionFormModal.value = false;
  selectedTransaction.value = null;
};
</script>


<template>
  <div class="flex flex-col items-center">
    <!-- Steuerungsleiste mit Filterelementen -->
    <div
      id="FilterCard"
      class="rounded-md border border-base-300 backdrop-blur-lg p-2 w-full max-w-5xl mb-3 z-10"
    >
      <div class="flex flex-wrap items-center justify-between gap-1">
        <div class="flex flex-wrap">
          <fieldset class="fieldset pt-0">
            <legend class="fieldset-legend text-center opacity-50">
              Monatswahl
            </legend>
            <MonthSelector
              @update-daterange="handleDateRangeUpdate"
              class="mx-2"
            />
          </fieldset>
          <fieldset class="fieldset pt-0">
            <legend class="fieldset-legend text-center opacity-50">
              Transaktion
            </legend>
            <select
              v-model="selectedTransactionType"
              class="select select-sm select-bordered w-38 mx-2 rounded-full"
              :class="
                selectedTransactionType
                  ? 'border-2 border-accent'
                  : 'border border-base-300'
              "
            >
              <option value="">Alle Typen</option>
              <option value="ausgabe">Ausgabe</option>
              <option value="einnahme">Einnahme</option>
              <option value="transfer">Transfer</option>
            </select>
          </fieldset>
          <fieldset class="fieldset pt-0">
            <legend class="fieldset-legend text-center opacity-50">
              Abgeglichen
            </legend>
            <select
              v-model="selectedReconciledFilter"
              class="select select-sm select-bordered w-38 mx-2 rounded-full"
              :class="
                selectedReconciledFilter
                  ? 'border-2 border-accent'
                  : 'border border-base-300'
              "
            >
              <option value="">Alle</option>
              <option value="abgeglichen">Abgeglichen</option>
              <option value="nicht abgeglichen">Nicht abgeglichen</option>
            </select>
          </fieldset>
          <div class="w-38">
            <fieldset class="fieldset pt-0">
              <legend class="fieldset-legend text-center opacity-50">
                Tags
              </legend>
              <SearchableSelectLite
                v-model="selectedTagId"
                :options="tagStore.tags"
                item-text="name"
                item-value="id"
                placeholder="Alle Tags"
              />
            </fieldset>
          </div>
          <div class="w-38">
            <fieldset class="fieldset pt-0">
              <legend class="fieldset-legend text-center opacity-50">
                Kategorien
              </legend>
              <SearchableSelectLite
                v-model="selectedCategoryId"
                :options="categoryStore.categories"
                item-text="name"
                item-value="id"
                placeholder="Alle Kategorien"
                class="w-38 mx-2 rounded-full"
              />
            </fieldset>
          </div>
          <button
            class="btn btn-sm btn-ghost btn-circle self-end ml-4 mb-4"
            @click="clearFilters"
          >
            <Icon icon="mdi:filter-off" class="text-xl" />
          </button>
        </div>
      </div>
    </div>

    <div class="flex gap-4 justify-center w-full max-w-5xl">
      <div class="w-full md:w-1/2 max-w-2xl">
        <!-- Row für Gesamtsaldo und Buttons -->
        <div class="rounded-md bg-base-200/50 backdrop-blur-lg p-2 mb-6">
          <div class="flex justify-between items-center">
            <div class="join">
              <button
                class="btn join-item rounded-l-full btn-sm btn-soft border border-base-300"
                @click="createAccountGroup"
              >
                <Icon icon="mdi:folder-plus" class="mr-2" />
                Neue Gruppe
              </button>
              <button
                class="btn join-item rounded-r-full btn-sm btn-soft border border-base-300"
                @click="createAccount"
              >
                <Icon icon="mdi:plus" class="mr-2" />
                Neues Konto
              </button>
            </div>
            <div class="flex items-center gap-2 text-base text-right">
              <div class="opacity-50">Gesamtsaldo:</div>
              <CurrencyDisplay
                class="text-base"
                :amount="totalBalance"
                :show-zero="true"
                :asInteger="true"
              />
              <Icon
                icon="mdi:scale-balance"
                class="text-secondary ml-0 mr-5 opacity-50"
              />
            </div>
          </div>
        </div>

        <div v-for="group in accountGroups" :key="group.id" class="mb-8">
          <div class="mb-4">
            <AccountGroupCard
              :group="group"
              :activeAccountId="selectedAccount ? selectedAccount.id : ''"
              @selectAccount="onSelectAccount"
            />
          </div>
        </div>
      </div>

      <!-- Such- und gefilterte Transaktionsliste -->
      <div class="flex flex-col w-1/2">
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

        <!-- Gefilterte Transaktionsliste gruppiert nach Datum -->
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
              <Icon icon="mdi:square-medium" class="text-base opacity-40" />
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
                <TransactionCard :transaction="transaction" clickable />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Neues Konto Modal -->
    <Teleport to="body">
      <div v-if="showNewAccountModal" class="modal modal-open">
        <div class="modal-box max-w-2xl">
          <h3 class="font-bold text-lg mb-4">Neues Konto erstellen</h3>
          <AccountForm
            @save="onAccountSaved"
            @cancel="showNewAccountModal = false"
          />
        </div>
        <div class="modal-backdrop" @click="showNewAccountModal = false"></div>
      </div>
    </Teleport>

    <!-- Neue Gruppe Modal -->
    <Teleport to="body">
      <div v-if="showNewGroupModal" class="modal modal-open">
        <div class="modal-box max-w-2xl">
          <h3 class="font-bold text-lg mb-4">Neue Kontogruppe erstellen</h3>
          <AccountGroupForm
            @save="onGroupSaved"
            @cancel="showNewGroupModal = false"
          />
        </div>
        <div class="modal-backdrop" @click="showNewGroupModal = false"></div>
      </div>
    </Teleport>

    <!-- Transaktionsformular Modal -->
    <Teleport to="body">
      <div v-if="showTransactionFormModal" class="modal modal-open">
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
