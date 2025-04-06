<!-- src/components/rules/RuleForm.vue -->
<script setup lang="ts">
/**
 * Pfad zur Komponente: src/components/rules/RuleForm.vue
 * Komponente zum Erstellen und Bearbeiten von Automatisierungsregeln.
 *
 * Komponenten-Props:
 * - rule?: AutomationRule - Bestehende Regel für Bearbeitungsmodus
 * - isEdit?: boolean - Gibt an, ob es sich um eine Bearbeitung handelt
 * - initialValues?: Partial<AutomationRule> - Vorausgefüllte Werte für neue Regeln
 *
 * Emits:
 * - save: Gibt die erstellte/aktualisierte Regel zurück
 * - cancel: Bricht den Vorgang ab
 * - apply: Testet die Regel auf vorhandene Transaktionen an
 */
import { ref, computed, onMounted, nextTick } from "vue";
import {
  RuleConditionType,
  RuleActionType,
  AutomationRule,
  RuleCondition,
  RuleAction,
} from "@/types";
import { useAccountStore } from "@/stores/accountStore";
import { useCategoryStore } from "@/stores/categoryStore";
import { useTagStore } from "@/stores/tagStore";
import { useRecipientStore } from "@/stores/recipientStore";
import { usePlanningStore } from "@/stores/planningStore";
import { useTransactionStore } from "@/stores/transactionStore";
import { debugLog } from "@/utils/logger";
import { v4 as uuidv4 } from "uuid";

const props = defineProps<{
  rule?: AutomationRule;
  isEdit?: boolean;
  initialValues?: Partial<AutomationRule>;
}>();

const emit = defineEmits(["save", "cancel", "apply"]);

// Stores
const accountStore = useAccountStore();
const categoryStore = useCategoryStore();
const tagStore = useTagStore();
const recipientStore = useRecipientStore();
const planningStore = usePlanningStore();
const transactionStore = useTransactionStore();

// Formularfelder
const name = ref("");
const description = ref("");
const isActive = ref(true);
const stage = ref<"PRE" | "DEFAULT" | "POST">("DEFAULT");
const priority = ref(100);
const conditions = ref<RuleCondition[]>([]);
const actions = ref<RuleAction[]>([]);

// Füge initial eine leere Bedingung und Aktion hinzu
onMounted(() => {
  if (props.rule) {
    // Bearbeiten einer bestehenden Regel
    name.value = props.rule.name;
    description.value = props.rule.description || "";
    isActive.value = props.rule.isActive;
    stage.value = props.rule.stage;
    priority.value = props.rule.priority;
    conditions.value = [...props.rule.conditions];
    actions.value = [...props.rule.actions];
  } else if (props.initialValues) {
    // Neue Regel mit vorausgefüllten Werten
    name.value = props.initialValues.name || "";
    description.value = props.initialValues.description || "";
    isActive.value =
      props.initialValues.isActive !== undefined
        ? props.initialValues.isActive
        : true;
    stage.value = props.initialValues.stage || "DEFAULT";
    priority.value = props.initialValues.priority || 100;
    conditions.value = props.initialValues.conditions
      ? [...props.initialValues.conditions]
      : [];
    actions.value = props.initialValues.actions
      ? [...props.initialValues.actions]
      : [];
  }

  // Stelle sicher, dass mindestens eine Bedingung und Aktion vorhanden ist
  if (conditions.value.length === 0) {
    conditions.value.push({
      type: RuleConditionType.ACCOUNT_IS,
      operator: "is",
      value: "",
    });
  }

  if (actions.value.length === 0) {
    actions.value.push({
      type: RuleActionType.SET_CATEGORY,
      field: "category",
      value: "",
    });
  }
});

// Verfügbare Optionen für Bedingungen und Aktionen
const conditionTypeOptions = [
  { value: RuleConditionType.ACCOUNT_IS, label: "Konto ist" },
  { value: RuleConditionType.PAYEE_EQUALS, label: "Empfänger ist genau" },
  { value: RuleConditionType.PAYEE_CONTAINS, label: "Empfänger enthält" },
  { value: RuleConditionType.AMOUNT_EQUALS, label: "Betrag ist genau" },
  { value: RuleConditionType.AMOUNT_GREATER, label: "Betrag größer als" },
  { value: RuleConditionType.AMOUNT_LESS, label: "Betrag kleiner als" },
  { value: RuleConditionType.DATE_IS, label: "Datum ist genau" },
  { value: RuleConditionType.DATE_APPROX, label: "Datum ist ungefähr" },
  {
    value: RuleConditionType.DESCRIPTION_CONTAINS,
    label: "Beschreibung enthält",
  },
];

