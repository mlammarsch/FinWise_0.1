<!-- Datei: src/components/budget/BudgetMonthCard.vue (vollständig) -->
<script setup lang="ts">
/**
 * Pfad zur Komponente: src/components/budget/BudgetMonthCard.vue
 * Zeigt pro Monat die Budget-, Transaktions- und Saldo-Werte an, gruppiert nach Kategoriegruppen.
 *
 * Komponenten-Props:
 * - month: { start: Date; end: Date; label: string } – Der aktuelle Anzeigemonat
 * - categories: Category[] – Liste aller Kategorien
 *
 * Beim Rechtsklick auf eine Kategorie erscheint ein Dropdown-Menü mit zwei Einträgen.
 */
import { computed, ref, nextTick } from "vue";
import { useTransactionStore } from "../../stores/transactionStore";
import { useCategoryStore } from "../../stores/categoryStore";
import { Category, TransactionType } from "../../types";
import CurrencyDisplay from "../ui/CurrencyDisplay.vue";
import {
  calculateCategorySaldo,
  calculateIncomeCategorySaldo,
} from "@/utils/runningBalances";
import { toDateOnlyString } from "@/utils/formatters";
import CategoryTransferModal from "./CategoryTransferModal.vue";
import { addCategoryTransfer } from "@/utils/categoryTransfer";
import { debugLog } from "@/utils/logger";

const props = defineProps<{
  month: { start: Date; end: Date; label: string };
  categories: Category[];
}>();

const transactionStore = useTransactionStore();
const categoryStore = useCategoryStore();

// Normierung der Monatsdaten
const normalizedMonthStart = new Date(toDateOnlyString(props.month.start));
const normalizedMonthEnd = new Date(toDateOnlyString(props.month.end));

// Filter: Buchungen (ohne CATEGORYTRANSFER)
const filteredTxs = computed(() =>
  transactionStore.transactions.filter(
    (tx) =>
      tx.type === TransactionType.EXPENSE ||
      tx.type === TransactionType.INCOME ||
      tx.type === TransactionType.ACCOUNTTRANSFER
  )
);

const availableFundsCategory = categoryStore.getAvailableFundsCategory();
const isVerfuegbareMittel = (cat: Category) =>
  availableFundsCategory?.id === cat.id;

/**
 * Aggregiert Daten für Ausgabenkategorien (Mutter + Kinder).
 */
function aggregateExpense(cat: Category) {
  const parentData = calculateCategorySaldo(
    filteredTxs.value,
    cat.id,
    normalizedMonthStart,
    normalizedMonthEnd
  );
  let agg = {
    budgeted: parentData.budgeted,
    spent: parentData.spent,
    saldo: parentData.saldo,
  };
  const children = categoryStore
    .getChildCategories(cat.id)
    .filter((c) => c.isActive && !isVerfuegbareMittel(c));
  children.forEach((child) => {
    const childData = calculateCategorySaldo(
      filteredTxs.value,
      child.id,
      normalizedMonthStart,
      normalizedMonthEnd
    );
    agg.budgeted += childData.budgeted;
    agg.spent += childData.spent;
    agg.saldo += childData.saldo;
  });
  return agg;
}

/**
 * Aggregiert Daten für Einnahmekategorien (Mutter + Kinder).
 */
function aggregateIncome(cat: Category) {
  const parentData = calculateIncomeCategorySaldo(
    filteredTxs.value,
    cat.id,
    normalizedMonthStart,
    normalizedMonthEnd
  );
  let agg = {
    budgeted: parentData.budgeted,
    spent: parentData.spent,
    saldo: parentData.saldo,
  };
  const children = categoryStore
    .getChildCategories(cat.id)
    .filter((c) => c.isActive && !isVerfuegbareMittel(c));
  children.forEach((child) => {
    const childData = calculateIncomeCategorySaldo(
      filteredTxs.value,
      child.id,
      normalizedMonthStart,
      normalizedMonthEnd
    );
    agg.budgeted += childData.budgeted;
    agg.spent += childData.spent;
    agg.saldo += childData.saldo;
  });
  return agg;
}

// Computed: Prüft, ob der angezeigte Monat aktuell ist
const isCurrentMonth = computed(() => {
  const now = new Date();
  return (
    now.getFullYear() === props.month.start.getFullYear() &&
    now.getMonth() === props.month.start.getMonth()
  );
});

// Expense- und Income-Gruppen (sortiert)
const expenseGroups = computed(() =>
  categoryStore.categoryGroups
    .filter((g) => !g.isIncomeGroup)
    .sort((a, b) => a.sortOrder - b.sortOrder)
);
const incomeGroups = computed(() =>
  categoryStore.categoryGroups
    .filter((g) => g.isIncomeGroup)
    .sort((a, b) => a.sortOrder - b.sortOrder)
);

