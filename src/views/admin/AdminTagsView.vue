<!-- src/views/admin/AdminTagsView.vue -->
<script setup lang="ts">
import { ref, computed, nextTick } from "vue";
import { useTagStore } from "../../stores/tagStore";
import { useTransactionStore } from "../../stores/transactionStore";
import type { Tag } from "../../types";
import SearchGroup from "../../components/ui/SearchGroup.vue";
import PagingComponent from "../../components/ui/PagingComponent.vue";

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
const itemsPerPage = ref<number | string>(25);

const filteredTags = computed(() => {
  if (searchQuery.value.trim() === "") {
    return tagStore.tags;
  }
  return tagStore.tags.filter((tag) =>
    tag.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

const totalPages = computed(() => {
  if (itemsPerPage.value === "all") return 1;
  return Math.ceil(filteredTags.value.length / Number(itemsPerPage.value));
});

const paginatedTags = computed(() => {
  if (itemsPerPage.value === "all") return filteredTags.value;
  const start = (currentPage.value - 1) * Number(itemsPerPage.value);
  const end = start + Number(itemsPerPage.value);
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
  selectedTag.value = { id: "", name: "", parentTagId: null, color: "#1a161d" };
  isEditMode.value = false;
  showTagModal.value = true;
};

const editTag = (tag: Tag) => {
  selectedTag.value = { ...tag };
  isEditMode.value = true;
  showTagModal.value = true;
};

const saveTag = () => {
  if (!selectedTag.value) return;

  if (isEditMode.value) {
    tagStore.updateTag(selectedTag.value);
  } else {
    tagStore.addTag({ ...selectedTag.value });
  }

  showTagModal.value = false;
};

const closeModal = () => {
  showTagModal.value = false;
};

const deleteTag = (tag: Tag) => {
  if (confirm(`Möchten Sie das Tag "${tag.name}" wirklich löschen?`)) {
    tagStore.deleteTag(tag.id);
  }
};

const openColorPicker = async (tagId: string) => {
  await nextTick();
  const input = document.querySelector(
    `input[type="color"][data-tag-id="${tagId}"]`
  ) as HTMLInputElement;
  input?.click();
};

const onColorPicked = (e: Event, tagId: string) => {
  const color = (e.target as HTMLInputElement).value;
  const tag = tagStore.getTagById(tagId);
  if (tag) {
    tagStore.updateTag({ ...tag, color });
  }
};
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
        @search="(query) => (searchQuery.value = query)"
        @btn-right-click="createTag"
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
                <th class="text-center hidden md:table-cell">Farbe</th>
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
                  <span
                    v-if="tag.color"
                    class="badge badge-sm text-white"
                    :style="{ backgroundColor: tag.color }"
                  >
                    {{ tag.color }}
                  </span>
                  <span v-else class="relative inline-block">
                    <Icon
                      icon="mdi:brush-variant"
                      class="opacity-50 text-lg cursor-pointer"
                      @click="openColorPicker(tag.id)"
                    />
                    <input
                      type="color"
                      class="sr-only absolute"
                      :data-tag-id="tag.id"
                      @change="(e) => onColorPicked(e, tag.id)"
                    />
                  </span>
                </td>
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
                      class="btn btn-ghost btn-sm text-secondary"
                      @click="editTag(tag)"
                    >
                      <Icon icon="mdi:pencil" class="text-base" />
                    </button>
                    <button
                      class="btn btn-ghost btn-sm text-error"
                      @click="deleteTag(tag)"
                    >
                      <Icon icon="mdi:trash-can" class="text-base" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <PagingComponent
          :currentPage="currentPage"
          :totalPages="totalPages"
          :itemsPerPage="itemsPerPage"
          @update:currentPage="(val) => (currentPage.value = val)"
          @update:itemsPerPage="(val) => (itemsPerPage.value = val)"
        />
      </div>
    </div>
  </div>

  <!-- Modal für Tag bearbeiten/erstellen -->
  <div
    v-if="showTagModal"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
  >
    <div
      class="bg-base-100 p-6 rounded-md w-full max-w-md shadow-lg border border-base-300"
    >
      <h3 class="text-lg font-bold mb-4">
        {{ isEditMode ? "Tag bearbeiten" : "Neues Tag erstellen" }}
      </h3>
      <div class="form-control mb-4">
        <label class="label"><span class="label-text">Name</span></label>
        <input
          v-model="selectedTag.name"
          type="text"
          class="input input-bordered w-full"
        />
      </div>

      <div class="form-control mb-4">
        <label class="label"><span class="label-text">Farbe</span></label>
        <input
          v-model="selectedTag.color"
          type="color"
          class="input input-bordered w-full h-12 p-1"
        />
        <div class="flex flex-wrap mt-2 gap-1">
          <button
            v-for="c in tagStore.colorHistory"
            :key="c"
            class="w-6 h-6 rounded border border-base-300"
            :style="{ backgroundColor: c }"
            @click="selectedTag.color = c"
          />
        </div>
      </div>

      <div class="form-control mb-4">
        <label class="label"
          ><span class="label-text">Übergeordnetes Tag</span></label
        >
        <select
          v-model="selectedTag.parentTagId"
          class="select select-bordered"
        >
          <option :value="null">Keines</option>
          <option v-for="tag in tagStore.tags" :key="tag.id" :value="tag.id">
            {{ tag.name }}
          </option>
        </select>
      </div>

      <div class="flex justify-end space-x-2">
        <button class="btn btn-outline" @click="closeModal">Abbrechen</button>
        <button class="btn btn-primary" @click="saveTag">
          {{ isEditMode ? "Speichern" : "Erstellen" }}
        </button>
      </div>
    </div>
  </div>
</template>
