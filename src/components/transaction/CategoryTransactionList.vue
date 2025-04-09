<!-- Datei: src/components/transaction/CategoryTransactionList.vue -->
<script setup lang="ts">
/**
 * Pfad zur Komponente: src/components/transaction/CategoryTransactionList.vue
 * Zeigt eine Liste von Transaktionen geordnet nach Kategorien an. Nutzt Services für Daten.
 *
 * Komponenten-Props:
 * - transactions: Transaction[] - Die anzuzeigenden Transaktionen (bereits vorgefiltert und sortiert)
 * - sortKey: keyof Transaction | "" - Nach welchem Feld sortiert wird (Info für UI)
 * - sortOrder: "asc" | "desc" - Die Sortierreihenfolge (Info für UI)
 *
 * Emits:
 * - edit: Bearbeiten einer Standardtransaktion (öffnet TransactionForm)
 * - delete: Löschen einer Transaktion
 * - sort-change: Anforderung zur Änderung der Sortierung
 */
import { defineProps, defineEmits, ref, computed, defineExpose } from "vue";
import { Transaction, TransactionType } from "../../types";
import { formatDate } from "../../utils/formatters";
import CurrencyDisplay from "../ui/CurrencyDisplay.vue";
import { Icon } from "@iconify/vue";
import CategoryTransferModal from "../budget/CategoryTransferModal.vue";
// Import Services instead of Stores for data fetching/display names
import { AccountService } from "@/services/AccountService";
import { CategoryService } from "@/services/CategoryService";
import { debugLog } from "@/utils/logger";

const props = defineProps<{
  transactions: Transaction[]; // Expect pre-filtered and pre-sorted transactions
  sortKey: keyof Transaction | "";
  sortOrder: "asc" | "desc";
}>();

const emit = defineEmits(["edit", "delete", "sort-change"]);

// Suchfunktionalität
const searchTerm = ref("");

// Verwende die bereits übergebenen, sortierten/gefilterten Transaktionen
const displayTransactions = computed(() => {
  const term = searchTerm.value.toLowerCase().trim();
  if (!term) return props.transactions;

  // Filter based on search term
  return props.transactions.filter((tx) => {
    const date = formatDate(tx.date);
    const valueDate = formatDate(tx.valueDate);
    const category = CategoryService.getCategoryName(tx.categoryId);
    const account = AccountService.getAccountName(tx.accountId); // Assuming exists for ACCOUNTTRANSFER payee display
    const toCategory = tx.toCategoryId
      ? CategoryService.getCategoryName(tx.toCategoryId)
      : "";
    const amount = tx.amount.toString();
    const note = tx.note || "";
    const payee = tx.payee || ""; // Include payee from CategoryTransfer

    return [
      date,
      valueDate,
      category,
      account,
      toCategory,
      amount,
      note,
      payee,
    ].some((field) => field.toLowerCase().includes(term));
  });
});

// --- Selection Logic (remains the same) ---
const selectedIds = ref<string[]>([]);
const lastSelectedIndex = ref<number | null>(null);
const currentPageIds = computed(() =>
  displayTransactions.value.map((tx) => tx.id)
);
const allSelected = computed(
  () =>
    currentPageIds.value.length > 0 &&
    currentPageIds.value.every((id) => selectedIds.value.includes(id))
);

function handleHeaderCheckboxChange(event: Event) {
  const checked = (event.target as HTMLInputElement).checked;
  if (checked) {
    // Add only visible IDs to selection
    selectedIds.value = [
      ...new Set([...selectedIds.value, ...currentPageIds.value]),
    ];
  } else {
    // Remove only visible IDs from selection
    const currentPageIdSet = new Set(currentPageIds.value);
    selectedIds.value = selectedIds.value.filter(
      (id) => !currentPageIdSet.has(id)
    );
  }
  lastSelectedIndex.value = null; // Reset last index after header action
}

function handleCheckboxClick(
  transactionId: string,
  index: number,
  event: MouseEvent
) {
  const target = event.target as HTMLInputElement;
  const isChecked = target.checked;
  const displayedTxs = displayTransactions.value; // Use the potentially filtered list

  if (
    event.shiftKey &&
    lastSelectedIndex.value !== null &&
    lastSelectedIndex.value < displayedTxs.length
  ) {
    const start = Math.min(lastSelectedIndex.value, index);
    const end = Math.max(lastSelectedIndex.value, index);
    for (let i = start; i <= end; i++) {
      if (i < displayedTxs.length) {
        // Ensure index is within bounds
        const id = displayedTxs[i].id;
        if (isChecked && !selectedIds.value.includes(id)) {
          selectedIds.value.push(id);
        } else if (!isChecked) {
          const pos = selectedIds.value.indexOf(id);
          if (pos !== -1) selectedIds.value.splice(pos, 1);
        }
      }
    }
  } else {
    if (isChecked) {
      if (!selectedIds.value.includes(transactionId)) {
        selectedIds.value.push(transactionId);
      }
    } else {
      const pos = selectedIds.value.indexOf(transactionId);
      if (pos !== -1) selectedIds.value.splice(pos, 1);
    }
  }
  // Update last selected index relative to the *currently displayed* list
  lastSelectedIndex.value = index;
}

