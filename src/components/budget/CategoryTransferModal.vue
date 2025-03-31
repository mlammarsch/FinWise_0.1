<!-- Datei: src/components/budget/CategoryTransferModal.vue -->
<script setup lang="ts">
/**
 * Pfad zur Komponente: src/components/budget/CategoryTransferModal.vue
 * Funktion: Übertragung von Beträgen zwischen Kategorien.
 * Komponenten-Props:
 * - category?: Category - Wird als Quelle genutzt (bei Transfer-Modus)
 * - isOpen: boolean - Steuerung der Sichtbarkeit des Modals
 * - month?: { start: Date; end: Date } - Relevanter Monat
 * - preselectedToCategoryId?: string - Vorselektion der Zielkategorie (bei Fill-Modus)
 * - mode?: "fill" | "transfer" | "header" - Steuert, welche Felder sichtbar sind:
 *    - fill: Übernimmt den Saldo der angeklickten Kategorie als Zielwert.
 *    - transfer: Übernimmt die angeklickte Kategorie als Quelle; Betrag 0.
 *    - header: Im Header-Modus ist die Quellkategorie fix (als "Verfügbare Mittel"), Ziel wählbar.
 * - prefillAmount?: number - Initialwert für das Betragsfeld
 *
 * Emits:
 * - close - Schließt das Modal (auch per ESC)
 * - transfer - Löst den Transfer aus
 */
import { ref, computed, watch } from "vue";
import { toDateOnlyString } from "@/utils/formatters";
import CurrencyDisplay from "../ui/CurrencyDisplay.vue";
import CurrencyInput from "../ui/CurrencyInput.vue";
import SelectCategory from "../ui/SelectCategory.vue";
import { useCategoryStore } from "../../stores/categoryStore";
import { useTransactionStore } from "../../stores/transactionStore";
import { calculateCategorySaldo } from "@/utils/runningBalances";
import { debugLog } from "@/utils/logger";

const props = defineProps<{
  category?: any;
  isOpen: boolean;
  month?: { start: Date; end: Date };
  preselectedToCategoryId?: string;
  mode?: "fill" | "transfer" | "header";
  prefillAmount?: number;
}>();

const emit = defineEmits(["close", "transfer"]);

const categoryStore = useCategoryStore();
const transactionStore = useTransactionStore();

const fromCategoryId = ref("");
const toCategoryId = ref("");
const amount = ref(props.prefillAmount || 0);

// Datum: Setze immer den letzten Tag des übergebenen Monats
function computeDefaultDate(): string {
  if (props.month) {
    const lastDay = new Date(props.month.end);
    return lastDay.toISOString().split("T")[0];
  }
  return new Date().toISOString().split("T")[0];
}
const date = ref(computeDefaultDate());
const note = ref("");

// Alte Logik zur Initialbefüllung beibehalten
if (props.mode === "transfer" && props.category) {
  fromCategoryId.value = props.category.id;
}
if (props.mode === "fill" && props.preselectedToCategoryId) {
  toCategoryId.value = props.preselectedToCategoryId;
}

watch(
  () => props.category,
  (cat) => {
    if (cat && props.mode === "transfer") {
      fromCategoryId.value = cat.id;
    }
  },
  { immediate: true }
);

watch(
  () => props.preselectedToCategoryId,
  (toCat) => {
    if (toCat && props.mode === "fill") {
      toCategoryId.value = toCat;
    }
  },
  { immediate: true }
);

const parseNumber = (value: string): number => {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  return parseFloat(normalized) || 0;
};

const formatNumber = (value: number): string => {
  return value.toString().replace(".", ",");
};

const isExpenseCategory = (cat: any) => {
  return (
    cat.name.trim().toLowerCase() === "verfügbare mittel" ||
    !cat.isIncomeCategory
  );
};

// Computed für Einkommen-Kategorien (werden ausgeschlossen)
const incomeCategoryIds = computed(() => {
  return categoryStore.categories
    .filter((cat) => cat.isIncomeCategory)
    .map((cat) => cat.id);
});

// Beibehaltung der alten Computed für Verfügbar-Anzeige
const normalizedMonthStart = computed(() =>
  props.month ? new Date(toDateOnlyString(props.month.start)) : new Date()
);
const normalizedMonthEnd = computed(() =>
  props.month ? new Date(toDateOnlyString(props.month.end)) : new Date()
);

