/**
 * Pfad zur Komponente: ./AccountGroupCard.vue
 * Diese Komponente stellt eine Gruppe von Konten dar und zeigt deren Details an.
 *
 * Komponenten-Props:
 * - group: AccountGroup - Die Kontogruppe, die dargestellt wird.
 *
 * Emits:
 * - edit: Wird ausgelöst, wenn die Gruppe bearbeitet werden soll.
 * - delete: Wird ausgelöst, wenn die Gruppe gelöscht werden soll.
 * - editAccount: Wird ausgelöst, wenn ein Konto bearbeitet wird.
 * - deleteAccount: Wird ausgelöst, wenn ein Konto gelöscht wird.
 * - reconcileAccount: Wird ausgelöst, wenn ein Konto abgeglichen wird.
 * - showTransactions: Wird ausgelöst, um Transaktionen eines Kontos anzuzeigen.
 * - accountCardClicked: Wird ausgelöst, wenn eine Kontokarte angeklickt wird.
 */

<script setup lang="ts">
import { computed } from "vue";
import { AccountGroup } from "../../types";
import { useAccountStore } from "../../stores/accountStore";
import CurrencyDisplay from "../ui/CurrencyDisplay.vue";
import AccountCard from "./AccountCard.vue";

const props = defineProps<{
  group: AccountGroup;
}>();

const emit = defineEmits([
  "edit",
  "delete",
  "editAccount",
  "deleteAccount",
  "reconcileAccount",
  "showTransactions",
  "accountCardClicked",
]);

const accountStore = useAccountStore();

// Berechnung der aktiven Konten in der Gruppe
const accountsInGroup = computed(() =>
  accountStore.accounts.filter(
    (account) => account.accountGroupId === props.group.id && account.isActive
  )
);

// Berechnung des Gesamtsaldos der aktiven Konten (ausgenommen Offline-Budget-Konten)
const groupBalance = computed(() =>
  accountsInGroup.value
    .filter((account) => !account.isOfflineBudget)
    .reduce((sum, account) => sum + account.balance, 0)
);

// Berechnung der Anzahl der Konten in der Gruppe
const accountCount = computed(() => accountsInGroup.value.length);

const editAccountGroup = () => emit("edit");
const deleteAccountGroup = () => emit("delete");
</script>

<template>
  <div
    class="card glass-effect bg-none border border-base-300 shadow-md relative z-0"
  >
    <!-- Dropdown-Menü für Aktionen -->
    <div class="dropdown dropdown-end absolute top-1 right-1">
      <label tabindex="0" class="btn btn-ghost btn-sm btn-circle">
        <Icon icon="mdi:dots-vertical" />
      </label>
      <ul
        tabindex="0"
        class="dropdown-content z-[99] menu p-2 shadow bg-base-100 border border-base-300 rounded-box w-52"
      >
        <li><a @click="editAccountGroup">Bearbeiten</a></li>
        <li><a @click="deleteAccountGroup" class="text-error">Löschen</a></li>
      </ul>
    </div>

    <!-- Titelbereich der Karte -->
    <div class="card-body flex flex-row p-3">
      <div class="p-0 w-24">
        <div class="w-16 h-16 rounded-md overflow-hidden">
          <img
            v-if="group.image"
            :src="group.image"
            alt="Gruppenbild"
            class="w-full h-full object-cover"
          />
          <div v-else class="w-full h-full bg-base-200"></div>
        </div>
      </div>
      <!-- Bezeichnung Konto und Betrag -->
      <div class="flex flex-col md:flex-row w-full mr-1 ml-2">
        <div class="self-start flex-grow md:self-center">
          <h3 class="text-lg opacity-50 font-semibold">
            {{ group.name }}
          </h3>
        </div>
        <div
          class="self-start w-full md:self-center md:w-25 flex items-center md:justify-end"
        >
          <CurrencyDisplay
            class="text-base"
            :amount="groupBalance"
            :show-zero="true"
            :asInteger="true"
          />
          <Icon
            icon="mdi:scale-balance"
            class="text-secondary text-base opacity-50 ml-2"
          />
        </div>
      </div>
    </div>

    <!-- Kontenübersicht -->
    <div class="card-body py-0 px-3">
      <div class="grid grid-cols-1 gap-1">
        <AccountCard
          v-for="account in accountsInGroup"
          :key="account.id"
          :account="account"
          @edit="$emit('editAccount', account)"
          @delete="$emit('deleteAccount', account)"
          @reconcile="$emit('reconcileAccount', account)"
          @showTransactions="$emit('showTransactions', account)"
          @click="$emit('accountCardClicked', account)"
        />
      </div>
    </div>

    <div class="card-actions">
      <div class="grid grid-cols-1 gap-1 py-3"></div>
    </div>
  </div>
</template>
