<script setup lang="ts">
import { computed } from "vue";
import { Transaction } from "../../types";
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

function getAccountName(accountId: string): string {
  return accountStore.getAccountById(accountId)?.name || "Unbekanntes Konto";
}

function getCategoryName(categoryId: string | undefined): string {
  return categoryId
    ? categoryStore.getCategoryById(categoryId)?.name || "Keine Kategorie"
    : "Keine Kategorie";
}

function getRecipientName(recipientId: string | undefined): string {
  return recipientId
    ? recipientStore.getRecipientById(recipientId)?.name ||
        "Unbekannter Empfänger"
    : "Unbekannter Empfänger";
}

function getTagNames(tagIds: string[]): string {
  return tagIds
    .map((id) => tagStore.getTagById(id)?.name || "Unbekanntes Tag")
    .join(", ");
}

const paginatedTransactions = computed(() => props.transactions);
</script>

<template>
  <div class="overflow-x-auto">
    <table class="table w-full">
      <thead>
        <tr>
          <th>Datum</th>
          <th v-if="showAccount">Konto</th>
          <th>Empfänger</th>
          <th>Kategorie</th>
          <th>Tags</th>
          <th class="text-right">Betrag</th>
          <th class="text-right">Aktionen</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="tx in paginatedTransactions" :key="tx.id">
          <td>{{ formatDate(tx.date) }}</td>
          <td v-if="showAccount">{{ getAccountName(tx.accountId) }}</td>
          <td>{{ getRecipientName(tx.recipientId) }}</td>
          <td>{{ getCategoryName(tx.categoryId) }}</td>
          <td>{{ getTagNames(tx.tagIds) }}</td>
          <td class="text-right">
            <CurrencyDisplay :amount="tx.amount" :show-zero="true" />
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
