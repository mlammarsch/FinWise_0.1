<!-- src/components/planning/PlanningTransactionForm.vue -->
<script setup lang="ts">
/**
 * Pfad zur Komponente: src/components/planning/PlanningTransactionForm.vue
 * Komponente für das Erfassen und Bearbeiten von Planungstransaktionen.
 *
 * Komponenten-Props:
 * - transaction?: PlanningTransaction - Bestehende Transaktion, falls Edit
 * - isEdit?: boolean - Gibt an, ob die Transaktion bearbeitet wird
 *
 * Emits:
 * - save: Gibt die erstellte/aktualisierte Transaktion zurück
 * - cancel: Bricht die Transaktionserfassung ab
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

// Formularfelder
const name = ref("");
const note = ref("");
const amount = ref(0);
const amountType = ref<AmountType>(AmountType.EXACT);
const approximateAmount = ref(0);
const minAmount = ref(0);
const maxAmount = ref(0);
const startDate = ref(dayjs().format("YYYY-MM-DD"));
const valueDate = ref(startDate.value); // Wertstellungsdatum
const accountId = ref("");
const categoryId = ref<string | null>(null);
const tagIds = ref<string[]>([]);
const recipientId = ref("");
const isTransfer = ref(false);
const toAccountId = ref("");

// Wiederholungsfelder
const repeatsEnabled = ref(false);
const recurrencePattern = ref<RecurrencePattern>(RecurrencePattern.MONTHLY);
const recurrenceEndType = ref<RecurrenceEndType>(RecurrenceEndType.NEVER);
const recurrenceCount = ref(12);
const endDate = ref<string | null>(null);
const executionDay = ref<number | null>(null);
const weekendHandling = ref<WeekendHandlingType>(WeekendHandlingType.NONE);
const moveScheduleEnabled = ref(false);
const weekendHandlingDirection = ref<"before" | "after">("after");

// Automatisierungsfelder
const autoExecute = ref(false);
const isActive = ref(true);

// Regel-Erstellung Modal
const showRuleCreationModal = ref(false);

// Zeitpunktbeschreibung
const dateDescription = ref("Jährlich am 14. April");

// Kommende Ausführungstermine
const upcomingDates = ref<Array<{ date: string; day: string }>>([]);

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
    accountId.value = props.transaction.accountId;
    categoryId.value = props.transaction.categoryId;
    tagIds.value = props.transaction.tagIds || [];
    recipientId.value = props.transaction.recipientId || "";
    autoExecute.value = props.transaction.autoExecute || false;
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

    if (props.transaction.transactionType === TransactionType.ACCOUNTTRANSFER) {
      isTransfer.value = true;
      toAccountId.value = props.transaction.transferToAccountId || "";
    } else {
      isTransfer.value = false;
    }
  } else {
    if (accountStore.activeAccounts.length > 0) {
      accountId.value = accountStore.activeAccounts[0].id;
    }
  }

  updateDateDescription();
  calculateUpcomingDates();
});

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

watch(startDate, (newDate) => {
  if (valueDate.value === startDate.value) {
    valueDate.value = newDate;
  }
});

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

  // Limitiere Termine auf 6
  upcomingDates.value = upcomingDates.value.slice(0, 6);
}

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

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function formatDate(dateStr: string): string {
  return dayjs(dateStr).format("DD.MM.YYYY");
}

function onCreateRecipient(data: { name: string }) {
  const created = recipientStore.addRecipient({ name: data.name });
  recipientId.value = created.id;
  debugLog("[PlanningTransactionForm] onCreateRecipient", created);
}

function savePlanningTransaction() {
  let effectiveAmount = amount.value;
  if (isTransfer.value) {
    effectiveAmount = Math.abs(effectiveAmount);
  } else {
    effectiveAmount = isExpense.value
      ? -Math.abs(effectiveAmount)
      : Math.abs(effectiveAmount);
  }

  const transactionType = isTransfer.value
    ? TransactionType.ACCOUNTTRANSFER
    : effectiveAmount < 0
    ? TransactionType.EXPENSE
    : TransactionType.INCOME;

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

  const transactionData: Omit<PlanningTransaction, "id"> = {
    name: name.value,
    accountId: accountId.value,
    categoryId: isTransfer.value ? null : categoryId.value,
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
    valueDate: valueDate.value, // Hinzugefügtes Wertstellungsdatum
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
    transactionType,
    transferToAccountId: isTransfer.value ? toAccountId.value : undefined,
    isActive: isActive.value,
    autoExecute: autoExecute.value,
  };

  debugLog(
    "[PlanningTransactionForm] savePlanningTransaction",
    transactionData
  );
  emit("save", transactionData);
}

const toggleAmountType = () => {
  amount.value = -amount.value;
};

const isExpense = computed(() => amount.value < 0);

const accounts = computed(() => accountStore.activeAccounts);
const categories = computed(() => categoryStore.activeCategories);

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

function saveRuleAndCloseModal(ruleData: any) {
  ruleStore.addRule(ruleData);
  debugLog("[PlanningTransactionForm] Created rule from planning", ruleData);
  showRuleCreationModal.value = false;
  alert(`Regel "${ruleData.name}" wurde erfolgreich erstellt.`);
}
</script>

<template>
  <form @submit.prevent="savePlanningTransaction" class="space-y-4">
    <!-- Namen der Planungstransaktion -->
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

    <!-- Grundlegende Informationen: Betrag, Konto, Empfänger -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Empfänger -->
      <div class="form-control">
        <label class="label">
          <span class="label-text">Empfänger/Auftraggeber</span>
          <span class="text-error">*</span>
        </label>
        <SelectRecipient v-model="recipientId" @create="onCreateRecipient" />
      </div>

      <!-- Betrag mit Vorzeichen-Auswahl -->
      <div class="form-control">
        <label class="label">
          <span class="label-text">Betrag</span>
          <span class="text-error">*</span>
        </label>
        <div class="flex flex-col space-y-3">
          <div class="input-group flex items-center gap-2">
            <button
              type="button"
              class="btn btn-sm rounded-full"
              :class="isExpense ? 'btn-error' : 'btn-success'"
              @click="toggleAmountType"
            >
              {{ isExpense ? "-" : "+" }}
            </button>
            <CurrencyInput v-model="amount" />
            <span>€</span>
          </div>

          <!-- Betragstyp-Auswahl -->
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

          <!-- Zusätzliche Felder je nach Betragstyp -->
          <div
            v-if="amountType === AmountType.APPROXIMATE"
            class="form-control"
          >
            <label class="label">
              <span class="label-text">Schwankung</span>
            </label>
            <div class="input-group">
              <span>±</span>
              <CurrencyInput v-model="approximateAmount" borderless />
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
    </div>

    <!-- Transaktionstyp -->
    <div class="form-control">
      <label class="cursor-pointer label">
        <span class="label-text">Ist dies eine Kontoüberweisung?</span>
        <input type="checkbox" class="toggle" v-model="isTransfer" />
      </label>
    </div>

    <!-- Kontoauswahl -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="form-control">
        <label class="label">
          <span class="label-text">Quellkonto</span>
          <span class="text-error">*</span>
        </label>
        <SelectAccount v-model="accountId" />
      </div>

      <div v-if="isTransfer" class="form-control">
        <label class="label">
          <span class="label-text">Zielkonto</span>
          <span class="text-error">*</span>
        </label>
        <select
          v-model="toAccountId"
          class="select select-bordered w-full"
          required
        >
          <option value="" disabled>Bitte wählen</option>
          <option
            v-for="account in accounts.filter((a) => a.id !== accountId)"
            :key="account.id"
            :value="account.id"
          >
            {{ account.name }}
          </option>
        </select>
      </div>

      <div v-if="!isTransfer" class="form-control">
        <label class="label">
          <span class="label-text">Kategorie</span>
        </label>
        <SelectCategory v-model="categoryId" />
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

    <!-- Terminfelder -->
    <div class="card bg-base-200 p-4 rounded-lg">
      <div class="form-control">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div>
            <label class="label">
              <span class="label-text">Datum</span>
            </label>
            <div class="form-control">
              <input
                type="date"
                v-model="startDate"
                class="input input-bordered"
                required
              />
            </div>
          </div>
          <div>
            <!-- Wertstellungsdatum -->
            <label class="label">
              <span class="label-text">Wertstellung</span>
            </label>
            <div class="form-control">
              <input
                type="date"
                v-model="valueDate"
                class="input input-bordered"
                required
              />
            </div>
          </div>
        </div>
      </div>

      <div class="space-y-4 mt-2">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <div class="form-control py-4">
            <label class="cursor-pointer label">
              <span class="label-text">Wiederholt sich</span>
              <input type="checkbox" class="toggle" v-model="repeatsEnabled" />
            </label>
          </div>

          <div v-if="repeatsEnabled" class="form-control">
            <label class="label">
              <span class="label-text">Wiederholung</span>
            </label>
            <select
              v-model="recurrencePattern"
              class="select select-bordered w-full"
            >
              <option :value="RecurrencePattern.DAILY">Täglich</option>
              <option :value="RecurrencePattern.WEEKLY">Wöchentlich</option>
              <option :value="RecurrencePattern.BIWEEKLY">Alle 2 Wochen</option>
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

        <div v-if="moveScheduleEnabled" class="form-control">
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
          <label class="label">
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

    <!-- Automatisierung -->
    <div class="card bg-base-200 p-4 rounded-lg">
      <div class="form-control">
        <label class="cursor-pointer label">
          <span class="label-text">Automatisch ausführen</span>
          <input type="checkbox" class="toggle" v-model="autoExecute" />
        </label>
        <p class="text-xs text-base-content/70" v-if="autoExecute">
          Die App erstellt automatisch Transaktionen für geplante Termine.
        </p>
      </div>

      <div class="form-control mt-2">
        <label class="cursor-pointer label">
          <span class="label-text">Aktiv</span>
          <input type="checkbox" class="toggle" v-model="isActive" />
        </label>
      </div>
    </div>

    <!-- Notizen -->
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

    <!-- Aktionsbuttons -->
    <div class="flex justify-end space-x-2 pt-4">
      <button type="button" class="btn" @click="$emit('cancel')">
        Abbrechen
      </button>
      <button type="submit" class="btn btn-primary">Speichern</button>
    </div>
  </form>
</template>
