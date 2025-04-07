<!-- Datei: src/components/budget/BudgetMonthCard.vue -->
<script setup lang="ts">
/**
 * Pfad zur Komponente: src/components/budget/BudgetMonthCard.vue
 * Zeigt pro Monat die Budget-, Transaktions- und Saldo-Werte an.
 *
 * Komponenten-Props:
 * - month: { start: Date; end: Date; label: string } – Der aktuelle Anzeigemonat
 * - categories: Category[] – Liste aller Kategorien
 *
 * Emit-Verarbeitung:
 * Beim Rechtsklick auf eine Kategorie erscheint ein Dropdown-Menü mit zwei Einträgen.
 */
import { computed, ref, nextTick } from "vue";
import { useTransactionStore } from "../../stores/transactionStore";
import { useCategoryStore } from "../../stores/categoryStore";
import { useMonthlyBalanceStore } from "@/stores/monthlyBalanceStore";
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
const monthlyBalanceStore = useMonthlyBalanceStore();

const normalizedMonthStart = new Date(toDateOnlyString(props.month.start));
const normalizedMonthEnd = new Date(toDateOnlyString(props.month.end));

const filteredTxs = computed(() =>
  transactionStore.transactions.filter(
    (tx) =>
      tx.type === TransactionType.EXPENSE ||
      tx.type === TransactionType.INCOME ||
      tx.type === TransactionType.ACCOUNTTRANSFER
  )
);

const filteredTxsForSaldo = computed(() =>
  transactionStore.transactions.filter(
    (tx) =>
      tx.type === TransactionType.EXPENSE ||
      tx.type === TransactionType.INCOME ||
      tx.type === TransactionType.ACCOUNTTRANSFER ||
      tx.type === TransactionType.CATEGORYTRANSFER
  )
);

const availableFundsCategory = categoryStore.getAvailableFundsCategory();
const isVerfuegbareMittel = (cat: Category) =>
  availableFundsCategory?.id === cat.id;

function aggregateExpense(cat: Category) {
  const startBalanceInfo =
    monthlyBalanceStore.getLatestPersistedCategoryBalance(
      cat.id,
      normalizedMonthStart
    ) || { balance: cat.startBalance || 0, date: normalizedMonthStart };
  const parentDataSaldo = calculateCategorySaldo(
    filteredTxsForSaldo.value,
    cat.id,
    normalizedMonthStart,
    normalizedMonthEnd,
    startBalanceInfo
  );
  const parentDataTrans = calculateCategorySaldo(
    filteredTxs.value,
    cat.id,
    normalizedMonthStart,
    normalizedMonthEnd,
    startBalanceInfo
  );
  let agg = {
    budgeted: parentDataSaldo.budgeted,
    spent: parentDataTrans.spent,
    saldo: parentDataSaldo.saldo,
  };
  const children = categoryStore
    .getChildCategories(cat.id)
    .filter((c) => c.isActive && !isVerfuegbareMittel(c));
  children.forEach((child) => {
    const childStartBalanceInfo =
      monthlyBalanceStore.getLatestPersistedCategoryBalance(
        child.id,
        normalizedMonthStart
      ) || { balance: child.startBalance || 0, date: normalizedMonthStart };
    const childDataSaldo = calculateCategorySaldo(
      filteredTxsForSaldo.value,
      child.id,
      normalizedMonthStart,
      normalizedMonthEnd,
      childStartBalanceInfo
    );
    const childDataTrans = calculateCategorySaldo(
      filteredTxs.value,
      child.id,
      normalizedMonthStart,
      normalizedMonthEnd,
      childStartBalanceInfo
    );
    agg.budgeted += childDataSaldo.budgeted;
    agg.spent += childDataTrans.spent;
    agg.saldo += childDataSaldo.saldo;
  });
  return agg;
}

