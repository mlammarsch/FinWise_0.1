<script setup lang="ts">
/**
 * Pfad zur Komponente: components/transaction/TransactionForm.vue
 * Diese Komponente dient zur Erstellung und Bearbeitung einer Transaktion.
 *
 * Komponenten-Props:
 * - transaction?: Transaction - Optional: Bestehende Transaktion zum Bearbeiten.
 * - isEdit?: boolean - Optional: Gibt an, ob die Transaktion bearbeitet wird.
 * - initialAccountId?: string - Optional: Vorausgewähltes Konto.
 * - initialTransactionType?: TransactionType - Optional: Vorausgewählter Transaktionstyp.
 *
 * Emits:
 * - save - Gibt die eingegebene Transaktion zurück.
 * - cancel - Bricht die Bearbeitung ab.
 */
import { ref, computed, onMounted, watch, nextTick } from "vue";
import { Transaction, TransactionType } from "../../types";
import { useAccountStore } from "../../stores/accountStore";
import { useRecipientStore } from "../../stores/recipientStore";
import { useCategoryStore } from "../../stores/categoryStore";
import { useTagStore } from "../../stores/tagStore";
import { useTransactionStore } from "../../stores/transactionStore";
import DatePicker from "../ui/DatePicker.vue";
import SearchableSelect from "../ui/SearchableSelect.vue";
import CurrencyInput from "../ui/CurrencyInput.vue";
import ButtonGroup from "../ui/ButtonGroup.vue";
import TagSearchableDropdown from "../ui/TagSearchableDropdown.vue";

const props = defineProps<{
  transaction?: Transaction;
  isEdit?: boolean;
  initialAccountId?: string;
  initialTransactionType?: TransactionType;
}>();

const emit = defineEmits(["save", "cancel"]);

const accountStore = useAccountStore();
const recipientStore = useRecipientStore();
const categoryStore = useCategoryStore();
const tagStore = useTagStore();
const transactionStore = useTransactionStore();

const date = ref(new Date().toISOString().split("T")[0]);
const valueDate = ref(date.value);
const transactionType = ref<TransactionType>(TransactionType.EXPENSE);
const accountId = ref("");
const toAccountId = ref("");
const categoryId = ref<string>("");
const tagIds = ref<string[]>([]);
const amount = ref(0);
const note = ref("");
const recipientId = ref("");
const reconciled = ref(false);
const recipientsLoaded = ref(false);
const submitAttempted = ref(false);

// Flag zur Vermeidung doppelter Submits
const isSubmitting = ref(false);

const amountInputRef = ref<InstanceType<typeof CurrencyInput> | null>(null);
const formModalRef = ref<HTMLFormElement | null>(null);

const locked = computed(
  () => props.transaction && (props.transaction as any).counterTransactionId
);

const recipients = computed(() =>
  Array.isArray(recipientStore.recipients) ? recipientStore.recipients : []
);

const categories = computed(() =>
  categoryStore.categories.map((c) => ({ id: c.id, name: c.name }))
);

const tags = computed(() =>
  tagStore.tags.map((t) => ({
    id: t.id,
    name: t.name,
    color: t.color,
  }))
);

const isTransfer = computed(
  () => transactionType.value === TransactionType.TRANSFER
);

const accounts = computed(() =>
  accountStore.activeAccounts.map((a) => ({ id: a.id, name: a.name }))
);

const filteredAccounts = computed(() =>
  accounts.value.filter((a) => a.id !== accountId.value)
);

const focusModalAndAmount = () => {
  nextTick(() => {
    amountInputRef.value?.focus();
    amountInputRef.value?.select();
  });
};

onMounted(() => {
  recipientsLoaded.value = true;
  if (props.transaction) {
    date.value = props.transaction.date;
    valueDate.value =
      (props.transaction as any).valueDate || props.transaction.date;
    accountId.value = props.transaction.accountId;
    categoryId.value = props.transaction.categoryId || "";
    tagIds.value = Array.isArray((props.transaction as any).tagIds)
      ? (props.transaction as any).tagIds
      : [];
    amount.value = props.transaction.amount ?? 0;
    note.value = props.transaction.note || "";
    recipientId.value = (props.transaction as any).recipientId || "";
    transactionType.value =
      (props.transaction as any).type || TransactionType.EXPENSE;
    reconciled.value = (props.transaction as any).reconciled || false;
    if (transactionType.value === TransactionType.TRANSFER) {
      toAccountId.value = (props.transaction as any).transferToAccountId || "";
    }
  } else {
    accountId.value =
      props.initialAccountId || accountStore.activeAccounts[0]?.id || "";
    reconciled.value = false;
  }
  focusModalAndAmount();
});

