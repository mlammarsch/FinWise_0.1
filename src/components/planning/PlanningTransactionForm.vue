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
} from "../../types";
import { useAccountStore } from "../../stores/accountStore";
import { useCategoryStore } from "../../stores/categoryStore";
import { useTagStore } from "../../stores/tagStore";
import { useRecipientStore } from "../../stores/recipientStore";
import dayjs from "dayjs";
import SelectAccount from "../ui/SelectAccount.vue";
import SelectCategory from "../ui/SelectCategory.vue";
import SelectRecipient from "../ui/SelectRecipient.vue";
import CurrencyInput from "../ui/CurrencyInput.vue";
import TagSearchableDropdown from "../ui/TagSearchableDropdown.vue";
import { debugLog } from "@/utils/logger";

const props = defineProps<{
  transaction?: PlanningTransaction;
  isEdit?: boolean;
}>();

const emit = defineEmits(["save", "cancel"]);

const accountStore = useAccountStore();
const categoryStore = useCategoryStore();
const tagStore = useTagStore();
const recipientStore = useRecipientStore();

// Formularfelder
const name = ref("");
const note = ref("");
const amount = ref(0);
const amountType = ref<AmountType>(AmountType.EXACT);
const approximateAmount = ref(0);
const minAmount = ref(0);
const maxAmount = ref(0);
const startDate = ref(dayjs().format("YYYY-MM-DD"));
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

// Zeitpunktbeschreibung
const dateDescription = ref("Jährlich am 14. April");

// Kommende Ausführungstermine
const upcomingDates = ref<Array<{ date: string; day: string }>>([]);

onMounted(() => {
  if (props.transaction) {
    // Lade Daten einer bestehenden Transaktion
    name.value = props.transaction.name || "";
    note.value = props.transaction.note || "";
    amount.value = Math.abs(props.transaction.amount); // Immer positiv speichern, Richtung über TransactionType
    amountType.value = props.transaction.amountType || AmountType.EXACT;
    approximateAmount.value = props.transaction.approximateAmount || 0;
    minAmount.value = props.transaction.minAmount || 0;
    maxAmount.value = props.transaction.maxAmount || 0;
    startDate.value = props.transaction.startDate;
    accountId.value = props.transaction.accountId;
    categoryId.value = props.transaction.categoryId;
    tagIds.value = props.transaction.tagIds || [];
    recipientId.value = props.transaction.recipientId || "";
    autoExecute.value = props.transaction.autoExecute || false;
    isActive.value =
      props.transaction.isActive !== undefined
        ? props.transaction.isActive
        : true;

    // Wiederholungsoptionen
    repeatsEnabled.value =
      props.transaction.recurrencePattern !== RecurrencePattern.ONCE;
    recurrencePattern.value = props.transaction.recurrencePattern;
    recurrenceEndType.value =
      props.transaction.recurrenceEndType || RecurrenceEndType.NEVER;
    recurrenceCount.value = props.transaction.recurrenceCount || 12;
    endDate.value = props.transaction.endDate || null;
    executionDay.value = props.transaction.executionDay || null;

    // Wochenendbehandlung
    weekendHandling.value =
      props.transaction.weekendHandling || WeekendHandlingType.NONE;
    moveScheduleEnabled.value =
      weekendHandling.value !== WeekendHandlingType.NONE;
    weekendHandlingDirection.value =
      weekendHandling.value === WeekendHandlingType.BEFORE ? "before" : "after";

    // Bestimme, ob es sich um einen Transfer handelt
    if (props.transaction.transactionType === TransactionType.ACCOUNTTRANSFER) {
      isTransfer.value = true;
      toAccountId.value = props.transaction.transferToAccountId || "";
    } else {
      isTransfer.value = false;
    }
  } else {
    // Standardwerte für neue Transaktionen
    if (accountStore.activeAccounts.length > 0) {
      accountId.value = accountStore.activeAccounts[0].id;
    }
  }

  updateDateDescription();
  calculateUpcomingDates();
});

// Aktualisiere die Beschreibung, wenn sich die Datumsfelder ändern
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