// Summiert alle Ausgaben-Gruppen
function groupExpense(group: any) {
  const cats = props.categories.filter(
    (c) =>
      c.isActive &&
      !c.isIncomeCategory &&
      !c.parentCategoryId &&
      c.categoryGroupId === group.id &&
      !isVerfuegbareMittel(c)
  );
  return cats.reduce(
    (agg, cat) => {
      const data = aggregateExpense(cat);
      return {
        budgeted: agg.budgeted + data.budgeted,
        spent: agg.spent + data.spent,
        saldo: agg.saldo + data.saldo,
      };
    },
    { budgeted: 0, spent: 0, saldo: 0 }
  );
}

// Summiert alle Einnahmen-Gruppen
function groupIncome(group: any) {
  const cats = props.categories.filter(
    (c) =>
      c.isActive &&
      c.isIncomeCategory &&
      !c.parentCategoryId &&
      c.categoryGroupId === group.id &&
      !isVerfuegbareMittel(c)
  );
  return cats.reduce(
    (agg, cat) => {
      const data = aggregateIncome(cat);
      return {
        budgeted: agg.budgeted + data.budgeted,
        spent: agg.spent + data.spent,
        saldo: agg.saldo + data.saldo,
      };
    },
    { budgeted: 0, spent: 0, saldo: 0 }
  );
}

// Gesamtsumme Ausgaben
const sumExpensesSummary = computed(() => {
  let agg = { budgeted: 0, spent: 0, saldo: 0 };
  expenseGroups.value.forEach((group) => {
    const groupAgg = groupExpense(group);
    agg.budgeted += groupAgg.budgeted;
    agg.spent += groupAgg.spent;
    agg.saldo += groupAgg.saldo;
  });
  return agg;
});

// Gesamtsumme Einnahmen
const sumIncomesSummary = computed(() => {
  let agg = { budgeted: 0, spent: 0, saldo: 0 };
  incomeGroups.value.forEach((group) => {
    const groupAgg = groupIncome(group);
    agg.budgeted += groupAgg.budgeted;
    agg.spent += groupAgg.spent;
    agg.saldo += groupAgg.saldo;
  });
  return agg;
});

// Transfer-Modal und Dropdown
const showTransferModal = ref(false);
const modalData = ref<{
  mode: "fill" | "transfer";
  clickedCategory: Category | null;
  amount: number;
} | null>(null);

const containerRef = ref<HTMLElement | null>(null);
const showDropdown = ref(false);
const dropdownX = ref(0);
const dropdownY = ref(0);
const dropdownRef = ref<HTMLElement | null>(null);

function openDropdown(event: MouseEvent, cat: Category) {
  event.preventDefault();
  if (containerRef.value) {
    const rect = containerRef.value.getBoundingClientRect();
    dropdownX.value = event.clientX - rect.left;
    dropdownY.value = event.clientY - rect.top;
  } else {
    dropdownX.value = event.clientX;
    dropdownY.value = event.clientY;
  }
  modalData.value = {
    mode: "transfer",
    clickedCategory: cat,
    amount: 0,
  };
  debugLog("[BudgetMonthCard] openDropdown", {
    categoryId: cat.id,
    categoryName: cat.name,
    x: dropdownX.value,
    y: dropdownY.value,
  });
  showDropdown.value = true;
  nextTick(() => {
    dropdownRef.value?.focus();
  });
}

function closeDropdown() {
  showDropdown.value = false;
}

function handleEscDropdown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    closeDropdown();
  }
}

function optionFill() {
  if (!modalData.value?.clickedCategory) return;
  const cat = modalData.value.clickedCategory;
  const amountValue = Math.abs(
    calculateCategorySaldo(
      transactionStore.transactions,
      cat.id,
      normalizedMonthStart,
      normalizedMonthEnd
    ).saldo
  );
  modalData.value = {
    mode: "fill",
    clickedCategory: cat,
    amount: amountValue,
  };
  debugLog("[BudgetMonthCard] optionFill", {
    categoryId: cat.id,
    categoryName: cat.name,
    amount: amountValue,
    mode: "fill",
  });
  closeDropdown();
  showTransferModal.value = true;
}

function optionTransfer() {
  if (!modalData.value?.clickedCategory) return;
  const cat = modalData.value.clickedCategory;
  modalData.value = {
    mode: "transfer",
    clickedCategory: cat,
    amount: 0,
  };
  debugLog("[BudgetMonthCard] optionTransfer", {
    categoryId: cat.id,
    categoryName: cat.name,
    amount: 0,
    mode: "transfer",
  });
  closeDropdown();
  showTransferModal.value = true;
}
</script>

