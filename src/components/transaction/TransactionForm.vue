<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { Transaction, TransactionType } from "../../types";
import { useAccountStore } from "../../stores/accountStore";
import { useCategoryStore } from "../../stores/categoryStore";
import { useTagStore } from "../../stores/tagStore";
import { useRecipientStore } from "../../stores/recipientStore";
import DatePicker from "../ui/DatePicker.vue";
import SearchableSelect from "../ui/SearchableSelect.vue";
import CurrencyInput from "../ui/CurrencyInput.vue";

const props = defineProps<{
  transaction?: Transaction;
  isEdit?: boolean;
  initialAccountId?: string;
  initialTransactionType?: TransactionType;
}>();

const emit = defineEmits(["save", "cancel", "createCategory", "createTag"]);

const accountStore = useAccountStore();
const categoryStore = useCategoryStore();
const tagStore = useTagStore();
const recipientStore = useRecipientStore();

const date = ref(new Date().toISOString().split("T")[0]);
const valueDate = ref(date.value);
const transactionType = ref<TransactionType>(TransactionType.EXPENSE);
const accountId = ref("");
const toAccountId = ref("");
const categoryId = ref<string | null>(null);
const tagIds = ref<string[]>([]);
const amount = ref(0);
const note = ref("");
const recipientId = ref("");
const recipientsLoaded = ref(false);

const recipients = computed(() =>
  Array.isArray(recipientStore.recipients) ? recipientStore.recipients : []
);

onMounted(() => {
  recipientsLoaded.value = true;

  if (props.transaction) {
    date.value = props.transaction.date;
    valueDate.value = props.transaction.valueDate || props.transaction.date;
    accountId.value = props.transaction.accountId;
    categoryId.value = props.transaction.categoryId;
    tagIds.value = props.transaction.tagIds;
    amount.value = props.transaction.amount ?? 0;
    note.value = props.transaction.note || "";
    recipientId.value = props.transaction.recipientId || "";
    transactionType.value = props.transaction.type;
  } else {
    if (props.initialAccountId) {
      accountId.value = props.initialAccountId;
    } else if (accountStore.activeAccounts.length > 0) {
      accountId.value = accountStore.activeAccounts[0].id;
    }
  }
});

// Passt den Buchungstyp an, wenn der Betrag geändert wird
watch(amount, (newAmount) => {
  if (toAccountId.value) {
    transactionType.value = TransactionType.TRANSFER;
  } else if (newAmount < 0) {
    transactionType.value = TransactionType.EXPENSE;
  } else if (newAmount > 0) {
    transactionType.value = TransactionType.INCOME;
  }
});

// Passt den Betrag an, wenn der Buchungstyp geändert wird
watch(transactionType, (newType) => {
  if (newType === TransactionType.TRANSFER) return;

  if (newType === TransactionType.EXPENSE && amount.value > 0) {
    amount.value = -amount.value;
  } else if (newType === TransactionType.INCOME && amount.value < 0) {
    amount.value = Math.abs(amount.value);
  }
});

// Löscht das Zielkonto, wenn der Typ nicht mehr Transfer ist
watch(transactionType, (newType) => {
  if (newType !== TransactionType.TRANSFER) {
    toAccountId.value = "";
  }
});

// Verhindert das Ändern des Typs, wenn ein Zielkonto gesetzt ist
watch(toAccountId, (newToAccountId) => {
  if (newToAccountId) {
    transactionType.value = TransactionType.TRANSFER;
  }
});

const saveTransaction = () => {
  emit("save", {
    type: transactionType.value,
    transaction: {
      date: date.value,
      valueDate: valueDate.value || date.value,
      accountId: accountId.value,
      categoryId: categoryId.value,
      tagIds: tagIds.value,
      amount: amount.value,
      note: note.value,
      recipientId: recipientId.value || undefined,
    },
  });
};

const accounts = computed(() =>
  accountStore.activeAccounts.map((account) => ({
    id: account.id,
    name: account.name,
  }))
);

const filteredAccounts = computed(() =>
  accounts.value.filter((account) => account.id !== accountId.value)
);
</script>

<template>
  <div v-if="!recipientsLoaded" class="text-center p-4">Lade Empfänger...</div>

  <form
    v-else
    @submit.prevent="saveTransaction"
    class="space-y-4 max-w-[calc(100%-80px)] mx-auto"
  >
    <!-- Transaktionstyp als Radio -->
    <div class="flex justify-center gap-4">
      <label class="flex items-center gap-2">
        <input
          type="radio"
          name="transactionType"
          class="radio border-neutral checked:bg-red-200 checked:text-red-600 checked:border-red-600"
          v-model="transactionType"
          :value="TransactionType.EXPENSE"
        />
        <span>Ausgabe</span>
      </label>
      <label class="flex items-center gap-2">
        <input
          type="radio"
          name="transactionType"
          class="radio border-neutral checked:bg-green-200 checked:text-green-600 checked:border-green-600"
          v-model="transactionType"
          :value="TransactionType.INCOME"
        />
        <span>Einnahme</span>
      </label>
      <label class="flex items-center gap-2">
        <input
          type="radio"
          name="transactionType"
          class="radio border-neutral checked:bg-yellow-200 checked:text-yellow-600 checked:border-yellow-600"
          v-model="transactionType"
          :value="TransactionType.TRANSFER"
        />
        <span>Transfer</span>
      </label>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <DatePicker v-model="date" label="Buchungsdatum" required />
      <DatePicker v-model="valueDate" label="Wertstellung" />
    </div>

    <!-- Betrag mit Euro-Symbol, rechtsbündig -->
    <div class="flex justify-end items-center gap-2">
      <CurrencyInput v-model="amount" class="w-[150px]" />
      <span class="text-3xl">€</span>
    </div>

    <SearchableSelect
      v-model="recipientId"
      :options="recipients"
      label="Empfänger"
    />

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <select v-model="accountId" class="select select-bordered w-full">
        <option
          v-for="account in accounts"
          :key="account.id"
          :value="account.id"
        >
          {{ account.name }}
        </option>
      </select>

      <select v-model="toAccountId" class="select select-bordered w-full">
        <option
          v-for="account in filteredAccounts"
          :key="account.id"
          :value="account.id"
        >
          {{ account.name }}
        </option>
      </select>
    </div>

    <SearchableSelect
      v-model="categoryId"
      :options="categoryStore.categories"
      label="Kategorie"
    />

    <textarea
      v-model="note"
      class="textarea textarea-bordered w-full min-h-[3rem]"
      placeholder="Notiz"
    ></textarea>

    <div class="flex justify-end space-x-2">
      <button type="button" class="btn btn-secondary" @click="$emit('cancel')">
        Abbrechen
      </button>
      <button type="submit" class="btn btn-primary">Speichern</button>
    </div>
  </form>
</template>
