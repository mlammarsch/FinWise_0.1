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
import { ref, computed, onMounted, watch } from "vue";
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
const categoryId = ref<string | null>(null);
const fromCategoryId = ref<string | null>(null);
const tagIds = ref<string[]>([]);
const recipientId = ref("");
const transactionType = ref<TransactionType>(TransactionType.EXPENSE);
const toAccountId = ref("");

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

onMounted(() => {
  if (props.transaction) {
    name.value = props.transaction.name || "";
    note.value = props.transaction.note || "";
    amount.value = Math.abs(props.transaction.amount);
    amountType.value = props.transaction.amountType || AmountType.EXACT;
    approximateAmount.value = props.transaction.approximateAmount || 0;
    minAmount.value = props.transaction.minAmount || 0;
    maxAmount.value = props.transaction.maxAmount || 0;
    startDate.value = props.transaction.startDate;
    valueDate.value =
      props.transaction.valueDate || props.transaction.startDate;
    valueDateManuallyChanged.value = valueDate.value !== startDate.value;
    accountId.value = props.transaction.accountId;
    categoryId.value = props.transaction.categoryId;
    tagIds.value = props.transaction.tagIds || [];
    recipientId.value = props.transaction.recipientId || "";
    forecastOnly.value = props.transaction.forecastOnly || false;
    isActive.value =
      props.transaction.isActive !== undefined
        ? props.transaction.isActive
        : true;

    repeatsEnabled.value =
      props.transaction.recurrencePattern !== RecurrencePattern.ONCE;
    recurrencePattern.value = props.transaction.recurrencePattern;
    recurrenceEndType.value =
      props.transaction.recurrenceEndType || RecurrenceEndType.NEVER;
    recurrenceCount.value = props.transaction.recurrenceCount || 12;
    endDate.value = props.transaction.endDate || null;
    executionDay.value = props.transaction.executionDay || null;

    weekendHandling.value =
      props.transaction.weekendHandling || WeekendHandlingType.NONE;
    moveScheduleEnabled.value =
      weekendHandling.value !== WeekendHandlingType.NONE;
    weekendHandlingDirection.value =
      weekendHandling.value === WeekendHandlingType.BEFORE ? "before" : "after";

    // Transaktionstyp und zugehörige Felder setzen
    if (props.transaction.transactionType) {
      transactionType.value = props.transaction.transactionType;
      if (transactionType.value === TransactionType.ACCOUNTTRANSFER) {
        toAccountId.value = props.transaction.transferToAccountId || "";
      } else if (
        transactionType.value === TransactionType.CATEGORYTRANSFER &&
        props.transaction.categoryId
      ) {
        fromCategoryId.value = props.transaction.categoryId;
        categoryId.value =
          (props.transaction as any).transferToCategoryId || null;
      }
    } else {
      // Fallback für alte Daten
      transactionType.value =
        props.transaction.amount < 0
          ? TransactionType.EXPENSE
          : TransactionType.INCOME;
    }
  } else {
    if (accountStore.activeAccounts.length > 0) {
      accountId.value = accountStore.activeAccounts[0].id;
    }
    valueDate.value = startDate.value;
    valueDateManuallyChanged.value = false;
    transactionType.value = TransactionType.EXPENSE;
  }
  updateDateDescription();
  calculateUpcomingDates();
});

// Watch-Hooks für Datumsfelder
watch(startDate, (newDate) => {
  if (!valueDateManuallyChanged.value) {
    valueDate.value = newDate;
  }
});

watch(valueDate, (val) => {
  valueDateManuallyChanged.value = val !== startDate.value;
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
  }
);

// Watch für Transaktionstyp und Betrag
watch(transactionType, (newType) => {
  if (newType === TransactionType.EXPENSE && amount.value > 0) {
    amount.value = -Math.abs(amount.value);
  } else if (newType === TransactionType.INCOME && amount.value < 0) {
    amount.value = Math.abs(amount.value);
  }

  // Bei Kategorietransfer oder Kontotransfer die Betragsprüfung überspringen
  if (
    newType === TransactionType.ACCOUNTTRANSFER ||
    newType === TransactionType.CATEGORYTRANSFER
  ) {
    amount.value = Math.abs(amount.value);
  }
});

