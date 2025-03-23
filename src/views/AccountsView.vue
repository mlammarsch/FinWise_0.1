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
import MonthSelector from "../components/ui/MonthSelector.vue";
import SearchGroup from "../components/ui/SearchGroup.vue";

const accountStore = useAccountStore();
const router = useRouter();

const showNewAccountModal = ref(false);
const showNewGroupModal = ref(false);

const selectedAccount = ref(null);

const accountsByGroup = computed(() => accountStore.accountsByGroup);
const accountGroups = computed(() => accountStore.accountGroups);
const totalBalance = computed(() => accountStore.totalBalance);

const createAccount = () => {
  selectedAccount.value = null;
  showNewAccountModal.value = true;
};

const createAccountGroup = () => {
  selectedAccount.value = null;
  showNewGroupModal.value = true;
};

const onAccountSaved = async (accountData) => {
  if (selectedAccount.value?.id) {
    accountStore.updateAccount(selectedAccount.value.id, accountData);
  } else {
    accountStore.addAccount(accountData);
  }
  showNewAccountModal.value = false;
  selectedAccount.value = null;
};

const onGroupSaved = async (groupData) => {
  const group = accountGroups.value.find((g) => g.name === groupData.name);
  if (group) {
    accountStore.updateAccountGroup(group.id, groupData);
  } else {
    accountStore.addAccountGroup(groupData);
  }
  showNewGroupModal.value = false;
};

const onSelectAccount = (account) => {
  selectedAccount.value = account;
};

const accountTransactions = computed(() => {
  if (selectedAccount.value) {
    return accountStore
      .getTransactionByAccountId(selectedAccount.value.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
  return [];
});
</script>

<template>
  <div class="flex gap-4 justify-center">
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

      <div v-for="group in accountGroups" :key="group.id" class="mb-8">
        <div class="mb-4">
          <AccountGroupCard
            :group="group"
            :activeAccountId="selectedAccount ? selectedAccount.id : ''"
            @selectAccount="onSelectAccount"
          />
        </div>
      </div>
    </div>

    <div class="w-full md:w-1/2 max-w-xl">
      <!-- Steuerungsleiste mit Filterelementen aus TransactionsView (ohne Kontenauswahl) -->
      <div class="rounded-md bg-base-200/50 backdrop-blur-lg p-2 mb-6">
        <div
          id="steuerungsleiste"
          class="flex flex-wrap items-center justify-between gap-1"
        >
          <div class="flex flex-wrap">
            <fieldset class="fieldset pt-0">
              <legend class="fieldset-legend text-center opacity-50">
                Monatswahl
              </legend>
              <MonthSelector class="mx-2" />
            </fieldset>
            <fieldset class="fieldset pt-0">
              <legend class="fieldset-legend text-center opacity-50">
                Transaktion
              </legend>
              <select
                class="select select-sm select-bordered border-base-300 w-38 mx-2 rounded-full"
              >
                <option value="">Alle Typen</option>
                <option value="ausgabe">Ausgabe</option>
                <option value="einnahme">Einnahme</option>
                <option value="transfer">Transfer</option>
              </select>
            </fieldset>
            <fieldset class="fieldset pt-0">
              <legend class="fieldset-legend text-center opacity-50">
                Abgeglichen
              </legend>
              <select
                class="select select-sm select-bordered border-base-300 w-38 mx-2 rounded-full"
              >
                <option value="">Alle</option>
                <option value="abgeglichen">Abgeglichen</option>
                <option value="nicht abgeglichen">Nicht abgeglichen</option>
              </select>
            </fieldset>
          </div>
        </div>
      </div>

      <h2 v-if="selectedAccount" class="text-xl font-bold mb-4">
        <SearchGroup btnRight="Neue Transaktion" btnRightIcon="mdi:plus" />
      </h2>
      <p v-else>Wähle ein Konto, um die Transaktionen anzuzeigen.</p>
      <div class="grid grid-cols-1 gap-1">
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
