// src/components/planning/PlanningTransactionForm.vue
<script setup lang="ts">
/**
 * Pfad zur Komponente: src/components/planning/PlanningTransactionForm.vue
 * Formular zum Erstellen und Bearbeiten von geplanten Transaktionen.
 *
 * Komponenten-Props:
 * - transaction?: PlanningTransaction - Optional: Zu bearbeitende Transaktion
 * - isEdit?: boolean - Optional: Zeigt an, ob es sich um eine Bearbeitung handelt
 *
 * Emits:
 * - save: Übermittelt die Daten der gespeicherten Transaktion
 * - cancel: Wird bei Abbruch ausgelöst
 */
import { ref, computed, onMounted, watch, nextTick } from "vue";
import {
  PlanningTransaction,
  RecurrencePattern,
  TransactionType,
  AmountType,
  RecurrenceEndType,
  WeekendHandlingType,
  RuleConditionType,
  RuleActionType,
} from "../../types";
import { useAccountStore } from "../../stores/accountStore";
import { useCategoryStore } from "../../stores/categoryStore";
import { useTagStore } from "../../stores/tagStore";
import { useRecipientStore } from "../../stores/recipientStore";
import { useRuleStore } from "@/stores/ruleStore";
import RuleForm from "@/components/rules/RuleForm.vue";
import dayjs from "dayjs";
import SelectAccount from "../ui/SelectAccount.vue";
import SelectCategory from "../ui/SelectCategory.vue";
import SelectRecipient from "../ui/SelectRecipient.vue";
import CurrencyInput from "../ui/CurrencyInput.vue";
import TagSearchableDropdown from "../ui/TagSearchableDropdown.vue";
import { debugLog } from "@/utils/logger";
import { Icon } from "@iconify/vue";

const props = defineProps<{
  transaction?: PlanningTransaction;
  isEdit?: boolean;
}>();

const emit = defineEmits(["save", "cancel"]);

const accountStore = useAccountStore();
const categoryStore = useCategoryStore();
const tagStore = useTagStore();
const recipientStore = useRecipientStore();
const ruleStore = useRuleStore();

// Formular-Refs
const planningFormRef = ref<HTMLFormElement | null>(null);

// Grundlegende Informationen
const name = ref("");
const note = ref("");
const amount = ref(0);
const amountType = ref<AmountType>(AmountType.EXACT);
const approximateAmount = ref(0);
const minAmount = ref(0);
const maxAmount = ref(0);
const startDate = ref(dayjs().format("YYYY-MM-DD"));
const valueDate = ref(startDate.value);
const valueDateManuallyChanged = ref(false);
const accountId = ref("");
const categoryId = ref<string | null>(null); // Holds category for Expense/Income, OR target category for CategoryTransfer
const fromCategoryId = ref<string | null>(null); // Holds source category for CategoryTransfer
const tagIds = ref<string[]>([]);
const recipientId = ref<string | null>(null); // Use null for empty state consistency
const transactionType = ref<TransactionType>(TransactionType.EXPENSE);
const toAccountId = ref("");

// Validierungsstatus
const formAttempted = ref(false); // Track if form submission was attempted

// Tab-Management
const activeTab = ref("categorization"); // 'categorization' oder 'recurrence'

// Wiederholungseinstellungen
const repeatsEnabled = ref(false);
const recurrencePattern = ref<RecurrencePattern>(RecurrencePattern.MONTHLY);
const recurrenceEndType = ref<RecurrenceEndType>(RecurrenceEndType.NEVER);
const recurrenceCount = ref(12);
const endDate = ref<string | null>(null);
const executionDay = ref<number | null>(null);
const weekendHandling = ref<WeekendHandlingType>(WeekendHandlingType.NONE);
const moveScheduleEnabled = ref(false);
const weekendHandlingDirection = ref<"before" | "after">("after");

// Prognosebuchung und Aktivitätsstatus
const forecastOnly = ref(false);
const isActive = ref(true);

// Regel-Modal
const showRuleCreationModal = ref(false);

// Berechnete Felder für Datum und Wiederholung
const dateDescription = ref("Jährlich am 14. April");
const upcomingDates = ref<Array<{ date: string; day: string }>>([]);

// --- Computed Properties ---

// Berechnete Eigenschaften für Transaktionstyp
const isExpense = computed(
  () => transactionType.value === TransactionType.EXPENSE
);
const isIncome = computed(
  () => transactionType.value === TransactionType.INCOME
);
const isAccountTransfer = computed(
  () => transactionType.value === TransactionType.ACCOUNTTRANSFER
);
const isCategoryTransfer = computed(
  () => transactionType.value === TransactionType.CATEGORYTRANSFER
);

// Gefilterte Konto- und Kategorie-Listen
const accounts = computed(() => accountStore.activeAccounts);
const categories = computed(() => categoryStore.activeCategories);

const filteredAccounts = computed(() =>
  (accounts.value || []).filter((acc) => acc.id !== accountId.value)
);

const filteredCategories = computed(() =>
  (categories.value || []).filter((cat) => cat.id !== fromCategoryId.value)
);

// --- Validierung Computed Properties ---
const isNameValid = computed(() => !!name.value?.trim());
const isAmountValid = computed(
  () =>
    typeof amount.value === "number" &&
    amount.value !== 0 &&
    amount.value !== null
); // Basic check, CurrencyInput handles more
const isStartDateValid = computed(() => !!startDate.value);
const isValueDateValid = computed(() => !!valueDate.value);

const isAccountIdRequired = computed(
  () => isExpense.value || isIncome.value || isAccountTransfer.value
);
const isAccountIdValid = computed(
  () => !isAccountIdRequired.value || !!accountId.value
);

const isCategoryIdRequired = computed(() => isExpense.value || isIncome.value);
const isCategoryIdValid = computed(
  () => !isCategoryIdRequired.value || !!categoryId.value
);

const isRecipientIdRequired = computed(() => isExpense.value || isIncome.value);
const isRecipientIdValid = computed(
  () => !isRecipientIdRequired.value || !!recipientId.value
);

const isToAccountIdRequired = computed(() => isAccountTransfer.value);
const isToAccountIdValid = computed(
  () => !isToAccountIdRequired.value || !!toAccountId.value
);

const isFromCategoryIdRequired = computed(() => isCategoryTransfer.value);
const isFromCategoryIdValid = computed(
  () => !isFromCategoryIdRequired.value || !!fromCategoryId.value
);

