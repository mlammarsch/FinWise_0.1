<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useTransactionStore } from "../stores/transactionStore";
import { useAccountStore } from "../stores/accountStore";
import { useCategoryStore } from "../stores/categoryStore";
import { useTagStore } from "../stores/tagStore";
import { useRecipientStore } from "../stores/recipientStore";
import TransactionList from "../components/transaction/TransactionList.vue";
import TransactionDetailModal from "../components/transaction/TransactionDetailModal.vue";
import TransactionForm from "../components/transaction/TransactionForm.vue";
import PagingComponent from "../components/ui/PagingComponent.vue";
import MonthSelector from "../components/ui/MonthSelector.vue";
import SearchGroup from "../components/ui/SearchGroup.vue";
import SearchableSelectLite from "../components/ui/SearchableSelectLite.vue";
import { Transaction, TransactionType } from "../types";
import { formatCurrency } from "../utils/formatters";

const refreshKey = ref(0);

// Stores
const transactionStore = useTransactionStore();
const accountStore = useAccountStore();
const categoryStore = useCategoryStore();
const tagStore = useTagStore();
const recipientStore = useRecipientStore();

// Modals
const showTransactionFormModal = ref(false);
const showTransactionDetailModal = ref(false);
const transactionListRef = ref<InstanceType<typeof TransactionList> | null>(
  null
);

// Filter- und UI-Status
const selectedTransaction = ref<Transaction | null>(null);
const selectedAccountId = ref("");
const selectedTransactionType = ref("");
const selectedReconciledFilter = ref("");
const selectedTagId = ref("");
const selectedCategoryId = ref("");
const searchQuery = ref("");
const currentPage = ref(1);
const itemsPerPage = ref(25);
const itemsPerPageOptions = [10, 20, 25, 50, 100, "all"];

const dateRange = ref<{ start: string; end: string }>({
  start: new Date().toISOString().split("T")[0],
  end: new Date().toISOString().split("T")[0],
});
function handleDateRangeUpdate(payload: { start: string; end: string }) {
  dateRange.value = payload;
  refreshKey.value++;
}

// Sortierung
const sortKey = ref<keyof Transaction | "">("date");
const sortOrder = ref<"asc" | "desc">("desc");
function sortBy(key: keyof Transaction) {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === "asc" ? "desc" : "asc";
  } else {
    sortKey.value = key;
    sortOrder.value = "asc";
  }
  currentPage.value = 1;
}
function handleSortChange(key: keyof Transaction) {
  sortBy(key);
}