<template>
  <div class="flex w-full">
    <!-- Vertikaler Divider -->
    <div class="p-1">
      <div
        class="w-px h-full"
        :class="
          isCurrentMonth
            ? 'bg-accent opacity-75 border-1 border-accent/75'
            : 'bg-base-300'
        "
      ></div>
    </div>

    <!-- Inhalt -->
    <div class="flex-grow">
      <div ref="containerRef" class="relative w-full p-1 rounded-lg">
        <!-- Tabellenheader -->
        <div class="sticky top-0 bg-base-100 z-20 p-2 border-b border-base-300">
          <div class="grid grid-cols-3">
            <div class="text-right font-bold">Budget</div>
            <div class="text-right font-bold">Transakt.</div>
            <div class="text-right font-bold">Saldo</div>
          </div>
        </div>

        <!-- Ausgaben -->
        <!-- Summenzeile Ausgaben -->
        <div class="p-2 border-b border-base-300 bg-base-300 mt-2">
          <div class="grid grid-cols-3">
            <div class="text-right">
              <CurrencyDisplay
                :amount="sumExpensesSummary.budgeted"
                :as-integer="true"
              />
            </div>
            <div class="text-right">
              <CurrencyDisplay
                :amount="sumExpensesSummary.spent"
                :as-integer="true"
              />
            </div>
            <div class="text-right">
              <CurrencyDisplay
                :amount="sumExpensesSummary.saldo"
                :as-integer="true"
              />
            </div>
          </div>
        </div>
        <!-- Gruppen für Ausgaben -->
        <template v-for="group in expenseGroups" :key="group.id">
          <div class="p-2 border-b border-base-300 bg-base-200 font-bold">
            <div class="grid grid-cols-3">
              <div class="text-right">
                <CurrencyDisplay
                  :amount="groupExpense(group).budgeted"
                  :as-integer="true"
                />
              </div>
              <div class="text-right">
                <CurrencyDisplay
                  :amount="groupExpense(group).spent"
                  :as-integer="true"
                />
              </div>
              <div class="text-right">
                <CurrencyDisplay
                  :amount="groupExpense(group).saldo"
                  :as-integer="true"
                />
              </div>
            </div>
          </div>

          <!-- Kategorien innerhalb der Gruppe -->
          <div
            v-for="cat in props.categories.filter(
              (c) =>
                c.isActive &&
                !c.isIncomeCategory &&
                !c.parentCategoryId &&
                c.categoryGroupId === group.id &&
                !isVerfuegbareMittel(c)
            )"
            :key="cat.id"
            class="cursor-pointer"
            @contextmenu="openDropdown($event, cat)"
          >
            <div class="grid grid-cols-3 p-2 border-b border-base-200">
              <div class="text-right">
                <CurrencyDisplay
                  :amount="aggregateExpense(cat).budgeted"
                  :as-integer="true"
                />
              </div>
              <div class="text-right">
                <CurrencyDisplay
                  :amount="aggregateExpense(cat).spent"
                  :as-integer="true"
                />
              </div>
              <div class="text-right">
                <CurrencyDisplay
                  :amount="aggregateExpense(cat).saldo"
                  :as-integer="true"
                />
              </div>
            </div>
            <template v-if="categoryStore.expandedCategories.has(cat.id)">
              <div
                v-for="child in categoryStore
                  .getChildCategories(cat.id)
                  .filter((c) => c.isActive && !isVerfuegbareMittel(c))"
                :key="child.id"
                class="grid grid-cols-3 pl-6 text-sm p-2 border-b border-base-200"
                @contextmenu="openDropdown($event, child)"
              >
                <div class="text-right">
                  <CurrencyDisplay
                    :amount="
                      calculateCategorySaldo(
                        filteredTxs,
                        child.id,
                        normalizedMonthStart,
                        normalizedMonthEnd
                      ).budgeted
                    "
                    :as-integer="true"
                  />
                </div>
                <div class="text-right">
                  <CurrencyDisplay
                    :amount="
                      calculateCategorySaldo(
                        filteredTxs,
                        child.id,
                        normalizedMonthStart,
                        normalizedMonthEnd
                      ).spent
                    "
                    :as-integer="true"
                  />
                </div>
                <div class="text-right">
                  <CurrencyDisplay
                    :amount="
                      calculateCategorySaldo(
                        transactionStore.transactions,
                        child.id,
                        normalizedMonthStart,
                        normalizedMonthEnd
                      ).saldo
                    "
                    :as-integer="true"
                  />
                </div>
              </div>
            </template>
          </div>
        </template>

        <!-- Einnahmen -->
        <!-- Summenzeile Einnahmen -->
        <div class="p-2 border-b border-base-300 bg-base-300 mt-4">
          <div class="grid grid-cols-3">
            <div class="text-right">
              <CurrencyDisplay
                :amount="sumIncomesSummary.budgeted"
                :as-integer="true"
              />
            </div>
            <div class="text-right">
              <CurrencyDisplay
                :amount="sumIncomesSummary.spent"
                :as-integer="true"
              />
            </div>
            <div class="text-right">
              <CurrencyDisplay
                :amount="sumIncomesSummary.saldo"
                :as-integer="true"
              />
            </div>
          </div>
        </div>
        <!-- Gruppen für Einnahmen -->
        <template v-for="group in incomeGroups" :key="group.id">
          <div class="p-2 border-b border-base-300 bg-base-200 font-bold">
            <div class="grid grid-cols-3">
              <div class="text-right">
                <CurrencyDisplay
                  :amount="groupIncome(group).budgeted"
                  :as-integer="true"
                />
              </div>
              <div class="text-right">
                <CurrencyDisplay
                  :amount="groupIncome(group).spent"
                  :as-integer="true"
                />
              </div>
              <div class="text-right">
                <CurrencyDisplay
                  :amount="groupIncome(group).saldo"
                  :as-integer="true"
                />
              </div>
            </div>
          </div>

          <!-- Kategorien innerhalb der Gruppe -->
          <div
            v-for="cat in props.categories.filter(
              (c) =>
                c.isActive &&
                c.isIncomeCategory &&
                !c.parentCategoryId &&
                c.categoryGroupId === group.id &&
                !isVerfuegbareMittel(c)
            )"
            :key="cat.id"
            class="cursor-pointer"
          >
            <div class="grid grid-cols-3 p-2 border-b border-base-200">
              <div class="text-right">
                <CurrencyDisplay
                  :amount="aggregateIncome(cat).budgeted"
                  :as-integer="true"
                />
              </div>
              <div class="text-right">
                <CurrencyDisplay
                  :amount="aggregateIncome(cat).spent"
                  :as-integer="true"
                />
              </div>
              <div class="text-right">
                <CurrencyDisplay
                  :amount="aggregateIncome(cat).saldo"
                  :as-integer="true"
                />
              </div>
            </div>
            <template v-if="categoryStore.expandedCategories.has(cat.id)">
              <div
                v-for="child in categoryStore
                  .getChildCategories(cat.id)
                  .filter((c) => c.isActive && !isVerfuegbareMittel(c))"
                :key="child.id"
                class="grid grid-cols-3 pl-6 text-sm p-2 border-b border-base-200"
              >
                <div class="text-right">
                  <CurrencyDisplay
                    :amount="
                      calculateIncomeCategorySaldo(
                        filteredTxs,
                        child.id,
                        normalizedMonthStart,
                        normalizedMonthEnd
                      ).budgeted
                    "
                    :as-integer="true"
                  />
                </div>
                <div class="text-right">
                  <CurrencyDisplay
                    :amount="
                      calculateIncomeCategorySaldo(
                        filteredTxs,
                        child.id,
                        normalizedMonthStart,
                        normalizedMonthEnd
                      ).spent
                    "
                    :as-integer="true"
                  />
                </div>
                <div class="text-right">
                  <CurrencyDisplay
                    :amount="
                      calculateIncomeCategorySaldo(
                        transactionStore.transactions,
                        child.id,
                        normalizedMonthStart,
                        normalizedMonthEnd
                      ).saldo
                    "
                    :as-integer="true"
                  />
                </div>
              </div>
            </template>
          </div>
        </template>

        <!-- Dropdown-Menü (per Rechtsklick) -->
        <div
          v-if="showDropdown"
          class="absolute z-40 w-40 bg-base-100 border border-base-300 rounded shadow p-2"
          :style="{ left: `${dropdownX}px`, top: `${dropdownY}px` }"
          tabindex="0"
          @keydown.escape="closeDropdown"
          @click.outside="closeDropdown"
        >
          <ul>
            <li>
              <button class="btn btn-ghost btn-sm w-full" @click="optionFill">
                Fülle auf von …
              </button>
            </li>
            <li>
              <button
                class="btn btn-ghost btn-sm w-full"
                @click="optionTransfer"
              >
                Transferiere zu …
              </button>
            </li>
          </ul>
        </div>
      </div>

      <!-- Transfer Modal -->
      <CategoryTransferModal
        v-if="showTransferModal"
        :is-open="showTransferModal"
        :month="props.month"
        :mode="modalData?.mode"
        :prefillAmount="modalData?.amount || 0"
        :preselectedCategoryId="modalData?.clickedCategory?.id"
        @close="showTransferModal = false"
        @transfer="
          (data) => {
            addCategoryTransfer(
              data.fromCategoryId,
              data.toCategoryId,
              data.amount,
              data.date,
              data.note
            );
            showTransferModal.value = false;
          }
        "
      />
    </div>
  </div>
</template>

<style scoped></style>