// Target category for category transfer uses categoryId ref
const isTargetCategoryIdRequired = computed(() => isCategoryTransfer.value);
const isTargetCategoryIdValid = computed(
  () => !isTargetCategoryIdRequired.value || !!categoryId.value
);

// Overall form validity
const isFormValid = computed(() => {
  return (
    isNameValid.value &&
    isAmountValid.value &&
    isStartDateValid.value &&
    isValueDateValid.value &&
    isAccountIdValid.value &&
    isCategoryIdValid.value && // Checks normal category OR target if applicable (isCategoryIdRequired handles context)
    isRecipientIdValid.value &&
    isToAccountIdValid.value &&
    isFromCategoryIdValid.value &&
    isTargetCategoryIdValid.value // Explicit check for target category in transfer mode
  );
});

// --- Lifecycle Hooks ---

onMounted(() => {
  loadTransactionData();
  updateDateDescription();
  calculateUpcomingDates();
  // Reset validation attempt state on mount
  formAttempted.value = false;
});

// --- Watchers ---

// Watch-Hooks für Datumsfelder
watch(startDate, (newDate) => {
  if (!valueDateManuallyChanged.value) {
    valueDate.value = newDate;
  }
  if (formAttempted.value) isStartDateValid.value; // Re-validate if needed
});

watch(valueDate, (val) => {
  valueDateManuallyChanged.value = val !== startDate.value;
  if (formAttempted.value) isValueDateValid.value; // Re-validate if needed
});

// Watch-Hooks für Datumsanzeige und Terminberechnung
watch(
  [
    startDate,
    recurrencePattern,
    repeatsEnabled,
    executionDay,
    moveScheduleEnabled,
    weekendHandlingDirection,
  ],
  () => {
    updateDateDescription();
    calculateUpcomingDates();
  },
  { deep: true } // Necessary for array watching
);

// Watch für Transaktionstyp - Resets und Betragsanpassung
watch(transactionType, (newType, oldType) => {
  debugLog(`Transaction type changed FROM ${oldType} TO ${newType}`);
  let effectiveAmount: number;
  // Reset related fields when switching type to ensure clean state
  if (newType !== oldType) {
    debugLog("Resetting fields due to type change.");
    // Clear fields based on the *old* type or irrelevant for the *new* type
    if (
      oldType === TransactionType.ACCOUNTTRANSFER ||
      newType !== TransactionType.ACCOUNTTRANSFER
    ) {
      debugLog("Clearing toAccountId");
      toAccountId.value = "";
    }
    if (
      oldType === TransactionType.CATEGORYTRANSFER ||
      newType !== TransactionType.CATEGORYTRANSFER
    ) {
      debugLog("Clearing fromCategoryId");
      fromCategoryId.value = null;
      // Only clear categoryId if the new type isn't Expense/Income or Target Category
      if (
        newType !== TransactionType.EXPENSE &&
        newType !== TransactionType.INCOME &&
        newType !== TransactionType.CATEGORYTRANSFER
      ) {
        debugLog("Clearing categoryId (not needed for new type)");
        categoryId.value = null;
      } else if (newType === TransactionType.CATEGORYTRANSFER) {
        debugLog("Clearing categoryId (to become target)");
        categoryId.value = null; // Clear specifically for target selection
      }
    }
    if (
      oldType !== TransactionType.EXPENSE &&
      oldType !== TransactionType.INCOME
    ) {
      // If previous type was Transfer, maybe clear recipient? Optional.
      // debugLog("Clearing recipientId");
      // recipientId.value = null;
    }

    // Reset category/account fields explicitly based on the NEW type destination
    if (
      newType === TransactionType.EXPENSE ||
      newType === TransactionType.INCOME
    ) {
      // Switching TO Expense/Income: ensure transfer fields are clear. Keep accountId if possible.
      toAccountId.value = "";
      fromCategoryId.value = null;
      // categoryId might be kept if switching between Expense/Income, otherwise cleared above.
    } else if (newType === TransactionType.CATEGORYTRANSFER) {
      // Switching TO Category Transfer: clear target account. Ensure category IDs are null for selection.
      toAccountId.value = "";
      fromCategoryId.value = null;
      categoryId.value = null; // Becomes the target category, ensure it's clear
    } else if (newType === TransactionType.ACCOUNTTRANSFER) {
      // Switching TO Account Transfer: clear category fields. Keep accountId (source).
      categoryId.value = null;
      fromCategoryId.value = null;
    }
    debugLog(
      `Fields after reset - accountId: ${accountId.value}, categoryId: ${categoryId.value}, fromCategoryId: ${fromCategoryId.value}, toAccountId: ${toAccountId.value}`
    );
  }

  // Betragsanpassung
  effectiveAmount = amount.value; // Start with current input
  if (
    newType === TransactionType.ACCOUNTTRANSFER ||
    newType === TransactionType.CATEGORYTRANSFER
  ) {
    amount.value = Math.abs(amount.value || 0); // Transfers always use positive amount internally
  } else if (
    newType === TransactionType.EXPENSE &&
    (amount.value > 0 || amount.value === 0)
  ) {
    amount.value = -Math.abs(amount.value || 0); // Expenses are negative (or zero)
    if (amount.value === 0 && effectiveAmount > 0)
      amount.value = -effectiveAmount; // Ensure sign flips even if input becomes 0
  } else if (
    newType === TransactionType.INCOME &&
    (amount.value < 0 || amount.value === 0)
  ) {
    amount.value = Math.abs(amount.value || 0); // Incomes are positive (or zero)
    if (amount.value === 0 && effectiveAmount < 0)
      amount.value = -effectiveAmount; // Ensure sign flips even if input becomes 0
  }
  debugLog(`Amount after type change processing: ${amount.value}`);
  // Re-validate amount if needed
  if (formAttempted.value) nextTick(isAmountValid.value);
});

// Watch für Betrag (nur für INCOME/EXPENSE relevant für automatischen Typwechsel)
watch(amount, (newAmount, oldAmount) => {
  // Only auto-switch type for Expense/Income based on sign, if not a transfer
  if (!isAccountTransfer.value && !isCategoryTransfer.value) {
    if (newAmount < 0 && transactionType.value !== TransactionType.EXPENSE) {
      transactionType.value = TransactionType.EXPENSE;
    } else if (
      newAmount > 0 &&
      transactionType.value !== TransactionType.INCOME
    ) {
      transactionType.value = TransactionType.INCOME;
    }
  }
  // Re-validate if needed
  if (formAttempted.value) isAmountValid.value;
});

