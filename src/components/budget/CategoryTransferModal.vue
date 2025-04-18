<!-- Datei: src/components/budget/CategoryTransferModal.vue (vollständig) -->
<script setup lang="ts">
/**
 * Pfad zur Komponente: src/components/budget/CategoryTransferModal.vue
 * Funktion: Übertragung von Beträgen zwischen Kategorien.
 *
 * Props:
 * - preselectedCategoryId?: string – ID der Kategorie, die je nach Modus in from oder to übernommen wird (nur bei neuen Transfers)
 * - isOpen: boolean – Sichtbarkeit
 * - month?: { start: Date; end: Date }
 * - mode?: "fill" | "transfer" – Übertragungsmodus (Default: "transfer")
 * - prefillAmount?: number
 * - prefillDate?: string – Datum (YYYY-MM-DD), falls beim Bearbeiten vorhanden
 * - transactionId?: string – Vorhandene Transaktions-ID (bei Bearbeitung)
 * - gegentransactionId?: string – Vorhandene Gegentransaktions-ID (bei Bearbeitung)
 * - fromCategoryId?: string – "Von"-Kategorie (bei Bearbeitung)
 * - toCategoryId?: string – "Zu"-Kategorie (bei Bearbeitung)
 *
 * Emits:
 * - close – Modal schließen
 * - transfer – Übertragung starten bzw. aktualisieren
 */
import { ref, computed, watch, onMounted, nextTick, withDefaults } from "vue";
import { toDateOnlyString } from "@/utils/formatters";
import CurrencyDisplay from "../ui/CurrencyDisplay.vue";
import CurrencyInput from "../ui/CurrencyInput.vue";
import SelectCategory from "../ui/SelectCategory.vue";
import { useCategoryStore } from "@/stores/categoryStore";
import { useTransactionStore } from "@/stores/transactionStore";
import { calculateCategorySaldo } from "@/utils/runningBalances";
import { debugLog } from "@/utils/logger";

const props = withDefaults(
  defineProps<{
    isOpen: boolean;
    month?: { start: Date; end: Date };
    mode?: "fill" | "transfer";
    prefillAmount?: number;
    preselectedCategoryId?: string;
    prefillDate?: string;
    transactionId?: string;
    gegentransactionId?: string;
    fromCategoryId?: string;
    toCategoryId?: string;
  }>(),
  {
    mode: "transfer",
  }
);

const emit = defineEmits(["close", "transfer"]);

const categoryStore = useCategoryStore();
const transactionStore = useTransactionStore();

const fromCategoryIdLocal = ref("");
const toCategoryIdLocal = ref("");
const amount = ref(props.prefillAmount || 0);
const date = ref("");
const note = ref("");

// Refs für Fokussteuerung
const fromCategoryRef = ref<InstanceType<typeof SelectCategory> | null>(null);
const toCategoryRef = ref<InstanceType<typeof SelectCategory> | null>(null);
const amountRef = ref<any>(null);

// Initiales Logging bei Komponentenerstellung
onMounted(() => {
  debugLog("[CategoryTransferModal] mounted - incoming props", {
    isOpen: props.isOpen,
    mode: props.mode,
    prefillAmount: props.prefillAmount,
    preselectedCategoryId: props.preselectedCategoryId,
    prefillDate: props.prefillDate,
    transactionId: props.transactionId,
    gegentransactionId: props.gegentransactionId,
    month: props.month,
  });
});

