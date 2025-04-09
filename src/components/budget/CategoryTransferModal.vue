<!-- Datei: src/components/budget/CategoryTransferModal.vue (vollständig) -->
<script setup lang="ts">
/**
 * Pfad zur Komponente: src/components/budget/CategoryTransferModal.vue
 * Funktion: Übertragung von Beträgen zwischen Kategorien mittels CategoryService.
 *
 * Props:
 * - isOpen: boolean – Sichtbarkeit
 * - month?: { start: Date; end: Date } – Aktueller Monat für Saldo-Anzeige
 * - mode?: "fill" | "transfer" – Übertragungsmodus (Default: "transfer")
 * - prefillAmount?: number – Vorausgefüllter Betrag
 * - preselectedCategoryId?: string – ID der Kategorie, die je nach Modus in from oder to übernommen wird
 * - prefillDate?: string – Datum (YYYY-MM-DD), falls beim Bearbeiten vorhanden
 * - transactionId?: string – Vorhandene Transaktions-ID (- amount) (bei Bearbeitung)
 * - gegentransactionId?: string – Vorhandene Gegentransaktions-ID (+ amount) (bei Bearbeitung)
 * - fromCategoryId?: string – "Von"-Kategorie (bei Bearbeitung)
 * - toCategoryId?: string – "Zu"-Kategorie (bei Bearbeitung)
 * - note?: string - Vorhandene Notiz (bei Bearbeitung)
 *
 * Emits:
 * - close – Modal schließen
 * - transfer – Übertragung erfolgreich durchgeführt (payload wird nicht mehr benötigt)
 */
import { ref, computed, watch, onMounted, nextTick, withDefaults } from "vue";
import { toDateOnlyString } from "@/utils/formatters";
import CurrencyDisplay from "../ui/CurrencyDisplay.vue";
import CurrencyInput from "../ui/CurrencyInput.vue";
import SelectCategory from "../ui/SelectCategory.vue";
import { useCategoryStore } from "@/stores/categoryStore"; // Nur noch für getCategoryById in der UI
import { CategoryService } from "@/services/CategoryService"; // Import CategoryService
import { debugLog } from "@/utils/logger";
import { Icon } from "@iconify/vue";

const props = withDefaults(
  defineProps<{
    isOpen: boolean;
    month?: { start: Date; end: Date };
    mode?: "fill" | "transfer";
    prefillAmount?: number;
    preselectedCategoryId?: string; // ID of the category clicked in BudgetMonthCard
    prefillDate?: string;
    transactionId?: string; // ID of negative amount transaction
    gegentransactionId?: string; // ID of positive amount transaction
    fromCategoryId?: string; // Provided during edit
    toCategoryId?: string; // Provided during edit
    note?: string; // Provided during edit
  }>(),
  {
    mode: "transfer",
  }
);

const emit = defineEmits(["close", "transfer"]); // 'transfer' Event signalisiert Erfolg

const categoryStore = useCategoryStore(); // For UI display only now
const categoryService = CategoryService; // Use the service

// Local state for the form
const fromCategoryIdLocal = ref("");
const toCategoryIdLocal = ref("");
const amount = ref(0);
const date = ref("");
const noteLocal = ref("");
const isProcessing = ref(false); // For disabling button on submit

// Refs für Fokussteuerung
const fromCategoryRef = ref<InstanceType<typeof SelectCategory> | null>(null);
const toCategoryRef = ref<InstanceType<typeof SelectCategory> | null>(null);
const amountRef = ref<any>(null); // Ref to CurrencyInput

// Computed values for dropdown options and validation
const normalizedMonthStart = computed(() =>
  props.month ? new Date(toDateOnlyString(props.month.start)) : new Date()
);
const normalizedMonthEnd = computed(() =>
  props.month ? new Date(toDateOnlyString(props.month.end)) : new Date()
);

// Fetch dropdown options using the service
const categoryOptions = computed(() => {
  if (!props.month) return []; // Guard against missing month
  return categoryService.getCategoryTransferOptions(
    normalizedMonthStart.value,
    normalizedMonthEnd.value
  );
});

// Filter out the target category from the 'from' options
const fromCategoryOptions = computed(() => {
  return categoryOptions.value.filter(
    (opt) => opt.id !== toCategoryIdLocal.value
  );
});

// Filter out the source category from the 'to' options
const toCategoryOptions = computed(() => {
  return categoryOptions.value.filter(
    (opt) => opt.id !== fromCategoryIdLocal.value
  );
});

// Get available balance for the selected 'from' category
const availableFromBalance = computed(() => {
  const selectedOption = categoryOptions.value.find(
    (opt) => opt.id === fromCategoryIdLocal.value
  );
  return selectedOption?.saldo ?? 0;
});

// ---- Lifecycle and Watchers ----

// On Mount: Log props
onMounted(() => {
  debugLog("[CategoryTransferModal] mounted - incoming props", { ...props });
});

