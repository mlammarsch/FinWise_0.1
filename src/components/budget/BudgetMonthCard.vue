<!-- Datei: src/components/budget/BudgetMonthCard.vue -->
<script setup lang="ts">
/**
 * Pfad zur Komponente: src/components/budget/BudgetMonthCard.vue
 * Zeigt pro Monat die Budget-, Transaktions- und Saldo-Werte an. Nutzt BudgetService.
 *
 * Komponenten-Props:
 * - month: { start: Date; end: Date; label: string } – Der aktuelle Anzeigemonat
 * - categories: Category[] – Liste aller Root-Kategorien für die Anzeige
 *
 * Emits:
 * - Keine direkten Emits, löst Öffnen des Transfer-Modals aus.
 */
import { computed, ref, nextTick, inject } from "vue";
import { useCategoryStore } from "../../stores/categoryStore";
import { Category } from "../../types";
import CurrencyDisplay from "../ui/CurrencyDisplay.vue";
import CategoryTransferModal from "./CategoryTransferModal.vue";
import { CategoryService } from "@/services/CategoryService"; // Import CategoryService for modal action
import { debugLog } from "@/utils/logger";
import { BudgetService } from "@/services/BudgetService"; // Import BudgetService
import { toDateOnlyString } from "@/utils/formatters"; // Sicherstellen, dass der Import existiert

const props = defineProps<{
  month: { start: Date; end: Date; label: string };
  categories: Category[]; // Erwartet jetzt nur noch Root-Kategorien
}>();

const categoryStore = useCategoryStore();
// Inject BudgetService if provided globally, or import directly
// const budgetService = inject<typeof BudgetService>('budgetService'); // If using provide/inject
const budgetService = BudgetService; // Direct import

const normalizedMonthStart = computed(
  () => new Date(toDateOnlyString(props.month.start))
);
const normalizedMonthEnd = computed(
  () => new Date(toDateOnlyString(props.month.end))
);

const availableFundsCategory = categoryStore.getAvailableFundsCategory();
const isVerfuegbareMittel = (cat: Category) =>
  availableFundsCategory?.id === cat.id;

// Holt aggregierte Daten über den BudgetService
function getAggregatedData(cat: Category) {
  return budgetService.getAggregatedMonthlyBudgetData(
    cat.id,
    normalizedMonthStart.value,
    normalizedMonthEnd.value
  );
}

// Holt Daten für eine einzelne (Kind-)Kategorie über den CategoryService/BudgetService
function getSingleCategoryData(catId: string) {
  // Ruft BudgetService auf, um die Daten nur für diese ID zu holen (ohne Kind-Aggregation)
  // Dies setzt voraus, dass getAggregatedMonthlyBudgetData auch ohne Kinder funktioniert,
  // wenn die Kategorie keine hat, oder eine separate Methode existiert.
  // Hier gehen wir davon aus, dass es für Einzelkategorien korrekt funktioniert.
  return budgetService.getAggregatedMonthlyBudgetData(
    catId,
    normalizedMonthStart.value,
    normalizedMonthEnd.value
  );
}

const isCurrentMonth = computed(() => {
  const now = new Date();
  return (
    now.getFullYear() === normalizedMonthStart.value.getFullYear() &&
    now.getMonth() === normalizedMonthStart.value.getMonth()
  );
});

// Holt die Zusammenfassung über den BudgetService
const sumExpensesSummary = computed(() => {
  return budgetService.getMonthlySummary(
    normalizedMonthStart.value,
    normalizedMonthEnd.value,
    "expense"
  );
});

const sumIncomesSummary = computed(() => {
  return budgetService.getMonthlySummary(
    normalizedMonthStart.value,
    normalizedMonthEnd.value,
    "income"
  );
});

// --- Context Menu and Modal Logic ---
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
    // Store category for modal logic
    mode: "transfer", // Default mode, will be overwritten by optionFill/optionTransfer
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
    dropdownRef.value?.focus(); // Focus the dropdown for keyboard navigation/escape
  });
}