// Watch für Quell/Ziel-Gleichheit bei Transfers
watch(fromCategoryId, (newCategoryId) => {
  if (isCategoryTransfer.value && newCategoryId === categoryId.value) {
    categoryId.value = null; // Prevent same source/target category
  }
  if (formAttempted.value) isFromCategoryIdValid.value; // Re-validate
});
watch(categoryId, (newCategoryId) => {
  // This watcher now handles target category for Category Transfer and normal category otherwise
  if (isCategoryTransfer.value && newCategoryId === fromCategoryId.value) {
    fromCategoryId.value = null; // Prevent same source/target category (clear source if target matches) - or clear target? Clear target is probably better UX.
    // Let's clear target instead if it matches source
    // categoryId.value = null;
  }
  if (formAttempted.value) {
    isCategoryIdValid.value; // Re-validate normal category
    isTargetCategoryIdValid.value; // Re-validate target category
  }
});
watch(accountId, (newAccountId) => {
  if (isAccountTransfer.value && newAccountId === toAccountId.value) {
    toAccountId.value = ""; // Prevent same source/target account
  }
  if (formAttempted.value) isAccountIdValid.value; // Re-validate
});
watch(toAccountId, (newToAccountId) => {
  if (isAccountTransfer.value && newToAccountId === accountId.value) {
    accountId.value = ""; // Prevent same source/target account (clear source if target matches)
  }
  if (formAttempted.value) isToAccountIdValid.value; // Re-validate
});

// Watch other validated fields
watch(name, () => {
  if (formAttempted.value) isNameValid.value;
});
watch(recipientId, () => {
  if (formAttempted.value) isRecipientIdValid.value;
});

// --- Methoden ---

/**
 * Lädt die Daten der übergebenen Transaktion in das Formular.
 */
function loadTransactionData() {
  if (props.transaction) {
    const tx = props.transaction;
    name.value = tx.name || "";
    note.value = tx.note || "";
    // Amount is handled carefully with type switching below
    amountType.value = tx.amountType || AmountType.EXACT;
    approximateAmount.value = tx.approximateAmount || 0;
    minAmount.value = tx.minAmount || 0;
    maxAmount.value = tx.maxAmount || 0;
    startDate.value = tx.startDate;
    valueDate.value = tx.valueDate || tx.startDate;
    valueDateManuallyChanged.value = valueDate.value !== startDate.value;
    accountId.value = tx.accountId; // Source account for all types initially
    tagIds.value = tx.tagIds || [];
    recipientId.value = tx.recipientId || null;
    forecastOnly.value = tx.forecastOnly || false;
    isActive.value = tx.isActive !== undefined ? tx.isActive : true;

    repeatsEnabled.value = tx.recurrencePattern !== RecurrencePattern.ONCE;
    recurrencePattern.value = tx.recurrencePattern;
    recurrenceEndType.value = tx.recurrenceEndType || RecurrenceEndType.NEVER;
    recurrenceCount.value = tx.recurrenceCount || 12;
    endDate.value = tx.endDate || null;
    executionDay.value = tx.executionDay || null;

    weekendHandling.value = tx.weekendHandling || WeekendHandlingType.NONE;
    moveScheduleEnabled.value =
      weekendHandling.value !== WeekendHandlingType.NONE;
    weekendHandlingDirection.value =
      weekendHandling.value === WeekendHandlingType.BEFORE ? "before" : "after";

    // Set transaction type and related fields AFTER other fields are set
    transactionType.value =
      tx.transactionType ||
      (tx.amount < 0 ? TransactionType.EXPENSE : TransactionType.INCOME);
    amount.value = tx.amount; // Set raw amount

    // Adjust fields based on loaded type
    if (transactionType.value === TransactionType.ACCOUNTTRANSFER) {
      toAccountId.value = tx.transferToAccountId || "";
      categoryId.value = null; // Clear category for account transfer
      fromCategoryId.value = null;
      amount.value = Math.abs(tx.amount); // Ensure amount is positive for display
    } else if (transactionType.value === TransactionType.CATEGORYTRANSFER) {
      fromCategoryId.value = tx.categoryId; // Source category is in 'categoryId' field for this type in DB
      categoryId.value = (tx as any).transferToCategoryId || null; // Target category is in extra field
      toAccountId.value = ""; // Clear account transfer field
      amount.value = Math.abs(tx.amount); // Ensure amount is positive for display
    } else {
      // Expense or Income
      categoryId.value = tx.categoryId; // Normal category
      fromCategoryId.value = null; // Clear transfer fields
      toAccountId.value = "";
      // Amount sign is already correct from tx.amount
    }
  } else {
    // Defaults for new transaction
    if (accountStore.activeAccounts.length > 0) {
      accountId.value = accountStore.activeAccounts[0].id;
    }
    valueDate.value = startDate.value;
    valueDateManuallyChanged.value = false;
    transactionType.value = TransactionType.EXPENSE; // Default to expense
    amount.value = 0; // Default amount
    // Reset other potentially conflicting fields
    categoryId.value = null;
    fromCategoryId.value = null;
    toAccountId.value = "";
    recipientId.value = null;
  }
}

/**
 * Aktualisiert die textuelle Beschreibung des Wiederholungsmusters
 */
function updateDateDescription() {
  if (!repeatsEnabled.value) {
    dateDescription.value = `Einmalig am ${formatDate(startDate.value)}`;
    return;
  }
  const date = dayjs(startDate.value);
  const day = date.date();
  const monthName = [
    "Januar",
    "Februar",
    "März",
    "April",
    "Mai",
    "Juni",
    "Juli",
    "August",
    "September",
    "Oktober",
    "November",
    "Dezember",
  ][date.month()];
  let desc = "";
  switch (recurrencePattern.value) {
    case RecurrencePattern.DAILY:
      desc = "Täglich";
      break;
    case RecurrencePattern.WEEKLY:
      desc = `Wöchentlich am ${getDayOfWeekName(date.day())}`;
      break;
    case RecurrencePattern.BIWEEKLY:
      desc = `Alle zwei Wochen am ${getDayOfWeekName(date.day())}`;
      break;
    case RecurrencePattern.MONTHLY:
      const dayToUse = executionDay.value
        ? executionDay.value > 0 && executionDay.value < 32
          ? executionDay.value
          : day
        : day;
      desc = `Monatlich am ${dayToUse}.`;
      break;
    case RecurrencePattern.QUARTERLY:
      desc = `Vierteljährlich am ${day}. ${monthName}`;
      break;
    case RecurrencePattern.YEARLY:
      desc = `Jährlich am ${day}. ${monthName}`;
      break;
    default:
      desc = formatDate(startDate.value);
  }
  if (moveScheduleEnabled.value) {
    const direction =
      weekendHandlingDirection.value === "before" ? "davor" : "danach";
    desc += ` (Wochenende: ${direction})`;
  }
  dateDescription.value = desc;
}

