<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCategoryStore } from '../../stores/categoryStore'
import CategoryForm from '../../components/budget/CategoryForm.vue'
import { Category } from '../../types'

// Stores
const categoryStore = useCategoryStore()

// State für Modals
const showCategoryModal = ref(false)

// Ausgewählte Kategorie
const selectedCategory = ref<Category | null>(null)

// Bearbeitungsmodus
const isEditMode = ref(false)

// Alle Kategorien
const categories = computed(() => categoryStore.categories)

// Kategoriegruppen
const categoryGroups = computed(() => categoryStore.categoryGroups)

// Kategorie bearbeiten
const editCategory = (category: Category) => {
  selectedCategory.value = category
  isEditMode.value = true
  showCategoryModal.value = true
}

// Neue Kategorie erstellen
const createCategory = () => {
  selectedCategory.value = null
  isEditMode.value = false
  showCategoryModal.value = true
}

// Kategorie speichern
const saveCategory = (categoryData: Omit<Category, 'id'>) => {
  if (isEditMode.value && selectedCategory.value) {
    categoryStore.updateCategory(selectedCategory.value.id, categoryData)
  } else {
    categoryStore.addCategory(categoryData)
  }
  showCategoryModal.value = false
}

// Kategorie löschen
const deleteCategory = (category: Category) => {
  if (confirm(`Möchten Sie die Kategorie "${category.name}" wirklich löschen?`)) {
    const result = categoryStore.deleteCategory(category.id)
    if (!result) {
      alert('Die Kategorie kann nicht gelöscht werden, da sie Unterkategorien enthält.')
    }
  }
}

// Kategoriegruppe erstellen
const createCategoryGroup = () => {
  const name = prompt('Name der neuen Kategoriegruppe:')
  if (name) {
    categoryStore.addCategoryGroup({
      name,
      sortOrder: categoryGroups.value.length
    })
  }
}

// Kategoriegruppe löschen
const deleteCategoryGroup = (groupId: string) => {
  const group = categoryGroups.value.find(g => g.id === groupId)
  if (!group) return
  if (confirm(`Möchten Sie die Kategoriegruppe "${group.name}" wirklich löschen?`)) {
    const result = categoryStore.deleteCategoryGroup(groupId)
    if (!result) {
      alert('Die Kategoriegruppe kann nicht gelöscht werden, da sie noch Kategorien enthält.')
    }
  }
}

// Hole den Namen einer Kategoriegruppe
const getGroupName = (groupId: string): string => {
  const group = categoryGroups.value.find(g => g.id === groupId)
  return group ? group.name : 'Unbekannt'
}

// Hole den Namen einer übergeordneten Kategorie
const getParentCategoryName = (parentId: string | null): string => {
  if (!parentId) return '-'
  const parent = categories.value.find(c => c.id === parentId)
  return parent ? parent.name : 'Unbekannt'
}
</script>

<template>
  <div>
    <!-- Header mit Aktionen -->
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-xl font-bold">Kategorien verwalten</h2>
      <div class="flex gap-2">
        <button class="btn btn-primary" @click="createCategory">
          <span class="iconify mr-2" data-icon="mdi:plus"></span>
          Neue Kategorie
        </button>
        <button class="btn btn-outline" @click="createCategoryGroup">
          <span class="iconify mr-2" data-icon="mdi:folder-plus"></span>
          Neue Gruppe
        </button>
      </div>
    </div>

    <!-- Kategorien -->
    <div class="card bg-base-100 shadow-md mb-6">
      <div class="card-body">
        <h3 class="card-title text-lg mb-4">Kategorien</h3>
        <div class="overflow-x-auto">
          <table class="table table-zebra w-full">
            <thead>
              <tr>
                <th>Name</th>
                <th>Gruppe</th>
                <th>Übergeordnete Kategorie</th>
                <th>Saldo</th>
                <th>Status</th>
                <th class="text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="category in categories" :key="category.id">
                <td>
                  {{ category.name }}
                  <span v-if="category.isSavingsGoal" class="badge badge-sm badge-accent ml-1">Sparziel</span>
                </td>
                <td>{{ getGroupName(category.categoryGroupId) }}</td>
                <td>{{ getParentCategoryName(category.parentCategoryId) }}</td>
                <td :class="category.balance >= 0 ? 'text-success' : 'text-error'">
                  {{ new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(category.balance) }}
                </td>
                <td>
                  <div class="badge" :class="category.isActive ? 'badge-success' : 'badge-error'">
                    {{ category.isActive ? 'Aktiv' : 'Inaktiv' }}
                  </div>
                </td>
                <td class="text-right">
                  <div class="flex justify-end space-x-1">
                    <button class="btn btn-ghost btn-xs" @click="editCategory(category)">
                      <span class="iconify" data-icon="mdi:pencil"></span>
                    </button>
                    <button class="btn btn-ghost btn-xs text-error" @click="deleteCategory(category)">
                      <span class="iconify" data-icon="mdi:trash-can"></span>
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="categories.length === 0">
                <td colspan="6" class="text-center py-4">
                  Keine Kategorien vorhanden
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Kategoriegruppen -->
    <div class="card bg-base-100 shadow-md">
      <div class="card-body">
        <h3 class="card-title text-lg mb-4">Kategoriegruppen</h3>
        <div class="overflow-x-auto">
          <table class="table table-zebra w-full">
            <thead>
              <tr>
                <th>Name</th>
                <th>Sortierung</th>
                <th>Anzahl Kategorien</th>
                <th class="text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="group in categoryGroups" :key="group.id">
                <td>{{ group.name }}</td>
                <td>{{ group.sortOrder }}</td>
                <td>{{ categories.filter(c => c.categoryGroupId === group.id).length }}</td>
                <td class="text-right">
                  <button class="btn btn-ghost btn-xs text-error" @click="deleteCategoryGroup(group.id)">
                    <span class="iconify" data-icon="mdi:trash-can"></span>
                  </button>
                </td>
              </tr>
              <tr v-if="categoryGroups.length === 0">
                <td colspan="4" class="text-center py-4">
                  Keine Kategoriegruppen vorhanden
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Kategorie-Modal -->
    <div v-if="showCategoryModal" class="modal modal-open">
      <div class="modal-box max-w-2xl">
        <h3 class="font-bold text-lg mb-4">
          {{ isEditMode ? 'Kategorie bearbeiten' : 'Neue Kategorie' }}
        </h3>
        <CategoryForm 
          :category="selectedCategory || undefined" 
          :is-edit="isEditMode"
          @save="saveCategory" 
          @cancel="showCategoryModal = false"
        />
      </div>
      <div class="modal-backdrop" @click="showCategoryModal = false"></div>
    </div>
  </div>
</template>