// Watch für Betrag (nur für INCOME/EXPENSE relevant)
watch(amount, (newAmount) => {
  if (isAccountTransfer.value || isCategoryTransfer.value) return;

  if (newAmount < 0 && transactionType.value !== TransactionType.EXPENSE) {
    transactionType.value = TransactionType.EXPENSE;
  } else if (
    newAmount > 0 &&
    transactionType.value !== TransactionType.INCOME
  ) {
    transactionType.value = TransactionType.INCOME;
  }
});

// Watch für Quell-Kategorie bei Kategorietransfer
watch(fromCategoryId, (newCategoryId) => {
  if (isCategoryTransfer.value && newCategoryId === categoryId.value) {
    categoryId.value = null;
  }
});

// Watch für ausgewähltes Quell-Konto bei Kontotransfer
watch(accountId, (newAccountId) => {
  if (isAccountTransfer.value && newAccountId === toAccountId.value) {
    toAccountId.value = "";
  }
});

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
      const dayToUse = executionDay.value || day;
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
  if (!repeatsEnabled.value) {
    upcomingDates.value.push({
      date: currentDate.format("DD.MM.YYYY"),
      day: getDayOfWeekName(currentDate.day()),
    });
    return;
  }
  while (count < 5 && currentDate.isBefore(endDateLimit)) {
    let dateToUse = currentDate;
    if (moveScheduleEnabled.value) {
      const dayOfWeek = dateToUse.day();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        if (weekendHandlingDirection.value === "before") {
          dateToUse =
            dayOfWeek === 0
              ? dateToUse.subtract(2, "day")
              : dateToUse.subtract(1, "day");
        } else {
          dateToUse =
            dayOfWeek === 0 ? dateToUse.add(1, "day") : dateToUse.add(2, "day");
        }
      }
    }
    upcomingDates.value.push({
      date: dateToUse.format("DD.MM.YYYY"),
      day: getDayOfWeekName(dateToUse.day()),
    });
    count++;
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
        if (executionDay.value) {
          const nextMonth = currentDate.add(1, "month");
          const year = nextMonth.year();
          const month = nextMonth.month();
          const maxDay = getDaysInMonth(year, month + 1);
          const day = Math.min(executionDay.value, maxDay);
          currentDate = dayjs(new Date(year, month, day));
        } else {
          currentDate = currentDate.add(1, "month");
        }
        break;
      case RecurrencePattern.QUARTERLY:
        currentDate = currentDate.add(3, "months");
        break;
      case RecurrencePattern.YEARLY:
        currentDate = currentDate.add(1, "year");
        break;
      default:
        count = 5;
    }
    if (recurrenceEndType.value === RecurrenceEndType.DATE && endDate.value) {
      if (currentDate.isAfter(dayjs(endDate.value))) break;
    }
  }
  upcomingDates.value = upcomingDates.value.slice(0, 6);
}

/**
 * Hilfsfunktion zum Formatieren des Tagesnamens
 */
function getDayOfWeekName(day: number): string {
  const days = [
    "Sonntag",
    "Montag",
    "Dienstag",
    "Mittwoch",
    "Donnerstag",
    "Freitag",
    "Samstag",
  ];
  return days[day];
}

/**
 * Hilfsfunktion zur Berechnung der Tage in einem Monat
 */
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
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
 * Speichert die Planungstransaktion
 */
function savePlanningTransaction() {
  let effectiveAmount = amount.value;

  // Betrag entsprechend dem Transaktionstyp anpassen
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
  const effectiveCategoryId = isCategoryTransfer.value
    ? fromCategoryId.value
    : categoryId.value;

  const transactionData: Omit<PlanningTransaction, "id"> = {
    name: name.value,
    accountId: accountId.value,
    categoryId: effectiveCategoryId,
    tagIds: tagIds.value,
    recipientId: recipientId.value,
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
    executionDay: executionDay.value,
    weekendHandling: effectiveWeekendHandling,
    transactionType: transactionType.value,
    transferToAccountId: isAccountTransfer.value
      ? toAccountId.value
      : undefined,
    isActive: isActive.value,
    forecastOnly: forecastOnly.value,
  };

  // Bei Kategorietransfer Zielkategorie als zusätzliches Feld hinzufügen
  if (isCategoryTransfer.value) {
    (transactionData as any).transferToCategoryId = categoryId.value;
  }

  debugLog(
    "[PlanningTransactionForm] savePlanningTransaction",
    transactionData
  );
  emit("save", transactionData);
}

