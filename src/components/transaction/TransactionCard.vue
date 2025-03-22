<script setup lang="ts">
import { defineProps, computed } from "vue";
import { Transaction, TransactionType } from "../../types";
import { useCategoryStore } from "../../stores/categoryStore";
import { useTagStore } from "../../stores/tagStore";
import { useRecipientStore } from "../../stores/recipientStore";
import { useTransactionStore } from "../../stores/transactionStore";
import CurrencyDisplay from "../ui/CurrencyDisplay.vue";
import { formatDate } from "../../utils/formatters";

// Beschreibung der Komponente
/**
 * Pfad zur Komponente: components/transaction/TransactionCard.vue
 * Diese Komponente stellt eine einzelne Transaktionskarte im horizontalen Layout dar.
 * Komponenten-Props:
 * - transaction: Transaction - Die Transaktion, die angezeigt wird.
 *
 * Emits:
 * - Keine Emits vorhanden.
 */

const props = defineProps<{ transaction: Transaction }>();

const categoryStore = useCategoryStore();
const tagStore = useTagStore();
const recipientStore = useRecipientStore();
const transactionStore = useTransactionStore();

const categoryName = computed(() =>
  props.transaction.categoryId
    ? categoryStore.getCategoryById(props.transaction.categoryId)?.name ||
      "Keine Kategorie"
    : "Keine Kategorie"
);

const recipientName = computed(() =>
  props.transaction.recipientId
    ? recipientStore.getRecipientById(props.transaction.recipientId)?.name ||
      "Unbekannter Empfänger"
    : "Unbekannter Empfänger"
);

const getTagName = (tagId: string) => tagStore.getTagById(tagId)?.name || "";

// Computed Property für das Icon vor dem Betrag
const transactionIcon = computed(() => {
  if (props.transaction.type === TransactionType.TRANSFER)
    return "mdi:bank-transfer";
  if (props.transaction.type === TransactionType.EXPENSE)
    return "mdi:cash-minus";
  if (props.transaction.type === TransactionType.INCOME) return "mdi:cash-plus";
  return "mdi:cash";
});

// Toggle für Abgleich
const toggleReconciled = () => {
  transactionStore.updateTransaction(props.transaction.id, {
    reconciled: !props.transaction.reconciled,
  });
};
</script>

<template>
  <div
    class="card rounded-md border border-base-300 bg-base-100 shadow-md hover:bg-base-200 transition duration-150"
  >
    <div class="flex items-stretch px-2 p-2 space-x-2">
      <!-- Checkbox für Batchverarbeitung -->
      <div class="flex flex-col justify-center pt-1">
        <input type="checkbox" class="checkbox checkbox-sm" />
      </div>

      <!-- Hauptbereich -->
      <div class="flex flex-col flex-grow space-y-1">
        <!-- Empfänger + Betrag -->
        <div class="flex justify-between items-start">
          <div class="font-semibold text-base">{{ recipientName }}</div>
          <div class="flex items-center space-x-1">
            <!-- Checkbox für Abgleich -->
            <div class="flex items-center">
              <input
                type="checkbox"
                class="checkbox checkbox-xs rounded-full"
                :checked="transaction.reconciled"
                @change="toggleReconciled"
              />
            </div>
            <Icon
              :icon="transactionIcon"
              class="text-base mx-1 text-neutral/70"
            />
            <CurrencyDisplay
              :amount="transaction.amount"
              class="text-right text-base font-semibold whitespace-nowrap"
              :show-zero="true"
              :class="{
                'text-warning': transaction.type === TransactionType.TRANSFER,
              }"
            />
          </div>
        </div>

        <!-- Notiz und Laufender Kontosaldo-->
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <div
              v-if="transaction.note"
              class="text-sm text-gray-500 whitespace-pre-wrap"
            >
              {{ transaction.note }}
            </div>
          </div>
          <div
            class="flex items-center justify-end"
            :class="{ 'ml-auto': !transaction.note }"
          >
            <Icon
              icon="mdi:scale-balance"
              class="text-base mx-1 text-neutral/70"
            />
            <CurrencyDisplay
              :amount="1000.5"
              class="text-sm text-right text-gray-500 whitespace-nowrap"
              :show-zero="true"
            />
          </div>
        </div>

        <!-- Datum, Wertstellung, Kategorie -->
        <div class="text-xs text-neutral mt-1 flex items-center flex-wrap">
          <!-- Gruppe 1 -->
          <div class="flex items-center">
            <Icon icon="mdi:calendar-import" class="pr-1 text-lg" />
            <div class="text-sm">{{ formatDate(transaction.date) }}</div>
          </div>

          <Icon icon="mdi:square-medium" class="text-base mx-1" />

          <!-- Gruppe 2 -->
          <div class="flex items-center">
            <Icon icon="mdi:calendar-check" class="pr-1 text-lg" />
            <div class="text-sm">{{ formatDate(transaction.valueDate) }}</div>
          </div>

          <Icon icon="mdi:square-medium" class="text-base mx-1" />

          <!-- Gruppe 3 -->
          <div class="flex items-center">
            <Icon icon="mdi:category" class="pr-1 text-lg" />
            <div class="text-sm">{{ categoryName }}</div>
          </div>
        </div>

        <!-- Tags -->
        <div
          v-if="transaction.tagIds.length > 0"
          class="flex flex-wrap gap-1 mt-1"
        >
          <span
            v-for="tagId in transaction.tagIds"
            :key="tagId"
            :class="[
              'badge',
              'rounded-full',
              'text-xs',
              { 'badge-secondary': !tagStore.getTagById(tagId)?.color },
            ]"
            :style="
              tagStore.getTagById(tagId)?.color
                ? {
                    backgroundColor: tagStore.getTagById(tagId).color,
                    color: '#fff',
                  }
                : {}
            "
          >
            {{ getTagName(tagId) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
