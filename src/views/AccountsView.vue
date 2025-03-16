<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useAccountStore } from "../stores/accountStore";
import AccountCard from "../components/account/AccountCard.vue";
import AccountGroupCard from "../components/account/AccountGroupCard.vue";
import AccountForm from "../components/account/AccountForm.vue";
import AccountReconcileModal from "../components/account/AccountReconcileModal.vue";
import CurrencyDisplay from "../components/ui/CurrencyDisplay.vue";
import TransactionList from "../components/transaction/TransactionList.vue";
import TransactionCard from "../components/transaction/TransactionCard.vue";

const accountStore = useAccountStore();
const router = useRouter();

// State für Modals
const showAccountModal = ref(false);
const showAccountGroupModal = ref(false);
const showReconcileModal = ref(false);

// Ausgewählte Elemente
const selectedAccount = ref(null);

// Konten nach Gruppen gruppiert
const accountsByGroup = computed(() => {
  return accountStore.accountsByGroup;
});

// Kontogruppen
const accountGroups = computed(() => {
  return accountStore.accountGroups;
});

// Gesamtsaldo aller Konten
const totalBalance = computed(() => {
  return accountStore.totalBalance;
});

// Konto bearbeiten
const editAccount = (account) => {
  selectedAccount.value = account;
  showAccountModal.value = true;
};

// Neues Konto erstellen
const createAccount = () => {
  selectedAccount.value = null;
  showAccountModal.value = true;
};

// Konto löschen
const deleteAccount = async (account) => {
  if (confirm(`Möchten Sie das Konto "${account.name}" wirklich löschen?`)) {
    await accountStore.deleteAccount(account.id);
  }
};

// Kontoabgleich starten
const reconcileAccount = (account) => {
  selectedAccount.value = account;
  showReconcileModal.value = true;
};

// Transaktionen anzeigen
const showTransactions = (account) => {
  router.push({ name: "transactions", query: { accountId: account.id } });
};

// Konto Gruppe bearbeiten
const editAccountGroup = (group) => {
  router.push({ name: "edit-account-group", params: { id: group.id } });
};

// Neue Konto Gruppe erstellen
const createAccountGroup = () => {
  // TODO: Implement Account Group Create Modal
  console.log("Create Account Group");
};

// Konto Gruppe löschen
const deleteAccountGroup = (group) => {
  // TODO: Implement Account Group Delete
  console.log("Delete Account Group", group);
};

// Aktionen nach dem Speichern eines Kontos
const onAccountSaved = async () => {
  showAccountModal.value = false;
  selectedAccount.value = null;
  await accountStore.loadAccounts(); // Aktualisiere die Kontenliste
};

// Aktionen nach dem Kontoabgleich
const onReconciled = async () => {
  showReconcileModal.value = false;
  selectedAccount.value = null;
  await accountStore.loadAccounts(); // Aktualisiere die Kontenliste
};

// Abbrechen-Aktion für Konto-Modal
const onAccountModalCancelled = () => {
  showAccountModal.value = false;
  selectedAccount.value = null;
};

// Abbrechen-Aktion für Kontoabgleich-Modal
const onReconcileModalCancelled = () => {
  showReconcileModal.value = false;
  selectedAccount.value = null;
};

const onAccountCardClicked = (account) => {
  selectedAccount.value = account;
};

const accountTransactions = computed(() => {
  if (selectedAccount.value) {
    return accountStore.getTransactionByAccountId(selectedAccount.value.id);
  }
  return [];
});
</script>

<template>
  <div class="flex gap-4">
    <div class="w-full md:w-1/2 max-w-xl">
      <!-- Row für Gesamtsaldo und Buttons -->
      <div class="rounded-md bg-base-200/50 backdrop-blur-lg p-2 mb-6">
        <div class="flex justify-between items-center">
          <!-- Join Buttons -->
          <div class="join">
            <button
              class="btn join-item rounded-l-full btn-sm btn-soft border border-base-300"
              @click="createAccountGroup"
            >
              <Icon icon="mdi:folder-plus" class="mr-2" />
              Neue Gruppe
            </button>
            <button
              class="btn join-item rounded-r-full btn-sm btn-soft border border-base-300"
              @click="createAccount"
            >
              <Icon icon="mdi:plus" class="mr-2" />
              Neues Konto
            </button>
          </div>
          <div class="flex items-center gap-2 text-base text-right">
            <div class="opacity-50">Gesamtsaldo:</div>
            <CurrencyDisplay
              class="text-base"
              :amount="totalBalance"
              :show-zero="true"
              :asInteger="true"
            />
            <Icon
              icon="mdi:scale-balance"
              class="text-secondary ml-0 mr-5 opacity-50"
            />
          </div>
        </div>
      </div>

      <div v-for="group in accountGroups" :key="group.id" class="mb-8 z-[1]">
        <div class="mb-4">
          <AccountGroupCard
            :group="group"
            @edit="editAccountGroup(group)"
            @delete="deleteAccountGroup(group)"
            @editAccount="editAccount"
            @deleteAccount="deleteAccount"
            @reconcileAccount="reconcileAccount"
            @showTransactions="showTransactions"
            @accountCardClicked="onAccountCardClicked"
          />
        </div>
      </div>
    </div>

    <div class="w-full md:w-1/2 max-w-xl">
      <h2 v-if="selectedAccount" class="text-xl font-bold mb-4">
        Transaktionen für Konto: {{ selectedAccount.name }}
      </h2>
      <p v-else>Wähle ein Konto, um die Transaktionen anzuzeigen.</p>
      <div class="grid grid-cols-1 gap-4">
        <TransactionCard
          v-for="transaction in accountTransactions"
          :key="transaction.id"
          :transaction="transaction"
        />
      </div>
    </div>

    <!-- Konto bearbeiten / erstellen Modal -->
    <Teleport to="body">
      <AccountForm
        v-if="showAccountModal"
        :account="selectedAccount"
        :is-edit="!!selectedAccount"
        @save="onAccountSaved"
        @cancel="onAccountModalCancelled"
      />
    </Teleport>

    <!-- Kontoabgleich Modal -->
    <Teleport to="body">
      <AccountReconcileModal
        v-if="showReconcileModal"
        :account="selectedAccount"
        :is-open="showReconcileModal"
        @close="onReconcileModalCancelled"
        @reconciled="onReconciled"
      />
    </Teleport>
  </div>
</template>