watch(
  () => props.isEdit,
  (newValue) => newValue && focusModalAndAmount()
);
watch(date, (newDate) => {
  if (!props.transaction || valueDate.value === props.transaction.date) {
    valueDate.value = newDate;
  }
});
watch(amount, (newAmount) => {
  if (locked.value) return;
  transactionType.value = toAccountId.value
    ? TransactionType.TRANSFER
    : newAmount < 0
    ? TransactionType.EXPENSE
    : newAmount > 0
    ? TransactionType.INCOME
    : transactionType.value;
});
watch(transactionType, (newType) => {
  if (!locked.value && newType !== TransactionType.TRANSFER) {
    toAccountId.value = "";
  }
  if (newType === TransactionType.EXPENSE && amount.value > 0) {
    amount.value = -Math.abs(amount.value);
  } else if (newType === TransactionType.INCOME && amount.value < 0) {
    amount.value = Math.abs(amount.value);
  }
});
watch(toAccountId, (newToAccountId) => {
  if (!locked.value && newToAccountId) {
    transactionType.value = TransactionType.TRANSFER;
  }
});

const validationErrors = computed(() => {
  const errors: string[] = [];
  if (!date.value) {
    errors.push("Buchungsdatum ist erforderlich");
  }
  if (!amount.value || amount.value === 0) {
    errors.push("Betrag ist erforderlich");
  }
  if (!accountId.value) {
    errors.push("Konto ist erforderlich");
  }
  if (
    transactionType.value === TransactionType.TRANSFER &&
    !toAccountId.value
  ) {
    errors.push("Gegenkonto ist erforderlich");
  }
  return errors;
});

// Funktionen zur Erstellung neuer Kategorie, Tags und Empfänger
function onCreateCategory(newCategory: { id: string; name: string }) {
  const created = categoryStore.addCategory({
    name: newCategory.name,
    parentCategoryId: null,
    sortOrder: categoryStore.categories.length,
  });
  categoryId.value = created.id;
}

function onCreateTag(newTag: { id: string; name: string }) {
  const created = tagStore.addTag({
    name: newTag.name,
    parentTagId: null,
  });
  tagIds.value = [...tagIds.value, created.id];
}

function onCreateRecipient(newRecipient: { id: string; name: string }) {
  const created = recipientStore.addRecipient({
    name: newRecipient.name,
  });
  recipientId.value = created.id;
}

// Unterscheidung zwischen Transfer und normaler Transaktion
const saveTransaction = () => {
  if (transactionType.value === TransactionType.TRANSFER) {
    return {
      type: transactionType.value,
      fromAccountId: accountId.value,
      toAccountId: toAccountId.value,
      amount: Math.abs(amount.value),
      date: date.value,
      valueDate: valueDate.value || date.value,
      note: note.value,
      reconciled: reconciled.value,
    };
  } else {
    return {
      date: date.value,
      valueDate: valueDate.value || date.value,
      accountId: accountId.value,
      categoryId: categoryId.value,
      tagIds: tagIds.value,
      amount: amount.value,
      note: note.value,
      recipientId: recipientId.value || undefined,
      reconciled: reconciled.value,
      type: transactionType.value,
      counterTransactionId: null,
      planningTransactionId: null,
      isReconciliation: false,
      runningBalance: 0,
    };
  }
};

const submitForm = () => {
  if (isSubmitting.value) return;
  isSubmitting.value = true;

  submitAttempted.value = true;
  if (validationErrors.value.length > 0) {
    alert(
      "Bitte fülle alle Pflichtfelder aus: " + validationErrors.value.join(", ")
    );
    isSubmitting.value = false;
    return;
  }
  const transactionPayload = saveTransaction();
  emit("save", transactionPayload);
  isSubmitting.value = false;
};
</script>

