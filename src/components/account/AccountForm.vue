<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { Account, AccountType } from "../../types";
import { useAccountStore } from "../../stores/accountStore";

const props = defineProps<{
  account?: Account;
  isEdit?: boolean;
}>();

const emit = defineEmits(["save", "cancel"]);

const accountStore = useAccountStore();

// Formularfelder
const name = ref("");
const description = ref("");
const note = ref("");
const accountType = ref<AccountType>(AccountType.CHECKING);
const isActive = ref(true);
const isOfflineBudget = ref(false);
const accountGroupId = ref("");
const sortOrder = ref(0);
const iban = ref("");
const balance = ref(0);
const creditLimit = ref(0);
const offset = ref(0);
const image = ref<string | null>(null); // Neu: Bild-URL

// Lade die Daten, wenn ein Konto zum Bearbeiten übergeben wurde
onMounted(() => {
  if (props.account) {
    name.value = props.account.name;
    description.value = props.account.description;
    note.value = props.account.note;
    accountType.value = props.account.accountType;
    isActive.value = props.account.isActive;
    isOfflineBudget.value = props.account.isOfflineBudget;
    accountGroupId.value = props.account.accountGroupId;
    sortOrder.value = props.account.sortOrder;
    iban.value = props.account.iban;
    balance.value = props.account.balance;
    creditLimit.value = props.account.creditLimit;
    offset.value = props.account.offset;
    image.value = props.account.image || null; // Lade Bild-URL
  } else {
    // Standardwerte für ein neues Konto
    if (accountStore.accountGroups.length > 0) {
      accountGroupId.value = accountStore.accountGroups[0].id;
    }
  }
});

// Konvertiere einen String in eine Zahl
const parseNumber = (value: string): number => {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  return parseFloat(normalized) || 0;
};

// Speichere das Konto
const saveAccount = () => {
  const accountData: Omit<Account, "id"> = {
    name: name.value,
    description: description.value,
    note: note.value,
    accountType: accountType.value,
    isActive: isActive.value,
    isOfflineBudget: isOfflineBudget.value,
    accountGroupId: accountGroupId.value,
    sortOrder: sortOrder.value,
    iban: iban.value,
    balance: balance.value,
    creditLimit: creditLimit.value,
    offset: offset.value,
    image: image.value || undefined,
  };

  console.log("Daten zum Speichern:", accountData); // Debugging
  emit("save", accountData);
};

// Kontogruppen für das Dropdown
const accountGroups = computed(() => {
  return accountStore.accountGroups;
});

// Kontotypen für das Dropdown
const accountTypes = [
  { value: AccountType.CHECKING, label: "Girokonto" },
  { value: AccountType.SAVINGS, label: "Sparkonto" },
  { value: AccountType.CREDIT, label: "Kreditkarte" },
  { value: AccountType.CASH, label: "Bargeld" },
];
</script>

<template>
  <form @submit.prevent="saveAccount" class="space-y-4">
    <div class="form-control">
      <label class="label">
        <span class="label-text">Name</span>
        <span class="text-error">*</span>
      </label>
      <input
        type="text"
        v-model="name"
        class="input input-bordered"
        required
        placeholder="Kontoname"
      />
    </div>

    <div class="form-control">
      <label class="label">
        <span class="label-text">Beschreibung</span>
      </label>
      <input
        type="text"
        v-model="description"
        class="input input-bordered"
        placeholder="Kurze Beschreibung"
      />
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="form-control">
        <label class="label">
          <span class="label-text">Kontotyp</span>
          <span class="text-error">*</span>
        </label>
        <select v-model="accountType" class="select select-bordered w-full">
          <option
            v-for="type in accountTypes"
            :key="type.value"
            :value="type.value"
          >
            {{ type.label }}
          </option>
        </select>
      </div>

      <div class="form-control">
        <label class="label">
          <span class="label-text">Kontogruppe</span>
        </label>
        <select
          v-model="accountGroupId"
          class="select select-bordered w-full"
          required
        >
          <option
            v-for="group in accountGroups"
            :key="group.id"
            :value="group.id"
          >
            {{ group.name }}
          </option>
        </select>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="form-control">
        <label class="label">
          <span class="label-text">IBAN</span>
        </label>
        <input
          type="text"
          v-model="iban"
          class="input input-bordered"
          placeholder="DE12 3456 7890 1234 5678 90"
        />
      </div>

      <div class="form-control">
        <label class="label">
          <span class="label-text">Sortierung</span>
        </label>
        <input
          type="number"
          v-model="sortOrder"
          class="input input-bordered"
          min="0"
        />
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="form-control">
        <label class="label">
          <span class="label-text">Kontostand</span>
          <span v-if="!props.isEdit" class="text-error">*</span>
        </label>
        <input
          type="text"
          :value="formatNumber(balance)"
          @input="balance = parseNumber(($event.target as HTMLInputElement).value)"
          class="input input-bordered"
          :required="!props.isEdit"
          placeholder="0,00"
        />
      </div>

      <div v-if="accountType === 'CREDIT'" class="form-control">
        <label class="label">
          <span class="label-text">Kreditlimit</span>
        </label>
        <input
          type="text"
          :value="formatNumber(creditLimit)"
          @input="creditLimit = parseNumber(($event.target as HTMLInputElement).value)"
          class="input input-bordered"
          placeholder="0,00"
        />
      </div>
    </div>

    <div class="form-control">
      <label class="label">
        <span class="label-text">Offset (Nulllinie für Statistiken)</span>
      </label>
      <input
        type="text"
        :value="formatNumber(offset)"
        @input="offset = parseNumber(($event.target as HTMLInputElement).value)"
        class="input input-bordered"
        placeholder="0,00"
      />
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

    <div class="form-control">
      <label class="label">
        <span class="label-text">Konto Bild (JPG oder PNG)</span>
      </label>
      <input
        type="file"
        class="file-input file-input-bordered w-full"
        accept="image/jpeg, image/png"
        @change="handleImageUpload"
      />
      <div v-if="image" class="mt-2">
        <img
          :src="image"
          alt="Konto Bild Vorschau"
          class="rounded-md max-h-32"
        />
      </div>
    </div>

    <div class="flex flex-col sm:flex-row gap-4 pt-4">
      <div class="form-control">
        <label class="label cursor-pointer">
          <span class="label-text mr-4">Aktiv</span>
          <input
            type="checkbox"
            v-model="isActive"
            class="toggle toggle-primary"
          />
        </label>
      </div>

      <div class="form-control">
        <label class="label cursor-pointer">
          <span class="label-text mr-4">Nicht im Budget berücksichtigen</span>
          <input
            type="checkbox"
            v-model="isOfflineBudget"
            class="toggle toggle-primary"
          />
        </label>
      </div>
    </div>

    <div class="flex justify-end space-x-2 pt-4">
      <button type="button" class="btn" @click="emit('cancel')">
        Abbrechen
      </button>
      <button type="submit" class="btn btn-primary">Speichern</button>
    </div>
  </form>
</template>