const actionTypeOptions = [
  { value: RuleActionType.SET_CATEGORY, label: "Kategorie setzen" },
  { value: RuleActionType.ADD_TAG, label: "Tag hinzufügen" },
  { value: RuleActionType.SET_NOTE, label: "Notiz setzen" },
  { value: RuleActionType.LINK_SCHEDULE, label: "Mit Planung verknüpfen" },
];

const operatorOptions = computed(() => {
  return [
    { value: "is", label: "ist" },
    { value: "contains", label: "enthält" },
    { value: "starts_with", label: "beginnt mit" },
    { value: "ends_with", label: "endet mit" },
    { value: "equals", label: "genau gleich" },
    { value: "greater", label: "größer als" },
    { value: "less", label: "kleiner als" },
    { value: "approx", label: "ungefähr" },
  ];
});

// Hilfsfunktionen für Bedingungen und Aktionen
function addCondition() {
  conditions.value.push({
    type: RuleConditionType.PAYEE_CONTAINS,
    operator: "contains",
    value: "",
  });
}

function removeCondition(index: number) {
  if (conditions.value.length > 1) {
    conditions.value.splice(index, 1);
  }
}

function addAction() {
  actions.value.push({
    type: RuleActionType.SET_CATEGORY,
    field: "category",
    value: "",
  });
}

function removeAction(index: number) {
  if (actions.value.length > 1) {
    actions.value.splice(index, 1);
  }
}

// Speichern der Regel
function saveRule() {
  const ruleData: Omit<AutomationRule, "id"> = {
    name: name.value,
    description: description.value,
    stage: stage.value,
    conditions: conditions.value,
    actions: actions.value,
    priority: priority.value,
    isActive: isActive.value,
  };

  debugLog("[RuleForm] saveRule", ruleData);
  emit("save", ruleData);
}

// Testen der Regel auf bestehende Transaktionen
function applyRuleToExistingTransactions() {
  const ruleData: AutomationRule = {
    id: props.rule?.id || uuidv4(),
    name: name.value,
    description: description.value,
    stage: stage.value,
    conditions: conditions.value,
    actions: actions.value,
    priority: priority.value,
    isActive: isActive.value,
  };

  debugLog("[RuleForm] applyRuleToExistingTransactions", ruleData);
  emit("apply", ruleData);
}

