<script setup lang="ts">
import { computed, ref } from "vue";
import { Transaction, TransactionType } from "../../types";
import { useAccountStore } from "../../stores/accountStore";
import { useCategoryStore } from "../../stores/categoryStore";
import { useTagStore } from "../../stores/tagStore";
import { useRecipientStore } from "../../stores/recipientStore";
import { formatDate } from "../../utils/formatters";
import CurrencyDisplay from "../ui/CurrencyDisplay.vue";
import { Icon } from "@iconify/vue";

const props = defineProps<{
  transactions: Transaction[];
  showAccount?: boolean;
}>();

const accountStore = useAccountStore();
const categoryStore = useCategoryStore();
const tagStore = useTagStore();
const recipientStore = useRecipientStore();

const sortKey = ref<keyof Transaction>("date");
const sortOrder = ref<"asc" | "desc">("desc");

function getAccountName(accountId: string): string {
  return accountStore.getAccountById(accountId)?.name || "Unbekanntes Konto";
}

function getCategoryName(categoryId: string | undefined): string {
  return categoryId
    ? categoryStore.getCategoryById(categoryId)?.name || "-"
    : "-";
}

function getRecipientName(recipientId: string | undefined): string {
  return recipientId
    ? recipientStore.getRecipientById(recipientId)?.name ||
        "Unbekannter Empfänger"
    : "Unbekannter Empfänger";
}

function sortBy(key: keyof Transaction) {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === "asc" ? "desc" : "asc";
  } else {
    sortKey.value = key;
    sortOrder.value = "asc";
  }
}

const sortedTransactions = computed(() => {
  const sorted = [...props.transactions];
  if (sortKey.value) {
    sorted.sort((a, b) => {
      const aValue = a[sortKey.value!];
      const bValue = b[sortKey.value!];

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortOrder.value === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortOrder.value === "asc" ? aValue - bValue : bValue - aValue;
      }
      return 0;
    });
  }
  return sorted;
});
</script>

<template>
  <div class="overflow-x-auto">
    <table class="table w-full">
      <thead>
        <tr>
          <th @click="sortBy('date')" class="cursor-pointer">
            <div class="flex items-center">
              Datum
              <Icon
                v-if="sortKey === 'date'"
                :icon="sortOrder === 'asc' ? 'mdi:arrow-up' : 'mdi:arrow-down'"
                class="ml-1 text-sm"
              />
            </div>
          </th>
          <th
            v-if="showAccount"
            @click="sortBy('accountId')"
            class="cursor-pointer"
          >
            <div class="flex items-center">
              Konto
              <Icon
                v-if="sortKey === 'accountId'"
                :icon="sortOrder === 'asc' ? 'mdi:arrow-up' : 'mdi:arrow-down'"
                class="ml-1 text-sm"
              />
            </div>
          </th>
          <th @click="sortBy('recipientId')" class="cursor-pointer">
            <div class="flex items-center">
              Empfänger
              <Icon
                v-if="sortKey === 'recipientId'"
                :icon="sortOrder === 'asc' ? 'mdi:arrow-up' : 'mdi:arrow-down'"
                class="ml-1 text-sm"
              />
            </div>
          </th>
          <th @click="sortBy('categoryId')" class="cursor-pointer">
            <div class="flex items-center">
              Kategorie
              <Icon
                v-if="sortKey === 'categoryId'"
                :icon="sortOrder === 'asc' ? 'mdi:arrow-up' : 'mdi:arrow-down'"
                class="ml-1 text-sm"
              />
            </div>
          </th>
          <th>Tags</th>
          <th @click="sortBy('amount')" class="text-right cursor-pointer">
            <div class="flex items-center justify-end">
              Betrag
              <Icon
                v-if="sortKey === 'amount'"
                :icon="sortOrder === 'asc' ? 'mdi:arrow-up' : 'mdi:arrow-down'"
                class="ml-1 text-sm"
              />
            </div>
          </th>
          <th class="text-right">Aktionen</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="tx in sortedTransactions" :key="tx.id">
          <td>{{ formatDate(tx.date) }}</td>
          <td v-if="showAccount">{{ getAccountName(tx.accountId) }}</td>
          <td>
            <span v-if="tx.type === TransactionType.TRANSFER">
              {{
                accountStore.getAccountById(tx.transferToAccountId)?.name ||
                "Unbekanntes Konto"
              }}
            </span>
            <span v-else>
              {{ getRecipientName(tx.recipientId) }}
            </span>
          </td>
          <td>{{ getCategoryName(tx.categoryId) }}</td>
          <td>
            <div class="flex flex-wrap gap-1">
              <span
                v-for="tagId in tx.tagIds"
                :key="tagId"
                class="badge badge-soft badge-secondary rounded-2xl"
              >
                {{ tagStore.getTagById(tagId)?.name || "Unbekanntes Tag" }}
              </span>
            </div>
          </td>
          <td class="text-right">
            <CurrencyDisplay
              :amount="tx.amount"
              :show-zero="true"
              :class="{ 'text-warning': tx.type === TransactionType.TRANSFER }"
            />
          </td>
          <td class="text-right">
            <div class="flex justify-end space-x-1">
              <button class="btn btn-ghost btn-xs" @click="$emit('view', tx)">
                <Icon icon="mdi:eye" class="text-base" />
              </button>
              <button class="btn btn-ghost btn-xs" @click="$emit('edit', tx)">
                <Icon icon="mdi:pencil" class="text-base" />
              </button>
              <button
                class="btn btn-ghost btn-xs text-error"
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
</template>
