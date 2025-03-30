<script setup lang="ts">
/**
 * Pfad zur Komponente: src/components/budget/BudgetMonthHeaderCard.vue
 * Zeigt Kopfdaten pro Monats-Spalte an.
 *
 * Komponenten-Props:
 * - label: string - Monatslabel
 * - toBudget: number - Geplantes Budget
 * - available?: number - verfügbare Mittel
 * - overspent?: number - Überzogen aus Vormonat
 * - budgeted?: number - bereits Budgetiert
 * - nextMonth?: number - für Folgemonat reserviert
 * - month?: { start: Date; end: Date } - Relevanter Monat (optional)
 *
 * Im Header soll bei Rechtsklick auf den "verfügbare Mittel"-Bereich ein Dropdown erscheinen,
 * das den Eintrag "Transfer zu…" enthält. Wird dieser gewählt, öffnet sich das Transfer-Modal im Header-Modus.
 */
import CurrencyDisplay from "../ui/CurrencyDisplay.vue";
import { ref, computed } from "vue";
import { useCategoryStore } from "../../stores/categoryStore";
import CategoryTransferModal from "../budget/CategoryTransferModal.vue";
import { addCategoryTransfer } from "@/utils/categoryTransfer";
import { debugLog } from "@/utils/logger";

const props = defineProps<{
  label: string;
  toBudget: number;
  available?: number;
  overspent?: number;
  budgeted?: number;
  nextMonth?: number;
  month?: { start: Date; end: Date };
}>();

const categoryStore = useCategoryStore();

// Container für relative Positionierung
const containerRef = ref<HTMLElement | null>(null);
const showHeaderDropdown = ref(false);
const headerDropdownX = ref(0);
const headerDropdownY = ref(0);

function openHeaderDropdown(event: MouseEvent) {
  event.preventDefault();
  if (containerRef.value) {
    const rect = containerRef.value.getBoundingClientRect();
    headerDropdownX.value = event.clientX - rect.left;
    headerDropdownY.value = event.clientY - rect.top;
  } else {
    headerDropdownX.value = event.clientX;
    headerDropdownY.value = event.clientY;
  }
  debugLog("[BudgetMonthHeaderCard] openHeaderDropdown", {
    x: headerDropdownX.value,
    y: headerDropdownY.value,
  });
  showHeaderDropdown.value = true;
}

function closeHeaderDropdown() {
  showHeaderDropdown.value = false;
}

function handleEscHeaderDropdown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    closeHeaderDropdown();
  }
}

// Transfer-Modal im Header
const showTransferModal = ref(false);
const modalData = ref<{ mode: "header" } | null>({ mode: "header" });

const availableCategory = computed(() =>
  categoryStore.categories.find(
    (cat) => cat.name.trim().toLowerCase() === "verfügbare mittel"
  )
);

function openHeaderTransfer() {
  // Im Header-Modus: Quell fix = "Verfügbare Mittel", Ziel wählbar
  modalData.value = { mode: "header" };
  showTransferModal.value = true;
  closeHeaderDropdown();
}

function closeModal() {
  showTransferModal.value = false;
}

function handleTransfer(data: any) {
  addCategoryTransfer(
    data.fromCategoryId,
    data.toCategoryId,
    data.amount,
    data.date,
    data.note
  );
  closeModal();
}
</script>

<template>
  <div
    ref="containerRef"
    class="relative min-w-[12rem] rounded-lg border border-base-300 bg-base-100 sticky top-0 z-30 m-2"
  >
    <div class="p-2 border-b border-base-300 text-center font-bold">
      {{ props.label }}
    </div>
    <div class="p-2 text-sm space-y-1 flex flex-col items-center">
      <!-- Rechtsklick-Trigger -->
      <div @contextmenu.prevent="openHeaderDropdown" class="cursor-pointer">
        <CurrencyDisplay :amount="props.available ?? 0" :as-integer="true" />
        verfügbare Mittel
      </div>
      <div>-{{ props.overspent ?? 0 }} Overspent in prev</div>
      <div>-{{ props.budgeted ?? 0 }} Budgeted</div>
      <div>-{{ props.nextMonth ?? 0 }} For next month</div>
    </div>
  </div>
  <!-- Header Dropdown-Menü -->
  <div
    v-if="showHeaderDropdown"
    class="absolute z-40 w-40 bg-base-100 border border-base-300 rounded shadow p-2"
    :style="{ left: `${headerDropdownX}px`, top: `${headerDropdownY}px` }"
    tabindex="0"
    @keydown.escape="closeHeaderDropdown"
    @click.outside="closeHeaderDropdown"
  >
    <ul>
      <li>
        <button class="btn btn-ghost btn-sm w-full" @click="openHeaderTransfer">
          Transfer zu…
        </button>
      </li>
    </ul>
  </div>
  <!-- Header Transfer Modal -->
  <CategoryTransferModal
    v-if="showTransferModal"
    :is-open="showTransferModal"
    :month="props.month"
    mode="header"
    :category="availableCategory"
    @close="closeModal"
    @transfer="handleTransfer"
  />
</template>

<style scoped>
/* Keine zusätzlichen Styles benötigt */
</style>
