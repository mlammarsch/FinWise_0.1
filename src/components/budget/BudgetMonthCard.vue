<script setup lang="ts">
/**
 * Pfad zur Komponente: src/components/budget/BudgetMonthCard.vue
 * Zeigt pro Monat die Budget-, Transaktions- und Saldo-Werte an.
 *
 * Komponenten-Props:
 * - month: { start: Date; end: Date; label: string } – Der aktuelle Anzeigemonat
 * - categories: Category[] – Liste aller Kategorien
 * - expanded: Set<string> – IDs der aufgeklappten Kategorien
 *
 * Emit-Verarbeitung:
 * Beim Rechtsklick auf eine Kategorie erscheint ein Dropdown-Menü (mit z‑40 und w-40)
 * mit zwei Einträgen:
 * 1. "Fülle auf von …": Modus "fill" – übernimmt den offenen Saldo der geklickten Kategorie.
 * 2. "Transferiere zu …": Modus "transfer" – Betrag wird auf 0 gesetzt, Quell fix = geklickte Kategorie.
 * Beide Optionen öffnen das Transfer-Modal mit entsprechender Vorbefüllung.
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
  expanded: Set<string>;
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

const sumExpensesSummary = computed(() => {
  let budgeted = 0,
    spentMiddle = 0,
    saldoFull = 0;
  const txsMiddle = filteredTxs.value;
  const txsFull = transactionStore.transactions;
  for (const cat of props.categories.filter(
    (c) =>
      c.isActive &&
      !c.isIncomeCategory &&
      !c.parentCategoryId &&
      !isVerfuegbareMittel(c)
  )) {
    const dataMiddle = calculateCategorySaldo(
      txsMiddle,
      cat.id,
      normalizedMonthStart,
      normalizedMonthEnd
    );
    const dataFull = calculateCategorySaldo(
      txsFull,
      cat.id,
      normalizedMonthStart,
      normalizedMonthEnd
    );
    budgeted += dataMiddle.budgeted;
    spentMiddle += dataMiddle.spent;
    saldoFull += dataFull.saldo;
    for (const child of cat.children || []) {
      if (child.isActive && !isVerfuegbareMittel(child)) {
        const childDataMiddle = calculateCategorySaldo(
          txsMiddle,
          child.id,
          normalizedMonthStart,
          normalizedMonthEnd
        );
        const childDataFull = calculateCategorySaldo(
          txsFull,
          child.id,
          normalizedMonthStart,
          normalizedMonthEnd
        );
        budgeted += childDataMiddle.budgeted;
        spentMiddle += childDataMiddle.spent;
        saldoFull += childDataFull.saldo;
      }
    }
  }
  return { budgeted, spentMiddle, saldoFull };
});

const sumIncomesSummary = computed(() => {
  let budgeted = 0,
    spentMiddle = 0,
    saldoFull = 0;
  const txsMiddle = filteredTxs.value;
  const txsFull = transactionStore.transactions;
  for (const cat of props.categories.filter(
    (c) =>
      c.isActive &&
      c.isIncomeCategory &&
      !c.parentCategoryId &&
      !isVerfuegbareMittel(c)
  )) {
    const dataMiddle = calculateIncomeCategorySaldo(
      txsMiddle,
      cat.id,
      normalizedMonthStart,
      normalizedMonthEnd
    );
    const dataFull = calculateIncomeCategorySaldo(
      txsFull,
      cat.id,
      normalizedMonthStart,
      normalizedMonthEnd
    );
    budgeted += dataMiddle.budgeted;
    spentMiddle += dataMiddle.spent;
    saldoFull += dataFull.saldo;
    for (const child of cat.children || []) {
      if (child.isActive && !isVerfuegbareMittel(child)) {
        const childDataMiddle = calculateIncomeCategorySaldo(
          txsMiddle,
          child.id,
          normalizedMonthStart,
          normalizedMonthEnd
        );
        const childDataFull = calculateIncomeCategorySaldo(
          txsFull,
          child.id,
          normalizedMonthStart,
          normalizedMonthEnd
        );
        budgeted += childDataMiddle.budgeted;
        spentMiddle += childDataMiddle.spent;
        saldoFull += childDataFull.saldo;
      }
    }
  }
  return { budgeted, spentMiddle, saldoFull };
});

// Neuer Computed: Prüft, ob der angezeigte Monat aktuell ist
const isCurrentMonth = computed(() => {
  const now = new Date();
  return (
    now.getFullYear() === props.month.start.getFullYear() &&
    now.getMonth() === props.month.start.getMonth()
  );
});

// Computed für Divider-Farbe
const dividerColorClass = computed(() => {
  return isCurrentMonth.value
    ? "bg-accent opacity-75 border-1 border-accent/75"
    : "bg-base-300";
});

// Zustand für Transfer-Modal und Dropdown
const showTransferModal = ref(false);
const modalData = ref<{
  mode: "fill" | "transfer";
  clickedCategory: Category | null;
  amount: number;
} | null>(null);

// Für exakte Positionierung: Container als relative
const containerRef = ref<HTMLElement | null>(null);
const showDropdown = ref(false);
const dropdownX = ref(0);
const dropdownY = ref(0);
const dropdownRef = ref<HTMLElement | null>(null);

function openDropdown(event: MouseEvent, cat: Category) {
  event.preventDefault();
  // Berechne relative Position im Container
  if (containerRef.value) {
    const rect = containerRef.value.getBoundingClientRect();
    dropdownX.value = event.clientX - rect.left;
    dropdownY.value = event.clientY - rect.top;
  } else {
    dropdownX.value = event.clientX;
    dropdownY.value = event.clientY;
  }
  modalData.value = {
    mode: "transfer", // Default mode
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

// Option 1: "Fülle auf von …"
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
  showTransferModal.value = true; // Direkt – kein nextTick nötig
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
  showTransferModal.value = true; // Direkt
}
</script>

<template>
  <div class="flex w-full">
    <!-- Vertikaler Divider -->
    <div class="p-1">
      <div
        class="w-px h-full"
        :class="dividerColorClass"
      ></div>
    </div>
    <!-- Bestehender Inhalt -->
    <div class="flex-grow">
      <div
        ref="containerRef"
        class="relative w-full p-1 rounded-lg"
      >
        <!-- Tabellenheader -->
        <div class="sticky top-0 bg-base-100 z-20 p-2 border-b border-base-300">
          <div class="grid grid-cols-3">
            <div class="text-right font-bold">Budget</div>
            <div class="text-right font-bold">Transakt.</div>
            <div class="text-right font-bold">Saldo</div>
          </div>
        </div>
        <!-- Überschrift Ausgaben -->
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
        <!-- Liste der Kategorien -->
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
                  :amount="
                    calculateCategorySaldo(
                      filteredTxs,
                      cat.id,
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
                      cat.id,
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
                      cat.id,
                      normalizedMonthStart,
                      normalizedMonthEnd
                    ).saldo
                  "
                  :as-integer="true"
                />
              </div>
            </div>
            <template v-if="props.expanded.has(cat.id)">
              <div
                v-for="child in cat.children.filter(
                  (c) => c.isActive && !isVerfuegbareMittel(c)
                )"
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
              <button
                class="btn btn-ghost btn-sm w-full"
                @click="optionFill"
              >
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
        <!-- Überschrift Einnahmen -->
        <div class="p-2 font-bold border-b border-base-300 mt-4">
          <div class="grid grid-cols-3 font-bold">
            <div class="text-right">
              <CurrencyDisplay
                :amount="sumIncomesSummary.budgeted"
                :as-integer="true"
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
                  :amount="
                    calculateIncomeCategorySaldo(
                      filteredTxs,
                      cat.id,
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
                      cat.id,
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
                      cat.id,
                      normalizedMonthStart,
                      normalizedMonthEnd
                    ).saldo
                  "
                  :as-integer="true"
                />
              </div>
            </div>
            <template v-if="props.expanded.has(cat.id)">
              <div
                v-for="child in cat.children.filter(
                  (c) => c.isActive && !isVerfuegbareMittel(c)
                )"
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
