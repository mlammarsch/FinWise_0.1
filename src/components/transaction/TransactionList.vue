<script setup lang="ts">
import { computed } from "vue";
import { Transaction } from "@/types";
import { formatDate, formatCurrency } from "@/utils/formatters";
import TransactionCard from "./TransactionCard.vue";
import { useAccountStore } from "@/stores/accountStore";
import { useCategoryStore } from "@/stores/categoryStore";
import { useReconciliationStore } from "@/stores/reconciliationStore"; // Neuer Import

/**
 * Pfad zur Komponente: src/components/transaction/TransactionList.vue
 * Liste von Transaktionen mit Sortier- und Filterfunktionen.
 *
 * Komponenten-Props:
 * - transactions: Transaction[] - Liste der anzuzeigenden Transaktionen
 * - showAccount: boolean - Optional: Kontenname anzeigen (default: false)
 * - sortKey: string - Schlüssel, nach dem sortiert wird
 * - sortOrder: 'asc' | 'desc' - Sortierrichtung
 *
 * Emits:
 * - edit: (transaction: Transaction) - Transaktion bearbeiten
 * - delete: (transaction: Transaction) - Transaktion löschen
 * - sort-change: (key: string) - Sortierung ändern
 * - toggleReconciliation: (transactionId: string) - Abgleichstatus umschalten
 */

// Props definieren
const props = defineProps({
  transactions: {
    type: Array as () => Transaction[],
    required: true,
  },
  showAccount: {
    type: Boolean,
    default: false,
  },
  sortKey: {
    type: String,
    default: "",
  },
  sortOrder: {
    type: String as () => "asc" | "desc",
    default: "desc",
  },
});

// Emits definieren
const emit = defineEmits([
  "edit",
  "delete",
  "sort-change",
  "toggleReconciliation",
]);

// Stores initialisieren
const accountStore = useAccountStore();
const categoryStore = useCategoryStore();
const reconciliationStore = useReconciliationStore();

// Funktionen für Events
const handleEdit = (tx: Transaction) => {
  emit("edit", tx);
};

const handleDelete = (tx: Transaction) => {
  emit("delete", tx);
};

const toggleReconciliation = (tx: Transaction) => {
  reconciliationStore.toggleTransactionReconciled(tx.id);
  emit("toggleReconciliation", tx.id);
};

// Sortierung
const toggleSort = (key: string) => {
  emit("sort-change", key);
};

// Hilfreiche berechnete Eigenschaften
const getSortIcon = (key: string) => {
  if (props.sortKey !== key) return "mdi:sort";
  return props.sortOrder === "asc"
    ? "mdi:sort-ascending"
    : "mdi:sort-descending";
};

// Hilfsfunktionen zum Formatieren des Transaktionstyps
const getTransactionTypeLabel = (type: string) => {
  switch (type) {
    case "EXPENSE":
      return "Ausgabe";
    case "INCOME":
      return "Einnahme";
    case "ACCOUNTTRANSFER":
      return "Übertrag";
    case "CATEGORYTRANSFER":
      return "Kat.Transfer";
    case "RECONCILE":
      return "Abgleich";
    default:
      return type;
  }
};

// Gibt den Kontonamen für eine Transaktion zurück
const getAccountName = (accountId: string) => {
  const account = accountStore.getAccountById(accountId);
  return account ? account.name : "Unbekannt";
};

// Gibt den Kategorienamen für eine Transaktion zurück
const getCategoryName = (categoryId: string | null) => {
  if (!categoryId) return "—";
  const category = categoryStore.getCategoryById(categoryId);
  return category ? category.name : "Unbekannt";
};

// CSS-Klassen für Spaltenüberschriften
const thClasses =
  "px-3 py-2 text-left font-medium cursor-pointer hover:bg-base-200";
</script>

