<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTagStore } from '../../stores/tagStore'
import { Tag } from '../../types'

// Stores
const tagStore = useTagStore()
console.log(tagStore) // <-- ADD THIS LINE

// State für Modals
const showTagModal = ref(false)

// Ausgewähltes Tag
const selectedTag = ref<Tag | null>(null)

// Bearbeitungsmodus
const isEditMode = ref(false)

// Alle Tags
const tags = computed(() => {
  return tagStore.tags
})

// Tag bearbeiten
const editTag = (tag: Tag) => {
  selectedTag.value = tag
  isEditMode.value = true
  showTagModal.value = true
}

// Neues Tag erstellen
const createTag = () => {
  selectedTag.value = null
  isEditMode.value = false
  showTagModal.value = true
}

// Tag speichern
const saveTag = (event: Event) => {
  event.preventDefault()
  const form = event.target as HTMLFormElement
  const name = (form.elements.namedItem('name') as HTMLInputElement).value
  const parentTagId = (form.elements.namedItem('parentTagId') as HTMLSelectElement).value || null

  if (isEditMode.value && selectedTag.value) {
    tagStore.updateTag(selectedTag.value.id, { name, parentTagId })
  } else {
    tagStore.addTag({ name, parentTagId })
  }

  showTagModal.value = false
}

// Tag löschen
const deleteTag = (tag: Tag) => {
  if (confirm(`Möchten Sie das Tag "${tag.name}" wirklich löschen?`)) {
    const result = tagStore.deleteTag(tag.id)
    if (!result) {
      alert('Das Tag kann nicht gelöscht werden, da es Unter-Tags enthält.')
    }
  }
}

// Hole den Namen eines übergeordneten Tags
const getParentTagName = (parentId: string | null): string => {
  if (!parentId) return '-'
  const parent = tags.value.find(t => t.id === parentId)
  return parent ? parent.name : 'Unbekannt'
}
</script>

<template>
  <div>
    <!-- Header mit Aktionen -->
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-xl font-bold">Tags verwalten</h2>

      <button class="btn btn-primary" @click="createTag">
        <span class="iconify mr-2" data-icon="mdi:plus"></span>
        Neues Tag
      </button>
    </div>

    <!-- Tags -->
    <div class="card bg-base-100 shadow-md">
      <div class="card-body">
        <h3 class="card-title text-lg mb-4">Tags</h3>

        <div class="overflow-x-auto">
          <table class="table table-zebra w-full">
            <thead>
              <tr>
                <th>Name</th>
                <th>Übergeordnetes Tag</th>
                <th>Anzahl Unter-Tags</th>
                <th class="text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="tag in tags" :key="tag.id">
                <td>{{ tag.name }}</td>
                <td>{{ getParentTagName(tag.parentTagId) }}</td>
                <td>{{ tagStore.getChildTags(tag.id).length }}</td>
                <td class="text-right">
                  <div class="flex justify-end space-x-1">
                    <button class="btn btn-ghost btn-xs" @click="editTag(tag)">
                      <span class="iconify" data-icon="mdi:pencil"></span>
                    </button>
                    <button class="btn btn-ghost btn-xs text-error" @click="deleteTag(tag)">
                      <span class="iconify" data-icon="mdi:trash-can"></span>
                    </button>
                  </div>
                </td>
              </tr>

              <tr v-if="tags.length === 0">
                <td colspan="4" class="text-center py-4">
                  Keine Tags vorhanden
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Tag-Modal -->
    <div v-if="showTagModal" class="modal modal-open">
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">
          {{ isEditMode ? 'Tag bearbeiten' : 'Neues Tag' }}
        </h3>

        <form @submit="saveTag">
          <div class="space-y-4">
            <div class="form-control">
              <label class="label">
                <span class="label-text">Name</span>
                <span class="text-error">*</span>
              </label>
              <input
                type="text"
                name="name"
                class="input input-bordered"
                required
                :value="selectedTag?.name || ''"
                placeholder="Tag-Name"
              />
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text">Übergeordnetes Tag</span>
              </label>
              <select name="parentTagId" class="select select-bordered w-full">
                <option value="">Kein übergeordnetes Tag</option>
                <option
                  v-for="tag in tags"
                  :key="tag.id"
                  :value="tag.id"
                  :disabled="selectedTag && tag.id === selectedTag.id"
                  :selected="selectedTag?.parentTagId === tag.id"
                >
                  {{ tag.name }}
                </option>
              </select>
            </div>
          </div>

          <div class="modal-action">
            <button type="button" class="btn" @click="showTagModal = false">Abbrechen</button>
            <button type="submit" class="btn btn-primary">Speichern</button>
          </div>
        </form>
      </div>
      <div class="modal-backdrop" @click="showTagModal = false"></div>
    </div>
  </div>
</template>