function aggregateIncome(cat: Category) {
  const startBalanceInfo =
    monthlyBalanceStore.getLatestPersistedCategoryBalance(
      cat.id,
      normalizedMonthStart
    ) || { balance: cat.startBalance || 0, date: normalizedMonthStart };
  const parentDataSaldo = calculateIncomeCategorySaldo(
    filteredTxsForSaldo.value,
    cat.id,
    normalizedMonthStart,
    normalizedMonthEnd,
    startBalanceInfo
  );
  const parentDataTrans = calculateIncomeCategorySaldo(
    filteredTxs.value,
    cat.id,
    normalizedMonthStart,
    normalizedMonthEnd,
    startBalanceInfo
  );
  let agg = {
    budgeted: parentDataSaldo.budgeted,
    spent: parentDataTrans.spent,
    saldo: parentDataSaldo.saldo,
  };
  const children = categoryStore
    .getChildCategories(cat.id)
    .filter((c) => c.isActive && !isVerfuegbareMittel(c));
  children.forEach((child) => {
    const childStartBalanceInfo =
      monthlyBalanceStore.getLatestPersistedCategoryBalance(
        child.id,
        normalizedMonthStart
      ) || { balance: child.startBalance || 0, date: normalizedMonthStart };
    const childDataSaldo = calculateIncomeCategorySaldo(
      filteredTxsForSaldo.value,
      child.id,
      normalizedMonthStart,
      normalizedMonthEnd,
      childStartBalanceInfo
    );
    const childDataTrans = calculateIncomeCategorySaldo(
      filteredTxs.value,
      child.id,
      normalizedMonthStart,
      normalizedMonthEnd,
      childStartBalanceInfo
    );
    agg.budgeted += childDataSaldo.budgeted;
    agg.spent += childDataTrans.spent;
    agg.saldo += childDataSaldo.saldo;
  });
  return agg;
}

const isCurrentMonth = computed(() => {
  const now = new Date();
  return (
    now.getFullYear() === props.month.start.getFullYear() &&
    now.getMonth() === props.month.start.getMonth()
  );
});

const sumExpensesSummary = computed(() => {
  let agg = { budgeted: 0, spentMiddle: 0, saldoFull: 0 };
  props.categories
    .filter(
      (c) =>
        c.isActive &&
        !c.isIncomeCategory &&
        !c.parentCategoryId &&
        !isVerfuegbareMittel(c)
    )
    .forEach((cat) => {
      const data = aggregateExpense(cat);
      agg.budgeted += data.budgeted;
      agg.spentMiddle += data.spent;
      agg.saldoFull += data.saldo;
    });
  return agg;
});