// Filterung
const filteredTransactions = computed(() => {
  refreshKey.value;
  let txs = transactionStore.transactions;
  if (selectedTransactionType.value) {
    const typeMap: Record<string, TransactionType> = {
      ausgabe: TransactionType.EXPENSE,
      einnahme: TransactionType.INCOME,
      transfer: TransactionType.TRANSFER,
    };
    const desired = typeMap[selectedTransactionType.value];
    if (desired) txs = txs.filter((tx) => tx.type === desired);
  }
  if (selectedAccountId.value) {
    txs = txs.filter((tx) => tx.accountId === selectedAccountId.value);
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
  const start = new Date(dateRange.value.start).getTime();
  const end = new Date(dateRange.value.end).getTime();
  txs = txs.filter((tx) => {
    const txDate = new Date(tx.date).getTime();
    return txDate >= start && txDate <= end;
  });
  if (!searchQuery.value.trim()) return txs;
  const lower = searchQuery.value.toLowerCase();
  const numeric = lower.replace(",", ".");
  return txs.filter((tx) => {
    const categoryName = tx.categoryId
      ? categoryStore.getCategoryById(tx.categoryId)?.name?.toLowerCase() || ""
      : "";
    const recipientName = tx.recipientId
      ? recipientStore.getRecipientById(tx.recipientId)?.name?.toLowerCase() ||
        ""
      : "";
    const tags = Array.isArray(tx.tagIds)
      ? tx.tagIds
          .map((id) => tagStore.getTagById(id)?.name?.toLowerCase() || "")
          .join(" ")
      : "";
    const accountName =
      accountStore.getAccountById(tx.accountId)?.name.toLowerCase() || "";
    const toAccountName =
      tx.type === TransactionType.TRANSFER
        ? accountStore
            .getAccountById(tx.transferToAccountId)
            ?.name.toLowerCase() || ""
        : "";
    const payee = tx.payee?.toLowerCase() || "";
    const formattedAmount = formatCurrency(tx.amount)
      .replace(/\./g, "")
      .replace(/,/g, ".");
    const note = tx.note?.toLowerCase() || "";
    return [
      categoryName,
      recipientName,
      tags,
      accountName,
      toAccountName,
      payee,
      formattedAmount,
      note,
    ].some((field) => field.includes(lower) || field.includes(numeric));
  });
});
const sortedTransactions = computed(() => {
  const list = [...filteredTransactions.value];
  if (sortKey.value) {
    list.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortKey.value) {
        case "accountId":
          aVal = accountStore.getAccountById(a.accountId)?.name || "";
          bVal = accountStore.getAccountById(b.accountId)?.name || "";
          break;
        case "recipientId":
          aVal =
            a.type === "TRANSFER"
              ? accountStore.getAccountById(a.transferToAccountId)?.name || ""
              : recipientStore.getRecipientById(a.recipientId)?.name || "";
          bVal =
            b.type === "TRANSFER"
              ? accountStore.getAccountById(b.transferToAccountId)?.name || ""
              : recipientStore.getRecipientById(b.recipientId)?.name || "";
          break;
        case "categoryId":
          aVal = categoryStore.getCategoryById(a.categoryId)?.name || "";
          bVal = categoryStore.getCategoryById(b.categoryId)?.name || "";
          break;
        case "reconciled":
          aVal = a.reconciled ? 1 : 0;
          bVal = b.reconciled ? 1 : 0;
          break;
        case "amount":
          aVal = a.amount;
          bVal = b.amount;
          break;
        case "date":
          aVal = new Date(a.date).getTime();
          bVal = new Date(b.date).getTime();
          break;
        default:
          aVal = a[sortKey.value];
          bVal = b[sortKey.value];
      }
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortOrder.value === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortOrder.value === "asc" ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });
  }
  return list;
});
const paginatedTransactions = computed(() => {
  if (itemsPerPage.value === "all") return sortedTransactions.value;
  const start = (currentPage.value - 1) * Number(itemsPerPage.value);
  return sortedTransactions.value.slice(
    start,
    start + Number(itemsPerPage.value)
  );
});

const viewTransaction = (tx: Transaction) => {
  selectedTransaction.value = tx;
  showTransactionDetailModal.value = true;
};

const editTransaction = (tx: Transaction) => {
  selectedTransaction.value = tx;
  showTransactionFormModal.value = true;
  showTransactionDetailModal.value = false;
};

const createTransaction = () => {
  selectedTransaction.value = null;
  showTransactionFormModal.value = true;
};

const handleSave = (payload: any) => {
  if (payload.type === TransactionType.TRANSFER) {
    if (selectedTransaction.value?.counterTransactionId) {
      transactionStore.updateTransferTransaction(selectedTransaction.value.id, {
        fromAccountId: payload.fromAccountId,
        toAccountId: payload.toAccountId,
        amount: payload.amount,
        date: payload.date,
        valueDate: payload.valueDate,
        note: payload.note,
        reconciled: payload.reconciled,
      });
    } else {
      transactionStore.addTransferTransaction(
        payload.fromAccountId,
        payload.toAccountId,
        payload.amount,
        payload.date,
        payload.valueDate,
        payload.note
      );
    }
  } else {
    const tx = {
      ...payload,
      payee: recipientStore.getRecipientById(payload.recipientId)?.name || "",
    };
    if (selectedTransaction.value) {
      transactionStore.updateTransaction(selectedTransaction.value.id, tx);
    } else {
      transactionStore.addTransaction(tx);
    }
  }
  showTransactionFormModal.value = false;
  selectedTransaction.value = null;
  refreshKey.value++;
};

const deleteTransaction = (tx: Transaction) => {
  if (confirm("Möchten Sie diese Transaktion wirklich löschen?")) {
    transactionStore.deleteTransaction(tx.id);
    showTransactionDetailModal.value = false;
  }
};

const clearFilters = () => {
  selectedAccountId.value = "";
  selectedTransactionType.value = "";
  selectedReconciledFilter.value = "";
  selectedTagId.value = "";
  selectedCategoryId.value = "";
  searchQuery.value = "";
};

// Filter-Persistenz laden
onMounted(() => {
  const savedTag = localStorage.getItem("transactionsView_selectedTagId");
  if (savedTag !== null) selectedTagId.value = savedTag;
  const savedCat = localStorage.getItem("transactionsView_selectedCategoryId");
  if (savedCat !== null) selectedCategoryId.value = savedCat;
});
watch(selectedTagId, (newVal) => {
  localStorage.setItem("transactionsView_selectedTagId", newVal);
});
watch(selectedCategoryId, (newVal) => {
  localStorage.setItem("transactionsView_selectedCategoryId", newVal);
});
</script>

