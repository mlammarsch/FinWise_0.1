<!-- Datei: src/components/budget/CategoryTransferModal.vue -->
<script setup lang="ts">
/**
 * Pfad zur Komponente: src/components/budget/CategoryTransferModal.vue
 * Funktion: Übertragung von Beträgen zwischen Kategorien.
 * Komponenten-Props:
 * - category?: Category - Wird als Quelle genutzt (bei Header-/Transfer-Modus z. B. "Verfügbare Mittel")
 * - isOpen: boolean - Steuerung der Sichtbarkeit des Modals
 * - month?: { start: Date; end: Date } - Relevanter Monat
 * - preselectedToCategoryId?: string - Vorselektion der Zielkategorie (bei Fill-Modus)
 * - mode?: "fill" | "transfer" | "header" - Steuert, welche Felder sichtbar sind:
 *    - fill: Es wird der Betrag (Saldo) der angeklickten Kategorie übernommen und als Ziel vorbefüllt.
 *    - transfer: Es wird die angeklickte Kategorie als Quelle vorbefüllt; Betrag 0.
 *    - header: Im Header-Modus ist die Quellkategorie fix (als "Verfügbare Mittel"), Ziel wählbar.
 * - prefillAmount?: number - Initialwert für das Betragsfeld
 *
 * Emits:
 * - close - Schließt das Modal (auch per ESC)
 * - transfer - Löst den Transfer aus
 */
import { ref, computed, watch } from "vue";
import { Category } from "../../types";
import { useCategoryStore } from "../../stores/categoryStore";
import { useTransactionStore } from "../../stores/transactionStore";
import { toDateOnlyString } from "@/utils/formatters";
import { calculateCategorySaldo } from "@/utils/runningBalances";
import CurrencyDisplay from "../ui/CurrencyDisplay.vue";
import SearchableSelect from "../ui/SearchableSelect.vue";
import CurrencyInput from "../ui/CurrencyInput.vue";

const props = defineProps<{
  category?: Category;
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

// Datum abhängig vom relevanten Monat setzen
function computeDefaultDate(): string {
  const today = new Date();
  if (props.month) {
    const clickedStart = new Date(toDateOnlyString(props.month.start));
    if (
      today.getFullYear() === clickedStart.getFullYear() &&
      today.getMonth() === clickedStart.getMonth()
    ) {
      return today.toISOString().split("T")[0];
    } else if (clickedStart > today) {
      // Zukunft: Erster Tag des geklickten Monats
      const firstDay = new Date(
        clickedStart.getFullYear(),
        clickedStart.getMonth(),
        1
      );
      return firstDay.toISOString().split("T")[0];
    } else {
      // Vergangenheit: Letzter Tag des Vormonats des geklickten Monats
      const lastDayPrev = new Date(
        clickedStart.getFullYear(),
        clickedStart.getMonth(),
        0
      );
      return lastDayPrev.toISOString().split("T")[0];
    }
  }
  return today.toISOString().split("T")[0];
}
const date = ref(computeDefaultDate());
const note = ref("");

// Initiale Befüllung basierend auf dem Modus
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

const isExpenseCategory = (cat: Category) => {
  return (
    cat.name.trim().toLowerCase() === "verfügbare mittel" ||
    !cat.isIncomeCategory
  );
};

const normalizedMonthStart = computed(() =>
  props.month ? new Date(toDateOnlyString(props.month.start)) : new Date()
);
const normalizedMonthEnd = computed(() =>
  props.month ? new Date(toDateOnlyString(props.month.end)) : new Date()
);

const sortOptions = (options: any[]) => {
  return options.sort((a, b) => {
    if (a.name.trim().toLowerCase() === "verfügbare mittel") return -1;
    if (b.name.trim().toLowerCase() === "verfügbare mittel") return 1;
    return a.name.localeCompare(b.name);
  });
};

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
  return sortOptions(opts);
});

const comboboxToOptions = computed(() => {
  const opts = categoryStore.categories
    .filter((cat) => isExpenseCategory(cat) && cat.id !== fromCategoryId.value)
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
  return sortOptions(opts);
});

// Übertragung auslösen (bei Enter oder Button)
const transferBetweenCategories = () => {
  if (!fromCategoryId.value || !toCategoryId.value || amount.value <= 0) return;
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
    <div class="modal-box">
      <h3 class="font-bold text-lg mb-4">Zwischen Kategorien übertragen</h3>
      <form @submit.prevent="transferBetweenCategories">
        <div class="space-y-4">
          <!-- Quell-Kategorie -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Von Kategorie</span>
              <span class="text-error">*</span>
            </label>
            <SearchableSelect
              v-model="fromCategoryId"
              :options="comboboxFromOptions"
              placeholder="Kategorie auswählen"
              required
            >
              <template #option="{ option }">
                <div class="flex justify-between items-center">
                  <span>{{ option.name }}</span>
                  <div class="ml-2">
                    (<CurrencyDisplay
                      :amount="option.saldo"
                      :show-zero="true"
                      :as-integer="true"
                    />)
                  </div>
                </div>
              </template>
            </SearchableSelect>
          </div>
          <!-- Ziel-Kategorie -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Zu Kategorie</span>
              <span class="text-error">*</span>
            </label>
            <SearchableSelect
              v-model="toCategoryId"
              :options="comboboxToOptions"
              placeholder="Kategorie auswählen"
              required
            >
              <template #option="{ option }">
                <div class="flex justify-between items-center">
                  <span>{{ option.name }}</span>
                  <div class="ml-2">
                    (<CurrencyDisplay
                      :amount="option.saldo"
                      :show-zero="true"
                      :as-integer="true"
                    />)
                  </div>
                </div>
              </template>
            </SearchableSelect>
          </div>
          <!-- Betrag -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Betrag</span>
              <span class="text-error">*</span>
            </label>
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
          </div>
          <!-- Datum -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Datum</span>
              <span class="text-error">*</span>
            </label>
            <input
              type="date"
              v-model="date"
              class="input input-bordered"
              required
            />
          </div>
          <!-- Notiz -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Notiz</span>
            </label>
            <input
              type="text"
              v-model="note"
              class="input input-bordered"
              placeholder="Grund für die Übertragung"
            />
          </div>
        </div>
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
