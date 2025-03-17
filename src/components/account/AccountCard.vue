<script setup lang="ts">
import { defineProps, computed, ref } from "vue";
import { Account } from "../../types";
import CurrencyDisplay from "../ui/CurrencyDisplay.vue";
import { useRouter } from "vue-router";
import AccountReconcileModal from "./AccountReconcileModal.vue";
import AccountForm from "./AccountForm.vue";
import { useAccountStore } from "../../stores/accountStore";

const emit = defineEmits(["select"]);

const props = defineProps<{
  account: Account;
}>();

const router = useRouter();
const accountStore = useAccountStore();

// State für Modals
const showReconcileModal = ref(false);
const showEditModal = ref(false);

const formattedIban = computed(() => {
  if (!props.account.iban) return "";
  const iban = props.account.iban.replace(/\s/g, "");
  return iban.match(/.{1,4}/g)?.join(" ") || iban;
});

const accountImage = computed(() => {
  return props.account.image || "https://placehold.co/400x400?text=Logo";
});

// Aktionen
const showTransactions = () => {
  router.push({ name: "transactions", query: { accountId: props.account.id } });
};

const deleteAccount = async () => {
  if (
    confirm(`Möchten Sie das Konto "${props.account.name}" wirklich löschen?`)
  ) {
    await accountStore.deleteAccount(props.account.id);
  }
};

// Modal Handlers
const onReconciled = async () => {
  showReconcileModal.value = false;
  await accountStore.loadAccounts();
};

const onAccountSaved = async () => {
  showEditModal.value = false;
  await accountStore.loadAccounts();
};

// Konto auswählen
const selectAccount = () => {
  emit("select", props.account);
};
</script>

<template>
  <div
    class="card rounded-md border-base-200 bg-base-200 shadow-none relative cursor-pointer hover:bg-base-300"
    style="width: 100%"
    @click="selectAccount"
  >
    <!-- Dropdown-Menü für Aktionen -->
    <div class="dropdown dropdown-end absolute top-1 right-1" @click.stop>
      <label tabindex="0" class="btn btn-ghost btn-sm btn-circle">
        <Icon icon="mdi:dots-vertical" />
      </label>
      <ul
        tabindex="0"
        class="dropdown-content menu p-2 shadow bg-base-100 border border-base-300 rounded-box w-52"
      >
        <li>
          <a @click="showReconcileModal = true">Kontoabgleich</a>
        </li>
        <li>
          <a @click="showEditModal = true">Bearbeiten</a>
        </li>
        <li>
          <a @click="deleteAccount" class="text-error">Löschen</a>
        </li>
      </ul>
    </div>

    <div class="card-body min-h-22 flex flex-row items-center p-0">
      <!-- Konto-Logo -->
      <div class="w-16 flex-shrink-0 mr-1 ml-2">
        <img
          :src="accountImage"
          alt="Account Logo"
          class="w-full h-full rounded-full object-cover"
        />
      </div>

      <!-- Kontodetails -->
      <div class="flex-grow">
        <div class="grid grid-rows-[auto_auto_auto] m-1 pl-2 py-1">
          <h2 class="card-title m-0 p-0 text-lg">{{ account.name }}</h2>
          <div class="text-sm m-0 p-0">{{ account.description }}</div>
          <div class="text-sm opacity-50 m-0 pt-1">{{ formattedIban }}</div>
        </div>
      </div>

      <!-- Saldo-Anzeige -->
      <div class="justify-self-end flex items-center flex-shrink-0 ml-2 mr-3">
        <CurrencyDisplay
          class="text-right text-base whitespace-nowrap"
          :amount="account.balance"
          :show-zero="true"
          :asInteger="true"
        />
        <Icon
          icon="mdi:scale-balance"
          class="text-secondary text-base opacity-50 ml-2"
        />
      </div>
    </div>

    <!-- Modals -->
    <Teleport to="body">
      <AccountReconcileModal
        v-if="showReconcileModal"
        :account="account"
        :is-open="showReconcileModal"
        @close="showReconcileModal = false"
        @reconciled="onReconciled"
      />

      <div v-if="showEditModal" class="modal modal-open">
        <div class="modal-box max-w-2xl">
          <h3 class="font-bold text-lg mb-4">Konto bearbeiten</h3>
          <AccountForm
            :account="account"
            :is-edit="true"
            @save="onAccountSaved"
            @cancel="showEditModal = false"
          />
        </div>
        <div class="modal-backdrop" @click="showEditModal = false"></div>
      </div>
    </Teleport>
  </div>
</template>
