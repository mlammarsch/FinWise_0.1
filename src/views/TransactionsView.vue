<script setup lang="ts">
import { ref, computed } from "vue";
import { useTransactionStore } from "../stores/transactionStore";
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

/**
 * Pfad zur Komponente: src/views/TransactionsView.vue
 * Verwaltung und Anzeige der Transaktionen mit Suchfunktion und Paginierung.
 *
 * Komponenten-Props:
 * - Keine Props vorhanden
 *
 * Emits:
 * - Keine Emits vorhanden
 */

// Stores
const transactionStore = useTransactionStore();
const categoryStore = useCategoryStore();
const tagStore = useTagStore();
const recipientStore = useRecipientStore();

// Modals
const showNewTransactionModal = ref(false);
const showTransactionDetailModal = ref(false);
const showEditTransactionModal = ref(false);

// State
const selectedTransaction = ref<Transaction | null>(null);
const searchQuery = ref("");
const currentPage = ref(1);
const itemsPerPage = ref(20);
const itemsPerPageOptions = [10, 20, 50, 100, "All"];

/**
 * **Optimierte Suche mit Paginierung**:
 * - Berücksichtigt verknüpfte Daten (Category, Tags, Recipient).
 * - Beträge sind mit Punkt und Komma durchsuchbar.
 */
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

    return (
      transaction.note?.toLowerCase().includes(searchLower) ||
      categoryName.toLowerCase().includes(searchLower) ||
      recipientName.toLowerCase().includes(searchLower) ||
      formattedAmount.includes(searchNumeric) ||
      transaction.account?.toLowerCase().includes(searchLower) ||
      tagNames.toLowerCase().includes(searchLower)
    );
  });
});

// **Paginierte Transaktionen**
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

  const pages = [1];
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

// **Transaktion anzeigen**
const viewTransaction = (transaction: Transaction) => {
  selectedTransaction.value = transaction;
  showTransactionDetailModal.value = true;
};

// **Transaktion bearbeiten**
const editTransaction = (transaction: Transaction) => {
  selectedTransaction.value = transaction;
  showEditTransactionModal.value = true;
  showTransactionDetailModal.value = false;
};

// **Neue Transaktion erstellen**
const createTransaction = () => {
  selectedTransaction.value = null;
  showNewTransactionModal.value = true;
};

// **Transaktion löschen**
const deleteTransaction = (transaction: Transaction) => {
  if (confirm("Möchten Sie diese Transaktion wirklich löschen?")) {
    transactionStore.deleteTransaction(transaction.id);
    showTransactionDetailModal.value = false;
  }
};
</script>

<template>
  <div class="space-y-6">
    <!-- Header mit Suche und Button -->
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-xl font-bold">Transaktionen</h2>
      <SearchGroup
        btnRight="Neue Transaktion"
        btnRightIcon="mdi:plus"
        @search="(query) => (searchQuery = query)"
        @btn-right-click="createTransaction"
      />
    </div>

    <!-- Transaktionsliste -->
    <div class="card bg-base-100 shadow">
      <div class="card-body">
        <TransactionList
          :transactions="paginatedTransactions"
          :show-account="true"
          @view="viewTransaction"
          @edit="editTransaction"
          @delete="deleteTransaction"
        />

        <!-- Paginierung -->
        <div class="divider"></div>

        <div class="flex justify-between items-center">
          <!-- Dropdown für Anzahl der Einträge pro Seite -->
          <select
            class="select select-bordered select-sm w-20"
            @change="(e) => changeItemsPerPage((e.target as HTMLSelectElement).value === 'All' ? 'All' : parseInt((e.target as HTMLSelectElement).value))"
          >
            <option
              v-for="option in itemsPerPageOptions"
              :key="option"
              :value="option"
            >
              {{ option }}
            </option>
          </select>

          <!-- Paginierungsbuttons -->
          <div class="join">
            <button
              class="join-item btn btn-sm rounded-l-full border border-base-300"
              :disabled="currentPage === 1"
              @click="changePage(currentPage - 1)"
            >
              <Icon icon="mdi:chevron-left" class="text-base" />
            </button>
            <button
              v-for="page in getPageNumbers"
              :key="page"
              class="join-item btn btn-sm border border-base-300"
              :class="{
                'btn-disabled': page === '...',
                'btn-primary': page === currentPage,
              }"
              @click="changePage(page)"
            >
              {{ page }}
            </button>
            <button
              class="join-item btn btn-sm rounded-r-full border border-base-300"
              :disabled="currentPage === totalPages"
              @click="changePage(currentPage + 1)"
            >
              <Icon icon="mdi:chevron-right" class="text-base" />
            </button>
          </div>

          <!-- Seitenanzeige -->
          <span class="text-sm"
            >Seite {{ currentPage }} von {{ totalPages }}</span
          >
        </div>
      </div>
    </div>
  </div>
</template>