/**
 * Berechnet die nächsten Ausführungstermine basierend auf dem Wiederholungsmuster
 */
function calculateUpcomingDates() {
  upcomingDates.value = [];
  if (!startDate.value) return;
  let currentDate = dayjs(startDate.value);
  const endDateLimit = dayjs().add(3, "years");
  let count = 0;
  const maxDatesToShow = 6;

  if (!repeatsEnabled.value) {
    upcomingDates.value.push({
      date: currentDate.format("DD.MM.YYYY"),
      day: getDayOfWeekName(currentDate.day()),
    });
    return;
  }

  while (count < 50 && currentDate.isBefore(endDateLimit)) {
    // Calculate more internally for end conditions
    let dateToUse = currentDate;

    // Handle End Date/Count limits
    if (
      recurrenceEndType.value === RecurrenceEndType.DATE &&
      endDate.value &&
      currentDate.isAfter(dayjs(endDate.value))
    ) {
      break;
    }
    if (
      recurrenceEndType.value === RecurrenceEndType.COUNT &&
      recurrenceCount.value &&
      count >= recurrenceCount.value
    ) {
      break;
    }

    if (moveScheduleEnabled.value) {
      const dayOfWeek = dateToUse.day(); // 0 = Sunday, 6 = Saturday
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        // Weekend
        if (weekendHandlingDirection.value === "before") {
          dateToUse =
            dayOfWeek === 0
              ? dateToUse.subtract(2, "day")
              : dateToUse.subtract(1, "day"); // Sun -> Fri, Sat -> Fri
        } else {
          // after
          dateToUse =
            dayOfWeek === 0 ? dateToUse.add(1, "day") : dateToUse.add(2, "day"); // Sun -> Mon, Sat -> Mon
        }
      }
    }

    // Only add to display list if within the limit
    if (upcomingDates.value.length < maxDatesToShow) {
      upcomingDates.value.push({
        date: dateToUse.format("DD.MM.YYYY"),
        day: getDayOfWeekName(dateToUse.day()),
      });
    }

    count++;

    // Calculate next date based on pattern
    switch (recurrencePattern.value) {
      case RecurrencePattern.DAILY:
        currentDate = currentDate.add(1, "day");
        break;
      case RecurrencePattern.WEEKLY:
        currentDate = currentDate.add(1, "week");
        break;
      case RecurrencePattern.BIWEEKLY:
        currentDate = currentDate.add(2, "weeks");
        break;
      case RecurrencePattern.MONTHLY:
        const originalDayOfMonth =
          executionDay.value ?? dayjs(startDate.value).date();
        let nextMonthDate = currentDate.add(1, "month");
        let daysInNextMonth = nextMonthDate.daysInMonth();
        let dayToSet = Math.min(originalDayOfMonth, daysInNextMonth);
        currentDate = nextMonthDate.date(dayToSet);
        break;
      case RecurrencePattern.QUARTERLY:
        currentDate = currentDate.add(3, "months");
        break;
      case RecurrencePattern.YEARLY:
        currentDate = currentDate.add(1, "year");
        break;
      default:
        count = 50; // Should not happen, break loop
    }

    // Safety break if something goes wrong with date calculation
    if (count > 49 && upcomingDates.value.length < maxDatesToShow) {
      console.warn("Potential infinite loop in date calculation detected.");
      break;
    }
  }
  // Ensure only the required number of dates are shown, even if more were calculated for end logic
  upcomingDates.value = upcomingDates.value.slice(0, maxDatesToShow);
}

/**
 * Hilfsfunktion zum Formatieren des Tagesnamens
 */
function getDayOfWeekName(day: number): string {
  const days = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
  return days[day];
}

/**
 * Hilfsfunktion zum Formatieren eines Datums
 */
function formatDate(dateStr: string): string {
  return dayjs(dateStr).format("DD.MM.YYYY");
}

/**
 * Handler für das Erstellen eines neuen Empfängers
 */
function onCreateRecipient(data: { name: string }) {
  const created = recipientStore.addRecipient({ name: data.name });
  recipientId.value = created.id;
  debugLog("[PlanningTransactionForm] onCreateRecipient", created);
}

/**
 * Validiert das Formular und zeigt Fehler an.
 */
