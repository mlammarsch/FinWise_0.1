<script setup lang="ts">
import { defineProps, computed } from "vue";
import { Transaction, TransactionType } from "../../types";
import { useCategoryStore } from "../../stores/categoryStore";
import { useTagStore } from "../../stores/tagStore";
import { useRecipientStore } from "../../stores/recipientStore";
import { useTransactionStore } from "../../stores/transactionStore";
import CurrencyDisplay from "../ui/CurrencyDisplay.vue";
import { formatDate } from "../../utils/formatters";

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

const transactionIcon = computed(() => {
  if (props.transaction.type === TransactionType.TRANSFER)
    return "mdi:bank-transfer";
  if (props.transaction.type === TransactionType.EXPENSE)
    return "mdi:cash-minus";
  if (props.transaction.type === TransactionType.INCOME) return "mdi:cash-plus";
  return "mdi:cash";
});

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
      <div class="flex flex-col justify-center p-2">
        <input type="checkbox" class="checkbox checkbox-sm" />
      </div>

      <!-- Hauptbereich -->
      <div class="flex flex-col flex-grow space-y-1">
        <!-- Empfänger + Betrag -->
        <div class="flex justify-between items-start">
          <div class="flex items-center">
            <Icon icon="mdi:account" class="pr-1 text-xl opacity-50" />
            <div class="font-semibold text-base">{{ recipientName }}</div>
          </div>

          <div class="flex items-center space-x-1">
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
              class="text-xl mx-1 text-neutral/70 mx-2"
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

        <!-- Entweder Notiz oder Datum/Kategorie -->
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <div
              v-if="transaction.note"
              class="whitespace-pre-wrap flex items-start bg-base-200 rounded-md p-1"
            >
              <div class="flex items-center">
                <div>
                  <Icon
                    icon="mdi:speaker-notes"
                    class="text-sm ml-1 opacity-50"
                  />
                </div>
                <div class="text-sm text-gray-500 ml-2">
                  {{ transaction.note }}
                </div>
              </div>
            </div>
            <div
              v-else
              class="text-xs neutral-content flex items-center flex-wrap"
            >
              <!-- Gruppe 1 -->
              <div class="flex items-center">
                <Icon
                  icon="mdi:calendar-import"
                  class="pr-1 text-lg opacity-50"
                />
                <div class="text-sm">
                  {{ formatDate(transaction.date) }}
                </div>
              </div>

              <Icon icon="mdi:square-medium" class="text-base mx-1" />

              <!-- Gruppe 2 -->
              <div class="flex items-center">
                <Icon
                  icon="mdi:calendar-check"
                  class="pr-1 text-lg opacity-50"
                />
                <div class="text-sm">
                  {{ formatDate(transaction.valueDate) }}
                </div>
              </div>

              <Icon icon="mdi:square-medium" class="text-base mx-1" />

              <!-- Gruppe 3 -->
              <div class="flex items-center">
                <Icon icon="mdi:category" class="pr-1 text-lg opacity-50" />
                <div class="text-sm">{{ categoryName }}</div>
              </div>
            </div>
          </div>

          <div
            class="flex items-center justify-end"
            :class="{ 'ml-auto': !transaction.note }"
          >
            <Icon
              icon="mdi:scale-balance"
              class="text-base mx-2 text-neutral opacity-50"
            />
            <CurrencyDisplay
              :amount="1000.5"
              class="text-xs text-right text-gray-500 whitespace-nowrap"
              :show-zero="true"
            />
          </div>
        </div>

        <!-- Datum + Kategorie Block nur bei vorhandener Notiz -->
        <div
          v-if="transaction.note"
          class="text-xs neutral-content mt-1 flex items-center flex-wrap"
        >
          <!-- Gruppe 1 -->
          <div class="flex items-center">
            <Icon icon="mdi:calendar-import" class="pr-1 text-lg opacity-50" />
            <div class="text-sm">{{ formatDate(transaction.date) }}</div>
          </div>

          <Icon icon="mdi:square-medium" class="text-base mx-1" />

          <!-- Gruppe 2 -->
          <div class="flex items-center">
            <Icon icon="mdi:calendar-check" class="pr-1 text-lg opacity-50" />
            <div class="text-sm">{{ formatDate(transaction.valueDate) }}</div>
          </div>

          <Icon icon="mdi:square-medium" class="text-base mx-1" />

          <!-- Gruppe 3 -->
          <div class="flex items-center">
            <Icon icon="mdi:category" class="pr-1 text-lg opacity-50" />
            <div class="text-sm">{{ categoryName }}</div>
          </div>
        </div>

        <!-- Tags (immer ganz unten) -->
        <div
          v-if="transaction.tagIds.length > 0"
          class="flex flex-wrap gap-1 mt-1"
        >
          <span
            v-for="tagId in transaction.tagIds"
            :key="tagId"
            :class="[
              'badge badge-sm opacity-70',
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
