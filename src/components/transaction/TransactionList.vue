<script setup lang="ts">
import { defineProps, defineEmits, ref, computed, defineExpose } from "vue";
import { Transaction, TransactionType } from "../../types";
import { useAccountStore } from "../../stores/accountStore";
import { useCategoryStore } from "../../stores/categoryStore";
import { useTagStore } from "../../stores/tagStore";
import { useRecipientStore } from "../../stores/recipientStore";
import { formatDate } from "../../utils/formatters";
import CurrencyDisplay from "../ui/CurrencyDisplay.vue";
import { Icon } from "@iconify/vue";
import { hexToRgba } from "../../utils/formatters";
import BadgeSoft from "../ui/BadgeSoft.vue";

const props = defineProps<{
  transactions: Transaction[];
  showAccount?: boolean;
  sortKey: keyof Transaction | "";
  sortOrder: "asc" | "desc";
}>();

const emit = defineEmits([
  "edit",
  "delete",
  "sort-change",
  "toggleReconciliation",
]);

const accountStore = useAccountStore();
const categoryStore = useCategoryStore();
const tagStore = useTagStore();
const recipientStore = useRecipientStore();

// Computed: Exclude CATEGORYTRANSFER transactions
const displayTransactions = computed(() =>
  props.transactions.filter(
    (tx) => tx.type !== TransactionType.CATEGORYTRANSFER
  )
);

// Auswahl-Logik
const selectedIds = ref<string[]>([]);
const lastSelectedIndex = ref<number | null>(null);
const currentPageIds = computed(() =>
  displayTransactions.value.map((tx) => tx.id)
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
      const id = displayTransactions.value[i].id;
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
  return displayTransactions.value.filter((tx) =>
    selectedIds.value.includes(tx.id)
  );
}

defineExpose({ getSelectedTransactions });
</script>

<template>
  <div class="overflow-x-auto">
    <table class="table w-full">
      <thead>
        <tr>
          <!-- Auswahl-Checkbox Header -->
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
          <th
            v-if="showAccount"
            @click="emit('sort-change', 'accountId')"
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
          <th
            @click="emit('sort-change', 'recipientId')"
            class="cursor-pointer"
          >
            <div class="flex items-center">
              Empfänger
              <Icon
                v-if="sortKey === 'recipientId'"
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
          <th>Tags</th>
          <th
            @click="emit('sort-change', 'amount')"
            class="text-right cursor-pointer"
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
          <!-- Neues Notiz-Feld -->
          <th class="text-center cursor-pointer flex items-center justify-end">
            <Icon icon="mdi:note-text-outline" class="text-lg" />
          </th>
          <th
            @click="emit('sort-change', 'reconciled')"
            class="text-center cursor-pointer"
          >
            <div class="flex items-center justify-center">
              <Icon icon="mdi:check-circle-outline" class="text-lg" />
              <Icon
                v-if="sortKey === 'reconciled'"
                :icon="sortOrder === 'asc' ? 'mdi:arrow-up' : 'mdi:arrow-down'"
                class="ml-1 text-sm"
              />
            </div>
          </th>
          <th class="text-right">Aktionen</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(tx, index) in displayTransactions" :key="tx.id">
          <!-- Auswahl-Checkbox in jeder Zeile -->
          <td>
            <input
              type="checkbox"
              class="checkbox checkbox-sm"
              :checked="selectedIds.includes(tx.id)"
              @click="handleCheckboxClick(tx.id, index, $event)"
            />
          </td>
          <td>{{ formatDate(tx.date) }}</td>
          <td v-if="showAccount">
            {{ accountStore.getAccountById(tx.accountId)?.name || "Unbekannt" }}
          </td>
          <td>
            <span v-if="tx.type === TransactionType.ACCOUNTTRANSFER">
              {{
                accountStore.getAccountById(tx.transferToAccountId)?.name ||
                "Unbekanntes Konto"
              }}
            </span>
            <span v-else>
              {{ recipientStore.getRecipientById(tx.recipientId)?.name || "-" }}
            </span>
          </td>
          <td>
            {{ categoryStore.getCategoryById(tx.categoryId)?.name || "-" }}
          </td>
          <td>
            <div class="flex flex-wrap gap-1">
              <BadgeSoft
                v-for="tagId in tx.tagIds"
                :key="tagId"
                :label="tagStore.getTagById(tagId)?.name || 'Unbekanntes Tag'"
                :colorIntensity="
                  tagStore.getTagById(tagId)?.color || 'secondary'
                "
                size="sm"
              />
            </div>
          </td>
          <td class="text-right">
            <CurrencyDisplay
              :amount="tx.amount"
              :show-zero="true"
              :class="{
                'text-warning': tx.type === TransactionType.ACCOUNTTRANSFER,
              }"
            />
          </td>
          <td class="text-right flex justify-end items-center mt-1">
            <template v-if="tx.note && tx.note.trim()">
              <div class="tooltip" :data-tip="tx.note">
                <Icon icon="mdi:speaker-notes" class="text-lg opacity-50" />
              </div>
            </template>
          </td>
          <td class="text-center">
            <input
              type="checkbox"
              class="checkbox checkbox-xs"
              :checked="tx.reconciled"
              @change="$emit('toggleReconciliation', tx, $event.target.checked)"
            />
          </td>
          <td class="text-right">
            <div class="flex justify-end space-x-1">
              <button
                class="btn btn-ghost btn-xs border-none"
                @click="$emit('edit', tx)"
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
</template>