function getSelectedTransactions(): Transaction[] {
  // Filter the original full list based on selectedIds
  // This assumes props.transactions might be the full list or a pre-filtered one.
  // If props.transactions is always the paginated/filtered list, use displayTransactions.value
  return props.transactions.filter((tx) => selectedIds.value.includes(tx.id));
}

defineExpose({ getSelectedTransactions, selectedIds }); // Expose selectedIds if needed

// --- Modal Logic for Editing Category Transfers ---
const showTransferModal = ref(false);
const modalData = ref<{
  transactionId: string; // ID of the negative transaction
  gegentransactionId: string; // ID of the positive transaction
  prefillAmount: number;
  fromCategoryId: string;
  toCategoryId: string;
  prefillDate: string;
  note?: string; // Add note to modal data
} | null>(null);

function editTransactionLocal(tx: Transaction) {
  if (tx.type === TransactionType.CATEGORYTRANSFER) {
    // It's a category transfer, determine which part we clicked (+ or - amount)
    const isFromPart = tx.amount < 0; // True if this is the transaction decreasing the 'from' category

    // IDs need to be correctly assigned based on which part was clicked
    const transactionId = isFromPart ? tx.id : tx.counterTransactionId || ""; // The negative amount tx ID
    const gegentransactionId = isFromPart
      ? tx.counterTransactionId || ""
      : tx.id; // The positive amount tx ID

    // Categories need to be determined based on the stored relationship
    const fromCatId = isFromPart ? tx.categoryId : tx.toCategoryId || ""; // The source category
    const toCatId = isFromPart ? tx.toCategoryId || "" : tx.categoryId; // The destination category

    if (!transactionId || !gegentransactionId) {
      console.error(
        "Counter transaction ID missing for category transfer:",
        tx
      );
      // Potentially show an error to the user
      return;
    }

    modalData.value = {
      transactionId,
      gegentransactionId,
      prefillAmount: Math.abs(tx.amount),
      fromCategoryId: fromCatId,
      toCategoryId: toCatId,
      prefillDate: tx.date, // Use the transaction's date
      note: tx.note, // Pass the note
    };
    debugLog(
      "[CategoryTransactionList] Opening edit modal for transfer",
      modalData.value
    );
    showTransferModal.value = true;
  } else {
    // It's a regular transaction, emit edit event for the parent view
    debugLog(
      "[CategoryTransactionList] Emitting edit for standard transaction",
      tx
    );
    emit("edit", tx);
  }
}

// Handles successful transfer from the modal
function onTransferComplete() {
  showTransferModal.value = false;
  // Optionally emit an event or refresh data if needed,
  // although the service update should trigger reactivity.
  debugLog(
    "[CategoryTransactionList] Transfer modal closed, operation successful."
  );
  // emit('refresh-data'); // Example if parent needs explicit refresh
}
</script>