const comboboxFromOptions = computed(() => {
  const opts = categoryStore.categories
    .filter((cat) => isExpenseCategory(cat))
    .map((cat) => ({
      id: cat.id,
      name: cat.name,
      saldo: props.month
        ? calculateCategorySaldo(
            transactionStore.transactions,
            cat.id,
            normalizedMonthStart.value,
            normalizedMonthEnd.value
          ).saldo
        : 0,
    }));
  return opts.sort((a, b) => a.name.localeCompare(b.name));
});

// Übertragung auslösen (bei Enter oder Button)
const transferBetweenCategories = () => {
  if (!fromCategoryId.value || !toCategoryId.value || amount.value <= 0) {
    return;
  }
  debugLog("[CategoryTransferModal] transferBetweenCategories", {
    fromCategoryId: fromCategoryId.value,
    toCategoryId: toCategoryId.value,
    amount: amount.value,
    date: date.value,
    note: note.value,
  });
  emit("transfer", {
    fromCategoryId: fromCategoryId.value,
    toCategoryId: toCategoryId.value,
    amount: amount.value,
    date: date.value,
    note: note.value,
  });
  emit("close");
};
</script>

<template>
  <div
    v-if="isOpen"
    class="modal modal-open"
    tabindex="0"
    @keydown.escape="$emit('close')"
  >
    <div class="modal-box w-2/3">
      <h3 class="font-bold text-lg mb-4">Zwischen Kategorien übertragen</h3>
      <form
        @submit.prevent="transferBetweenCategories"
        class="flex flex-col space-y-4 w-full"
      >
        <!-- Von Kategorie -->
        <fieldset class="form-control">
          <legend class="label font-bold select-none">
            Von Kategorie <span class="text-error">*</span>
          </legend>
          <SelectCategory
            v-model:modelValue="fromCategoryId"
            :initialID="
              props.mode === 'transfer' && props.category
                ? props.category.id
                : ''
            "
            :filterOutArray="incomeCategoryIds"
          />
        </fieldset>
        <!-- Zu Kategorie -->
        <fieldset class="form-control">
          <legend class="label font-bold select-none">
            Zu Kategorie <span class="text-error">*</span>
          </legend>
          <SelectCategory
            v-model:modelValue="toCategoryId"
            :initialID="
              props.mode === 'fill' && props.preselectedToCategoryId
                ? props.preselectedToCategoryId
                : ''
            "
            :filterOutArray="
              incomeCategoryIds.concat(fromCategoryId ? [fromCategoryId] : [])
            "
          />
        </fieldset>
        <!-- Betrag -->
        <fieldset class="form-control">
          <legend class="label font-bold select-none">
            Betrag <span class="text-error">*</span>
          </legend>
          <CurrencyInput v-model="amount" />
          <label class="label">
            <span class="label-text-alt">
              Verfügbar:
              <CurrencyDisplay
                :amount="
                  comboboxFromOptions.find((o) => o.id === fromCategoryId)
                    ?.saldo || 0
                "
                :show-zero="true"
                :as-integer="true"
              />
            </span>
          </label>
        </fieldset>
        <!-- Datum -->
        <fieldset class="form-control">
          <legend class="label font-bold select-none">
            Datum <span class="text-error">*</span>
          </legend>
          <input
            type="date"
            v-model="date"
            class="input input-bordered w-full"
            required
          />
        </fieldset>
        <!-- Notiz -->
        <fieldset class="form-control">
          <legend class="label font-bold select-none">Notiz</legend>
          <input
            type="text"
            v-model="note"
            class="input input-bordered w-full"
            placeholder="Grund für die Übertragung"
          />
        </fieldset>
        <div class="modal-action">
          <button type="button" class="btn" @click="$emit('close')">
            Abbrechen
          </button>
          <button type="submit" class="btn btn-primary">Übertragen</button>
        </div>
      </form>
    </div>
    <div class="modal-backdrop" @click="$emit('close')"></div>
  </div>
</template>

<style scoped>
/* Keine zusätzlichen Styles benötigt */
</style>
