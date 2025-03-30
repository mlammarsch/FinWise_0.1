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
 *    - fill: Der offene Betrag (Saldo) der geklickten Kategorie wird übernommen,
 *            Zielkategorie fix (Dropdown ausgeblendet).
 *    - transfer: Quellkategorie fix (Dropdown ausgeblendet), Betrag 0; Zielkategorie wählbar.
 *    - header: Im Header-Modus ist die Quellkategorie fix (als "Verfügbare Mittel"),
 *              Zielkategorie wählbar.
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

const props = defineProps<{
  category?: Category;
  isOpen: boolean;
  month?: { start: Date; end: Date };
  preselectedToCategoryId?: string;
  mode?: "fill" | "transfer" | "header";
}>();

const emit = defineEmits(["close", "transfer"]);

const categoryStore = useCategoryStore();
const transactionStore = useTransactionStore();

const fromCategoryId = ref("");
const toCategoryId = ref("");
const amount = ref(0);
const date = ref(new Date().toISOString().split("T")[0]);
const note = ref("");

// In Header-/Transfer-Modus: Quelle fix
if ((props.mode === "header" || props.mode === "transfer") && props.category) {
  fromCategoryId.value = props.category.id;
}
// In Fill-Modus: Ziel fix
if (props.mode === "fill" && props.preselectedToCategoryId) {
  toCategoryId.value = props.preselectedToCategoryId;
}

watch(
  () => props.category,
  (cat) => {
    if (cat && (props.mode === "header" || props.mode === "transfer")) {
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

// Wird beim Drücken der Enter-Taste oder Klick auf den Button ausgelöst
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
          <div v-if="props.mode === 'header' || props.mode === 'transfer'">
            <div class="form-control">
              <label class="label">
                <span class="label-text">Von Kategorie</span>
              </label>
              <div class="p-2 border rounded bg-gray-100">
                {{
                  comboboxFromOptions.find((o) => o.id === fromCategoryId)
                    ?.name || ""
                }}
              </div>
            </div>
          </div>
          <div v-else>
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
          </div>
          <!-- Ziel-Kategorie -->
          <div v-if="props.mode === 'fill'">
            <div class="form-control">
              <label class="label">
                <span class="label-text">Zu Kategorie</span>
              </label>
              <div class="p-2 border rounded bg-gray-100">
                {{
                  comboboxFromOptions.find((o) => o.id === toCategoryId)
                    ?.name || ""
                }}
              </div>
            </div>
          </div>
          <div v-else>
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
          </div>
          <!-- Betrag -->
          <div class="form-control">
            <label class="label">
              <span class="label-text">Betrag</span>
              <span class="text-error">*</span>
            </label>
            <div class="input-group">
              <input
                type="text"
                :value="formatNumber(amount)"
                @input="amount = parseNumber(($event.target as HTMLInputElement).value)"
                class="input input-bordered w-full"
                required
              />
            </div>
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
          <!-- Datum und Notiz -->
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
