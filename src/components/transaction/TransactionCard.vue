<script setup lang="ts">
import { defineProps, computed } from "vue";
import { Transaction } from "../../types";
import { useCategoryStore } from "../../stores/categoryStore";
import { useTagStore } from "../../stores/tagStore";
import { useAccountStore } from "../../stores/accountStore";
import { useRecipientStore } from "../../stores/recipientStore";
import { formatDate } from "../../utils/formatters";
import CurrencyDisplay from "../ui/CurrencyDisplay.vue";

/**
 * Pfad zur Komponente: components/TransactionCard.vue
 *
 * Diese Komponente stellt eine einzelne Transaktionskarte dar, die alle relevanten Informationen untereinander anzeigt.
 *
 * Komponenten-Props:
 * - transaction: Transaction - Die Transaktion, die angezeigt wird.
 *
 * Emits:
 * - Keine Emits vorhanden.
 */

const props = defineProps<{ transaction: Transaction }>();

const categoryStore = useCategoryStore();
const tagStore = useTagStore();
const accountStore = useAccountStore();
const recipientStore = useRecipientStore();

const categoryName = computed(() => {
  return props.transaction.categoryId
    ? categoryStore.getCategoryById(props.transaction.categoryId)?.name ||
        "Keine Kategorie"
    : "Keine Kategorie";
});

const accountName = computed(() => {
  return (
    accountStore.getAccountById(props.transaction.accountId)?.name ||
    "Unbekanntes Konto"
  );
});

const recipientName = computed(() => {
  return props.transaction.recipientId
    ? recipientStore.getRecipientById(props.transaction.recipientId)?.name ||
        "Unbekannter Empfänger"
    : "Unbekannter Empfänger";
});

const getTagName = (tagId: string) => {
  return tagStore.getTagById(tagId)?.name || "";
};
</script>

<template>
  <div class="card border border-base-200 shadow-none p-4">
    <div class="space-y-2">
      <div>
        <span class="text-sm text-gray-500">Datum:</span>
        <div>{{ formatDate(transaction.date) }}</div>
      </div>

      <div>
        <span class="text-sm text-gray-500">Konto:</span>
        <div>{{ accountName }}</div>
      </div>

      <div>
        <span class="text-sm text-gray-500">Empfänger:</span>
        <div>{{ recipientName }}</div>
      </div>

      <div>
        <span class="text-sm text-gray-500">Kategorie:</span>
        <div>{{ categoryName }}</div>
      </div>

      <div v-if="transaction.note">
        <span class="text-sm text-gray-500">Notiz:</span>
        <div class="whitespace-pre-wrap">{{ transaction.note }}</div>
      </div>

      <div v-if="transaction.tagIds.length > 0">
        <span class="text-sm text-gray-500">Tags:</span>
        <div class="flex flex-wrap gap-1 mt-1">
          <span
            v-for="tagId in transaction.tagIds"
            :key="tagId"
            class="badge badge-outline"
          >
            {{ getTagName(tagId) }}
          </span>
        </div>
      </div>

      <div>
        <span class="text-sm text-gray-500">Betrag:</span>
        <div class="text-lg font-semibold">
          <CurrencyDisplay :amount="transaction.amount" :show-zero="true" />
        </div>
      </div>
    </div>
  </div>
</template>