<template>
  <div class="text-center p-4" v-if="!recipientsLoaded">Lade Empfänger...</div>
  <form
    ref="formModalRef"
    novalidate
    tabindex="-1"
    v-else
    @submit.prevent="submitForm"
    @keydown.esc.prevent="emit('cancel')"
    class="space-y-4 max-w-[calc(100%-80px)] mx-auto relative"
  >
    <!-- Transaktionstyp und Abgleich-Checkbox -->
    <div class="flex flex-row justify-between items-start">
      <div class="flex justify-center gap-4 pt-4">
        <label class="flex items-center gap-2">
          <input
            type="radio"
            class="radio radio-sm border-neutral checked:bg-error/60 checked:text-error checked:border-error"
            v-model="transactionType"
            :value="TransactionType.EXPENSE"
            :disabled="locked"
          />
          <span class="text-sm">Ausgabe</span>
        </label>
        <label class="flex items-center gap-2">
          <input
            type="radio"
            class="radio radio-sm border-neutral checked:bg-success/60 checked:text-success checked:border-success"
            v-model="transactionType"
            :value="TransactionType.INCOME"
            :disabled="locked"
          />
          <span class="text-sm">Einnahme</span>
        </label>
        <label class="flex items-center gap-2">
          <input
            type="radio"
            class="radio radio-sm border-neutral checked:bg-warning/60 checked:text-warning checked:border-warning"
            v-model="transactionType"
            :value="TransactionType.TRANSFER"
          />
          <span class="text-sm">Transfer</span>
        </label>
      </div>
      <label class="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          v-model="reconciled"
          class="checkbox checkbox-xs"
        />
        abgeglichen?
      </label>
    </div>

    <!-- Fehlermeldungen -->
    <div
      v-if="submitAttempted && validationErrors.length > 0"
      class="alert alert-error p-2"
    >
      <ul class="list-disc list-inside">
        <li v-for="(err, index) in validationErrors" :key="index">
          {{ err }}
        </li>
      </ul>
    </div>

    <div class="divider" />

    <!-- Datum und Betrag -->
    <div class="grid grid-cols-3 gap-4 items-end">
      <DatePicker
        v-model="date"
        label="Buchungsdatum (Pflicht)"
        required
        class="self-end fieldset"
      />
      <DatePicker
        v-model="valueDate"
        label="Wertstellung"
        required
        class="self-end fieldset"
      />
      <div class="flex justify-end items-center gap-2 self-end">
        <CurrencyInput
          ref="amountInputRef"
          v-model="amount"
          class="w-[150px]"
        />
        <span class="text-3xl">€</span>
      </div>
    </div>

    <!-- Notiz -->
    <div class="flex items-start justify-between gap-2 mt-5">
      <Icon icon="mdi:speaker-notes" />
      <textarea
        v-model="note"
        class="textarea textarea-bordered w-full min-h-[3rem] fieldset"
        placeholder="Notiz"
      ></textarea>
    </div>

    <div class="divider pt-5" />

    <!-- Konto und Transfer-Konto -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <fieldset class="fieldset">
        <legend class="fieldset-legend">Konto (Pflicht)</legend>
        <select v-model="accountId" class="select select-bordered w-full">
          <option v-for="a in accounts" :key="a.id" :value="a.id">
            {{ a.name }}
          </option>
        </select>
      </fieldset>
      <fieldset class="fieldset">
        <legend class="fieldset-legend">
          Transfer-Konto (Pflicht bei Transfer)
        </legend>
        <select
          v-model="toAccountId"
          class="select select-bordered w-full"
          :disabled="!isTransfer"
        >
          <option v-for="a in filteredAccounts" :key="a.id" :value="a.id">
            {{ a.name }}
          </option>
        </select>
      </fieldset>
    </div>

    <div class="divider pt-5" />

    <!-- Empfänger -->
    <SearchableSelect
      class="fieldset"
      v-model="recipientId"
      :options="recipients"
      label="Empfänger"
      :disabled="isTransfer"
      :allowCreate="true"
      @create="onCreateRecipient($event)"
    />

    <!-- Kategorie & Tags -->
    <div
      v-if="transactionType !== TransactionType.TRANSFER"
      class="grid grid-cols-1 md:grid-cols-2 gap-4"
    >
      <SearchableSelect
        class="fieldset"
        v-model="categoryId"
        :options="categories"
        label="Kategorie"
        :allowCreate="true"
        @create="onCreateCategory($event)"
      />
      <TagSearchableDropdown
        class="fieldset"
        v-model="tagIds"
        :options="tags"
        label="Tags"
        @create="onCreateTag($event)"
      />
    </div>

    <!-- Buttons -->
    <div class="flex justify-end pt-5">
      <ButtonGroup
        left-label="Abbrechen"
        right-label="Speichern"
        left-color="btn-soft"
        right-color="btn-primary"
        @left-click="emit('cancel')"
        @right-click="submitForm"
      />
    </div>
  </form>
</template>
