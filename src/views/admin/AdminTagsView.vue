<script setup lang="ts">
import { ref, computed } from "vue";
import { useTagStore } from "../../stores/tagStore";
import { useTransactionStore } from "../../stores/transactionStore";
import type { Tag } from "../../types";
import SearchGroup from "../../components/ui/SearchGroup.vue";

/**
 * Pfad zur Komponente: src/views/admin/AdminTagsView.vue
 * Verwaltung der Tags.
 *
 * Komponenten-Props:
 * - Keine Props vorhanden
 *
 * Emits:
 * - Keine Emits vorhanden
 */

const tagStore = useTagStore();
const transactionStore = useTransactionStore();

const showTagModal = ref(false);
const isEditMode = ref(false);
const selectedTag = ref<Tag | null>(null);
const searchQuery = ref("");

const currentPage = ref(1);
const itemsPerPage = 25;

const filteredTags = computed(() => {
  if (searchQuery.value.trim() === "") {
    return tagStore.tags;
  }
  return tagStore.tags.filter((tag) =>
    tag.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

const totalPages = computed(() =>
  Math.ceil(filteredTags.value.length / itemsPerPage)
);

const paginatedTags = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return filteredTags.value.slice(start, end);
});

const tagUsage = computed(() => {
  return (tagId: string) =>
    transactionStore.transactions.filter((tx) => tx.tagIds.includes(tagId))
      .length;
});

const getParentTagName = (parentId: string | null): string => {
  if (!parentId) return "-";
  const parent = tagStore.tags.find((t) => t.id === parentId);
  return parent ? parent.name : "Unbekannt";
};

const createTag = () => {
  selectedTag.value = null;
  isEditMode.value = false;
  showTagModal.value = true;
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
      <h2 class="text-xl font-bold flex-shrink-0">Tags verwalten</h2>
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
              <tr v-for="tag in paginatedTags" :key="tag.id">
                <td>{{ tag.name }}</td>
                <td class="text-center hidden md:table-cell">
                  {{ getParentTagName(tag.parentTagId) }}
                </td>
                <td class="text-center hidden md:table-cell">
                  {{ tagStore.getChildTags(tag.id).length }}
                </td>
                <td class="text-center hidden md:table-cell">
                  {{ tagUsage(tag.id) }}
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