// Watch isOpen to initialize form state
watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      isProcessing.value = false; // Reset processing state
      // Set Date: Use prefillDate if editing, otherwise default to month end or today
      if (props.prefillDate) {
        date.value = props.prefillDate;
      } else {
        const defaultDate = props.month
          ? new Date(props.month.end).toISOString().split("T")[0] // End of the month
          : new Date().toISOString().split("T")[0]; // Today
        date.value = defaultDate;
      }

      // Set Amount: Use prefillAmount
      amount.value = props.prefillAmount || 0;

      // Set Note: Use provided note if editing
      noteLocal.value = props.note || "";

      // Set Categories based on mode (new) or props (edit)
      if (props.transactionId) {
        // Edit Mode: Use provided props
        fromCategoryIdLocal.value = props.fromCategoryId || "";
        toCategoryIdLocal.value = props.toCategoryId || "";
      } else {
        // New Transfer Mode: Prefill based on context menu click
        if (props.mode === "transfer" && props.preselectedCategoryId) {
          fromCategoryIdLocal.value = props.preselectedCategoryId;
          toCategoryIdLocal.value = ""; // Clear target
        } else if (props.mode === "fill" && props.preselectedCategoryId) {
          toCategoryIdLocal.value = props.preselectedCategoryId;
          // Find "Verfügbare Mittel" for the 'from' category in fill mode
          const availableFundsCat = categoryStore.getAvailableFundsCategory();
          fromCategoryIdLocal.value = availableFundsCat?.id || ""; // Use 'Verfügbare Mittel' or fallback
        } else {
          // Default case (e.g., opened without context)
          fromCategoryIdLocal.value = ""; // Clear both if no context
          toCategoryIdLocal.value = "";
        }
      }

      // Set focus
      nextTick(() => {
        if (props.transactionId) {
          amountRef.value?.focus();
          amountRef.value?.select();
        } else if (props.mode === "fill") {
          // Focus amount if prefilled, otherwise 'from'
          if (amount.value > 0) {
            amountRef.value?.focus();
            amountRef.value?.select();
          } else {
            fromCategoryRef.value?.focusInput();
          }
        } else {
          // mode === 'transfer'
          // Focus 'to' category if 'from' is prefilled, otherwise 'from'
          if (fromCategoryIdLocal.value) {
            toCategoryRef.value?.focusInput();
          } else {
            fromCategoryRef.value?.focusInput();
          }
        }
      });

      debugLog("[CategoryTransferModal] Initialized state", {
        from: fromCategoryIdLocal.value,
        to: toCategoryIdLocal.value,
        amount: amount.value,
        date: date.value,
        note: noteLocal.value,
        mode: props.mode,
      });
    } else {
      // Reset local state when modal closes
      fromCategoryIdLocal.value = "";
      toCategoryIdLocal.value = "";
      amount.value = 0;
      date.value = "";
      noteLocal.value = "";
    }
  },
  { immediate: true } // Run watcher immediately on mount
);

// ---- Actions ----

// Transfer/Update logic using the CategoryService
async function performTransfer() {
  if (
    !fromCategoryIdLocal.value ||
    !toCategoryIdLocal.value ||
    amount.value <= 0 ||
    !date.value ||
    isProcessing.value
  ) {
    debugLog("[CategoryTransferModal] Validation failed or processing", {
      from: fromCategoryIdLocal.value,
      to: toCategoryIdLocal.value,
      amount: amount.value,
      date: date.value,
    });
    // TODO: Add user feedback for validation errors
    return;
  }

  isProcessing.value = true; // Disable button

  try {
    let success = false;
    if (props.transactionId && props.gegentransactionId) {
      // --- Edit existing transfer ---
      debugLog("[CategoryTransferModal] Attempting to update transfer");
      success = await categoryService.updateCategoryTransfer(
        props.transactionId,
        props.gegentransactionId,
        fromCategoryIdLocal.value,
        toCategoryIdLocal.value,
        amount.value,
        date.value,
        noteLocal.value
      );
    } else {
      // --- Add new transfer ---
      debugLog("[CategoryTransferModal] Attempting to add transfer");
      const result = await categoryService.addCategoryTransfer(
        fromCategoryIdLocal.value,
        toCategoryIdLocal.value,
        amount.value,
        date.value,
        noteLocal.value
      );
      success = !!result; // Check if result is truthy
    }

    if (success) {
      debugLog("[CategoryTransferModal] Transfer successful");
      emit("transfer"); // Signal success to parent
      emit("close");
    } else {
      debugLog("[CategoryTransferModal] Transfer failed");
      // TODO: Show error message to user
    }
  } catch (error) {
    debugLog("[CategoryTransferModal] Error during transfer:", error);
    // TODO: Show error message to user
  } finally {
    isProcessing.value = false; // Re-enable button
  }
}
</script>

