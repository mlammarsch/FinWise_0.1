<script setup lang="ts">
import { defineProps, computed } from "vue";
import { Transaction } from "../../types";
import { useCategoryStore } from "../../stores/categoryStore";
import { useTagStore } from "../../stores/tagStore";
import { formatDate } from "../../utils/formatters";
import CurrencyDisplay from "../ui/CurrencyDisplay.vue";

/**
 * Pfad zur Komponente: components/TransactionCard.vue
 *
 * Diese Komponente stellt eine einzelne Transaktionskarte dar.
 *
 * Komponenten-Props:
 * - transaction: Transaction - Die Transaktion, die angezeigt wird.
 *
 * Emits:
 * - Keine Emits vorhanden.
 */

const props = defineProps<{
  transaction: Transaction;
}>();

const categoryStore = useCategoryStore();
const tagStore = useTagStore();

const categoryName = computed(() => {
  if (props.transaction.categoryId) {
    return (
      categoryStore.getCategoryById(props.transaction.categoryId)?.name ||
      "Keine Kategorie"
    );
  }
  return null;
});

const getTagName = (tagId: string) => {
  return tagStore.getTagById(tagId)?.name || "";
};
</script>

<template>
  <div class="card border border-base-200 shadow-none">
    <div class="card-body py-2">
      <div class="grid grid-cols-[1fr_auto] gap-2 items-start">
        <!-- Linke Spalte mit Transaktionsdetails -->
        <div>
          <h2 class="card-title m-0 p-0 text-lg">{{ transaction.payee }}</h2>
          <div class="text-sm opacity-50 m-0 p-0">
            {{ transaction.note ? ` - ${transaction.note}` : "" }}
          </div>
          <div class="text-sm">
            {{ formatDate(transaction.date) }}
            <span v-if="categoryName"> - {{ categoryName }}</span>
          </div>
          <div class="flex flex-wrap gap-1 mt-1">
            <div
              v-for="tagId in transaction.tagIds"
              :key="tagId"
              class="badge badge-soft badge-secondary"
            >
              {{ getTagName(tagId) }}
            </div>
          </div>
        </div>
        <!-- Rechte Spalte mit Betrag -->
        <div class="justify-self-end flex items-center">
          <CurrencyDisplay
            class="text-right font-bold whitespace-nowrap"
            :amount="transaction.amount"
            :show-zero="true"
          />
        </div>
      </div>
    </div>
  </div>
</template>
