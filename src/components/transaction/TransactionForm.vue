/**
 * Pfad zur Komponente: components/transaction/TransactionForm.vue
 *
 * Diese Komponente ermöglicht das Erstellen und Bearbeiten von Transaktionen.
 *
 * Komponenten-Props:
 * - transaction?: Transaction - Optional: Die zu bearbeitende Transaktion.
 * - isEdit?: boolean - Optional: Gibt an, ob sich die Komponente im Bearbeitungsmodus befindet.
 * - initialAccountId?: string - Optional: Vorab gesetztes Konto.
 * - initialTransactionType?: TransactionType - Optional: Vorab gesetzter Transaktionstyp.
 *
 * Emits:
 * - save - Wird ausgelöst, wenn eine Transaktion gespeichert wird.
 * - cancel - Wird ausgelöst, wenn der Vorgang abgebrochen wird.
 * - createCategory - Wird ausgelöst, wenn eine neue Kategorie erstellt wird.
 * - createTag - Wird ausgelöst, wenn ein neues Tag erstellt wird.
 */

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from "vue";
import { Transaction, TransactionType } from "../../types";
import { useAccountStore } from "../../stores/accountStore";
import { useRecipientStore } from "../../stores/recipientStore";
import { useCategoryStore } from "../../stores/categoryStore";
import { useTagStore } from "../../stores/tagStore";
import DatePicker from "../ui/DatePicker.vue";
import SearchableSelect from "../ui/SearchableSelect.vue";
import CurrencyInput from "../ui/CurrencyInput.vue";
import ButtonGroup from "../ui/ButtonGroup.vue";

const props = defineProps<{
  transaction?: Transaction;
  isEdit?: boolean;
  initialAccountId?: string;
  initialTransactionType?: TransactionType;
}>();

const emit = defineEmits(["save", "cancel", "createCategory", "createTag"]);

const accountStore = useAccountStore();
const recipientStore = useRecipientStore();
const categoryStore = useCategoryStore();
const tagStore = useTagStore();

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
const recipientsLoaded = ref(false);

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
  tagStore.tags.map((t) => ({ id: t.id, name: t.name }))
);

const selectedCategory = computed(() =>
  categoryId.value ? categoryStore.getCategoryById(categoryId.value) : undefined
);

const selectedTags = computed(() =>
  tagIds.value.length > 0
    ? tagIds.value.map((id) => tagStore.getTagById(id))
    : []
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

    if (transactionType.value === TransactionType.TRANSFER) {
      toAccountId.value = (props.transaction as any).transferToAccountId || "";
    }
  } else {
    accountId.value =
      props.initialAccountId || accountStore.activeAccounts[0]?.id || "";
  }

  focusModalAndAmount();
});
</script>

<template>
  <div v-if="!recipientsLoaded" class="text-center p-4">Lade Empfänger...</div>
  <form
    ref="formModalRef"
    tabindex="-1"
    v-else
    @submit.prevent="
      emit('save', {
        date,
        valueDate,
        accountId,
        categoryId,
        tagIds,
        amount,
        note,
        recipientId,
      })
    "
    @keydown.esc.prevent="emit('cancel')"
    class="space-y-4 max-w-[calc(100%-80px)] mx-auto"
  >
    <!-- Transaktionstyp Auswahl -->
    <div class="flex justify-center gap-4">
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

    <div class="divider" />

    <!-- Grid für Datumsauswahl und Betrag -->
    <div class="grid grid-cols-3 gap-4 items-end">
      <!-- Datumsauswahl -->
      <DatePicker
        v-model="date"
        label="Buchungsdatum"
        required
        class="self-end fieldset"
      />
      <DatePicker
        v-model="valueDate"
        label="Wertstellung"
        required
        class="self-end fieldset"
      />

      <!-- Betrag -->
      <div class="flex justify-end items-center gap-2 self-end">
        <CurrencyInput
          ref="amountInputRef"
          v-model="amount"
          class="w-[150px]"
        />
        <span class="text-3xl">€</span>
      </div>
    </div>

    <div class="divider pt-5" />

    <!-- Konto Auswahl -->

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <fieldset class="fieldset">
        <legend class="fieldset-legend">Konto</legend>
        <select v-model="accountId" class="select select-bordered w-full">
          <option v-for="a in accounts" :key="a.id" :value="a.id">
            {{ a.name }}
          </option>
        </select>
      </fieldset>
      <fieldset class="fieldset">
        <legend class="fieldset-legend">Transfer-Konto</legend>
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
    />

    <!-- Kategorien & Tags -->
    <div
      v-if="transactionType !== TransactionType.TRANSFER"
      class="grid grid-cols-1 md:grid-cols-2 gap-4"
    >
      <SearchableSelect
        class="fieldset"
        v-model="categoryId"
        :options="categories"
        label="Kategorie"
        @create="emit('createCategory', $event)"
      />
      <SearchableSelect
        class="fieldset"
        v-model="tagIds"
        :options="tags"
        label="Tags"
        multiple
        @create="emit('createTag', $event)"
      />
    </div>

    <!-- Notizfeld -->
    <textarea
      v-model="note"
      class="textarea textarea-bordered w-full min-h-[3rem] fieldset"
      placeholder="Notiz"
    ></textarea>

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
