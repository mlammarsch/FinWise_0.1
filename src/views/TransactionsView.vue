<script setup lang="ts">
import { ref, computed } from "vue";
import { useTransactionStore } from "../stores/transactionStore";
import { useAccountStore } from "../stores/accountStore";
import { useCategoryStore } from "../stores/categoryStore";
import { useTagStore } from "../stores/tagStore";
import { useRecipientStore } from "../stores/recipientStore";
import TransactionList from "../components/transaction/TransactionList.vue";
import TransactionDetailModal from "../components/transaction/TransactionDetailModal.vue";
import TransactionForm from "../components/transaction/TransactionForm.vue";
import PagingComponent from "../components/ui/PagingComponent.vue";
import { Transaction } from "../types";
import SearchGroup from "../components/ui/SearchGroup.vue";
import { formatCurrency } from "../utils/formatters";
import { Icon } from "@iconify/vue";
import DateRangePicker from "../components/ui/DateRangePicker.vue";

// Stores
const transactionStore = useTransactionStore();
const accountStore = useAccountStore();
const categoryStore = useCategoryStore();
const tagStore = useTagStore();
const recipientStore = useRecipientStore();

// Modals
const showTransactionFormModal = ref(false);
const showTransactionDetailModal = ref(false);

// Monatliche Selektion
const currentDate = ref(new Date());

const formattedMonthYear = computed(() =>
  currentDate.value.toLocaleDateString("de-DE", {
    year: "numeric",
    month: "long",
  })
);

const previousMonth = () => {
  currentDate.value = new Date(
    currentDate.value.getFullYear(),
    currentDate.value.getMonth() - 1,
    1
  );
};

const nextMonth = () => {
  currentDate.value = new Date(
    currentDate.value.getFullYear(),
    currentDate.value.getMonth() + 1,
    1
  );
};

// Date Range Picker
const dateRange = ref<{ start: string; end: string }>({
  start: new Date().toISOString().split("T")[0],
  end: new Date().toISOString().split("T")[0],
});

// Filter- und UI-Status
const selectedTransaction = ref<Transaction | null>(null);
const selectedAccountId = ref("");
const selectedTransactionType = ref("");
const searchQuery = ref("");
const currentPage = ref(1);
const itemsPerPage = ref(25);
const itemsPerPageOptions = [10, 20, 25, 50, 100, "all"];

// Filterung der Transaktionen
const filteredTransactions = computed(() => {
  let transactions = transactionStore.transactions;

  if (selectedAccountId.value) {
    transactions = transactions.filter(
      (tx) => tx.accountId === selectedAccountId.value
    );
  }

  if (selectedTransactionType.value) {
    transactions = transactions.filter(
      (tx) => tx.type === selectedTransactionType.value.toUpperCase()
    );
  }

  if (!searchQuery.value.trim()) return transactions;

  const searchLower = searchQuery.value.toLowerCase();
  const searchNumeric = searchLower.replace(",", ".");

  return transactions.filter((transaction) => {
    const categoryName =
      (transaction.categoryId &&
        categoryStore.getCategoryById(transaction.categoryId)?.name) ||
      "";
    const recipientName =
      (transaction.recipientId &&
        recipientStore.getRecipientById(transaction.recipientId)?.name) ||
      "";
    const tagNames = Array.isArray(transaction.tagIds)
      ? transaction.tagIds
          .map((tagId) => tagStore.getTagById(tagId)?.name || "")
          .join(" ")
      : "";
    const accountName =
      accountStore.getAccountById(transaction.accountId)?.name || "";
    const toAccountName =
      (transaction.transferToAccountId &&
        accountStore.getAccountById(transaction.transferToAccountId)?.name) ||
      "";
    const payee = transaction.payee || "";
    const formattedAmount = formatCurrency(transaction.amount)
      .replace(/\./g, "")
      .replace(/,/g, ".");

    return (
      categoryName.toLowerCase().includes(searchLower) ||
      recipientName.toLowerCase().includes(searchLower) ||
      tagNames.toLowerCase().includes(searchLower) ||
      accountName.toLowerCase().includes(searchLower) ||
      toAccountName.toLowerCase().includes(searchLower) ||
      payee.toLowerCase().includes(searchLower) ||
      formattedAmount.includes(searchNumeric) ||
      (transaction.note || "").toLowerCase().includes(searchLower)
    );
  });
});

// Paginierung
const paginatedTransactions = computed(() => {
  if (itemsPerPage.value === "all") return filteredTransactions.value;
  const start = (currentPage.value - 1) * Number(itemsPerPage.value);
  return filteredTransactions.value.slice(
    start,
    start + Number(itemsPerPage.value)
  );
});

const totalPages = computed(() =>
  itemsPerPage.value === "all"
    ? 1
    : Math.ceil(filteredTransactions.value.length / Number(itemsPerPage.value))
);

// Aktionen: Anzeigen, Bearbeiten, Erstellen
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

// Speichern
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
    <!-- Filterleiste -->
    <div class="flex flex-wrap items-center justify-between gap-1">
      <!-- FilterCard -->
      <div class="card w-2/3 bg-base-100 shadow-md border border-base-300">
        <div class="rounded-md bg-base-200/50 backdrop-blur-lg p-2">
          <div class="flex flex-wrap items-center justify-left gap-2">
            <!-- Monatsauswahl -->
            <div class="join">
              <button
                class="btn join-item rounded-l-full btn-sm btn-soft border border-base-300 w-10"
                @click="previousMonth"
              >
                <Icon
                  icon="mdi:chevron-left"
                  class="text-lg"
                />
              </button>
              <button class="btn join-item btn-sm border border-base-300 w-30">
                {{ formattedMonthYear }}
              </button>
              <button
                class="btn join-item rounded-r-full btn-sm btn-soft border border-base-300 w-10"
                @click="nextMonth"
              >
                <Icon
                  icon="mdi:chevron-right"
                  class="text-lg"
                />
              </button>
            </div>

            <!-- Konto Dropdown -->
            <select
              v-model="selectedAccountId"
              class="select select-sm select-bordered border-base-300 w-40"
            >
              <option
                disabled
                value=""
              >
                Konto wählen
              </option>
              <option
                v-for="acc in accountStore.activeAccounts"
                :key="acc.id"
                :value="acc.id"
              >
                {{ acc.name }}
              </option>
            </select>

            <!-- Transaktionstyp Dropdown -->
            <select
              v-model="selectedTransactionType"
              class="select select-sm select-bordered border-base-300 w-40"
            >
              <option
                disabled
                value=""
              >
                Typ wählen
              </option>
              <option value="ausgabe">Ausgabe</option>
              <option value="einnahme">Einnahme</option>
              <option value="transfer">Transfer</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Suchgruppe -->
      <SearchGroup
        btnRight="Neue Transaktion"
        btnRightIcon="mdi:plus"
        @search="(query) => (searchQuery = query)"
        @btn-right-click="createTransaction"
      />
    </div>

    <!-- Transaktionsliste -->
    <div class="card bg-base-100 shadow-md border border-base-300">
      <div class="card-body">
        <TransactionList
          :transactions="paginatedTransactions"
          :show-account="true"
          @edit="editTransaction"
          @delete="deleteTransaction"
        />

        <PagingComponent
          v-model:currentPage="currentPage"
          v-model:itemsPerPage="itemsPerPage"
          :totalPages="totalPages"
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