const sumIncomesSummary = computed(() => {
  let agg = { budgeted: 0, spentMiddle: 0, saldoFull: 0 };
  props.categories
    .filter(
      (c) =>
        c.isActive &&
        c.isIncomeCategory &&
        !c.parentCategoryId &&
        !isVerfuegbareMittel(c)
    )
    .forEach((cat) => {
      const data = aggregateIncome(cat);
      agg.budgeted += data.budgeted;
      agg.spentMiddle += data.spent;
      agg.saldoFull += data.saldo;
    });
  return agg;
});

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
  const startBalanceInfo =
    monthlyBalanceStore.getLatestPersistedCategoryBalance(
      cat.id,
      normalizedMonthStart
    ) || { balance: cat.startBalance || 0, date: normalizedMonthStart };
  const amountValue = Math.abs(
    calculateCategorySaldo(
      transactionStore.transactions,
      cat.id,
      normalizedMonthStart,
      normalizedMonthEnd,
      startBalanceInfo
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
    <!-- Bestehender Inhalt -->
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
        <!-- Überschrift Ausgaben (Aggregatsumme) -->
        <div class="p-2 font-bold border-b border-base-300 mt-2">
          <div class="grid grid-cols-3 font-bold">
            <div class="text-right">
              <CurrencyDisplay
                :amount="sumExpensesSummary.budgeted"
                :as-integer="true"
              />
            </div>
            <div class="text-right">
              <CurrencyDisplay
                :amount="sumExpensesSummary.spentMiddle"
                :as-integer="true"
              />
            </div>
            <div class="text-right">
              <CurrencyDisplay
                :amount="sumExpensesSummary.saldoFull"
                :as-integer="true"
              />
            </div>
          </div>
        </div>
        <!-- Liste der Ausgabenkategorien -->
        <div class="grid grid-rows-auto">
          <template
            v-for="cat in props.categories.filter(
              (c) =>
                c.isActive &&
                !c.isIncomeCategory &&
                !c.parentCategoryId &&
                !isVerfuegbareMittel(c)
            )"
            :key="cat.id"
          >
            <div
              class="grid grid-cols-3 p-2 border-b border-base-200"
              @contextmenu="openDropdown($event, cat)"
            >
              <div class="text-right">
                <CurrencyDisplay
                  :amount="Math.abs(aggregateExpense(cat).budgeted)"
                  :as-integer="true"
                  :show-sign="false"
                  :class="
                    aggregateExpense(cat).budgeted < 0 ? 'text-error' : ''
                  "
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
                      Math.abs(
                        calculateCategorySaldo(
                          filteredTxsForSaldo,
                          child.id,
                          normalizedMonthStart,
                          normalizedMonthEnd,
                          monthlyBalanceStore.getLatestPersistedCategoryBalance(
                            child.id,
                            normalizedMonthStart
                          ) || {
                            balance: child.startBalance || 0,
                            date: normalizedMonthStart,
                          }
                        ).budgeted
                      )
                    "
                    :as-integer="true"
                    :show-sign="false"
                    :class="
                      calculateCategorySaldo(
                        filteredTxsForSaldo,
                        child.id,
                        normalizedMonthStart,
                        normalizedMonthEnd,
                        monthlyBalanceStore.getLatestPersistedCategoryBalance(
                          child.id,
                          normalizedMonthStart
                        ) || {
                          balance: child.startBalance || 0,
                          date: normalizedMonthStart,
                        }
                      ).budgeted < 0
                        ? 'text-error'
                        : ''
                    "
                  />
                </div>
                <div class="text-right">
                  <CurrencyDisplay
                    :amount="
                      calculateCategorySaldo(
                        filteredTxs,
                        child.id,
                        normalizedMonthStart,
                        normalizedMonthEnd,
                        monthlyBalanceStore.getLatestPersistedCategoryBalance(
                          child.id,
                          normalizedMonthStart
                        ) || {
                          balance: child.startBalance || 0,
                          date: normalizedMonthStart,
                        }
                      ).spent
                    "
                    :as-integer="true"
                  />
                </div>
                <div class="text-right">
                  <CurrencyDisplay
                    :amount="
                      calculateCategorySaldo(
                        filteredTxsForSaldo,
                        child.id,
                        normalizedMonthStart,
                        normalizedMonthEnd,
                        monthlyBalanceStore.getLatestPersistedCategoryBalance(
                          child.id,
                          normalizedMonthStart
                        ) || {
                          balance: child.startBalance || 0,
                          date: normalizedMonthStart,
                        }
                      ).saldo
                    "
                    :as-integer="true"
                  />
                </div>
              </div>
            </template>
          </template>
        </div>
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
        <!-- Überschrift Einnahmen (Aggregatsumme) -->
        <div class="p-2 font-bold border-b border-base-300 mt-4">
          <div class="grid grid-cols-3 font-bold">
            <div class="text-right">
              <CurrencyDisplay
                :amount="sumIncomesSummary.budgeted"
                :as-integer="true"
                class="text-success"
              />
            </div>
            <div class="text-right">
              <CurrencyDisplay
                :amount="sumIncomesSummary.spentMiddle"
                :as-integer="true"
              />
            </div>
            <div class="text-right">
              <CurrencyDisplay
                :amount="sumIncomesSummary.saldoFull"
                :as-integer="true"
              />
            </div>
          </div>
        </div>
        <div class="grid grid-rows-auto">
          <template
            v-for="cat in props.categories.filter(
              (c) =>
                c.isActive &&
                c.isIncomeCategory &&
                !c.parentCategoryId &&
                !isVerfuegbareMittel(c)
            )"
            :key="cat.id"
          >
            <div class="grid grid-cols-3 p-2 border-b border-base-200">
              <div class="text-right">
                <CurrencyDisplay
                  :amount="aggregateIncome(cat).budgeted"
                  :as-integer="true"
                  class="text-success"
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
                        filteredTxsForSaldo,
                        child.id,
                        normalizedMonthStart,
                        normalizedMonthEnd,
                        monthlyBalanceStore.getLatestPersistedCategoryBalance(
                          child.id,
                          normalizedMonthStart
                        ) || {
                          balance: child.startBalance || 0,
                          date: normalizedMonthStart,
                        }
                      ).budgeted
                    "
                    :as-integer="true"
                    class="text-success"
                  />
                </div>
                <div class="text-right">
                  <CurrencyDisplay
                    :amount="
                      calculateIncomeCategorySaldo(
                        filteredTxs,
                        child.id,
                        normalizedMonthStart,
                        normalizedMonthEnd,
                        monthlyBalanceStore.getLatestPersistedCategoryBalance(
                          child.id,
                          normalizedMonthStart
                        ) || {
                          balance: child.startBalance || 0,
                          date: normalizedMonthStart,
                        }
                      ).spent
                    "
                    :as-integer="true"
                  />
                </div>
                <div class="text-right">
                  <CurrencyDisplay
                    :amount="
                      calculateIncomeCategorySaldo(
                        filteredTxsForSaldo,
                        child.id,
                        normalizedMonthStart,
                        normalizedMonthEnd,
                        monthlyBalanceStore.getLatestPersistedCategoryBalance(
                          child.id,
                          normalizedMonthStart
                        ) || {
                          balance: child.startBalance || 0,
                          date: normalizedMonthStart,
                        }
                      ).saldo
                    "
                    :as-integer="true"
                  />
                </div>
              </div>
            </template>
          </template>
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
            showTransferModal = false;
          }
        "
      />
    </div>
  </div>
</template>

<style scoped>
/* Keine zusätzlichen Styles benötigt */
</style>