<template>
  <div class="overflow-x-auto">
    <table class="table table-zebra table-compact w-full">
      <thead>
        <tr>
          <th :class="thClasses" @click="toggleSort('date')">
            <div class="flex items-center">
              <span class="mr-1">Datum</span>
              <Icon :icon="getSortIcon('date')" class="text-lg" />
            </div>
          </th>
          <th
            v-if="showAccount"
            :class="thClasses"
            @click="toggleSort('accountId')"
          >
            <div class="flex items-center">
              <span class="mr-1">Konto</span>
              <Icon :icon="getSortIcon('accountId')" class="text-lg" />
            </div>
          </th>
          <th :class="thClasses" @click="toggleSort('payee')">
            <div class="flex items-center">
              <span class="mr-1">Beschreibung</span>
              <Icon :icon="getSortIcon('payee')" class="text-lg" />
            </div>
          </th>
          <th :class="thClasses" @click="toggleSort('categoryId')">
            <div class="flex items-center">
              <span class="mr-1">Kategorie</span>
              <Icon :icon="getSortIcon('categoryId')" class="text-lg" />
            </div>
          </th>
          <th :class="thClasses + ' text-right'" @click="toggleSort('amount')">
            <div class="flex items-center justify-end">
              <span class="mr-1">Betrag</span>
              <Icon :icon="getSortIcon('amount')" class="text-lg" />
            </div>
          </th>
          <th class="px-3 py-2 text-center">
            <Icon
              icon="mdi:check-circle-outline"
              class="opacity-60"
              title="Abgeglichen"
            />
          </th>
          <th class="px-3 py-2 text-right">Aktionen</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="transaction in transactions"
          :key="transaction.id"
          class="hover:bg-base-200 hover:cursor-pointer"
          @click.stop="handleEdit(transaction)"
        >
          <td class="px-3 py-2">
            <div>{{ formatDate(transaction.date) }}</div>
            <div
              v-if="transaction.date !== transaction.valueDate"
              class="text-xs opacity-60"
            >
              Wert: {{ formatDate(transaction.valueDate || transaction.date) }}
            </div>
          </td>

          <td v-if="showAccount" class="px-3 py-2">
            <div>{{ getAccountName(transaction.accountId) }}</div>
            <div
              v-if="transaction.type === 'ACCOUNTTRANSFER'"
              class="text-xs opacity-60"
            >
              → {{ getAccountName(transaction.transferToAccountId || "") }}
            </div>
          </td>

          <td class="px-3 py-2">
            <div>{{ transaction.payee || transaction.note }}</div>
            <div
              v-if="transaction.payee && transaction.note"
              class="text-xs opacity-60"
            >
              {{ transaction.note }}
            </div>
            <div class="text-xs badge badge-outline">
              {{ getTransactionTypeLabel(transaction.type) }}
            </div>
          </td>

          <td class="px-3 py-2">
            {{ getCategoryName(transaction.categoryId) }}
          </td>

          <td
            class="px-3 py-2 text-right"
            :class="transaction.amount >= 0 ? 'text-success' : 'text-error'"
          >
            {{ formatCurrency(transaction.amount) }}
          </td>

          <td class="px-3 py-2 text-center">
            <input
              type="checkbox"
              :checked="transaction.reconciled"
              class="checkbox checkbox-sm"
              @click.stop="toggleReconciliation(transaction)"
            />
          </td>

          <td class="px-3 py-2 text-right">
            <div class="flex justify-end space-x-1">
              <button
                class="btn btn-ghost btn-xs"
                @click.stop="handleEdit(transaction)"
              >
                <Icon icon="mdi:pencil" class="text-base" />
              </button>
              <button
                class="btn btn-ghost btn-xs text-error"
                @click.stop="handleDelete(transaction)"
              >
                <Icon icon="mdi:trash-can" class="text-base" />
              </button>
            </div>
          </td>
        </tr>
        <tr v-if="transactions.length === 0">
          <td colspan="7" class="text-center py-4 opacity-60">
            Keine Transaktionen gefunden.
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