<template>
  <div
    v-if="isOpen"
    class="modal modal-open"
    tabindex="0"
    @keydown.escape="$emit('close')"
  >
    <div class="modal-box w-full max-w-lg">
      <!-- Increased max-width -->
      <!-- Dynamische Überschrift -->
      <h3 class="font-bold text-lg mb-4 flex items-center">
        <Icon icon="mdi:swap-horizontal-bold" class="mr-2 text-xl" />
        <template v-if="transactionId">Kategorietransfer bearbeiten</template>
        <template v-else-if="mode === 'fill'">
          Fülle
          <span class="font-semibold mx-1">{{
            categoryStore.getCategoryById(toCategoryIdLocal)?.name || "..."
          }}</span>
          auf von...
        </template>
        <template v-else>
          <!-- mode === 'transfer' -->
          Transferiere von
          <span class="font-semibold mx-1">{{
            categoryStore.getCategoryById(fromCategoryIdLocal)?.name || "..."
          }}</span>
          zu...
        </template>
      </h3>

      <form
        @submit.prevent="performTransfer"
        class="flex flex-col space-y-4 w-full"
      >
        <!-- From Category -->
        <fieldset
          :class="
            mode === 'transfer' && !!preselectedCategoryId
              ? 'opacity-50 cursor-not-allowed'
              : ''
          "
        >
          <legend class="text-sm font-semibold mb-1 select-none">
            Von Kategorie <span class="text-error">*</span>
          </legend>
          <SelectCategory
            ref="fromCategoryRef"
            v-model="fromCategoryIdLocal"
            :options="fromCategoryOptions"
            placeholder="Auswählen..."
            :disabled="mode === 'transfer' && !!preselectedCategoryId"
          />
        </fieldset>

        <!-- To Category -->
        <fieldset
          :class="
            mode === 'fill' && !!preselectedCategoryId
              ? 'opacity-50 cursor-not-allowed'
              : ''
          "
        >
          <legend class="text-sm font-semibold mb-1 select-none">
            Zu Kategorie <span class="text-error">*</span>
          </legend>
          <SelectCategory
            ref="toCategoryRef"
            v-model="toCategoryIdLocal"
            :options="toCategoryOptions"
            placeholder="Auswählen..."
            :disabled="mode === 'fill' && !!preselectedCategoryId"
          />
        </fieldset>

        <!-- Amount -->
        <fieldset>
          <legend class="text-sm font-semibold mb-1 select-none">
            Betrag <span class="text-error">*</span>
          </legend>
          <CurrencyInput
            ref="amountRef"
            v-model="amount"
            :class="amount > availableFromBalance ? 'input-error' : ''"
          />
          <!-- Available Balance Hint -->
          <label class="label" v-if="fromCategoryIdLocal">
            <span
              class="label-text-alt flex items-center"
              :class="
                availableFromBalance < amount && availableFromBalance < 0
                  ? 'text-error'
                  : availableFromBalance < amount
                  ? 'text-warning'
                  : 'text-base-content/70'
              "
            >
              <Icon
                :icon="
                  availableFromBalance < amount
                    ? 'mdi:alert-circle-outline'
                    : 'mdi:information-outline'
                "
                class="mr-1"
              />
              Verfügbar:&nbsp;
              <CurrencyDisplay
                :amount="availableFromBalance"
                :show-zero="true"
                :as-integer="true"
              />
            </span>
          </label>
        </fieldset>

        <!-- Date -->
        <fieldset>
          <legend class="text-sm font-semibold mb-1 select-none">
            Datum <span class="text-error">*</span>
          </legend>
          <input
            type="date"
            v-model="date"
            class="input input-bordered w-full focus:outline-none focus:ring-2 focus:ring-accent"
            required
          />
        </fieldset>

        <!-- Note -->
        <fieldset>
          <legend class="text-sm font-semibold mb-1 select-none">Notiz</legend>
          <input
            type="text"
            v-model="noteLocal"
            class="input input-bordered w-full focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder="Grund für die Übertragung (optional)"
          />
        </fieldset>

        <!-- Actions -->
        <div class="modal-action mt-6">
          <button type="button" class="btn btn-ghost" @click="$emit('close')">
            Abbrechen
          </button>
          <button
            type="submit"
            class="btn btn-primary"
            :disabled="isProcessing"
          >
            <span
              v-if="isProcessing"
              class="loading loading-spinner loading-xs"
            ></span>
            {{ transactionId ? "Speichern" : "Übertragen" }}
          </button>
        </div>
      </form>
    </div>
    <!-- Backdrop -->
    <div class="modal-backdrop bg-black/30" @click="$emit('close')"></div>
  </div>
</template>

<style scoped>
/* Optional: Add styles for disabled look */
.opacity-50.cursor-not-allowed .select-bordered {
  background-color: hsl(var(--b2) / 0.5); /* Slightly different background */
}
</style>
