<script setup lang="ts">
import { ref, computed } from "vue";
import { useRecipientStore } from "../../stores/recipientStore";
import { useTransactionStore } from "../../stores/transactionStore";
import type { Recipient } from "../../stores/recipientStore";

/**
 * Pfad zur Komponente: src/views/admin/AdminRecipientsView.vue
 * Verwaltung der Empfänger/Auftraggeber.
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
const itemsPerPage = 25;

const filteredRecipients = computed(() => {
  if (searchQuery.value.trim() === "") {
    return recipientStore.recipients;
  }
  return recipientStore.searchRecipients(searchQuery.value);
});

const totalPages = computed(() =>
  Math.ceil(filteredRecipients.value.length / itemsPerPage)
);

const paginatedRecipients = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
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

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
  }
};

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
  }
};

// Dynamische Seitenzahlen generieren
const getPageNumbers = computed(() => {
  const pages = [];
  if (totalPages.value <= 5) {
    for (let i = 1; i <= totalPages.value; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage.value > 3) pages.push("...");
    let start = Math.max(2, currentPage.value - 1);
    let end = Math.min(totalPages.value - 1, currentPage.value + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage.value < totalPages.value - 2) pages.push("...");
    pages.push(totalPages.value);
  }
  return pages;
});
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
      <div class="flex justify-end w-full md:w-auto mt-2 md:mt-0">
        <div class="join flex items-center">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Suche Auftraggeber"
            class="input join-item rounded-l-full input-sm input-bordered text-center"
          />
          <button
            class="btn join-item btn-sm btn-soft border border-base-300 flex items-center justify-center"
          >
            <Icon icon="mdi:magnify" class="mr-2" />
          </button>
          <button
            class="btn join-item rounded-r-full btn-sm btn-soft border border-base-300 flex items-center justify-center"
            @click="createRecipient"
          >
            <Icon icon="mdi:plus" class="mr-2" /> Neu
          </button>
        </div>
      </div>
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
              <tr v-for="recipient in paginatedRecipients" :key="recipient.id">
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
                      <Icon icon="mdi:pencil" class="text-base" />
                    </button>
                    <button
                      class="btn btn-ghost btn-sm text-error flex items-center justify-center"
                    >
                      <Icon icon="mdi:trash-can" class="text-base" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Paginierung -->
        <div class="flex justify-between items-center mt-4">
          <div class="join">
            <button
              class="join-item btn btn-sm rounded-l-full border border-base-300 flex items-center justify-center"
              :disabled="currentPage === 1"
              @click="prevPage"
            >
              <Icon icon="mdi:chevron-left" class="text-base" />
            </button>
            <button
              v-for="page in getPageNumbers"
              :key="page"
              class="join-item btn btn-sm border border-base-300 shadow-none"
              :class="{
                'btn-disabled': page === '...',
                'btn-primary': page === currentPage,
              }"
              @click="page !== '...' && (currentPage = page)"
            >
              {{ page }}
            </button>
            <button
              class="join-item btn btn-sm rounded-r-full border border-base-300 flex items-center justify-center"
              :disabled="currentPage === totalPages"
              @click="nextPage"
            >
              <Icon icon="mdi:chevron-right" class="text-base" />
            </button>
          </div>
          <span class="text-sm ml-4"
            >Seite {{ currentPage }} von {{ totalPages }}</span
          >
        </div>
      </div>
    </div>
  </div>
</template>
