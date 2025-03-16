<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCategoryStore } from '../stores/categoryStore'
import { useTransactionStore } from '../stores/transactionStore'
import BudgetCard from '../components/budget/BudgetCard.vue'
import CategoryForm from '../components/budget/CategoryForm.vue'
import CategoryTransferModal from '../components/budget/CategoryTransferModal.vue'
import { Category } from '../types'
import CurrencyDisplay from '../components/ui/CurrencyDisplay.vue'

// Stores
const categoryStore = useCategoryStore()
const transactionStore = useTransactionStore()

// State für Modals
const showCategoryModal = ref(false)
const showTransferModal = ref(false)

// Ausgewählte Kategorie
const selectedCategory = ref<Category | null>(null)

// Bearbeitungsmodus
const isEditMode = ref(false)

// Kategorien nach Gruppen gruppiert
const categoriesByGroup = computed(() => {
  return categoryStore.categoriesByGroup
})

// Kategoriegruppen
const categoryGroups = computed(() => {
  return categoryStore.categoryGroups
})

// Sparziele
const savingsGoals = computed(() => {
  return categoryStore.savingsGoals
})

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

// Kategorieübertragung anzeigen
const showTransfer = (category: Category) => {
  selectedCategory.value = category
  showTransferModal.value = true
}

// Kategorieübertragung durchführen
const transferBetweenCategories = (data: any) => {
  transactionStore.addCategoryTransfer(
    data.fromCategoryId,
    data.toCategoryId,
    data.amount,
    data.date,
    data.note
  )
  
  showTransferModal.value = false
}
</script>

<template>
  <div>
    <!-- Header mit Aktionen -->
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-xl font-bold">Budgets & Kategorien</h2>
      
      <div class="flex gap-2">
        <button class="btn btn-primary" @click="createCategory">
          <span class="iconify mr-2" data-icon="mdi:plus"></span>
          Neue Kategorie
        </button>
      </div>
    </div>
    
    <!-- Sparziele -->
    <div v-if="savingsGoals.length > 0" class="mb-8">
      <h3 class="text-lg font-bold mb-4">Sparziele</h3>
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div v-for="category in savingsGoals" :key="category.id">
          <BudgetCard 
            :category="category" 
            @edit="editCategory(category)" 
            @transfer="showTransfer(category)"
          />
        </div>
      </div>
    </div>
    
    <!-- Kategorien nach Gruppen -->
    <div v-for="group in categoryGroups" :key="group.id" class="mb-8">
      <h3 class="text-lg font-bold mb-4">{{ group.name }}</h3>
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div v-for="category in categoriesByGroup[group.id]" :key="category.id">
          <BudgetCard 
            :category="category" 
            @edit="editCategory(category)" 
            @transfer="showTransfer(category)"
          />
          
          <!-- Unterkategorien -->
          <div v-if="categoryStore.getChildCategories(category.id).length > 0" class="ml-4 mt-2 space-y-2">
            <div v-for="childCategory in categoryStore.getChildCategories(category.id)" :key="childCategory.id" class="card bg-base-200 p-3">
              <div class="flex justify-between items-center">
                <div>
                  <h4 class="font-medium">{{ childCategory.name }}</h4>
                  <p class="text-sm">
                    Saldo:
                    <CurrencyDisplay :amount="childCategory.balance" :show-zero="true" :asInteger="false" />
                  </p>
                </div>
                <div class="dropdown dropdown-end">
                  <label tabindex="0" class="btn btn-ghost btn-xs btn-circle">
                    <span class="iconify" data-icon="mdi:dots-vertical"></span>
                  </label>
                  <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
                    <li><a @click="editCategory(childCategory)">Bearbeiten</a></li>
                    <li><a @click="showTransfer(childCategory)">Übertragen</a></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
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
    
    <!-- Kategorieübertragung-Modal -->
    <CategoryTransferModal 
      :category="selectedCategory" 
      :is-open="showTransferModal"
      @close="showTransferModal = false"
      @transfer="transferBetweenCategories"
    />
  </div>
</template>