/**
 * Initialisiert Grundwerte für eine neue Regel
 */
function getInitialRuleValues() {
  const recipientName =
    recipientStore.getRecipientById(recipientId.value)?.name || "";
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
        value: categoryId.value || "",
      },
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
    @submit.prevent="savePlanningTransaction"
    class="space-y-4"
  >
    <!-- ALLGEMEIN - Immer sichtbar oben -->
    <div class="space-y-4">
      <!-- Transaktionstyp-Radiogruppe -->
      <div class="flex flex-col space-y-3">
        <div class="flex justify-center gap-4 pt-4">
          <label class="flex items-center gap-2">
            <input
              type="radio"
              class="radio radio-sm border-neutral checked:bg-error/60 checked:text-error checked:border-error"
              v-model="transactionType"
              :value="TransactionType.EXPENSE"
            />
            <span class="text-sm">Ausgabe</span>
          </label>
          <label class="flex items-center gap-2">
            <input
              type="radio"
              class="radio radio-sm border-neutral checked:bg-success/60 checked:text-success checked:border-success"
              v-model="transactionType"
              :value="TransactionType.INCOME"
            />
            <span class="text-sm">Einnahme</span>
          </label>
          <label class="flex items-center gap-2">
            <input
              type="radio"
              class="radio radio-sm border-neutral checked:bg-warning/60 checked:text-warning checked:border-warning"
              v-model="transactionType"
              :value="TransactionType.ACCOUNTTRANSFER"
            />
            <span class="text-sm">Kontotransfer</span>
          </label>
          <label class="flex items-center gap-2">
            <input
              type="radio"
              class="radio radio-sm border-neutral checked:bg-warning/60 checked:text-warning checked:border-warning"
              v-model="transactionType"
              :value="TransactionType.CATEGORYTRANSFER"
            />
            <span class="text-sm">Kategorietransfer</span>
          </label>
        </div>
      </div>

      <!-- Name der Planungstransaktion -->
      <div class="form-control">
        <label class="label">
          <span class="label-text">Name der Planungstransaktion</span>
          <span class="text-error">*</span>
        </label>
        <input
          type="text"
          v-model="name"
          class="input input-bordered"
          required
          placeholder="z.B. Schornsteinfeger, Miete, Gehalt"
        />
      </div>

      <!-- Betrag -->
      <div class="form-control">
        <label class="label">
          <span class="label-text">Betrag</span>
          <span class="text-error">*</span>
        </label>
        <div class="flex flex-col space-y-3">
          <div class="input-group flex items-center gap-2">
            <CurrencyInput v-model="amount" />
            <span>€</span>
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
            <label class="label">
              <span class="label-text">Schwankung</span>
            </label>
            <div class="input-group">
              <span>±</span>
              <CurrencyInput
                v-model="approximateAmount"
                borderless
              />
              <span>€</span>
            </div>
          </div>

          <div
            v-if="amountType === AmountType.RANGE"
            class="grid grid-cols-2 gap-2"
          >
            <div class="form-control">
              <label class="label">
                <span class="label-text">Min. Betrag</span>
              </label>
              <CurrencyInput v-model="minAmount" />
            </div>
            <div class="form-control">
              <label class="label">
                <span class="label-text">Max. Betrag</span>
              </label>
              <CurrencyInput v-model="maxAmount" />
            </div>
          </div>
        </div>
      </div>

      <!-- Datum und Wertstellung -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="form-control">
          <label class="label">
            <span class="label-text">Datum</span>
            <span class="text-error">*</span>
          </label>
          <input
            type="date"
            v-model="startDate"
            class="input input-bordered"
            required
          />
        </div>
        <div class="form-control">
          <label class="label">
            <span class="label-text">Wertstellung</span>
            <span class="text-error">*</span>
          </label>
          <input
            type="date"
            v-model="valueDate"
            class="input input-bordered"
            required
          />
        </div>
      </div>
    </div>

    <!-- TABS -->
    <div class="tabs tabs-boxed">
      <a
        class="tab"
        :class="{ 'tab-active': activeTab === 'categorization' }"
        @click="activeTab = 'categorization'"
      >
        Kategorisierung
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
      class="space-y-4"
    >
      <!-- Empfänger -->
      <div class="form-control">
        <label class="label">
          <span class="label-text">Empfänger/Auftraggeber</span>
          <span
            v-if="!isCategoryTransfer && !isAccountTransfer"
            class="text-error"
            >*</span
          >
        </label>
        <SelectRecipient
          v-model="recipientId"
          @create="onCreateRecipient"
        />
      </div>

      <!-- Konten und Kategorien basierend auf Transaktionstyp -->
      <div
        v-if="isExpense || isIncome"
        class="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <div class="form-control">
          <label class="label">
            <span class="label-text">Konto</span>
            <span class="text-error">*</span>
          </label>
          <SelectAccount v-model="accountId" />
        </div>
        <div class="form-control">
          <label class="label">
            <span class="label-text">Kategorie</span>
            <span class="text-error">*</span>
          </label>
          <SelectCategory v-model="categoryId" />
        </div>
      </div>

      <!-- Kontotransfer -->
      <div
        v-if="isAccountTransfer"
        class="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <div class="form-control">
          <label class="label">
            <span class="label-text">Quellkonto</span>
            <span class="text-error">*</span>
          </label>
          <SelectAccount v-model="accountId" />
        </div>
        <div class="form-control">
          <label class="label">
            <span class="label-text">Zielkonto</span>
            <span class="text-error">*</span>
          </label>
          <select
            v-model="toAccountId"
            class="select select-bordered w-full"
            required
          >
            <option
              value=""
              disabled
            >
              Bitte wählen
            </option>
            <option
              v-for="account in filteredAccounts"
              :key="account.id"
              :value="account.id"
            >
              {{ account.name }}
            </option>
          </select>
        </div>
      </div>

      <!-- Kategorietransfer -->
      <div
        v-if="isCategoryTransfer"
        class="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <div class="form-control">
          <label class="label">
            <span class="label-text">Quellkategorie</span>
            <span class="text-error">*</span>
          </label>
          <SelectCategory v-model="fromCategoryId" />
        </div>
        <div class="form-control">
          <label class="label">
            <span class="label-text">Zielkategorie</span>
            <span class="text-error">*</span>
          </label>
          <SelectCategory
            v-model="categoryId"
            :options="filteredCategories"
          />
        </div>
      </div>

      <!-- Tags -->
      <div class="form-control">
        <label class="label">
          <span class="label-text">Tags</span>
        </label>
        <TagSearchableDropdown
          v-model="tagIds"
          :options="tagStore.tags"
          placeholder="Tags hinzufügen..."
        />
      </div>
    </div>

    <!-- TAB 2: Wiederholung -->
    <div
      v-if="activeTab === 'recurrence'"
      class="space-y-4"
    >
      <div class="card bg-base-200 p-4 rounded-lg">
        <div class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div class="form-control py-4">
              <label class="cursor-pointer label">
                <span class="label-text">Wiederholt sich</span>
                <input
                  type="checkbox"
                  class="toggle"
                  v-model="repeatsEnabled"
                />
              </label>
            </div>

            <div
              v-if="repeatsEnabled"
              class="form-control"
            >
              <label class="label">
                <span class="label-text">Wiederholung</span>
              </label>
              <select
                v-model="recurrencePattern"
                class="select select-bordered w-full"
              >
                <option :value="RecurrencePattern.DAILY">Täglich</option>
                <option :value="RecurrencePattern.WEEKLY">Wöchentlich</option>
                <option :value="RecurrencePattern.BIWEEKLY">
                  Alle 2 Wochen
                </option>
                <option :value="RecurrencePattern.MONTHLY">Monatlich</option>
                <option :value="RecurrencePattern.QUARTERLY">
                  Vierteljährlich
                </option>
                <option :value="RecurrencePattern.YEARLY">Jährlich</option>
              </select>
            </div>
            <div
              v-if="recurrencePattern === RecurrencePattern.MONTHLY"
              class="form-control"
            >
              <label class="label">
                <span class="label-text">Tag des Monats</span>
              </label>
              <input
                type="number"
                v-model="executionDay"
                class="input input-bordered"
                min="1"
                max="31"
                placeholder="Tag (1-31)"
              />
            </div>
          </div>

          <div class="form-control">
            <label class="cursor-pointer label">
              <span class="label-text">Verschieben, wenn Wochenende</span>
              <input
                type="checkbox"
                class="toggle"
                v-model="moveScheduleEnabled"
              />
            </label>
          </div>

          <div
            v-if="moveScheduleEnabled"
            class="form-control"
          >
            <div class="flex space-x-2">
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  class="radio radio-sm"
                  value="before"
                  v-model="weekendHandlingDirection"
                />
                <span class="text-sm">Nach vorne (Freitag)</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  class="radio radio-sm"
                  value="after"
                  v-model="weekendHandlingDirection"
                />
                <span class="text-sm">Nach hinten (Montag)</span>
              </label>
            </div>
          </div>

          <div class="form-control">
            <label class="cursor-pointer label">
              <span class="label-text">Endet</span>
            </label>
            <div class="flex space-x-2">
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  class="radio radio-sm"
                  :value="RecurrenceEndType.NEVER"
                  v-model="recurrenceEndType"
                />
                <span class="text-sm">Nie</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  class="radio radio-sm"
                  :value="RecurrenceEndType.COUNT"
                  v-model="recurrenceEndType"
                />
                <span class="text-sm">Nach X Terminen</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  class="radio radio-sm"
                  :value="RecurrenceEndType.DATE"
                  v-model="recurrenceEndType"
                />
                <span class="text-sm">Am Datum</span>
              </label>
            </div>
          </div>

          <div
            v-if="recurrenceEndType === RecurrenceEndType.COUNT"
            class="form-control"
          >
            <input
              type="number"
              v-model="recurrenceCount"
              class="input input-bordered"
              min="1"
              placeholder="Anzahl der Wiederholungen"
            />
          </div>

          <div
            v-if="recurrenceEndType === RecurrenceEndType.DATE"
            class="form-control"
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

        <div class="mt-4">
          <div class="text-sm font-semibold mb-2">
            Zeitpunkt: {{ dateDescription }}
          </div>
          <div v-if="upcomingDates.length > 0">
            <div class="text-sm font-semibold mb-2">Kommende Termine:</div>
            <div class="grid grid-cols-1 gap-2">
              <div
                v-for="(date, index) in upcomingDates"
                :key="index"
                class="text-sm"
              >
                {{ date.date }} ({{ date.day }})
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ALLGEMEIN - Immer sichtbar unten -->
    <div class="space-y-4">
      <div class="card bg-base-200 p-4 rounded-lg">
        <div class="form-control">
          <label class="cursor-pointer label">
            <span class="label-text">Nur Prognosebuchung</span>
            <input
              type="checkbox"
              class="toggle"
              v-model="forecastOnly"
            />
          </label>
          <p
            class="text-xs text-base-content/70"
            v-if="forecastOnly"
          >
            Bei aktivierter Option werden keine echten Transaktionen erzeugt.
          </p>
        </div>
        <div class="form-control mt-2">
          <label class="cursor-pointer label">
            <span class="label-text">Aktiv</span>
            <input
              type="checkbox"
              class="toggle"
              v-model="isActive"
            />
          </label>
        </div>
      </div>

      <div class="form-control">
        <label class="label">
          <span class="label-text">Notizen</span>
        </label>
        <textarea
          v-model="note"
          class="textarea textarea-bordered h-24"
          placeholder="Zusätzliche Informationen"
        ></textarea>
      </div>

      <div class="flex justify-end space-x-2 pt-4">
        <button
          type="button"
          class="btn"
          @click="$emit('cancel')"
        >
          Abbrechen
        </button>
        <button
          type="submit"
          class="btn btn-primary"
        >
          Speichern
        </button>
      </div>
    </div>
  </form>
</template>