function validateForm(): boolean {
  formAttempted.value = true; // Mark that validation check occurred
  // Trigger reactivity for computed properties (though watchers should handle most)
  const valid = isFormValid.value;

  if (!valid) {
    debugLog("[PlanningTransactionForm] Validation failed.");
    // Optional: Scroll to the first invalid field
    nextTick(() => {
      const firstError = planningFormRef.value?.querySelector(
        '.input-bordered:invalid, .select-bordered:invalid, .textarea-bordered:invalid, .validator-hint.text-error:not([style*="display: none"])'
      ); // Basic selector, might need refinement
      if (firstError) {
        firstError.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  }
  return valid;
}

/**
 * Speichert die Planungstransaktion
 */
function savePlanningTransaction() {
  if (!validateForm()) {
    return;
  }

  let effectiveAmount = amount.value;

  // Betrag entsprechend dem Transaktionstyp anpassen (final check)
  if (isAccountTransfer.value || isCategoryTransfer.value) {
    effectiveAmount = Math.abs(effectiveAmount);
  } else {
    effectiveAmount = isExpense.value
      ? -Math.abs(effectiveAmount)
      : Math.abs(effectiveAmount);
  }

  const effectiveWeekendHandling = moveScheduleEnabled.value
    ? weekendHandlingDirection.value === "before"
      ? WeekendHandlingType.BEFORE
      : WeekendHandlingType.AFTER
    : WeekendHandlingType.NONE;

  const effectiveRecurrencePattern = repeatsEnabled.value
    ? recurrencePattern.value
    : RecurrencePattern.ONCE;

  const effectiveRecurrenceEndType = repeatsEnabled.value
    ? recurrenceEndType.value
    : RecurrenceEndType.NEVER;

  // Kategoriedaten entsprechend dem Transaktionstyp anpassen
  // Bei Transfer ist `categoryId` in der DB die *Quellkategorie*
  const dbCategoryId = isCategoryTransfer.value
    ? fromCategoryId.value
    : categoryId.value;
  // Bei Transfer ist `transferToCategoryId` die *Zielkategorie*, die im Formular in `categoryId` gehalten wird
  const dbTransferToCategoryId = isCategoryTransfer.value
    ? categoryId.value
    : undefined;

  const transactionData: Omit<PlanningTransaction, "id"> = {
    name: name.value.trim(),
    accountId: accountId.value, // Immer das Quellkonto (auch bei Transfers)
    categoryId: dbCategoryId, // Quellkategorie bei CatTransfer, sonst normale Kategorie
    tagIds: tagIds.value,
    recipientId:
      isAccountTransfer.value || isCategoryTransfer.value
        ? null
        : recipientId.value, // Kein Empfänger bei Transfers
    amount: effectiveAmount,
    amountType: amountType.value,
    approximateAmount:
      amountType.value === AmountType.APPROXIMATE
        ? approximateAmount.value
        : undefined,
    minAmount:
      amountType.value === AmountType.RANGE ? minAmount.value : undefined,
    maxAmount:
      amountType.value === AmountType.RANGE ? maxAmount.value : undefined,
    note: note.value,
    startDate: startDate.value,
    valueDate: valueDate.value,
    endDate:
      effectiveRecurrenceEndType === RecurrenceEndType.DATE
        ? endDate.value
        : null,
    recurrencePattern: effectiveRecurrencePattern,
    recurrenceEndType: effectiveRecurrenceEndType,
    recurrenceCount:
      effectiveRecurrenceEndType === RecurrenceEndType.COUNT
        ? recurrenceCount.value
        : null,
    executionDay:
      effectiveRecurrencePattern === RecurrencePattern.MONTHLY &&
      executionDay.value
        ? executionDay.value
        : null,
    weekendHandling: effectiveWeekendHandling,
    transactionType: transactionType.value,
    transferToAccountId: isAccountTransfer.value
      ? toAccountId.value
      : undefined,
    isActive: isActive.value,
    forecastOnly: forecastOnly.value,
    // Add transferToCategoryId specifically if it's a category transfer
    ...(isCategoryTransfer.value && {
      transferToCategoryId: dbTransferToCategoryId,
    }),
  };

  debugLog("[PlanningTransactionForm] Final data for save:", transactionData);
  emit("save", transactionData);
}

/**
 * Initialisiert Grundwerte für eine neue Regel
 */
function getInitialRuleValues() {
  const recipientName =
    recipientStore.getRecipientById(recipientId.value || "")?.name || "";
  return {
    name: `Regel für ${name.value || recipientName}`,
    description: `Automatisch erstellt für Planungstransaktion "${
      name.value || recipientName
    }"`,
    stage: "DEFAULT",
    isActive: true,
    conditions: [
      {
        type: RuleConditionType.ACCOUNT_IS,
        operator: "is",
        value: accountId.value,
      },
      {
        type: RuleConditionType.PAYEE_CONTAINS,
        operator: "contains",
        value: recipientName,
      },
      {
        type: RuleConditionType.AMOUNT_EQUALS,
        operator: "equals",
        value: Math.abs(amount.value),
      },
    ],
    actions: [
      {
        type: RuleActionType.SET_CATEGORY,
        field: "category",
        value: categoryId.value || fromCategoryId.value || "",
      }, // Use appropriate category based on type
    ],
  };
}

/**
 * Speichert eine neue Regel und schließt das Regelmodal
 */
function saveRuleAndCloseModal(ruleData: any) {
  ruleStore.addRule(ruleData);
  debugLog("[PlanningTransactionForm] Created rule from planning", ruleData);
  showRuleCreationModal.value = false;
  alert(`Regel "${ruleData.name}" wurde erfolgreich erstellt.`);
}
</script>

<template>
  <form
    ref="planningFormRef"
    @submit.prevent="savePlanningTransaction"
    class="space-y-6"
    novalidate
  >
    <!-- ALLGEMEIN - Immer sichtbar oben -->
    <div class="space-y-4">
      <!-- Transaktionstyp-Radiogruppe -->
      <fieldset class="fieldset flex justify-between gap-4">
        <div>
          <legend class="fieldset-legend">Transaktionstyp</legend>
        </div>
        <div class="flex flex-wrap justify-center gap-4 pt-2">
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              class="radio radio-sm border-neutral checked:bg-error/60 checked:text-error checked:border-error"
              v-model="transactionType"
              :value="TransactionType.EXPENSE"
            />
            <span class="text-sm">Ausgabe</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              class="radio radio-sm border-neutral checked:bg-success/60 checked:text-success checked:border-success"
              v-model="transactionType"
              :value="TransactionType.INCOME"
            />
            <span class="text-sm">Einnahme</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              class="radio radio-sm border-neutral checked:bg-warning/60 checked:text-warning checked:border-warning"
              v-model="transactionType"
              :value="TransactionType.ACCOUNTTRANSFER"
            />
            <span class="text-sm">Kontotransfer</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              class="radio radio-sm border-neutral checked:bg-warning/60 checked:text-warning checked:border-warning"
              v-model="transactionType"
              :value="TransactionType.CATEGORYTRANSFER"
            />
            <span class="text-sm">Kategorietransfer</span>
          </label>
        </div>
      </fieldset>
      <div class="divider"></div>
      <!-- Name der Planungstransaktion -->
      <div class="flex gap-4 items-end">
        <div class="w-full">
          <fieldset class="fieldset">
            <legend class="fieldset-legend">
              Name<span class="text-error">*</span>
            </legend>
            <div class="form-control">
              <input
                type="text"
                v-model="name"
                class="input input-bordered"
                :class="{ 'input-error': formAttempted && !isNameValid }"
                required
                placeholder="z.B. Schornsteinfeger, Miete, Gehalt"
                aria-describedby="name-validation"
              />
              <div
                id="name-validation"
                class="validator-hint text-error mt-1"
                v-if="formAttempted && !isNameValid"
              >
                Name darf nicht leer sein.
              </div>
            </div>
          </fieldset>
          <fieldset class="fieldset">
            <legend class="fieldset-legend">Notizen</legend>
            <div class="form-control">
              <textarea
                v-model="note"
                class="textarea textarea-bordered w-full"
                placeholder="Zusätzliche Informationen"
              ></textarea>
            </div>
          </fieldset>
        </div>
        <div class="w-full">
          <!-- Betrag -->
          <fieldset class="fieldset">
            <legend class="fieldset-legend">
              Betrag<span class="text-error">*</span>
            </legend>
            <div class="form-control">
              <div class="flex flex-col space-y-3">
                <div class="input-group flex items-center gap-2">
                  <CurrencyInput
                    v-model="amount"
                    :class="{ 'input-error': formAttempted && !isAmountValid }"
                    aria-describedby="amount-validation"
                    required
                  />
                  <span>€</span>
                </div>
                <div
                  id="amount-validation"
                  class="validator-hint text-error mt-1"
                  v-if="formAttempted && !isAmountValid"
                >
                  Betrag muss eine gültige Zahl sein.
                </div>

                <div class="flex items-center space-x-3">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      class="radio radio-sm"
                      :value="AmountType.EXACT"
                      v-model="amountType"
                    />
                    <span class="text-sm">Exakt</span>
                  </label>
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      class="radio radio-sm"
                      :value="AmountType.APPROXIMATE"
                      v-model="amountType"
                    />
                    <span class="text-sm">Ungefähr</span>
                  </label>
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      class="radio radio-sm"
                      :value="AmountType.RANGE"
                      v-model="amountType"
                    />
                    <span class="text-sm">Bereich</span>
                  </label>
                </div>

                <div
                  v-if="amountType === AmountType.APPROXIMATE"
                  class="form-control"
                >
                  <label class="label pt-0 pb-1">
                    <span class="label-text">Schwankung</span>
                  </label>
                  <div
                    class="input-group border border-base-content/20 rounded-lg focus-within:border-primary"
                  >
                    <span class="pl-3">±</span>
                    <CurrencyInput
                      v-model="approximateAmount"
                      borderless
                      hide-error-message
                    />
                    <span class="pr-3">€</span>
                  </div>
                </div>

                <div
                  v-if="amountType === AmountType.RANGE"
                  class="grid grid-cols-2 gap-2"
                >
                  <div class="form-control">
                    <label class="label pt-0 pb-1">
                      <span class="label-text">Min. Betrag</span>
                    </label>
                    <div
                      class="input-group border border-base-content/20 rounded-lg focus-within:border-primary"
                    >
                      <CurrencyInput
                        v-model="minAmount"
                        borderless
                        hide-error-message
                      />
                      <span class="pr-3">€</span>
                    </div>
                  </div>
                  <div class="form-control">
                    <label class="label pt-0 pb-1">
                      <span class="label-text">Max. Betrag</span>
                    </label>
                    <div
                      class="input-group border border-base-content/20 rounded-lg focus-within:border-primary"
                    >
                      <CurrencyInput
                        v-model="maxAmount"
                        borderless
                        hide-error-message
                      />
                      <span class="pr-3">€</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </fieldset>
        </div>
      </div>
      <!-- Datum und Wertstellung -->
      <fieldset class="fieldset">
        <legend class="fieldset-legend">
          Datum<span class="text-error">*</span>
        </legend>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="form-control">
            <label class="label pb-1">
              <span class="label-text">Startdatum</span>
            </label>
            <input
              type="date"
              v-model="startDate"
              class="input input-bordered"
              :class="{ 'input-error': formAttempted && !isStartDateValid }"
              required
              aria-describedby="startdate-validation"
            />
            <div
              id="startdate-validation"
              class="validator-hint text-error mt-1"
              v-if="formAttempted && !isStartDateValid"
            >
              Startdatum muss angegeben werden.
            </div>
          </div>
          <div class="form-control">
            <label class="label pb-1">
              <span class="label-text">Wertstellung</span>
            </label>
            <input
              type="date"
              v-model="valueDate"
              class="input input-bordered"
              :class="{ 'input-error': formAttempted && !isValueDateValid }"
              required
              aria-describedby="valuedate-validation"
            />
            <div
              id="valuedate-validation"
              class="validator-hint text-error mt-1"
              v-if="formAttempted && !isValueDateValid"
            >
              Wertstellungsdatum muss angegeben werden.
            </div>
          </div>
        </div>
      </fieldset>
    </div>

    <!-- TABS -->
    <div class="card border border-base-300 p-1">
      <div class="tabs tabs-boxed">
        <a
          class="tab"
          :class="{ 'tab-active': activeTab === 'categorization' }"
          @click="activeTab = 'categorization'"
        >
          Kategorisierung & Details
        </a>
        <a
          class="tab"
          :class="{ 'tab-active': activeTab === 'recurrence' }"
          @click="activeTab = 'recurrence'"
        >
          Wiederholung
        </a>
      </div>

      <!-- TAB 1: Kategorisierung -->
      <div
        v-if="activeTab === 'categorization'"
        class="card bg-base-200 p-4 rounded-lg space-y-4"
      >
        <!-- Empfänger (Nur für Ausgabe/Einnahme relevant & Pflicht) -->
        <div class="form-control">
          <fieldset
            v-if="transactionType !== TransactionType.CATEGORYTRANSFER"
            class="fieldset"
          >
            <legend class="fieldset-legend">Empfänger/Auftraggeber</legend>
            <SelectRecipient
              v-model="recipientId"
              @create="onCreateRecipient"
              :class="{ 'input-error': formAttempted && !isRecipientIdValid }"
              aria-describedby="recipient-validation"
              :required="isRecipientIdRequired"
            />
            <div
              id="recipient-validation"
              class="validator-hint text-error mt-1"
              v-if="formAttempted && !isRecipientIdValid"
            >
              Empfänger muss ausgewählt werden.
            </div>
          </fieldset>
        </div>

        <!-- Konten und Kategorien basierend auf Transaktionstyp -->
        <div
          v-if="isExpense || isIncome"
          class="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <!-- Konto (Pflicht) -->
          <fieldset class="fieldset">
            <legend class="fieldset-legend">
              Konto<span class="text-error">*</span>
            </legend>
            <div class="form-control">
              <SelectAccount
                v-model="accountId"
                :class="{ 'input-error': formAttempted && !isAccountIdValid }"
                aria-describedby="account-validation"
                required
              />
              <div
                id="account-validation"
                class="validator-hint text-error mt-1"
                v-if="formAttempted && !isAccountIdValid"
              >
                Konto muss ausgewählt werden.
              </div>
            </div>
          </fieldset>
          <!-- Kategorie (Pflicht) -->
          <fieldset class="fieldset">
            <legend class="fieldset-legend">
              Kategorie<span class="text-error">*</span>
            </legend>
            <div class="form-control">
              <SelectCategory
                v-model="categoryId"
                :class="{ 'input-error': formAttempted && !isCategoryIdValid }"
                aria-describedby="category-validation"
                required
              />
              <div
                id="category-validation"
                class="validator-hint text-error mt-1"
                v-if="formAttempted && !isCategoryIdValid"
              >
                Kategorie muss ausgewählt werden.
              </div>
            </div>
          </fieldset>
        </div>

        <!-- Kontotransfer -->
        <div
          v-if="isAccountTransfer"
          class="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <!-- Quellkonto (Pflicht) -->
          <fieldset class="fieldset">
            <legend class="fieldset-legend">
              Quellkonto<span class="text-error">*</span>
            </legend>
            <div class="form-control">
              <SelectAccount
                v-model="accountId"
                :class="{ 'input-error': formAttempted && !isAccountIdValid }"
                aria-describedby="source-account-validation"
                required
              />
              <div
                id="source-account-validation"
                class="validator-hint text-error mt-1"
                v-if="formAttempted && !isAccountIdValid"
              >
                Quellkonto muss ausgewählt werden.
              </div>
            </div>
          </fieldset>
          <!-- Zielkonto (Pflicht) -->
          <fieldset class="fieldset">
            <legend class="fieldset-legend">
              Zielkonto<span class="text-error">*</span>
            </legend>
            <div class="form-control">
              <select
                v-model="toAccountId"
                class="select select-bordered w-full"
                :class="{
                  'select-error': formAttempted && !isToAccountIdValid,
                }"
                required
                aria-describedby="target-account-validation"
              >
                <option value="" disabled selected>Bitte wählen</option>
                <option
                  v-for="account in filteredAccounts"
                  :key="account.id"
                  :value="account.id"
                >
                  {{ account.name }}
                </option>
              </select>
              <div
                id="target-account-validation"
                class="validator-hint text-error mt-1"
                v-if="formAttempted && !isToAccountIdValid"
              >
                Zielkonto muss ausgewählt werden.
              </div>
            </div>
          </fieldset>
        </div>

        <!-- Kategorietransfer -->
        <div
          v-if="isCategoryTransfer"
          class="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <!-- Quellkategorie (Pflicht) -->
          <fieldset class="fieldset">
            <legend class="fieldset-legend">
              Quellkategorie<span class="text-error">*</span>
            </legend>
            <div class="form-control">
              <SelectCategory
                v-model="fromCategoryId"
                :class="{
                  'input-error': formAttempted && !isFromCategoryIdValid,
                }"
                aria-describedby="source-category-validation"
                required
              />
              <div
                id="source-category-validation"
                class="validator-hint text-error mt-1"
                v-if="formAttempted && !isFromCategoryIdValid"
              >
                Quellkategorie muss ausgewählt werden.
              </div>
            </div>
          </fieldset>
          <!-- Zielkategorie (Pflicht) -->
          <fieldset class="fieldset">
            <legend class="fieldset-legend">
              Zielkategorie<span class="text-error">*</span>
            </legend>
            <div class="form-control">
              <SelectCategory
                v-model="categoryId"
                :options="filteredCategories"
                :class="{
                  'input-error': formAttempted && !isTargetCategoryIdValid,
                }"
                aria-describedby="target-category-validation"
                required
              />
              <div
                id="target-category-validation"
                class="validator-hint text-error mt-1"
                v-if="formAttempted && !isTargetCategoryIdValid"
              >
                Zielkategorie muss ausgewählt werden.
              </div>
            </div>
          </fieldset>
        </div>

        <!-- Tags (Optional) -->
        <fieldset
          v-if="transactionType !== TransactionType.CATEGORYTRANSFER"
          class="fieldset"
        >
          <legend class="fieldset-legend">Tags</legend>
          <div class="form-control">
            <TagSearchableDropdown
              v-model="tagIds"
              :options="tagStore.tags"
              placeholder="Tags hinzufügen..."
            />
          </div>
        </fieldset>
      </div>
      <!-- TAB 2: Wiederholung -->
      <div v-if="activeTab === 'recurrence'" class="space-y-4">
        <fieldset class="fieldset">
          <div class="card bg-base-200 p-4 rounded-lg">
            <legend class="fieldset-legend">Einstellungen Wiederholung</legend>
            <div class="flex flex-col md:flex-row md:space-x-8 justify-start">
              <!-- Linke Spalte: Einstellungen -->
              <div class="space-y-4 md:w-1/2">
                <div class="form-control">
                  <label class="cursor-pointer label">
                    <span class="label-text">Wiederholt sich</span>
                    <input
                      type="checkbox"
                      class="toggle toggle-primary"
                      v-model="repeatsEnabled"
                    />
                  </label>
                </div>

                <div v-if="repeatsEnabled" class="space-y-4">
                  <div class="form-control">
                    <label class="label pb-1">
                      <span class="label-text">Frequenz</span>
                    </label>
                    <select
                      v-model="recurrencePattern"
                      class="select select-bordered w-full"
                    >
                      <option :value="RecurrencePattern.DAILY">Täglich</option>
                      <option :value="RecurrencePattern.WEEKLY">
                        Wöchentlich
                      </option>
                      <option :value="RecurrencePattern.BIWEEKLY">
                        Alle 2 Wochen
                      </option>
                      <option :value="RecurrencePattern.MONTHLY">
                        Monatlich
                      </option>
                      <option :value="RecurrencePattern.QUARTERLY">
                        Vierteljährlich
                      </option>
                      <option :value="RecurrencePattern.YEARLY">
                        Jährlich
                      </option>
                    </select>
                  </div>

                  <div
                    v-if="recurrencePattern === RecurrencePattern.MONTHLY"
                    class="form-control"
                  >
                    <label class="label pb-1">
                      <span class="label-text">Tag des Monats (optional)</span>
                    </label>
                    <input
                      type="number"
                      v-model.number="executionDay"
                      class="input input-bordered"
                      min="1"
                      max="31"
                      placeholder="Standard: Tag des Startdatums"
                    />
                  </div>

                  <div class="form-control">
                    <label class="cursor-pointer label">
                      <span class="label-text"
                        >Verschieben, wenn Wochenende</span
                      >
                      <input
                        type="checkbox"
                        class="toggle"
                        v-model="moveScheduleEnabled"
                        :disabled="!repeatsEnabled"
                      />
                    </label>
                  </div>

                  <div
                    v-if="repeatsEnabled && moveScheduleEnabled"
                    class="form-control"
                  >
                    <label class="label pb-1"
                      ><span class="label-text">Verschieberichtung</span></label
                    >
                    <div class="flex space-x-4">
                      <label class="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          class="radio radio-sm"
                          value="before"
                          v-model="weekendHandlingDirection"
                        />
                        <span class="text-sm">Vorher (Freitag)</span>
                      </label>
                      <label class="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          class="radio radio-sm"
                          value="after"
                          v-model="weekendHandlingDirection"
                        />
                        <span class="text-sm">Danach (Montag)</span>
                      </label>
                    </div>
                  </div>

                  <div class="form-control">
                    <label class="label pt-4 pb-1"
                      ><span class="label-text">Endet</span></label
                    >
                    <div class="flex flex-wrap gap-x-4 gap-y-2">
                      <label class="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          class="radio radio-sm"
                          :value="RecurrenceEndType.NEVER"
                          v-model="recurrenceEndType"
                          :disabled="!repeatsEnabled"
                        />
                        <span class="text-sm">Nie</span>
                      </label>
                      <label class="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          class="radio radio-sm"
                          :value="RecurrenceEndType.COUNT"
                          v-model="recurrenceEndType"
                          :disabled="!repeatsEnabled"
                        />
                        <span class="text-sm">Nach Anzahl</span>
                      </label>
                      <label class="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          class="radio radio-sm"
                          :value="RecurrenceEndType.DATE"
                          v-model="recurrenceEndType"
                          :disabled="!repeatsEnabled"
                        />
                        <span class="text-sm">Am Datum</span>
                      </label>
                    </div>
                  </div>

                  <div
                    v-if="
                      repeatsEnabled &&
                      recurrenceEndType === RecurrenceEndType.COUNT
                    "
                    class="form-control"
                  >
                    <label class="label pb-1"
                      ><span class="label-text"
                        >Anzahl Wiederholungen</span
                      ></label
                    >
                    <input
                      type="number"
                      v-model.number="recurrenceCount"
                      class="input input-bordered"
                      min="1"
                      placeholder="Anzahl"
                    />
                  </div>

                  <div
                    v-if="
                      repeatsEnabled &&
                      recurrenceEndType === RecurrenceEndType.DATE
                    "
                    class="form-control"
                  >
                    <label class="label pb-1"
                      ><span class="label-text">Enddatum</span></label
                    >
                    <input
                      type="date"
                      v-model="endDate"
                      class="input input-bordered"
                      :min="startDate"
                      placeholder="Enddatum"
                    />
                  </div>
                </div>
              </div>

              <!-- Rechte Spalte: Vorschau -->
              <div class="mt-4 md:mt-0 md:w-1/2">
                <div class="text-sm font-semibold mb-8">
                  Nächste Ausführung: {{ dateDescription }}
                </div>
                <div v-if="upcomingDates.length > 0 && repeatsEnabled">
                  <div class="text-sm font-semibold mb-2">
                    Voraussichtliche Termine:
                  </div>
                  <div class="grid grid-cols-1 gap-1">
                    <div
                      v-for="(date, index) in upcomingDates"
                      :key="index"
                      class="text-xs p-1 rounded"
                    >
                      {{ date.date }} ({{ date.day }})
                    </div>
                  </div>
                  <p
                    class="text-xs text-base-content/70 mt-1"
                    v-if="
                      recurrenceEndType === RecurrenceEndType.COUNT &&
                      upcomingDates.length >= (recurrenceCount || 0)
                    "
                  >
                    Endet nach {{ recurrenceCount }} Termin(en).
                  </p>
                  <p
                    class="text-xs text-base-content/70 mt-1"
                    v-else-if="
                      recurrenceEndType === RecurrenceEndType.DATE && endDate
                    "
                  >
                    Endet am {{ formatDate(endDate) }}.
                  </p>
                </div>
                <div v-else-if="upcomingDates.length > 0 && !repeatsEnabled">
                  <div class="text-sm font-semibold mb-2">
                    Einmaliger Termin:
                  </div>
                  <div class="text-xs p-1 rounded bg-base-100">
                    {{ upcomingDates[0].date }} ({{ upcomingDates[0].day }})
                  </div>
                </div>
                <p v-else-if="!startDate" class="text-sm text-warning">
                  Bitte ein Startdatum wählen.
                </p>
              </div>
            </div>
          </div>
        </fieldset>
      </div>
    </div>
    <fieldset class="fieldset">
      <legend class="fieldset-legend">Status</legend>
      <div class="form-control">
        <label class="cursor-pointer label">
          <span class="label-text">Aktiv</span>
          <input type="checkbox" class="toggle" v-model="isActive" />
        </label>
      </div>
    </fieldset>

    <fieldset class="fieldset">
      <legend class="fieldset-legend">Buchungsverhalten</legend>
      <div class="form-control">
        <label class="cursor-pointer label">
          <span class="label-text">Nur Prognosebuchung</span>
          <input type="checkbox" class="toggle" v-model="forecastOnly" />
        </label>
        <p class="text-xs text-base-content/70 pl-4" v-if="forecastOnly">
          Bei aktivierter Option werden keine echten Transaktionen erzeugt.
        </p>
      </div>
    </fieldset>

    <!-- Buttons unten -->
    <div class="flex justify-end space-x-2 pt-6">
      <button type="button" class="btn btn-ghost" @click="$emit('cancel')">
        Abbrechen
      </button>
      <button type="submit" class="btn btn-primary">
        {{ isEdit ? "Änderungen speichern" : "Planung erstellen" }}
      </button>
    </div>
  </form>
</template>

<style scoped>
/* Optionale Styles für bessere Darstellung der Validator Hints oder Fieldsets */
.fieldset {
  border: _none; /* Standard-Fieldset-Border entfernen */
  padding: 0;
  margin: 0;
}

.fieldset-legend {
  font-weight: 600;
  padding-bottom: 0.5rem; /* Etwas Abstand unter der Legende */
  font-size: 0.875rem; /* Tailwind text-sm */
  color: hsl(var(--bc) / 0.7); /* Leicht abgedunkelte Textfarbe */
}

/* Styling für ungültige Felder, wenn Validierung versucht wurde */
.input-error,
.select-error,
.textarea-error {
  border-color: hsl(var(--er)); /* daisyUI error color */
}

.validator-hint {
  font-size: 0.75rem; /* Tailwind text-xs */
  min-height: 1rem; /* Verhindert leichtes Springen, wenn Fehler erscheint */
}

/* Verstecke native HTML5 Validierungs-Popups */
input:invalid,
select:invalid,
textarea:invalid {
  box-shadow: none;
}
</style>
