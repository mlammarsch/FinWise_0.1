<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useAccountStore } from "../stores/accountStore";
import AccountCard from "../components/account/AccountCard.vue";
import AccountGroupCard from "../components/account/AccountGroupCard.vue";
import AccountForm from "../components/account/AccountForm.vue";
import AccountGroupForm from "../components/account/AccountGroupForm.vue";
import CurrencyDisplay from "../components/ui/CurrencyDisplay.vue";
import TransactionCard from "../components/transaction/TransactionCard.vue";

const accountStore = useAccountStore();
const router = useRouter();

// State für Modals
const showNewAccountModal = ref(false);
const showNewGroupModal = ref(false);

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

// Neues Konto erstellen
const createAccount = () => {
  showNewAccountModal.value = true;
};

// Neue Kontogruppe erstellen
const createAccountGroup = () => {
  showNewGroupModal.value = true;
};

// Aktionen nach dem Speichern
const onAccountSaved = async () => {
  showNewAccountModal.value = false;
  await accountStore.loadAccounts();
};

const onGroupSaved = async () => {
  showNewGroupModal.value = false;
  await accountStore.loadAccounts();
};

// Konto auswählen
const onSelectAccount = (account) => {
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
            @selectAccount="onSelectAccount"
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

    <!-- Neues Konto Modal -->
    <Teleport to="body">
      <div v-if="showNewAccountModal" class="modal modal-open">
        <div class="modal-box max-w-2xl">
          <h3 class="font-bold text-lg mb-4">Neues Konto erstellen</h3>
          <AccountForm
            @save="onAccountSaved"
            @cancel="showNewAccountModal = false"
          />
        </div>
        <div class="modal-backdrop" @click="showNewAccountModal = false"></div>
      </div>
    </Teleport>

    <!-- Neue Gruppe Modal -->
    <Teleport to="body">
      <div v-if="showNewGroupModal" class="modal modal-open">
        <div class="modal-box max-w-2xl">
          <h3 class="font-bold text-lg mb-4">Neue Kontogruppe erstellen</h3>
          <AccountGroupForm
            @save="onGroupSaved"
            @cancel="showNewGroupModal = false"
          />
        </div>
        <div class="modal-backdrop" @click="showNewGroupModal = false"></div>
      </div>
    </Teleport>
  </div>
</template>
