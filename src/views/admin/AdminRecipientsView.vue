<!-- src/views/admin/AdminRecipientsView.vue -->
<script setup lang="ts">
import { ref, computed } from "vue";
import { useRecipientStore } from "../../stores/recipientStore";
import { useTransactionStore } from "../../stores/transactionStore";
import type { Recipient } from "../../stores/recipientStore";
import SearchGroup from "../../components/ui/SearchGroup.vue";
import PagingComponent from "../../components/ui/PagingComponent.vue";

/**
 * Pfad zur Komponente: src/views/admin/AdminRecipientsView.vue
 * Verwaltung der Empfänger/Auftraggeber.
 *
 * Komponenten-Props:
 * - Keine Props vorhanden
 *
 * Emits:
 * - Keine Emits vorhanden
 */

const recipientStore = useRecipientStore();
const transactionStore = useTransactionStore();

const showRecipientModal = ref(false);
const isEditMode = ref(false);
const selectedRecipient = ref<Recipient | null>(null);
const searchQuery = ref("");

const currentPage = ref(1);
const itemsPerPage = ref<number | string>(25);

const filteredRecipients = computed(() => {
  if (searchQuery.value.trim() === "") {
    return recipientStore.recipients;
  }
  return recipientStore.recipients.filter((r) =>
    r.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

const totalPages = computed(() => {
  if (itemsPerPage.value === "all") return 1;
  return Math.ceil(
    filteredRecipients.value.length / Number(itemsPerPage.value)
  );
});

const paginatedRecipients = computed(() => {
  if (itemsPerPage.value === "all") return filteredRecipients.value;
  const start = (currentPage.value - 1) * Number(itemsPerPage.value);
  const end = start + Number(itemsPerPage.value);
  return filteredRecipients.value.slice(start, end);
});

const recipientUsage = computed(() => {
  return (recipientId: string) =>
    transactionStore.transactions.filter((tx) => tx.recipientId === recipientId)
      .length;
});

const createRecipient = () => {
  selectedRecipient.value = null;
  isEditMode.value = false;
  showRecipientModal.value = true;
};
</script>

<template>
  <div class="max-w-4xl mx-auto flex flex-col min-h-screen py-8">
    <!-- Header -->
    <div
      class="flex w-full justify-between items-center mb-6 flex-wrap md:flex-nowrap"
    >
      <h2 class="text-xl font-bold flex-shrink-0">
        Empfänger/Auftraggeber verwalten
      </h2>
      <SearchGroup
        btnRight="Neu"
        btnRightIcon="mdi:plus"
        @search="(query) => (searchQuery = query)"
        @btn-right-click="createRecipient"
      />
    </div>

    <!-- Card -->
    <div class="card bg-base-100 shadow-md border border-base-300 w-full mt-6">
      <div class="card-body">
        <div class="overflow-x-auto">
          <table class="table table-zebra w-full">
            <thead>
              <tr>
                <th>Name</th>
                <th class="text-center hidden md:table-cell">
                  Übergeordnetes Tag
                </th>
                <th class="text-center hidden md:table-cell">
                  Anzahl Unter-Tags
                </th>
                <th class="text-center hidden md:table-cell">
                  Verwendet in Buchungen
                </th>
                <th class="text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="recipient in paginatedRecipients"
                :key="recipient.id"
              >
                <td>{{ recipient.name }}</td>
                <td class="text-center hidden md:table-cell">-</td>
                <td class="text-center hidden md:table-cell">0</td>
                <td class="text-center hidden md:table-cell">
                  {{ recipientUsage(recipient.id) }}
                </td>
                <td class="text-right">
                  <div class="flex justify-end space-x-1">
                    <button
                      class="btn btn-ghost btn-sm text-secondary flex items-center justify-center"
                    >
                      <Icon
                        icon="mdi:pencil"
                        class="text-base"
                      />
                    </button>
                    <button
                      class="btn btn-ghost btn-sm text-error flex items-center justify-center"
                    >
                      <Icon
                        icon="mdi:trash-can"
                        class="text-base"
                      />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Paginierungskomponente -->
        <PagingComponent
          :currentPage="currentPage"
          :totalPages="totalPages"
          :itemsPerPage="itemsPerPage"
          @update:currentPage="(val) => (currentPage = val)"
          @update:itemsPerPage="(val) => (itemsPerPage = val)"
        />
      </div>
    </div>
  </div>
</template>
