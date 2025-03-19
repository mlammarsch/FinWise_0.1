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

/**
 * Pfad zur Komponente: src/views/TransactionsView.vue
 * Verwaltung und Anzeige der Transaktionen mit verbesserter Suchfunktion.
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

/**
 * **Optimierte Suche**:
 * - Durchsucht die tatsächlichen Werte, nicht nur die IDs.
 * - Berücksichtigt verknüpfte Daten aus `categoryStore`, `tagStore`, `recipientStore`.
 * - Beträge können mit Punkt oder Komma eingegeben werden.
 */
const filteredTransactions = computed(() => {
  if (!searchQuery.value.trim()) return transactionStore.transactions;

  const searchLower = searchQuery.value.toLowerCase();
  const searchNumeric = searchLower.replace(/,/g, "."); // Komma zu Punkt für Zahlensuche

  return transactionStore.transactions.filter((transaction) => {
    const categoryName =
      categoryStore.getCategoryById(transaction.categoryId)?.name || "";
    const recipientName =
      recipientStore.getRecipientById(transaction.recipientId)?.name || "";
    const tagNames = transaction.tagIds
      .map((tagId) => tagStore.getTagById(tagId)?.name || "")
      .join(" ");

    const formattedAmount = formatCurrency(transaction.amount)
      .replace(/\./g, "") // Tausenderpunkte entfernen
      .replace(/,/g, "."); // Komma zu Punkt umwandeln für Vergleich

    return (
      transaction.note?.toLowerCase().includes(searchLower) ||
      categoryName.toLowerCase().includes(searchLower) ||
      recipientName.toLowerCase().includes(searchLower) ||
      formattedAmount.includes(searchNumeric) || // Suche mit Komma oder Punkt
      transaction.account?.toLowerCase().includes(searchLower) ||
      tagNames.toLowerCase().includes(searchLower)
    );
  });
});

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
  <div>
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
    <div class="card bg-base-100 shadow-md">
      <div class="card-body">
        <TransactionList
          :transactions="filteredTransactions"
          :show-account="true"
          @view="viewTransaction"
          @edit="editTransaction"
          @delete="deleteTransaction"
        />
      </div>
    </div>

    <!-- Neue Transaktion Modal -->
    <div v-if="showNewTransactionModal" class="modal modal-open">
      <div class="modal-box max-w-2xl">
        <h3 class="font-bold text-lg mb-4">Neue Transaktion</h3>
        <TransactionForm
          @save="saveTransaction"
          @cancel="showNewTransactionModal = false"
        />
      </div>
      <div
        class="modal-backdrop"
        @click="showNewTransactionModal = false"
      ></div>
    </div>

    <!-- Transaktionsdetail-Modal -->
    <TransactionDetailModal
      :transaction="selectedTransaction"
      :is-open="showTransactionDetailModal"
      @close="showTransactionDetailModal = false"
      @edit="editTransaction"
      @delete="deleteTransaction"
    />

    <!-- Transaktion bearbeiten Modal -->
    <div v-if="showEditTransactionModal" class="modal modal-open">
      <div class="modal-box max-w-2xl">
        <h3 class="font-bold text-lg mb-4">Transaktion bearbeiten</h3>
        <TransactionForm
          :transaction="selectedTransaction || undefined"
          :is-edit="true"
          @save="saveTransaction"
          @cancel="showEditTransactionModal = false"
        />
      </div>
      <div
        class="modal-backdrop"
        @click="showEditTransactionModal = false"
      ></div>
    </div>
  </div>
</template>
