<script setup lang="ts">
import { defineProps, defineEmits, ref, computed, defineExpose } from "vue";
import { Transaction, TransactionType } from "../../types";
import { useAccountStore } from "../../stores/accountStore";
import { useCategoryStore } from "../../stores/categoryStore";
import { formatDate } from "../../utils/formatters";
import CurrencyDisplay from "../ui/CurrencyDisplay.vue";
import { Icon } from "@iconify/vue";

const props = defineProps<{
  transactions: Transaction[];
  sortKey: keyof Transaction | "";
  sortOrder: "asc" | "desc";
  viewMode?: "normal"; // grouping removed; default is "normal"
}>();

// Set default viewMode if not provided
const viewMode = computed(() => props.viewMode || "normal");

const emit = defineEmits(["edit", "delete", "sort-change"]);

const accountStore = useAccountStore();
const categoryStore = useCategoryStore();

// Computed: Exclude transfer transactions that do not change category
const displayTransactions = computed(() => {
  return props.transactions.filter((tx) => {
    if (tx.type === TransactionType.TRANSFER) {
      // Only include transfers if target category exists and is different from source category
      return tx.toCategoryId && tx.toCategoryId !== tx.categoryId;
    }
    return true;
  });
});

// Selection logic (similar to TransactionList)
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
          <!-- Selection Checkbox Header -->
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
          <!-- Category Field -->
          <th class="cursor-pointer" @click="emit('sort-change', 'categoryId')">
            <div class="flex items-center">
              Kategorie
              <Icon
                v-if="sortKey === 'categoryId'"
                :icon="sortOrder === 'asc' ? 'mdi:arrow-up' : 'mdi:arrow-down'"
                class="ml-1 text-sm"
              />
            </div>
          </th>
          <!-- Account / Target Category Field -->
          <th class="cursor-pointer" @click="emit('sort-change', 'accountId')">
            <div class="flex items-center">
              <template
                v-if="
                  displayTransactions[0] &&
                  displayTransactions[0].type === TransactionType.TRANSFER
                "
              >
                Zielkategorie
              </template>
              <template v-else> Konto </template>
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
          <!-- Note -->
          <th class="text-center cursor-pointer">
            <Icon icon="mdi:note-text-outline" class="text-lg" />
          </th>
          <!-- Actions -->
          <th class="text-right">Aktionen</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(tx, index) in displayTransactions" :key="tx.id">
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
            <template v-if="tx.type === TransactionType.TRANSFER">
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
              :class="{ 'text-warning': tx.type === TransactionType.TRANSFER }"
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
