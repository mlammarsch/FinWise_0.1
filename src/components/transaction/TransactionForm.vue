<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from "vue";
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

const locked = computed(
  () => props.transaction && (props.transaction as any).counterTransactionId
);

const recipients = computed(() =>
  Array.isArray(recipientStore.recipients) ? recipientStore.recipients : []
);

const amountInputRef = ref<InstanceType<typeof CurrencyInput> | null>(null);
const formModalRef = ref<HTMLFormElement | null>(null);

const focusModalAndAmount = () => {
  nextTick(() => {
    formModalRef.value?.focus();
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
    categoryId.value = props.transaction.categoryId;
    tagIds.value = (props.transaction as any).tagIds || [];
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

watch(
  () => props.isEdit,
  (newValue) => newValue && focusModalAndAmount()
);

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
  if (!locked.value && newType !== TransactionType.TRANSFER)
    toAccountId.value = "";
});

watch(toAccountId, (newToAccountId) => {
  if (!locked.value && newToAccountId)
    transactionType.value = TransactionType.TRANSFER;
});

const isTransfer = computed(
  () => transactionType.value === TransactionType.TRANSFER
);

const saveTransaction = () => {
  const payload =
    transactionType.value === TransactionType.TRANSFER
      ? {
          type: transactionType.value,
          fromAccountId: accountId.value,
          toAccountId: toAccountId.value,
          amount: Math.abs(amount.value),
          date: date.value,
          valueDate: valueDate.value || date.value,
          note,
        }
      : {
          type: transactionType.value,
          transaction: {
            date: date.value,
            valueDate: valueDate.value || date.value,
            accountId: accountId.value,
            categoryId,
            tagIds,
            amount: amount.value,
            note,
            recipientId: recipientId.value || undefined,
          },
        };
  emit("save", payload);
};

const accounts = computed(() =>
  accountStore.activeAccounts.map((a) => ({ id: a.id, name: a.name }))
);
const filteredAccounts = computed(() =>
  accounts.value.filter((a) => a.id !== accountId.value)
);
</script>

<template>
  <div v-if="!recipientsLoaded" class="text-center p-4">Lade Empfänger...</div>
  <form
    ref="formModalRef"
    tabindex="-1"
    v-else
    @submit.prevent="saveTransaction"
    class="space-y-4 max-w-[calc(100%-80px)] mx-auto"
  >
    <div class="flex justify-center gap-4">
      <label class="flex items-center gap-2">
        <input
          type="radio"
          name="transactionType"
          class="radio border-neutral checked:bg-red-200 checked:text-red-600 checked:border-red-600"
          v-model="transactionType"
          :value="TransactionType.EXPENSE"
          :disabled="locked"
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
          :disabled="locked"
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
    <div class="flex justify-end items-center gap-2">
      <CurrencyInput ref="amountInputRef" v-model="amount" class="w-[150px]" />
      <span class="text-3xl">€</span>
    </div>
    <SearchableSelect
      v-model="recipientId"
      :options="recipients"
      label="Empfänger"
      :disabled="isTransfer"
    />
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <select v-model="accountId" class="select select-bordered w-full">
        <option v-for="a in accounts" :key="a.id" :value="a.id">
          {{ a.name }}
        </option>
      </select>
      <select
        v-model="toAccountId"
        class="select select-bordered w-full"
        :disabled="!isTransfer"
      >
        <option v-for="a in filteredAccounts" :key="a.id" :value="a.id">
          {{ a.name }}
        </option>
      </select>
    </div>
    <textarea
      v-model="note"
      class="textarea textarea-bordered w-full"
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
