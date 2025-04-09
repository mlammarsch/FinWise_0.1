<!-- Datei: src/components/transaction/CategoryTransactionList.vue -->
<script setup lang="ts">
/**
 * Pfad zur Komponente: src/components/transaction/CategoryTransactionList.vue
 * Zeigt eine Liste von Transaktionen geordnet nach Kategorien an.
 *
 * Komponenten-Props:
 * - transactions: Transaction[] - Die anzuzeigenden Transaktionen
 * - sortKey: keyof Transaction | "" - Nach welchem Feld sortiert werden soll
 * - sortOrder: "asc" | "desc" - Die Sortierreihenfolge
 * - viewMode?: "normal" - Optionaler Anzeigemodus
 *
 * Emits:
 * - edit: Bearbeiten einer Transaktion
 * - delete: Löschen einer Transaktion
 * - sort-change: Änderung der Sortierung
 */
import { defineProps, defineEmits, ref, computed, defineExpose } from "vue";
import { Transaction, TransactionType } from "../../types";
import { useAccountStore } from "../../stores/accountStore";
import { useCategoryStore } from "../../stores/categoryStore";
import { useTransactionStore } from "../../stores/transactionStore";
import { useTransactionFilterStore } from "../../stores/transactionFilterStore";
import { formatDate } from "../../utils/formatters";
import CurrencyDisplay from "../ui/CurrencyDisplay.vue";
import { Icon } from "@iconify/vue";
import CategoryTransferModal from "../budget/CategoryTransferModal.vue";
import { updateCategoryTransfer } from "@/utils/categoryTransfer";
import { debugLog } from "@/utils/logger";

const props = defineProps<{
  transactions: Transaction[];
  sortKey: keyof Transaction | "";
  sortOrder: "asc" | "desc";
  viewMode?: "normal";
}>();

const viewMode = computed(() => props.viewMode || "normal");

const emit = defineEmits(["edit", "delete", "sort-change"]);

const accountStore = useAccountStore();
const categoryStore = useCategoryStore();

// Suchfunktionalität
const searchTerm = ref("");

// Zeige nur EXPENSE, INCOME und positive CATEGORYTRANSFER
const displayTransactions = computed(() => {
  const baseTransactions = props.transactions.filter(
    (tx) =>
      tx.type === TransactionType.EXPENSE || tx.type === TransactionType.INCOME
  );

  const positiveCategoryTransfers = props.transactions.filter(
    (tx) => tx.type === TransactionType.CATEGORYTRANSFER && tx.amount > 0
  );

  return [...baseTransactions, ...positiveCategoryTransfers];
});

// Sortierte Transaktionen basierend auf sortKey und sortOrder
const sortedTransactions = computed(() => {
  const transactions = [...displayTransactions.value];

  if (!props.sortKey) return transactions;

  return transactions.sort((a, b) => {
    const key = props.sortKey;

    let valA = a[key];
    let valB = b[key];

    if (key === "date" || key === "valueDate") {
      valA = new Date(valA as string).getTime();
      valB = new Date(valB as string).getTime();
    }

    if (valA == null) return 1;
    if (valB == null) return -1;

    if (valA < valB) return props.sortOrder === "asc" ? -1 : 1;
    if (valA > valB) return props.sortOrder === "asc" ? 1 : -1;
    return 0;
  });
});

// Filtert Transaktionen nach Suchbegriff
const searchFilteredTransactions = computed(() => {
  const term = searchTerm.value.toLowerCase().trim();
  if (!term) return sortedTransactions.value;

  return sortedTransactions.value.filter((tx) => {
    const date = formatDate(tx.date);
    const valueDate = formatDate(tx.valueDate);
    const category = categoryStore.getCategoryById(tx.categoryId)?.name || "";
    const account = accountStore.getAccountById(tx.accountId)?.name || "";
    const toCategory = tx.toCategoryId
      ? categoryStore.getCategoryById(tx.toCategoryId)?.name || ""
      : "";
    const amount = tx.amount.toString();
    const note = tx.note || "";

    return [date, valueDate, category, account, toCategory, amount, note].some(
      (field) => field.toLowerCase().includes(term)
    );
  });
});

