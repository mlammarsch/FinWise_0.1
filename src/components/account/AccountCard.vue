<script setup lang="ts">
import { defineProps, computed } from "vue";
import { Account } from "../../types";
import CurrencyDisplay from "../ui/CurrencyDisplay.vue";
import { useRouter } from 'vue-router';
// import { Icon } from "@iconify/vue";

/**
 * Pfad zur Komponente: src\components\account\AccountCard.vue
 *
 * Diese Komponente stellt eine einzelne Konto-Karte dar.
 *
 * Komponenten-Props:
 * - account: Account - Das Konto, das angezeigt wird.
 *
 * Emits:
 * - edit: Wird ausgelöst, wenn das Konto bearbeitet werden soll.
 * - delete: Wird ausgelöst, wenn das Konto gelöscht werden soll.
 * - reconcile: Wird ausgelöst, wenn ein Kontoabgleich erfolgen soll.
 * - showTransactions: Wird ausgelöst, um die Transaktionen des Kontos anzuzeigen.
 */

const props = defineProps<{
  account: Account;
}>();

const emit = defineEmits(["edit", "delete", "reconcile", "showTransactions", "editAccount"]);
const router = useRouter();

const formattedIban = computed(() => {
  if (!props.account.iban) return "";
  const iban = props.account.iban.replace(/\s/g, "");
  return iban.match(/.{1,4}/g)?.join(" ") || iban;
});

const accountImage = computed(() => {
  return props.account.image || "https://placehold.co/400x400?text=Logo";
});
</script>

<template>
  <div
    class="card rounded-md border-base-200 bg-base-200 shadow-none relative z-10"
    style="width: 100%"
  >
    <!-- Dropdown-Menü für Aktionen -->
    <div class="absolute top-1 right-1 dropdown dropdown-end">
      <label tabindex="0" class="btn btn-ghost btn-sm btn-circle">
        <Icon icon="mdi:dots-vertical" />
      </label>
      <ul
        tabindex="0"
        class="dropdown-content z-[100] menu p-2 shadow bg-base-100 border border-base-300 rounded-box w-52"
      >
        <li>
          <a @click="$emit('showTransactions', account)"
            >Transaktionen anzeigen</a
          >
        </li>
        <li><a @click="$emit('reconcile', account)">Kontoabgleich</a></li>
        <li>
          <a @click="$emit('editAccount', account)">Bearbeiten</a>
        </li>
        <li>
          <a @click="$emit('delete', account)" class="text-error">Löschen</a>
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
  </div>
</template>