<template>
  <div class="space-y-6">
    <!-- Filterleiste -->
    <div class="flex flex-wrap items-center justify-between gap-1">
      <div
        class="card w-2/3 bg-base-100 shadow-md flex flex-wrap items-center justify-between"
      >
        <div
          class="rounded-lg glass-effect backdrop-blur-lg pb-1 flex flex-wrap items-center justify-start mx-2 gap-2"
        >
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
              Konto
            </legend>
            <select
              v-model="selectedAccountId"
              class="select select-sm select-bordered rounded-full"
              :class="
                selectedAccountId
                  ? 'border-2 border-accent'
                  : 'border border-base-300'
              "
            >
              <option value="">Alle Konten</option>
              <option
                v-for="acc in accountStore.activeAccounts"
                :key="acc.id"
                :value="acc.id"
              >
                {{ acc.name }}
              </option>
            </select>
          </fieldset>
          <fieldset class="fieldset pt-0">
            <legend class="fieldset-legend text-center opacity-50">
              Transaktion
            </legend>
            <select
              v-model="selectedTransactionType"
              class="select select-sm select-bordered rounded-full"
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
              class="select select-sm select-bordered rounded-full"
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
              class=""
            />
          </fieldset>
          <fieldset class="fieldset pt-0">
            <legend class="fieldset-legend text-center opacity-50">Tags</legend>
            <SearchableSelectLite
              v-model="selectedTagId"
              :options="tagStore.tags"
              item-text="name"
              item-value="id"
              placeholder="Alle Tags"
              class=""
            />
          </fieldset>
          <button
            class="btn btn-sm btn-ghost btn-circle self-end pb-2"
            @click="clearFilters"
          >
            <Icon icon="mdi:filter-off" class="text-xl" />
          </button>
        </div>
      </div>
      <SearchGroup
        btnRight="Neue Transaktion"
        btnRightIcon="mdi:plus"
        @search="(query) => (searchQuery = query)"
        @btn-right-click="createTransaction"
      />
    </div>
    <!-- Transaktionsliste Card -->
    <div class="card bg-base-100 shadow-md border border-base-300">
      <div
        class="dropdown dropdown-start dropdown-hover"
        style="position: absolute; top: 1.7rem; left: 0.1rem; margin: 0rem"
      >
        <label class="btn btn-ghost btn-md btn-circle">⋮</label>
        <ul
          class="dropdown-content menu p-2 shadow bg-base-100 border border-base-300 rounded-box w-52"
        >
          <li>
            <a
              class="text-error"
              @click="
                transactionListRef.value?.getSelectedTransactions() &&
                  handleBatchDeleteFromList
              "
            >
              Batch Delete
            </a>
          </li>
        </ul>
      </div>
      <div class="card-body">
        <TransactionList
          ref="transactionListRef"
          :transactions="paginatedTransactions"
          :show-account="true"
          :sort-key="sortKey"
          :sort-order="sortOrder"
          @sort-change="handleSortChange"
          @edit="editTransaction"
          @delete="deleteTransaction"
          @toggleReconciliation="
            (tx, val) =>
              transactionStore.updateTransaction(tx.id, { reconciled: val })
          "
        />
        <PagingComponent
          v-model:currentPage="currentPage"
          v-model:itemsPerPage="itemsPerPage"
          :totalPages="
            itemsPerPage === 'all'
              ? 1
              : Math.ceil(sortedTransactions.length / Number(itemsPerPage))
          "
          :itemsPerPageOptions="itemsPerPageOptions"
        />
      </div>
    </div>
    <!-- Detail-Modal -->
    <Teleport to="body">
      <TransactionDetailModal
        v-if="showTransactionDetailModal"
        :transaction="selectedTransaction"
        @close="showTransactionDetailModal = false"
      />
    </Teleport>
    <!-- Formular-Modal -->
    <Teleport to="body">
      <div v-if="showTransactionFormModal" class="modal modal-open">
        <div class="modal-box w-full max-w-2xl">
          <TransactionForm
            :transaction="selectedTransaction"
            @cancel="showTransactionFormModal = false"
            @save="handleSave"
          />
        </div>
      </div>
    </Teleport>
  </div>
</template>
