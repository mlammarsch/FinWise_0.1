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
import { Icon } from "@iconify/vue";

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

watch(date, (newDate) => {
  valueDate.value = newDate;
});

watch([amount, toAccountId], () => {
  if (toAccountId.value) {
    transactionType.value = TransactionType.TRANSFER;
  } else if (amount.value < 0) {
    transactionType.value = TransactionType.EXPENSE;
  } else if (amount.value > 0) {
    transactionType.value = TransactionType.INCOME;
  } else {
    transactionType.value = TransactionType.EXPENSE;
  }
});

watch(accountId, () => {
  if (toAccountId.value === accountId.value) {
    toAccountId.value = "";
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
      <label class="flex items-center gap-2 text-neutral">
        <input
          type="radio"
          name="transactionType"
          class="radio radio-sm radio-error"
          v-model="transactionType"
          :value="TransactionType.EXPENSE"
        />
        <span>Ausgabe</span>
      </label>
      <label class="flex items-center gap-2 text-neutral">
        <input
          type="radio"
          name="transactionType"
          class="radio radio-sm radio-success"
          v-model="transactionType"
          :value="TransactionType.INCOME"
        />
        <span>Einnahme</span>
      </label>
      <label class="flex items-center gap-2 text-neutral">
        <input
          type="radio"
          name="transactionType"
          class="radio radio-sm radio-warning"
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

    <!-- Betrag mit Euro-Symbol -->
    <div class="flex items-center gap-2">
      <Icon icon="mdi:currency-eur" class="text-4xl" />
      <CurrencyInput v-model="amount" class="w-full" />
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

    <!-- Tags als Badges -->
    <div>
      <label class="label">
        <Icon icon="mdi:tags" class="mr-2" />
        <span class="label-text">Tags</span>
      </label>
      <div class="flex flex-wrap gap-2 p-1">
        <div
          v-for="tag in tagStore.tags.filter((t) => tagIds.includes(t.id))"
          :key="tag.id"
          class="badge badge-soft badge-secondary"
        >
          {{ tag.name }}
        </div>
      </div>
    </div>

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