// Aktualisiert die menschenlesbare Datumsbeschreibung
function updateDateDescription() {
  if (!repeatsEnabled.value) {
    dateDescription.value = `Einmalig am ${formatDate(startDate.value)}`;
    return;
  }

  const date = dayjs(startDate.value);
  const day = date.date();
  const month = date.month() + 1; // dayjs Monate sind 0-basiert
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

// Berechnet die nächsten Ausführungstermine
function calculateUpcomingDates() {
  upcomingDates.value = [];

  if (!startDate.value) return;

  let currentDate = dayjs(startDate.value);
  const endDateLimit = dayjs().add(3, "years");
  let count = 0;

  // Wenn nicht wiederholend, nur das Startdatum anzeigen
  if (!repeatsEnabled.value) {
    const formattedDay = `${getDayOfWeekName(currentDate.day())}`;
    upcomingDates.value.push({
      date: currentDate.format("DD.MM.YYYY"),
      day: formattedDay,
    });
    return;
  }

  // Maximal 5 Termine anzeigen
  while (count < 5 && currentDate.isBefore(endDateLimit)) {
    // Wochenendbehandlung
    let dateToUse = currentDate;
    if (moveScheduleEnabled.value) {
      const dayOfWeek = dateToUse.day(); // 0 = Sonntag, 6 = Samstag
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        // Wochenende
        if (weekendHandlingDirection.value === "before") {
          // Auf den vorherigen Freitag verschieben
          dateToUse =
            dayOfWeek === 0
              ? dateToUse.subtract(2, "day")
              : dateToUse.subtract(1, "day");
        } else {
          // Auf den nächsten Montag verschieben
          dateToUse =
            dayOfWeek === 0 ? dateToUse.add(1, "day") : dateToUse.add(2, "day");
        }
      }
    }

    const formattedDay = `${getDayOfWeekName(dateToUse.day())}`;
    upcomingDates.value.push({
      date: dateToUse.format("DD.MM.YYYY"),
      day: formattedDay,
    });

    count++;

    // Nächstes Datum berechnen
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
        // Bei monatlicher Wiederholung mit spezifischem Tag
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
        count = 5; // Abort loop for ONCE pattern
    }

    // Prüfe Endbedingungen
    if (recurrenceEndType.value === RecurrenceEndType.DATE && endDate.value) {
      if (currentDate.isAfter(dayjs(endDate.value))) break;
    }
  }
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
  const date = dayjs(dateStr);
  return date.format("DD.MM.YYYY");
}

// Neue Empfänger erstellen
function onCreateRecipient(data: { name: string }) {
  const created = recipientStore.addRecipient({ name: data.name });
  recipientId.value = created.id;
  debugLog("[PlanningTransactionForm] onCreateRecipient", created);
}

// Speichern der Planungstransaktion
function savePlanningTransaction() {
  // Berechne den tatsächlichen Betrag basierend auf dem Transaktionstyp
  let effectiveAmount = amount.value;
  if (isTransfer.value) {
    // Bei Transfers immer positiv
    effectiveAmount = Math.abs(effectiveAmount);
  } else {
    // Ansonsten abhängig vom UI Toggle
    effectiveAmount = isExpense.value
      ? -Math.abs(effectiveAmount)
      : Math.abs(effectiveAmount);
  }

  // Bestimme das TransactionType
  const transactionType = isTransfer.value
    ? TransactionType.ACCOUNTTRANSFER
    : effectiveAmount < 0
    ? TransactionType.EXPENSE
    : TransactionType.INCOME;

  // Bestimme die Wochenendbehandlung
  const effectiveWeekendHandling = moveScheduleEnabled.value
    ? weekendHandlingDirection.value === "before"
      ? WeekendHandlingType.BEFORE
      : WeekendHandlingType.AFTER
    : WeekendHandlingType.NONE;

  // Bestimme die Wiederholungsparameter
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
    transactionType: transactionType,
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

// UI-Helfer
const toggleAmountType = () => {
  amount.value = -amount.value;
};

const isExpense = computed(() => amount.value < 0);

const accounts = computed(() => accountStore.activeAccounts);
const categories = computed(() => categoryStore.activeCategories);
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
        <div class="flex flex-col space-y-2">
          <div class="input-group">
            <button
              type="button"
              class="btn"
              :class="isExpense ? 'btn-error' : 'btn-success'"
              @click="toggleAmountType"
            >
              {{ isExpense ? "-" : "+" }}
            </button>
            <CurrencyInput v-model="amount" borderless />
            <span>€</span>
          </div>

          <!-- Betragstyp-Auswahl -->
          <div class="flex space-x-2">
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

    <!-- Terminfelder -->
    <div class="card bg-base-200 p-4 rounded-lg">
      <div class="form-control">
        <label class="label">
          <span class="label-text">Datum</span>
        </label>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Datumsauswahl -->
          <div class="form-control">
            <input
              type="date"
              v-model="startDate"
              class="input input-bordered"
              required
            />
          </div>

          <!-- Wiederholung aktivieren -->
          <div class="form-control">
            <label class="cursor-pointer label">
              <span class="label-text">Wiederholt sich</span>
              <input type="checkbox" class="toggle" v-model="repeatsEnabled" />
            </label>
          </div>
        </div>
      </div>

      <div v-if="repeatsEnabled" class="space-y-4 mt-2">
        <!-- Wiederholungsmuster -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="form-control">
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

          <!-- Spezifischer Ausführungstag (für monatliche Wiederholungen) -->
          <div
            class="form-control"
            v-if="recurrencePattern === RecurrencePattern.MONTHLY"
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

        <!-- Wochenendbehandlung -->
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

        <!-- Endbedingung -->
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

        <!-- Anzahl der Wiederholungen oder Enddatum -->
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

      <!-- Vorschau der Ausführungstermine -->
      <div class="mt-4">
        <div class="text-sm font-semibold mb-2">
          Zeitpunkt: {{ dateDescription }}
        </div>
        <div v-if="upcomingDates.length > 0">
          <div class="text-sm font-semibold mb-2">Kommende Termine:</div>
          <div class="grid grid-cols-2 gap-2">
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

    <!-- Notizen -->
    <div class="form-control">
      <label class="label">
        <span class="label-text">Notizen</span>
      </label>
      <textarea
        v-model="note"
        class="textarea textarea-bordered h-24"
        placeholder="Zusätzliche Informationen"
      />
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
