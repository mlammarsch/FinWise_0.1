<script setup lang="ts">
/**
 * Pfad zur Komponente: src/components/budget/CategoryTransferModal.vue
 * Funktion: Übertragung von Beträgen zwischen Kategorien.
 *
 * Props:
 * - preselectedCategoryId?: string – ID der Kategorie, die je nach Modus in from oder to übernommen wird
 * - isOpen: boolean – Sichtbarkeit
 * - month?: { start: Date; end: Date }
 * - mode?: "fill" | "transfer"
 * - prefillAmount?: number
 *
 * Emits:
 * - close – Modal schließen
 * - transfer – Übertragung starten
 */
import { ref, computed, watch, onMounted, nextTick } from "vue";
import { toDateOnlyString } from "@/utils/formatters";
import CurrencyDisplay from "../ui/CurrencyDisplay.vue";
import CurrencyInput from "../ui/CurrencyInput.vue";
import SelectCategory from "../ui/SelectCategory.vue";
import { useCategoryStore } from "@/stores/categoryStore";
import { useTransactionStore } from "@/stores/transactionStore";
import { calculateCategorySaldo } from "@/utils/runningBalances";
import { debugLog } from "@/utils/logger";

const props = defineProps<{
  isOpen: boolean;
  month?: { start: Date; end: Date };
  mode?: "fill" | "transfer";
  prefillAmount?: number;
  preselectedCategoryId?: string;
}>();

const emit = defineEmits(["close", "transfer"]);

const categoryStore = useCategoryStore();
const transactionStore = useTransactionStore();

const fromCategoryId = ref("");
const toCategoryId = ref("");
const amount = ref(props.prefillAmount || 0);
const date = ref("");
const note = ref("");

// Refs für Fokussteuerung
const fromCategoryRef = ref<InstanceType<typeof SelectCategory> | null>(null);
const toCategoryRef = ref<InstanceType<typeof SelectCategory> | null>(null);

// Initiales Logging bei Komponentenerstellung
onMounted(() => {
  debugLog("[CategoryTransferModal] mounted - incoming props", {
    isOpen: props.isOpen,
    mode: props.mode,
    prefillAmount: props.prefillAmount,
    preselectedCategoryId: props.preselectedCategoryId,
    month: props.month,
  });
});

// Datum setzen & Fokussteuerung bei Öffnung
watch(
  () => props.isOpen,
  (open) => {
    if (open && props.month) {
      const computed = new Date(props.month.end).toISOString().split("T")[0];
      date.value = computed;
      debugLog("[CategoryTransferModal] isOpen watcher → set date", {
        computed,
      });
    }

    if (open && props.preselectedCategoryId) {
      if (props.mode === "transfer") {
        fromCategoryId.value = props.preselectedCategoryId;
        debugLog(
          "[CategoryTransferModal] isOpen → set fromCategoryId (transfer)",
          {
            id: props.preselectedCategoryId,
          }
        );
      } else if (props.mode === "fill") {
        toCategoryId.value = props.preselectedCategoryId;
        debugLog("[CategoryTransferModal] isOpen → set toCategoryId (fill)", {
          id: props.preselectedCategoryId,
        });
      }

      nextTick(() => {
        if (props.mode != "transfer") fromCategoryRef.value?.focusInput();
        else if (props.mode === "transfer") toCategoryRef.value?.focusInput();
      });
    }
  },
  { immediate: true }
);

const normalizedMonthStart = computed(() =>
  props.month ? new Date(toDateOnlyString(props.month.start)) : new Date()
);
const normalizedMonthEnd = computed(() =>
  props.month ? new Date(toDateOnlyString(props.month.end)) : new Date()
);

const incomeCategoryIds = computed(() =>
  categoryStore.categories
    .filter((cat) => cat.isIncomeCategory)
    .map((cat) => cat.id)
);

const comboboxFromOptions = computed(() =>
  categoryStore.categories
    .filter(
      (cat) =>
        !cat.isIncomeCategory ||
        cat.name.trim().toLowerCase() === "verfügbare mittel"
    )
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
    }))
);

function transferBetweenCategories() {
  if (!fromCategoryId.value || !toCategoryId.value || amount.value <= 0) return;

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
}
</script>

<template>
  <div
    v-if="isOpen"
    class="modal modal-open"
    tabindex="0"
    @keydown.escape="$emit('close')"
  >
    <div class="modal-box w-full max-w-sm">
      <h3 class="font-bold text-lg mb-4">Zwischen Kategorien übertragen</h3>
      <form
        @submit.prevent="transferBetweenCategories"
        class="flex flex-col space-y-4 w-full"
      >
        <fieldset v-show="mode == 'fill'">
          <legend class="text-sm font-semibold mb-1 select-none">
            Von Kategorie <span class="text-error">*</span>
          </legend>
          <SelectCategory
            ref="fromCategoryRef"
            v-model="fromCategoryId"
            :filterOutArray="incomeCategoryIds"
          />
        </fieldset>

        <fieldset v-show="mode == 'transfer'">
          <legend class="text-sm font-semibold mb-1 select-none">
            Zu Kategorie <span class="text-error">*</span>
          </legend>
          <SelectCategory
            ref="toCategoryRef"
            v-model="toCategoryId"
            :filterOutArray="incomeCategoryIds.concat(fromCategoryId || '')"
          />
        </fieldset>

        <fieldset>
          <legend class="text-sm font-semibold mb-1 select-none">
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

        <fieldset>
          <legend class="text-sm font-semibold mb-1 select-none">Datum</legend>
          <input
            type="date"
            v-model="date"
            class="input input-bordered w-full focus:outline-none focus:ring-2 focus:ring-accent"
            required
          />
        </fieldset>

        <fieldset>
          <legend class="text-sm font-semibold mb-1 select-none">Notiz</legend>
          <input
            type="text"
            v-model="note"
            class="input input-bordered w-full focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder="Grund für die Übertragung"
          />
        </fieldset>

        <div class="modal-action">
          <button
            type="button"
            class="btn"
            @click="$emit('close')"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            class="btn btn-primary"
          >
            Übertragen
          </button>
        </div>
      </form>
    </div>
    <div
      class="modal-backdrop"
      @click="$emit('close')"
    ></div>
  </div>
</template>

<style scoped></style>