function closeDropdown() {
  showDropdown.value = false;
}

// Close dropdown with Escape key
function handleEscDropdown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    closeDropdown();
  }
}

// Handle 'Fill from...' option
function optionFill() {
  if (!modalData.value?.clickedCategory) return;
  const cat = modalData.value.clickedCategory;

  // Get current balance using the service - Aggregated for parent, single for child
  const categoryData = getAggregatedData(cat);
  const amountToFill =
    categoryData.saldo < 0 ? Math.abs(categoryData.saldo) : 0; // Only suggest if negative

  modalData.value = {
    mode: "fill",
    clickedCategory: cat,
    amount: amountToFill, // Prefill with the negative balance amount
  };
  debugLog("[BudgetMonthCard] optionFill", {
    categoryId: cat.id,
    categoryName: cat.name,
    amount: amountToFill,
    mode: "fill",
  });
  closeDropdown();
  showTransferModal.value = true; // Open the transfer modal in 'fill' mode
}

// Handle 'Transfer to...' option
function optionTransfer() {
  if (!modalData.value?.clickedCategory) return;
  const cat = modalData.value.clickedCategory;

  modalData.value = {
    mode: "transfer",
    clickedCategory: cat,
    amount: 0, // No prefill for transfer amount
  };
  debugLog("[BudgetMonthCard] optionTransfer", {
    categoryId: cat.id,
    categoryName: cat.name,
    amount: 0,
    mode: "transfer",
  });
  closeDropdown();
  showTransferModal.value = true; // Open the transfer modal in 'transfer' mode
}