// Auswahl-Logik
const selectedIds = ref<string[]>([]);
const lastSelectedIndex = ref<number | null>(null);
const currentPageIds = computed(() =>
  searchFilteredTransactions.value.map((tx) => tx.id)
);
const allSelected = computed(() =>
  currentPageIds.value.every((id) => selectedIds.value.includes(id))
);

function handleHeaderCheckboxChange(event: Event) {
  const checked = (event.target as HTMLInputElement).checked;
  if (checked) {
    selectedIds.value = [...currentPageIds.value];
  } else {
    selectedIds.value = selectedIds.value.filter(
      (id) => !currentPageIds.value.includes(id)
    );
  }
}

function handleCheckboxClick(
  transactionId: string,
  index: number,
  event: MouseEvent
) {
  const target = event.target as HTMLInputElement;
  const isChecked = target.checked;
  if (event.shiftKey && lastSelectedIndex.value !== null) {
    const start = Math.min(lastSelectedIndex.value, index);
    const end = Math.max(lastSelectedIndex.value, index);
    for (let i = start; i <= end; i++) {
      const id = searchFilteredTransactions.value[i].id;
      if (isChecked && !selectedIds.value.includes(id)) {
        selectedIds.value.push(id);
      } else if (!isChecked) {
        const pos = selectedIds.value.indexOf(id);
        if (pos !== -1) selectedIds.value.splice(pos, 1);
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
  lastSelectedIndex.value = index;
}

function getSelectedTransactions(): Transaction[] {
  return searchFilteredTransactions.value.filter((tx) =>
    selectedIds.value.includes(tx.id)
  );
}

defineExpose({ getSelectedTransactions });

// Modal-Logik für Bearbeitung von Kategorie-Transfers
const showTransferModal = ref(false);
const modalData = ref<{
  transactionId: string;
  gegentransactionId: string;
  prefillAmount: number;
  fromCategoryId: string;
  toCategoryId: string;
  prefillDate: string;
} | null>(null);

function editTransaction(tx: Transaction, index: number) {
  if (tx.type === TransactionType.CATEGORYTRANSFER) {
    const isFrom = tx.amount < 0;
    const transactionId = isFrom ? tx.id : tx.counterTransactionId || "";
    const gegentransactionId = isFrom ? tx.counterTransactionId || "" : tx.id;
    const fromCatId = isFrom ? tx.categoryId : tx.toCategoryId || "";
    const toCatId = isFrom ? tx.toCategoryId || "" : tx.categoryId;
    modalData.value = {
      transactionId,
      gegentransactionId,
      prefillAmount: Math.abs(tx.amount),
      fromCategoryId: fromCatId,
      toCategoryId: toCatId,
      prefillDate: tx.date,
    };
    showTransferModal.value = true;
  } else {
    emit("edit", tx);
  }
}
</script>

<template>
  <div class="overflow-x-auto">
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
          class="absolute right-2 top-1/2 -translate-y-1/2 text-base text-neutral/60 hover:text-error/60"
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

    <table class="table w-full">
      <thead>
        <tr>
          <!-- Auswahl -->
          <th class="w-5">
            <input
              type="checkbox"
              class="checkbox checkbox-sm"
              :checked="allSelected"
              @change="handleHeaderCheckboxChange"
            />
          </th>
          <th @click="emit('sort-change', 'date')" class="cursor-pointer">
            <div class="flex items-center">
              Datum
              <Icon
                v-if="sortKey === 'date'"
                :icon="sortOrder === 'asc' ? 'mdi:arrow-up' : 'mdi:arrow-down'"
                class="ml-1 text-sm"
              />
            </div>
          </th>
          <th @click="emit('sort-change', 'valueDate')" class="cursor-pointer">
            <div class="flex items-center">
              Wertstellungsdatum
              <Icon
                v-if="sortKey === 'valueDate'"
                :icon="sortOrder === 'asc' ? 'mdi:arrow-up' : 'mdi:arrow-down'"
                class="ml-1 text-sm"
              />
            </div>
          </th>
          <th @click="emit('sort-change', 'categoryId')" class="cursor-pointer">
            <div class="flex items-center">
              Kategorie
              <Icon
                v-if="sortKey === 'categoryId'"
                :icon="sortOrder === 'asc' ? 'mdi:arrow-up' : 'mdi:arrow-down'"
                class="ml-1 text-sm"
              />
            </div>
          </th>
          <th @click="emit('sort-change', 'accountId')" class="cursor-pointer">
            <div class="flex items-center">
              <template
                v-if="
                  searchFilteredTransactions[0] &&
                  searchFilteredTransactions[0].type ===
                    TransactionType.CATEGORYTRANSFER
                "
              >
                Zielkategorie
              </template>
              <template v-else>Konto</template>
              <Icon
                v-if="sortKey === 'accountId'"
                :icon="sortOrder === 'asc' ? 'mdi:arrow-up' : 'mdi:arrow-down'"
                class="ml-1 text-sm"
              />
            </div>
          </th>
          <th
            class="text-right cursor-pointer"
            @click="emit('sort-change', 'amount')"
          >
            <div class="flex items-center justify-end">
              Betrag
              <Icon
                v-if="sortKey === 'amount'"
                :icon="sortOrder === 'asc' ? 'mdi:arrow-up' : 'mdi:arrow-down'"
                class="ml-1 text-sm"
              />
            </div>
          </th>
          <th class="text-center cursor-pointer">
            <Icon icon="mdi:note-text-outline" class="text-lg" />
          </th>
          <th class="text-right">Aktionen</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(tx, index) in searchFilteredTransactions" :key="tx.id">
          <td>
            <input
              type="checkbox"
              class="checkbox checkbox-sm"
              :checked="selectedIds.includes(tx.id)"
              @click="handleCheckboxClick(tx.id, index, $event)"
            />
          </td>
          <td>{{ formatDate(tx.date) }}</td>
          <td>{{ formatDate(tx.valueDate) }}</td>
          <td>
            {{
              categoryStore.getCategoryById(tx.categoryId)?.name || "Unbekannt"
            }}
          </td>
          <td>
            <template v-if="tx.type === TransactionType.CATEGORYTRANSFER">
              {{
                categoryStore.getCategoryById(tx.toCategoryId)?.name ||
                "Unbekannt"
              }}
            </template>
            <template v-else>
              {{
                accountStore.getAccountById(tx.accountId)?.name || "Unbekannt"
              }}
            </template>
          </td>
          <td class="text-right">
            <CurrencyDisplay
              :amount="tx.amount"
              :show-zero="true"
              :class="{
                'text-warning': tx.type === TransactionType.CATEGORYTRANSFER,
              }"
            />
          </td>
          <td class="text-center">
            <template v-if="tx.note && tx.note.trim()">
              <div class="tooltip" :data-tip="tx.note">
                <Icon icon="mdi:speaker-notes" class="text-lg opacity-50" />
              </div>
            </template>
          </td>
          <td class="text-right">
            <div class="flex justify-end space-x-1">
              <button
                class="btn btn-ghost btn-xs border-none"
                @click="editTransaction(tx, index)"
              >
                <Icon icon="mdi:pencil" class="text-base/75" />
              </button>
              <button
                class="btn btn-ghost btn-xs border-none text-error/75"
                @click="$emit('delete', tx)"
              >
                <Icon icon="mdi:trash-can" class="text-base" />
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Kategorie-Transfer Modal für Bearbeitung -->
  <CategoryTransferModal
    v-if="showTransferModal"
    :is-open="showTransferModal"
    :prefillAmount="modalData?.prefillAmount || 0"
    :prefillDate="modalData?.prefillDate"
    :fromCategoryId="modalData?.fromCategoryId"
    :toCategoryId="modalData?.toCategoryId"
    :transactionId="modalData?.transactionId"
    :gegentransactionId="modalData?.gegentransactionId"
    @close="showTransferModal = false"
    @transfer="
      (data) => {
        updateCategoryTransfer(
          data.transactionId,
          data.gegentransactionId,
          data.fromCategoryId,
          data.toCategoryId,
          data.amount,
          data.date,
          data.note
        );
        showTransferModal = false;
      }
    "
  />
</template>
