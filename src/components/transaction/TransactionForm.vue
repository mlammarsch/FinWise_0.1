<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
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
const valueDate = ref("");
const transactionType = ref<TransactionType>(TransactionType.EXPENSE);
const accountId = ref("");
const toAccountId = ref("");
const categoryId = ref<string | null>(null);
const tagIds = ref<string[]>([]);
const amount = ref(0);
const note = ref("");
const recipientId = ref("");
const recipientsLoaded = ref(false);

// Lade Empfänger beim Mounten der Komponente
onMounted(() => {
  if (!recipientStore.recipients || !Array.isArray(recipientStore.recipients)) {
    recipientStore.recipients = [];
  }
  recipientsLoaded.value = true;

  if (props.transaction) {
    date.value = props.transaction.date;
    valueDate.value = props.transaction.valueDate || props.transaction.date;
    accountId.value = props.transaction.accountId;
    categoryId.value = props.transaction.categoryId;
    tagIds.value = props.transaction.tagIds;
    amount.value = props.transaction.amount;
    note.value = props.transaction.note || "";
    recipientId.value = props.transaction.recipientId || "";
  } else {
    if (props.initialAccountId) {
      accountId.value = props.initialAccountId;
    } else if (accountStore.activeAccounts.length > 0) {
      accountId.value = accountStore.activeAccounts[0].id;
    }

    if (props.initialTransactionType) {
      transactionType.value = props.initialTransactionType;
    }
  }
});

// Sicherstellen, dass `recipients` **immer** ein Array ist
const recipients = computed(() =>
  Array.isArray(recipientStore.recipients) &&
  recipientStore.recipients.length > 0
    ? recipientStore.recipients.map((recipient) => ({
        id: recipient.id,
        name: recipient.name,
      }))
    : []
);

const saveTransaction = () => {
  let finalAmount = Math.abs(amount.value);

  if (transactionType.value === TransactionType.EXPENSE) {
    finalAmount = -finalAmount;
  }

  emit("save", {
    type: transactionType.value,
    transaction: {
      date: date.value,
      valueDate: valueDate.value || date.value,
      accountId: accountId.value,
      categoryId: categoryId.value,
      tagIds: tagIds.value,
      amount: finalAmount,
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

const categories = computed(() =>
  categoryStore.categories.map((category) => ({
    id: category.id,
    name: category.name,
  }))
);

const tags = computed(() =>
  tagStore.tags.map((tag) => ({
    id: tag.id,
    name: tag.name,
  }))
);
</script>

<template>
  <div v-if="!recipientsLoaded" class="text-center p-4">Lade Empfänger...</div>

  <form v-else @submit.prevent="saveTransaction" class="space-y-4">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <DatePicker v-model="date" label="Buchungsdatum" required />
      <DatePicker v-model="valueDate" label="Wertstellung" />
    </div>

    <div class="form-control">
      <label class="label">
        <span class="label-text">Transaktionstyp</span>
      </label>
      <select v-model="transactionType" class="select select-bordered w-full">
        <option :value="TransactionType.EXPENSE">Ausgabe</option>
        <option :value="TransactionType.INCOME">Einnahme</option>
        <option :value="TransactionType.TRANSFER">Überweisung</option>
      </select>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="form-control">
        <label class="label">
          <span class="label-text">Konto</span>
        </label>
        <select v-model="accountId" class="select select-bordered w-full">
          <option
            v-for="account in accounts"
            :key="account.id"
            :value="account.id"
          >
            {{ account.name }}
          </option>
        </select>
      </div>

      <div
        v-if="transactionType === TransactionType.TRANSFER"
        class="form-control"
      >
        <label class="label">
          <span class="label-text">Auf Konto</span>
        </label>
        <select v-model="toAccountId" class="select select-bordered w-full">
          <option
            v-for="account in accounts.filter((acc) => acc.id !== accountId)"
            :key="account.id"
            :value="account.id"
          >
            {{ account.name }}
          </option>
        </select>
      </div>
    </div>

    <SearchableSelect
      v-model="recipientId"
      :options="recipients"
      label="Empfänger"
    />

    <CurrencyInput v-model="amount" />

    <div class="form-control">
      <label class="label">
        <span class="label-text">Kategorie</span>
      </label>
      <select v-model="categoryId" class="select select-bordered w-full">
        <option
          v-for="category in categories"
          :key="category.id"
          :value="category.id"
        >
          {{ category.name }}
        </option>
      </select>
    </div>

    <div class="form-control">
      <label class="label">
        <span class="label-text">Tags</span>
      </label>
      <select v-model="tagIds" class="select select-bordered w-full" multiple>
        <option v-for="tag in tags" :key="tag.id" :value="tag.id">
          {{ tag.name }}
        </option>
      </select>
    </div>

    <div class="form-control">
      <label class="label">
        <span class="label-text">Notiz</span>
      </label>
      <textarea
        v-model="note"
        class="textarea textarea-bordered w-full"
      ></textarea>
    </div>

    <div class="flex justify-end space-x-2">
      <button type="button" class="btn btn-secondary" @click="$emit('cancel')">
        Abbrechen
      </button>
      <button type="submit" class="btn btn-primary">Speichern</button>
    </div>
  </form>
</template>