// Wird vom Modal @transfer Event aufgerufen
function executeTransfer(data: {
  transactionId?: string | undefined;
  gegentransactionId?: string | undefined;
  fromCategoryId: string;
  toCategoryId: string;
  amount: number;
  date: string;
  note: string;
}) {
  //Modal ruft direkt CategoryService auf
  // CategoryService.addCategoryTransfer(
  //      data.fromCategoryId,
  //      data.toCategoryId,
  //      data.amount,
  //      data.date,
  //      data.note
  // );
  // Da das Modal den Service direkt aufruft, brauchen wir hier nichts mehr zu tun.
  showTransferModal.value = false;
  debugLog("[BudgetMonthCard] Transfer executed via Modal & Service", data);
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
      <div
        ref="containerRef"
        class="relative w-full p-1 rounded-lg bg-base-100"
      >
        <!-- Tabellenheader (Sticky) -->
        <div class="sticky top-0 bg-base-100 z-20 p-2 border-b border-base-300">
          <div class="grid grid-cols-3">
            <div class="text-right font-bold">Budget</div>
            <div class="text-right font-bold">Transakt.</div>
            <div class="text-right font-bold">Saldo</div>
          </div>
        </div>

        <!-- === Ausgaben === -->
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
        <!-- Liste der Ausgaben-Hauptkategorien -->
        <div class="grid grid-rows-auto">
          <template
            v-for="cat in props.categories.filter(
              (c) =>
                c.isActive && !c.isIncomeCategory && !isVerfuegbareMittel(c)
            )"
            :key="cat.id"
          >
            <!-- Hauptkategorie Zeile -->
            <div
              class="grid grid-cols-3 p-2 border-b border-base-200 cursor-context-menu hover:bg-base-200"
              @contextmenu.prevent="openDropdown($event, cat)"
            >
              <div class="text-right">
                <CurrencyDisplay
                  :amount="Math.abs(getAggregatedData(cat).budgeted)"
                  :as-integer="true"
                  :show-sign="false"
                  :class="
                    getAggregatedData(cat).budgeted < 0 ? 'text-error' : ''
                  "
                />
              </div>
              <div class="text-right">
                <CurrencyDisplay
                  :amount="getAggregatedData(cat).spent"
                  :as-integer="true"
                />
              </div>
              <div class="text-right">
                <CurrencyDisplay
                  :amount="getAggregatedData(cat).saldo"
                  :as-integer="true"
                />
              </div>
            </div>
            <!-- Unterkategorien (wenn expanded) -->
            <template v-if="categoryStore.expandedCategories.has(cat.id)">
              <div
                v-for="child in categoryStore
                  .getChildCategories(cat.id)
                  .filter((c) => c.isActive && !isVerfuegbareMittel(c))"
                :key="child.id"
                class="grid grid-cols-3 pl-6 text-sm p-2 border-b border-base-200 cursor-context-menu hover:bg-base-200/50"
                @contextmenu.prevent="openDropdown($event, child)"
              >
                <div class="text-right">
                  <CurrencyDisplay
                    :amount="Math.abs(getSingleCategoryData(child.id).budgeted)"
                    :as-integer="true"
                    :show-sign="false"
                    :class="
                      getSingleCategoryData(child.id).budgeted < 0
                        ? 'text-error'
                        : ''
                    "
                  />
                </div>
                <div class="text-right">
                  <CurrencyDisplay
                    :amount="getSingleCategoryData(child.id).spent"
                    :as-integer="true"
                  />
                </div>
                <div class="text-right">
                  <CurrencyDisplay
                    :amount="getSingleCategoryData(child.id).saldo"
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
          ref="dropdownRef"
          class="absolute z-40 w-40 bg-base-200 border border-base-300 rounded shadow-lg p-2"
          :style="{ left: `${dropdownX}px`, top: `${dropdownY}px` }"
          tabindex="0"
          @keydown.escape="closeDropdown"
          @blur="closeDropdown"
        >
          <ul>
            <li>
              <button
                class="btn btn-ghost btn-sm w-full text-left justify-start"
                @click="optionFill"
              >
                <Icon icon="mdi:arrow-up-bold-box-outline" class="mr-2" /> Fülle
                auf von …
              </button>
            </li>
            <li>
              <button
                class="btn btn-ghost btn-sm w-full text-left justify-start"
                @click="optionTransfer"
              >
                <Icon icon="mdi:arrow-right-bold-box-outline" class="mr-2" />
                Transferiere zu …
              </button>
            </li>
          </ul>
        </div>

        <!-- === Einnahmen === -->
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
        <!-- Liste der Einnahmen-Hauptkategorien -->
        <div class="grid grid-rows-auto">
          <template
            v-for="cat in props.categories.filter(
              (c) => c.isActive && c.isIncomeCategory && !isVerfuegbareMittel(c)
            )"
            :key="cat.id"
          >
            <!-- Hauptkategorie Zeile (kein Kontextmenü für Einnahmen) -->
            <div class="grid grid-cols-3 p-2 border-b border-base-200">
              <div class="text-right">
                <CurrencyDisplay
                  :amount="getAggregatedData(cat).budgeted"
                  :as-integer="true"
                  class="text-success"
                />
              </div>
              <div class="text-right">
                <CurrencyDisplay
                  :amount="getAggregatedData(cat).spent"
                  :as-integer="true"
                />
              </div>
              <div class="text-right">
                <CurrencyDisplay
                  :amount="getAggregatedData(cat).saldo"
                  :as-integer="true"
                />
              </div>
            </div>
            <!-- Unterkategorien (wenn expanded) -->
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
                    :amount="getSingleCategoryData(child.id).budgeted"
                    :as-integer="true"
                    class="text-success"
                  />
                </div>
                <div class="text-right">
                  <CurrencyDisplay
                    :amount="getSingleCategoryData(child.id).spent"
                    :as-integer="true"
                  />
                </div>
                <div class="text-right">
                  <CurrencyDisplay
                    :amount="getSingleCategoryData(child.id).saldo"
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
        @transfer="executeTransfer"
      />
    </div>
  </div>
</template>

<style scoped>
/* Keine zusätzlichen Styles benötigt */
</style>