// Hilfsmethode für die bedingte Anzeige von Wertauswahlen je nach Bedingungstyp
function getConditionValueInput(condition: RuleCondition, index: number) {
  switch (condition.type) {
    case RuleConditionType.ACCOUNT_IS:
      return (
        <select v-model={condition.value} class="select select-bordered w-full">
          <option value="" disabled>
            Konto auswählen
          </option>
          {accountStore.accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
      );

    case RuleConditionType.AMOUNT_EQUALS:
    case RuleConditionType.AMOUNT_GREATER:
    case RuleConditionType.AMOUNT_LESS:
      return (
        <input
          type="number"
          step="0.01"
          v-model={condition.value}
          class="input input-bordered w-full"
          placeholder="Betrag (z.B. 42.99)"
        />
      );

    case RuleConditionType.DATE_IS:
    case RuleConditionType.DATE_APPROX:
      return (
        <input
          type="date"
          v-model={condition.value}
          class="input input-bordered w-full"
        />
      );

    default:
      return (
        <input
          type="text"
          v-model={condition.value}
          class="input input-bordered w-full"
          placeholder="Wert eingeben"
        />
      );
  }
}

// Hilfsmethode für die bedingte Anzeige von Wertauswahlen je nach Aktionstyp
function getActionValueInput(action: RuleAction, index: number) {
  switch (action.type) {
    case RuleActionType.SET_CATEGORY:
      return (
        <select v-model={action.value} class="select select-bordered w-full">
          <option value="" disabled>
            Kategorie auswählen
          </option>
          {categoryStore.categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      );

    case RuleActionType.ADD_TAG:
      return (
        <select
          v-model={action.value}
          class="select select-bordered w-full"
          multiple
        >
          {tagStore.tags.map((tag) => (
            <option key={tag.id} value={tag.id}>
              {tag.name}
            </option>
          ))}
        </select>
      );

    case RuleActionType.LINK_SCHEDULE:
      return (
        <select v-model={action.value} class="select select-bordered w-full">
          <option value="" disabled>
            Planung auswählen
          </option>
          {planningStore.planningTransactions.map((planning) => (
            <option key={planning.id} value={planning.id}>
              {planning.name}
            </option>
          ))}
        </select>
      );

    default:
      return (
        <input
          type="text"
          v-model={action.value}
          class="input input-bordered w-full"
          placeholder="Wert eingeben"
        />
      );
  }
}
</script>

<template>
  <form @submit.prevent="saveRule" class="space-y-4">
    <!-- Grundlegende Regelinformationen -->
    <div class="form-control">
      <label class="label">
        <span class="label-text">Regelname</span>
        <span class="text-error">*</span>
      </label>
      <input
        type="text"
        v-model="name"
        class="input input-bordered"
        required
        placeholder="Name der Regel"
      />
    </div>

    <div class="form-control">
      <label class="label">
        <span class="label-text">Beschreibung</span>
      </label>
      <textarea
        v-model="description"
        class="textarea textarea-bordered"
        placeholder="Optionale Beschreibung der Regel"
      ></textarea>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <!-- Ausführungsphase -->
      <div class="form-control">
        <label class="label">
          <span class="label-text">Ausführungsphase</span>
          <Icon
            icon="mdi:help-circle-outline"
            class="text-base-content/50 cursor-help"
            title="Bestimmt, wann die Regel ausgeführt wird. PRE: Vor anderen Regeln, DEFAULT: Normale Ausführung, POST: Nach allen anderen Regeln."
          />
        </label>
        <select v-model="stage" class="select select-bordered w-full">
          <option value="PRE">PRE (Vorab)</option>
          <option value="DEFAULT">DEFAULT (Normal)</option>
          <option value="POST">POST (Nachgelagert)</option>
        </select>
      </div>

      <!-- Priorität -->
      <div class="form-control">
        <label class="label">
          <span class="label-text">Priorität</span>
          <Icon
            icon="mdi:help-circle-outline"
            class="text-base-content/50 cursor-help"
            title="Kleinere Werte werden zuerst ausgeführt. Standard ist 100."
          />
        </label>
        <input
          type="number"
          v-model="priority"
          class="input input-bordered"
          min="1"
          max="999"
        />
      </div>

      <!-- Aktiv/Inaktiv -->
      <div class="form-control pt-8">
        <label class="cursor-pointer label justify-start">
          <input type="checkbox" v-model="isActive" class="toggle mr-2" />
          <span class="label-text">Regel aktiv</span>
        </label>
      </div>
    </div>

    <!-- Bedingungsteil -->
    <div class="card bg-base-200 p-4">
      <h3 class="text-lg font-semibold mb-4 flex items-center">
        <Icon icon="mdi:filter-outline" class="mr-2" />
        Wenn alle dieser Bedingungen zutreffen:
      </h3>

      <div v-for="(condition, index) in conditions" :key="index" class="mb-3">
        <div class="flex items-center space-x-2">
          <select v-model="condition.type" class="select select-bordered w-1/3">
            <option
              v-for="option in conditionTypeOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>

          <select
            v-model="condition.operator"
            class="select select-bordered w-1/4"
          >
            <option
              v-for="option in operatorOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>

          <!-- Dynamischer Wert-Input basierend auf dem Bedingungstyp -->
          <div class="w-1/3">
            <select
              v-if="condition.type === RuleConditionType.ACCOUNT_IS"
              v-model="condition.value"
              class="select select-bordered w-full"
            >
              <option value="" disabled>Konto auswählen</option>
              <option
                v-for="account in accountStore.accounts"
                :key="account.id"
                :value="account.id"
              >
                {{ account.name }}
              </option>
            </select>

            <input
              v-else-if="
                condition.type === RuleConditionType.AMOUNT_EQUALS ||
                condition.type === RuleConditionType.AMOUNT_GREATER ||
                condition.type === RuleConditionType.AMOUNT_LESS
              "
              type="number"
              step="0.01"
              v-model="condition.value"
              class="input input-bordered w-full"
              placeholder="Betrag (z.B. 42.99)"
            />

            <input
              v-else-if="
                condition.type === RuleConditionType.DATE_IS ||
                condition.type === RuleConditionType.DATE_APPROX
              "
              type="date"
              v-model="condition.value"
              class="input input-bordered w-full"
            />

            <input
              v-else
              type="text"
              v-model="condition.value"
              class="input input-bordered w-full"
              placeholder="Wert eingeben"
            />
          </div>

          <!-- Entfernen-Button -->
          <button
            type="button"
            class="btn btn-ghost btn-sm"
            @click="removeCondition(index)"
            :disabled="conditions.length <= 1"
          >
            <Icon icon="mdi:close" class="text-error" />
          </button>
        </div>
      </div>

      <button
        type="button"
        class="btn btn-ghost btn-sm mt-2"
        @click="addCondition"
      >
        <Icon icon="mdi:plus" class="mr-1" />
        Weitere Bedingung hinzufügen
      </button>
    </div>

    <!-- Aktionsteil -->
    <div class="card bg-base-200 p-4">
      <h3 class="text-lg font-semibold mb-4 flex items-center">
        <Icon icon="mdi:lightning-bolt" class="mr-2" />
        Dann führe diese Aktionen aus:
      </h3>

      <div v-for="(action, index) in actions" :key="index" class="mb-3">
        <div class="flex items-center space-x-2">
          <select v-model="action.type" class="select select-bordered w-1/3">
            <option
              v-for="option in actionTypeOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>

          <div class="w-1/2">
            <select
              v-if="action.type === RuleActionType.SET_CATEGORY"
              v-model="action.value"
              class="select select-bordered w-full"
            >
              <option value="" disabled>Kategorie auswählen</option>
              <option
                v-for="category in categoryStore.categories"
                :key="category.id"
                :value="category.id"
              >
                {{ category.name }}
              </option>
            </select>

            <select
              v-else-if="action.type === RuleActionType.ADD_TAG"
              v-model="action.value"
              class="select select-bordered w-full"
              multiple
            >
              <option
                v-for="tag in tagStore.tags"
                :key="tag.id"
                :value="tag.id"
              >
                {{ tag.name }}
              </option>
            </select>

            <select
              v-else-if="action.type === RuleActionType.LINK_SCHEDULE"
              v-model="action.value"
              class="select select-bordered w-full"
            >
              <option value="" disabled>Planung auswählen</option>
              <option
                v-for="planning in planningStore.planningTransactions"
                :key="planning.id"
                :value="planning.id"
              >
                {{ planning.name }}
              </option>
            </select>

            <input
              v-else
              type="text"
              v-model="action.value"
              class="input input-bordered w-full"
              placeholder="Wert eingeben"
            />
          </div>

          <!-- Entfernen-Button -->
          <button
            type="button"
            class="btn btn-ghost btn-sm"
            @click="removeAction(index)"
            :disabled="actions.length <= 1"
          >
            <Icon icon="mdi:close" class="text-error" />
          </button>
        </div>
      </div>

      <button
        type="button"
        class="btn btn-ghost btn-sm mt-2"
        @click="addAction"
      >
        <Icon icon="mdi:plus" class="mr-1" />
        Weitere Aktion hinzufügen
      </button>
    </div>

    <!-- Test-Button und Aktionsbuttons -->
    <div class="flex justify-between items-center pt-4">
      <button
        type="button"
        class="btn btn-outline"
        @click="applyRuleToExistingTransactions"
      >
        <Icon icon="mdi:play" class="mr-2" />
        Regel testen
      </button>

      <div class="space-x-2">
        <button type="button" class="btn" @click="$emit('cancel')">
          Abbrechen
        </button>
        <button type="submit" class="btn btn-primary">Speichern</button>
      </div>
    </div>
  </form>
</template>
