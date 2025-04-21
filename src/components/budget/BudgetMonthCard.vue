<!-- Datei: src/components/budget/BudgetMonthCard.vue -->
<script setup lang="ts">
/**
 * Pfad zur Komponente: src/components/budget/BudgetMonthCard.vue
 * Zeigt pro Monat die Budget‑, Transaktions‑ und Saldo‑Werte an. Nutzt BudgetService.
 *
 * Props:
 * - month: { start: Date; end: Date; label: string }
 * - categories: Category[]
 *
 * Interne Logik:
 * - Rechtsklick öffnet Context‑Dropdown
 * - Dropdown schließt bei Blur (mit Fokus‑Check)
 * - Öffnen des CategoryTransferModal
 */
import { computed, ref, nextTick } from "vue";
import { useCategoryStore } from "../../stores/categoryStore";
import { Category } from "../../types";
import CurrencyDisplay from "../ui/CurrencyDisplay.vue";
import CategoryTransferModal from "./CategoryTransferModal.vue";
import { BudgetService } from "@/services/BudgetService";
import { toDateOnlyString } from "@/utils/formatters";
import { debugLog } from "@/utils/logger";

const props = defineProps<{
  month: { start: Date; end: Date; label: string };
  categories: Category[];
}>();

const categoryStore = useCategoryStore();
const budgetService = BudgetService;

// Normalisiertes Monats‑Intervall
const normalizedMonthStart = computed(
  () => new Date(toDateOnlyString(props.month.start))
);
const normalizedMonthEnd = computed(
  () => new Date(toDateOnlyString(props.month.end))
);

// „Verfügbare Mittel“-Kategorie
const availableFundsCategory = categoryStore.getAvailableFundsCategory();
const isVerfuegbareMittel = (cat: Category) =>
  availableFundsCategory?.id === cat.id;

// BudgetService‑Wrapper
function getAggregatedData(cat: Category) {
  return budgetService.getAggregatedMonthlyBudgetData(
    cat.id,
    normalizedMonthStart.value,
    normalizedMonthEnd.value
  );
}
function getSingleCategoryData(catId: string) {
  return budgetService.getAggregatedMonthlyBudgetData(
    catId,
    normalizedMonthStart.value,
    normalizedMonthEnd.value
  );
}

// Prüft, ob wir im aktuellen Monat sind
const isCurrentMonth = computed(() => {
  const now = new Date();
  return (
    now.getFullYear() === normalizedMonthStart.value.getFullYear() &&
    now.getMonth() === normalizedMonthStart.value.getMonth()
  );
});

// Gesamtsummen für Kopfzeile
const sumExpensesSummary = computed(() =>
  budgetService.getMonthlySummary(
    normalizedMonthStart.value,
    normalizedMonthEnd.value,
    "expense"
  )
);
const sumIncomesSummary = computed(() =>
  budgetService.getMonthlySummary(
    normalizedMonthStart.value,
    normalizedMonthEnd.value,
    "income"
  )
);

// Context‑Dropdown & Modal State
const showDropdown = ref(false);
const dropdownX = ref(0);
const dropdownY = ref(0);
const containerRef = ref<HTMLElement | null>(null);
const dropdownRef = ref<HTMLElement | null>(null);

const showTransferModal = ref(false);
const modalData = ref<{
  mode: "fill" | "transfer";
  clickedCategory: Category | null;
  amount: number;
} | null>(null);

/**
 * Öffnet das Context‑Dropdown an Mausposition
 */
function openDropdown(event: MouseEvent, cat: Category) {
  event.preventDefault();
  debugLog("[BudgetMonthCard] openDropdown", { category: cat });

  if (containerRef.value) {
    const rect = containerRef.value.getBoundingClientRect();
    dropdownX.value = event.clientX - rect.left;
    dropdownY.value = event.clientY - rect.top;
  } else {
    dropdownX.value = event.clientX;
    dropdownY.value = event.clientY;
  }

  modalData.value = { mode: "transfer", clickedCategory: cat, amount: 0 };
  showDropdown.value = true;
  nextTick(() => dropdownRef.value?.focus());
}

/**
 * Schließt das Dropdown
 */
function closeDropdown() {
  showDropdown.value = false;
}

/**
 * Blur‑Handler: schließt nur, wenn der neue Fokus NICHT
 * ins Dropdown hineinführt.
 */
function onDropdownBlur(e: FocusEvent) {
  const next = e.relatedTarget as HTMLElement | null;
  if (!dropdownRef.value?.contains(next)) {
    closeDropdown();
  }
}

/**
 * Option: Transfer zu…
 */
function optionTransfer() {
  if (!modalData.value?.clickedCategory) return;
  const cat = modalData.value.clickedCategory;
  modalData.value = { mode: "transfer", clickedCategory: cat, amount: 0 };
  debugLog("[BudgetMonthCard] optionTransfer", { category: cat });
  closeDropdown();
  showTransferModal.value = true;
}

/**
 * Option: Fülle auf…
 */
