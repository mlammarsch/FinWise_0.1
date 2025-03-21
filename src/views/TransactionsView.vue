<script setup lang="ts">
import { ref, computed } from "vue";
import { useTransactionStore } from "../stores/transactionStore";
import { useAccountStore } from "../stores/accountStore"; // hinzugefügt
import { useCategoryStore } from "../stores/categoryStore";
import { useTagStore } from "../stores/tagStore";
import { useRecipientStore } from "../stores/recipientStore";
import TransactionList from "../components/transaction/TransactionList.vue";
import TransactionDetailModal from "../components/transaction/TransactionDetailModal.vue";
import TransactionForm from "../components/transaction/TransactionForm.vue";
import { Transaction } from "../types";
import SearchGroup from "../components/ui/SearchGroup.vue";
import { formatCurrency } from "../utils/formatters";
import { Icon } from "@iconify/vue";

// Stores
const transactionStore = useTransactionStore();
const accountStore = useAccountStore(); // neu verwendet
const categoryStore = useCategoryStore();
const tagStore = useTagStore();
const recipientStore = useRecipientStore();

// Modals
const showTransactionFormModal = ref(false);
const showTransactionDetailModal = ref(false);

// State
const selectedTransaction = ref<Transaction | null>(null);
const searchQuery = ref("");
const currentPage = ref(1);
const itemsPerPage = ref(20);
const itemsPerPageOptions = [10, 20, 50, 100, "All"];

// Filter und Pagination
const filteredTransactions = computed(() => {
  if (!searchQuery.value.trim()) return transactionStore.transactions;

  const searchLower = searchQuery.value.toLowerCase();
  const searchNumeric = searchLower.replace(/,/g, ".");

  return transactionStore.transactions.filter((transaction) => {
    const categoryName =
      categoryStore.getCategoryById(transaction.categoryId)?.name || "";
    const recipientName =
      recipientStore.getRecipientById(transaction.recipientId)?.name || "";
    const tagNames = transaction.tagIds
      .map((tagId) => tagStore.getTagById(tagId)?.name || "")
      .join(" ");
    const formattedAmount = formatCurrency(transaction.amount)
      .replace(/\./g, "")
      .replace(/,/g, ".");
    const accountName =
      accountStore.getAccountById(transaction.accountId)?.name || "";
    const toAccountName = transaction.transferToAccountId
      ? accountStore.getAccountById(transaction.transferToAccountId)?.name || ""
      : "";

    return (
      (transaction.note || "").toLowerCase().includes(searchLower) ||
      categoryName.toLowerCase().includes(searchLower) ||
      recipientName.toLowerCase().includes(searchLower) ||
      tagNames.toLowerCase().includes(searchLower) ||
      formattedAmount.includes(searchNumeric) ||
      accountName.toLowerCase().includes(searchLower) ||
      toAccountName.toLowerCase().includes(searchLower)
    );
  });
});

const paginatedTransactions = computed(() => {
  if (itemsPerPage.value === "All") return filteredTransactions.value;
  const start = (currentPage.value - 1) * itemsPerPage.value;
  return filteredTransactions.value.slice(start, start + itemsPerPage.value);
});

const totalPages = computed(() =>
  itemsPerPage.value === "All"
    ? 1
    : Math.ceil(filteredTransactions.value.length / itemsPerPage.value)
);

const getPageNumbers = computed(() => {
  if (totalPages.value <= 5) {
    return Array.from({ length: totalPages.value }, (_, i) => i + 1);
  }

  const pages: (number | string)[] = [1];
  if (currentPage.value > 3) pages.push("...");
  if (currentPage.value > 2) pages.push(currentPage.value - 1);
  pages.push(currentPage.value);
  if (currentPage.value < totalPages.value - 1)
    pages.push(currentPage.value + 1);
  if (currentPage.value < totalPages.value - 2) pages.push("...");
  pages.push(totalPages.value);

  return pages;
});

const changePage = (page: number | "...") => {
  if (page !== "...") currentPage.value = page;
};

const changeItemsPerPage = (value: number | "All") => {
  itemsPerPage.value = value;
  currentPage.value = 1;
};

// Anzeigen, Bearbeiten, Erstellen
const viewTransaction = (transaction: Transaction) => {
  selectedTransaction.value = transaction;
  showTransactionDetailModal.value = true;
};

const editTransaction = (transaction: Transaction) => {
  selectedTransaction.value = transaction;
  showTransactionFormModal.value = true;
  showTransactionDetailModal.value = false;
};

const createTransaction = () => {
  selectedTransaction.value = null;
  showTransactionFormModal.value = true;
};

// Speichern von Transaktionen (neu oder bearbeiten)
const handleSave = (payload: any) => {
  if (payload.type === "TRANSFER") {
    if (
      selectedTransaction.value &&
      selectedTransaction.value.counterTransactionId
    ) {
      transactionStore.updateTransferTransaction(selectedTransaction.value.id, {
        fromAccountId: payload.fromAccountId,
        toAccountId: payload.toAccountId,
        amount: payload.amount,
        date: payload.date,
        valueDate: payload.valueDate,
        note: payload.note,
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
      ...payload.transaction,
      type: payload.type,
      payee:
        recipientStore.getRecipientById(payload.transaction.recipientId)
          ?.name || "",
      counterTransactionId: null,
      planningTransactionId: null,
      isReconciliation: false,
      runningBalance: 0,
    };

    if (selectedTransaction.value) {
      transactionStore.updateTransaction(selectedTransaction.value.id, tx);
    } else {
      transactionStore.addTransaction(tx);
    }
  }

  showTransactionFormModal.value = false;
  selectedTransaction.value = null;
};

// Löschen
const deleteTransaction = (transaction: Transaction) => {
  if (confirm("Möchten Sie diese Transaktion wirklich löschen?")) {
    transactionStore.deleteTransaction(transaction.id);
    showTransactionDetailModal.value = false;
  }
};
</script>

<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-xl font-bold">Transaktionen</h2>
      <SearchGroup
        btnRight="Neue Transaktion"
        btnRightIcon="mdi:plus"
        @search="(query) => (searchQuery = query)"
        @btn-right-click="createTransaction"
      />
    </div>

    <div class="card bg-base-100 shadow-md border border-base-300 shadow">
      <div class="card-body">
        <TransactionList
          :transactions="paginatedTransactions"
          :show-account="true"
          @edit="editTransaction"
          @delete="deleteTransaction"
        />

        <div class="divider"></div>

        <div class="flex justify-between items-center">
          <select
            class="select select-bordered select-sm w-20"
            @change="(e) =>
              changeItemsPerPage(
                (e.target as HTMLSelectElement).value === 'All'
                  ? 'All'
                  : parseInt((e.target as HTMLSelectElement).value)
              )"
          >
            <option
              v-for="option in itemsPerPageOptions"
              :key="option"
              :value="option"
            >
              {{ option }}
            </option>
          </select>
        </div>
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
      <div
        v-if="showTransactionFormModal"
        class="modal modal-open"
      >
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
