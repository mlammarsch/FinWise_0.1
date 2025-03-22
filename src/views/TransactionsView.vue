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
import MonthSelector from "../components/ui/MonthSelector.vue";
import { Transaction, TransactionType } from "../types";
import SearchGroup from "../components/ui/SearchGroup.vue";
import { formatCurrency, formatDate } from "../utils/formatters";
import { Icon } from "@iconify/vue";

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

// Filter- und UI-Status
const selectedTransaction = ref<Transaction | null>(null);
const selectedAccountId = ref(""); // Leerer Wert => kein Filter
const selectedTransactionType = ref(""); // Leerer Wert => kein Filter
const searchQuery = ref("");
const currentPage = ref(1);
const itemsPerPage = ref(25);
const itemsPerPageOptions = [10, 20, 25, 50, 100, "all"];

// Filterpriorität: Zuerst Typ, dann Konto, dann Datumsbereich
const dateRange = ref<{ start: string; end: string }>({
  start: new Date().toISOString().split("T")[0],
  end: new Date().toISOString().split("T")[0],
});
function handleDateRangeUpdate(payload: { start: string; end: string }) {
  dateRange.value = payload;
  refreshKey.value++;
}

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

// Filterung der Transaktionen – Filterreihenfolge: Typ, Konto, Datum, Suchbegriff
const filteredTransactions = computed(() => {
  refreshKey.value;
  let transactions = transactionStore.transactions;

  // Filter nach Transaktionstyp
  if (selectedTransactionType.value) {
    const typeMapping: Record<string, TransactionType> = {
      ausgabe: TransactionType.EXPENSE,
      einnahme: TransactionType.INCOME,
      transfer: TransactionType.TRANSFER,
    };
    const desiredType = typeMapping[selectedTransactionType.value];
    if (desiredType) {
      transactions = transactions.filter((tx) => tx.type === desiredType);
    }
  }

  // Filter nach Konto
  if (selectedAccountId.value) {
    transactions = transactions.filter(
      (tx) => tx.accountId === selectedAccountId.value
    );
  }

  // Filter nach Datum
  transactions = transactions.filter((tx) => {
    const txDate = new Date(tx.date).getTime();
    const start = new Date(dateRange.value.start).getTime();
    const end = new Date(dateRange.value.end).getTime();
    return txDate >= start && txDate <= end;
  });

  // Suchfilter
  if (!searchQuery.value.trim()) return transactions;
  const searchLower = searchQuery.value.toLowerCase();
  const searchNumeric = searchLower.replace(",", ".");
  return transactions.filter((tx) => {
    const categoryName =
      (tx.categoryId && categoryStore.getCategoryById(tx.categoryId)?.name) ||
      "";
    const recipientName =
      (tx.recipientId &&
        recipientStore.getRecipientById(tx.recipientId)?.name) ||
      "";
    const tagNames = Array.isArray(tx.tagIds)
      ? tx.tagIds
          .map((tagId) => tagStore.getTagById(tagId)?.name || "")
          .join(" ")
      : "";
    const accountName = accountStore.getAccountById(tx.accountId)?.name || "";
    const toAccountName =
      tx.type === "TRANSFER"
        ? accountStore.getAccountById(tx.transferToAccountId)?.name || ""
        : "";
    const payee = tx.payee || "";
    const formattedAmount = formatCurrency(tx.amount)
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
      (tx.note || "").toLowerCase().includes(searchLower)
    );
  });
});

const sortedTransactions = computed(() => {
  const txs = [...filteredTransactions.value];
  if (sortKey.value) {
    txs.sort((a, b) => {
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
  return txs;
});

const paginatedTransactions = computed(() => {
  if (itemsPerPage.value === "all") return sortedTransactions.value;
  const start = (currentPage.value - 1) * Number(itemsPerPage.value);
  return sortedTransactions.value.slice(
    start,
    start + Number(itemsPerPage.value)
  );
});

// Aktionen: Anzeigen, Bearbeiten, Erstellen
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
  refreshKey.value++;
};

// Löschen
const deleteTransaction = (tx: Transaction) => {
  if (confirm("Möchten Sie diese Transaktion wirklich löschen?")) {
    transactionStore.deleteTransaction(tx.id);
    showTransactionDetailModal.value = false;
  }
};
</script>

<template>
  <div class="space-y-6">
    <!-- Filterleiste -->
    <div class="flex flex-wrap items-center justify-between gap-1">
      <!-- FilterCard -->
      <div class="card w-2/3 bg-base-100 shadow-md">
        <!-- Container für Filter mit flex, items-center, justify-start und mx-2 -->
        <div
          class="rounded-md backdrop-blur-lg p-2 flex items-center justify-start mx-2 gap-2"
        >
          <!-- Monatliche Selektion via MonthSelector -->
          <MonthSelector
            @update-daterange="handleDateRangeUpdate"
            class="mx-2"
          />
          <!-- Transaktionstyp Dropdown -->
          <select
            v-model="selectedTransactionType"
            class="select select-sm select-bordered border-base-300 w-40 mx-2"
          >
            <option value="">Alle Typen</option>
            <option value="ausgabe">Ausgabe</option>
            <option value="einnahme">Einnahme</option>
            <option value="transfer">Transfer</option>
          </select>
          <!-- Konto Dropdown -->
          <select
            v-model="selectedAccountId"
            class="select select-sm select-bordered border-base-300 w-40 mx-2"
          >
            <option value="">Alle Konten</option>
            <option
              v-for="acc in accountStore.activeAccounts"
              :key="acc.id"
              :value="acc.id"
              class="mx-2"
            >
              {{ acc.name }}
            </option>
          </select>
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