function optionFill() {
  if (!modalData.value?.clickedCategory) return;
  const cat = modalData.value.clickedCategory;
  const data = getAggregatedData(cat);
  const amt = data.saldo < 0 ? Math.abs(data.saldo) : 0;
  modalData.value = { mode: "fill", clickedCategory: cat, amount: amt };
  debugLog("[BudgetMonthCard] optionFill", { category: cat, amount: amt });
  closeDropdown();
  showTransferModal.value = true;
}

/**
 * Wird vom Modal emittet, um Transfer auszuführen
 */
function executeTransfer(payload: {
  transactionId?: string;
  gegentransactionId?: string;
  fromCategoryId: string;
  toCategoryId: string;
  amount: number;
  date: string;
  note: string;
}) {
  showTransferModal.value = false;
  debugLog("[BudgetMonthCard] executeTransfer", payload);
  // TODO: Persistenz via Service oder Store
}
</script>

<template>
  <div class="flex w-full">
    <!-- Linker Zeitstrich -->
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

    <div class="flex-grow">
      <div
        ref="containerRef"
        class="relative w-full p-1 rounded-lg bg-base-100"
      >
        <!-- Tabellen-Header -->
        <div class="sticky top-0 bg-base-100 z-20 p-2 border-b border-base-300">
          <div class="grid grid-cols-3">
            <div class="text-right font-bold">Budget</div>
            <div class="text-right font-bold">Transakt.</div>
            <div class="text-right font-bold">Saldo</div>
          </div>
        </div>

        <!-- Ausgaben‑Summary -->
        <div class="p-2 font-bold border-b border-base-300 mt-2">
          <div class="grid grid-cols-3">
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
                :class="
                  sumExpensesSummary.spentMiddle >= 0
                    ? 'text-base'
                    : 'text-error'
                "
              />
            </div>
            <div class="text-right">
              <CurrencyDisplay
                :amount="sumExpensesSummary.saldoFull"
                :as-integer="true"
                :class="
                  sumExpensesSummary.saldoFull >= 0 ? 'text-base' : 'text-error'
                "
              />
            </div>
          </div>
        </div>

        <!-- Ausgabenkategorien -->
        <div class="grid grid-rows-auto">
          <template
            v-for="cat in props.categories.filter(
              (c) =>
                c.isActive && !c.isIncomeCategory && !isVerfuegbareMittel(c)
            )"
            :key="cat.id"
          >
            <div
              class="grid grid-cols-3 p-2 border-b border-base-200 cursor-context-menu hover:bg-base-200"
              @contextmenu="openDropdown($event, cat)"
            >
              <div class="text-right text-base">
                <CurrencyDisplay
                  :amount="getAggregatedData(cat).budgeted"
                  :as-integer="true"
                />
              </div>
              <div class="text-right">
                <CurrencyDisplay
                  :amount="getAggregatedData(cat).spent"
                  :as-integer="true"
                  :class="
                    getAggregatedData(cat).spent >= 0
                      ? 'text-base'
                      : 'text-error'
                  "
                />
              </div>
              <div class="text-right">
                <CurrencyDisplay
                  :amount="getAggregatedData(cat).saldo"
                  :as-integer="true"
                  :class="
                    getAggregatedData(cat).saldo >= 0
                      ? 'text-base'
                      : 'text-error'
                  "
                />
              </div>
            </div>

            <template v-if="categoryStore.expandedCategories.has(cat.id)">
              <div
                v-for="child in categoryStore
                  .getChildCategories(cat.id)
                  .filter((c) => c.isActive && !isVerfuegbareMittel(c))"
                :key="child.id"
                class="grid grid-cols-3 pl-6 text-sm p-2 border-b border-base-200 cursor-context-menu hover:bg-base-200/50"
                @contextmenu="openDropdown($event, child)"
              >
                <div class="text-right text-base">
                  <CurrencyDisplay
                    :amount="getSingleCategoryData(child.id).budgeted"
                    :as-integer="true"
                  />
                </div>
                <div class="text-right">
                  <CurrencyDisplay
                    :amount="getSingleCategoryData(child.id).spent"
                    :as-integer="true"
                    :class="
                      getSingleCategoryData(child.id).spent >= 0
                        ? 'text-base'
                        : 'text-error'
                    "
                  />
                </div>
                <div class="text-right">
                  <CurrencyDisplay
                    :amount="getSingleCategoryData(child.id).saldo"
                    :as-integer="true"
                    :class="
                      getSingleCategoryData(child.id).saldo >= 0
                        ? 'text-base'
                        : 'text-error'
                    "
                  />
                </div>
              </div>
            </template>
          </template>
        </div>

        <!-- Einnahmen‑Summary -->
        <div class="p-2 font-bold border-b border-base-300 mt-4">
          <div class="grid grid-cols-3">
            <div class="text-right">
              <CurrencyDisplay
                :amount="sumIncomesSummary.budgeted"
                :as-integer="true"
                :class="
                  sumIncomesSummary.budgeted >= 0 ? 'text-base' : 'text-error'
                "
              />
            </div>
            <div class="text-right">
              <CurrencyDisplay
                :amount="sumIncomesSummary.spentMiddle"
                :as-integer="true"
                :class="
                  sumIncomesSummary.spentMiddle >= 0
                    ? 'text-base'
                    : 'text-error'
                "
              />
            </div>
            <div class="text-right">
              <CurrencyDisplay
                :amount="sumIncomesSummary.saldoFull"
                :as-integer="true"
                :class="
                  sumIncomesSummary.saldoFull >= 0 ? 'text-base' : 'text-error'
                "
              />
            </div>
          </div>
        </div>

        <!-- Einnahmen‑Kategorien -->
        <div class="grid grid-rows-auto">
          <template
            v-for="cat in props.categories.filter(
              (c) => c.isActive && c.isIncomeCategory && !isVerfuegbareMittel(c)
            )"
            :key="cat.id"
          >
            <div class="grid grid-cols-3 p-2 border-b border-base-200">
              <div class="text-right text-base">
                <CurrencyDisplay
                  :amount="getAggregatedData(cat).budgeted"
                  :as-integer="true"
                  :class="
                    getAggregatedData(cat).budgeted >= 0
                      ? 'text-base'
                      : 'text-error'
                  "
                />
              </div>
              <div class="text-right">
                <CurrencyDisplay
                  :amount="getAggregatedData(cat).spent"
                  :as-integer="true"
                  :class="
                    getAggregatedData(cat).spent >= 0
                      ? 'text-base'
                      : 'text-error'
                  "
                />
              </div>
              <div class="text-right">
                <CurrencyDisplay
                  :amount="getAggregatedData(cat).saldo"
                  :as-integer="true"
                  :class="
                    getAggregatedData(cat).saldo >= 0
                      ? 'text-base'
                      : 'text-error'
                  "
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
                <div class="text-right text-base">
                  <CurrencyDisplay
                    :amount="getSingleCategoryData(child.id).budgeted"
                    :as-integer="true"
                    :class="
                      getSingleCategoryData(child.id).budgeted >= 0
                        ? 'text-base'
                        : 'text-error'
                    "
                  />
                </div>
                <div class="text-right">
                  <CurrencyDisplay
                    :amount="getSingleCategoryData(child.id).spent"
                    :as-integer="true"
                    :class="
                      getSingleCategoryData(child.id).spent >= 0
                        ? 'text-base'
                        : 'text-error'
                    "
                  />
                </div>
                <div class="text-right">
                  <CurrencyDisplay
                    :amount="getSingleCategoryData(child.id).saldo"
                    :as-integer="true"
                    :class="
                      getSingleCategoryData(child.id).saldo >= 0
                        ? 'text-base'
                        : 'text-error'
                    "
                  />
                </div>
              </div>
            </template>
          </template>
        </div>

        <!-- Verfügbare Mittel -->
        <div
          v-if="availableFundsCategory"
          class="p-2 border-b border-base-300 mt-4 mb-2 bg-base-200 rounded"
        >
          <div class="grid grid-cols-3">
            <div class="col-span-2 font-bold">
              {{ availableFundsCategory.name }}
            </div>
            <div class="text-right font-bold">
              <CurrencyDisplay
                :amount="getAggregatedData(availableFundsCategory).saldo"
                :as-integer="true"
                :class="
                  getAggregatedData(availableFundsCategory).saldo >= 0
                    ? 'text-base'
                    : 'text-error'
                "
              />
            </div>
          </div>
        </div>

        <!-- Kontext‑Dropdown -->
        <div
          v-if="showDropdown"
          ref="dropdownRef"
          tabindex="0"
          class="absolute z-40 bg-base-100 border border-base-300 rounded shadow p-2"
          :style="`left: ${dropdownX}px; top: ${dropdownY}px;`"
          @keydown.escape="closeDropdown"
          @blur="onDropdownBlur"
        >
          <ul>
            <li>
              <button
                class="btn btn-ghost btn-sm w-full"
                @click="optionTransfer"
              >
                Transferiere zu…
              </button>
            </li>
            <li
              v-if="
                modalData?.clickedCategory &&
                getAggregatedData(modalData.clickedCategory).saldo < 0
              "
            >
              <button class="btn btn-ghost btn-sm w-full" @click="optionFill">
                Fülle von…
                <span class="badge badge-sm badge-primary ml-1">
                  <CurrencyDisplay
                    :amount="
                      modalData
                        ? Math.abs(
                            getAggregatedData(modalData.clickedCategory!).saldo
                          )
                        : 0
                    "
                    :as-integer="true"
                  />
                </span>
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>

  <!-- Transfer‑Modal -->
  <CategoryTransferModal
    v-if="showTransferModal && modalData"
    :is-open="showTransferModal"
    :month="props.month"
    :mode="modalData.mode"
    :prefillAmount="modalData.amount"
    :preselectedCategoryId="modalData.clickedCategory?.id"
    @close="showTransferModal = false"
    @transfer="executeTransfer"
  />
</template>

<style scoped>
/* Keine zusätzlichen Styles notwendig */
</style>