// Datum setzen & Fokussteuerung bei Öffnung und Vorbefüllen bei Bearbeitung
watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      if (props.transactionId && props.prefillDate) {
        date.value = props.prefillDate;
        debugLog("[CategoryTransferModal] isOpen watcher → set prefillDate", {
          date: props.prefillDate,
        });
      } else if (props.month) {
        const computedDate = new Date(props.month.end)
          .toISOString()
          .split("T")[0];
        date.value = computedDate;
        debugLog(
          "[CategoryTransferModal] isOpen watcher → set date from month",
          { computed: computedDate }
        );
      }
      if (props.transactionId) {
        // Bearbeitungsmodus: Vorbefüllen aus den übergebenen Props
        fromCategoryIdLocal.value = props.fromCategoryId || "";
        toCategoryIdLocal.value = props.toCategoryId || "";
        amount.value = props.prefillAmount || 0;
      } else if (props.preselectedCategoryId) {
        // Neuer Transfer: Vorbefüllen basierend auf Modus
        if (props.mode === "transfer") {
          fromCategoryIdLocal.value = props.preselectedCategoryId;
        } else if (props.mode === "fill") {
          toCategoryIdLocal.value = props.preselectedCategoryId;
        }
      }
      nextTick(() => {
        if (props.transactionId) {
          // Fokus auf Betragsfeld und komplettes Markieren des Inhalts
          const inputEl = amountRef.value?.$el?.querySelector("input");
          if (inputEl) {
            inputEl.focus();
            inputEl.select();
          }
        } else {
          if (props.mode !== "transfer") {
            fromCategoryRef.value?.focusInput();
          } else {
            toCategoryRef.value?.focusInput();
          }
        }
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
  if (
    !fromCategoryIdLocal.value ||
    !toCategoryIdLocal.value ||
    amount.value <= 0
  )
    return;

  debugLog("[CategoryTransferModal] transferBetweenCategories", {
    transactionId: props.transactionId,
    gegentransactionId: props.gegentransactionId,
    fromCategoryId: fromCategoryIdLocal.value,
    toCategoryId: toCategoryIdLocal.value,
    amount: amount.value,
    date: date.value,
    note: note.value,
  });

  emit("transfer", {
    transactionId: props.transactionId,
    gegentransactionId: props.gegentransactionId,
    fromCategoryId: fromCategoryIdLocal.value,
    toCategoryId: toCategoryIdLocal.value,
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
      <!-- Überschrift basierend auf dem Modus anpassen -->
      <h3 class="font-bold text-lg mb-4">
        <template v-if="mode === 'transfer'">
          Transferiere von
          {{
            categoryStore.getCategoryById(preselectedCategoryId)?.name || ""
          }}...
        </template>
        <template v-else-if="mode === 'fill'">
          Fülle
          {{
            categoryStore.getCategoryById(preselectedCategoryId)?.name || ""
          }}...
        </template>
        <template v-else> Kategorietransfer bearbeiten </template>
      </h3>
      <form
        @submit.prevent="transferBetweenCategories"
        class="flex flex-col space-y-4 w-full"
      >
        <fieldset v-show="mode == 'fill' || transactionId">
          <legend class="text-sm font-semibold mb-1 select-none">
            Von Kategorie <span class="text-error">*</span>
          </legend>
          <SelectCategory
            ref="fromCategoryRef"
            v-model="fromCategoryIdLocal"
            :filterOutArray="incomeCategoryIds"
          />
        </fieldset>

        <fieldset v-show="mode == 'transfer' || transactionId">
          <legend class="text-sm font-semibold mb-1 select-none">
            Zu Kategorie <span class="text-error">*</span>
          </legend>
          <SelectCategory
            ref="toCategoryRef"
            v-model="toCategoryIdLocal"
            :filterOutArray="
              incomeCategoryIds.concat(fromCategoryIdLocal || '')
            "
          />
        </fieldset>

        <fieldset>
          <legend class="text-sm font-semibold mb-1 select-none">
            Betrag <span class="text-error">*</span>
          </legend>
          <CurrencyInput ref="amountRef" v-model="amount" />
          <label class="label">
            <span class="label-text-alt">
              Verfügbar:
              <CurrencyDisplay
                :amount="
                  comboboxFromOptions.find((o) => o.id === fromCategoryIdLocal)
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

<style scoped></style>