<template>
  <div>
    <!-- Suchfeld -->
    <div class="mb-4 flex justify-end">
      <div class="join flex items-center relative">
        <input
          v-model="searchTerm"
          type="text"
          placeholder="Suchen..."
          class="input join-item rounded-l-full input-sm input-bordered border-1 border-base-300 text-center pr-8"
        />
        <button
          v-if="searchTerm"
          @click="searchTerm = ''"
          class="absolute right-[40px] top-1/2 -translate-y-1/2 text-base text-neutral/60 hover:text-error/60"
          aria-label="Suche zurücksetzen"
        >
          <Icon icon="mdi:close-circle-outline" />
        </button>
        <button
          class="btn join-item btn-sm btn-soft border border-base-300 rounded-r-full flex items-center justify-center"
        >
          <Icon icon="mdi:magnify" class="text-lg" />
        </button>
      </div>
    </div>

    <div class="overflow-x-auto">
      <!-- Added overflow-x-auto here -->
      <table class="table w-full table-zebra table-sm">
        <!-- Added table-sm -->
        <thead>
          <tr>
            <!-- Auswahl -->
            <th class="w-5 px-1">
              <input
                type="checkbox"
                class="checkbox checkbox-sm"
                :checked="allSelected"
                @change="handleHeaderCheckboxChange"
              />
            </th>
            <th
              @click="$emit('sort-change', 'date')"
              class="cursor-pointer px-2"
            >
              <div class="flex items-center">
                Datum
                <Icon
                  v-if="sortKey === 'date'"
                  :icon="
                    sortOrder === 'asc' ? 'mdi:arrow-up' : 'mdi:arrow-down'
                  "
                  class="ml-1 text-xs"
                />
              </div>
            </th>
            <th
              @click="$emit('sort-change', 'valueDate')"
              class="cursor-pointer px-2"
            >
              <div class="flex items-center">
                Wertstellung
                <Icon
                  v-if="sortKey === 'valueDate'"
                  :icon="
                    sortOrder === 'asc' ? 'mdi:arrow-up' : 'mdi:arrow-down'
                  "
                  class="ml-1 text-xs"
                />
              </div>
            </th>
            <th
              @click="$emit('sort-change', 'categoryId')"
              class="cursor-pointer px-2"
            >
              <div class="flex items-center">
                Von Kat.
                <Icon
                  v-if="sortKey === 'categoryId'"
                  :icon="
                    sortOrder === 'asc' ? 'mdi:arrow-up' : 'mdi:arrow-down'
                  "
                  class="ml-1 text-xs"
                />
              </div>
            </th>
            <th
              @click="$emit('sort-change', 'toCategoryId')"
              class="cursor-pointer px-2"
            >
              <div class="flex items-center">
                Zu Kat./Konto
                <Icon
                  v-if="sortKey === 'toCategoryId'"
                  :icon="
                    sortOrder === 'asc' ? 'mdi:arrow-up' : 'mdi:arrow-down'
                  "
                  class="ml-1 text-xs"
                />
              </div>
            </th>
            <th
              class="text-right cursor-pointer px-2"
              @click="$emit('sort-change', 'amount')"
            >
              <div class="flex items-center justify-end">
                Betrag
                <Icon
                  v-if="sortKey === 'amount'"
                  :icon="
                    sortOrder === 'asc' ? 'mdi:arrow-up' : 'mdi:arrow-down'
                  "
                  class="ml-1 text-xs"
                />
              </div>
            </th>
            <th class="text-center cursor-pointer px-1">
              <Icon icon="mdi:note-text-outline" class="text-base" />
            </th>
            <th class="text-right px-2">Aktionen</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(tx, index) in displayTransactions"
            :key="tx.id"
            class="hover"
          >
            <td class="px-1">
              <input
                type="checkbox"
                class="checkbox checkbox-sm"
                :checked="selectedIds.includes(tx.id)"
                @click="handleCheckboxClick(tx.id, index, $event)"
              />
            </td>
            <td class="px-2">{{ formatDate(tx.date) }}</td>

            <td class="px-2">{{ formatDate(tx.valueDate) }}</td>

            <td class="px-2">
              {{ CategoryService.getCategoryName(tx.categoryId) }}
            </td>
            <td class="px-2">
              <template v-if="tx.type === TransactionType.CATEGORYTRANSFER">
                {{ CategoryService.getCategoryName(tx.toCategoryId) }}
              </template>
              <template v-else>
                <!-- Should not happen if only category transfers are shown, but as fallback -->
                {{ AccountService.getAccountName(tx.accountId) }}
              </template>
            </td>
            <td class="text-right px-2">
              <CurrencyDisplay
                :amount="tx.amount"
                :show-zero="true"
                :asInteger="false"
                :class="{
                  'text-success':
                    tx.type === TransactionType.INCOME ||
                    (tx.type === TransactionType.CATEGORYTRANSFER &&
                      tx.amount > 0),
                  'text-error':
                    tx.type === TransactionType.EXPENSE ||
                    (tx.type === TransactionType.CATEGORYTRANSFER &&
                      tx.amount < 0),
                  'text-info': tx.type === TransactionType.ACCOUNTTRANSFER, // Although likely not shown here
                  'text-warning': tx.type === TransactionType.RECONCILE, // Although likely not shown here
                }"
              />
            </td>
            <td class="text-center px-1">
              <template v-if="tx.note && tx.note.trim()">
                <div class="tooltip tooltip-left" :data-tip="tx.note">
                  <Icon
                    icon="mdi:comment-text-outline"
                    class="text-base opacity-60 cursor-help"
                  />
                </div>
              </template>
            </td>
            <td class="text-right px-2">
              <div class="flex justify-end space-x-1">
                <button
                  class="btn btn-ghost btn-xs border-none px-1"
                  @click="editTransactionLocal(tx)"
                  title="Bearbeiten"
                >
                  <Icon icon="mdi:pencil" class="text-base" />
                </button>
                <button
                  class="btn btn-ghost btn-xs border-none text-error/75 px-1"
                  @click="$emit('delete', tx)"
                  title="Löschen"
                >
                  <Icon icon="mdi:trash-can" class="text-base" />
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="displayTransactions.length === 0">
            <td colspan="8" class="text-center py-4 text-base-content/70">
              Keine Transaktionen für die Filter gefunden.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
  <!-- Kategorie-Transfer Modal für Bearbeitung -->
  <CategoryTransferModal
    v-if="showTransferModal && modalData"
    :is-open="showTransferModal"
    :prefillAmount="modalData.prefillAmount"
    :prefillDate="modalData.prefillDate"
    :fromCategoryId="modalData.fromCategoryId"
    :toCategoryId="modalData.toCategoryId"
    :transactionId="modalData.transactionId"
    :gegentransactionId="modalData.gegentransactionId"
    :note="modalData.note"
    @close="showTransferModal = false"
    @transfer="onTransferComplete"
  />
</template>
