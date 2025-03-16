<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Category } from '../../types'
import { useCategoryStore } from '../../stores/categoryStore'

const props = defineProps<{
  category?: Category
  isEdit?: boolean
}>()

const emit = defineEmits(['save', 'cancel'])

const categoryStore = useCategoryStore()

// Formularfelder
const name = ref('')
const description = ref('')
const isActive = ref(true)
const isSavingsGoal = ref(false)
const targetAmount = ref(0)
const targetDate = ref('')
const categoryGroupId = ref('')
const parentCategoryId = ref<string | null>(null)
const balance = ref(0)

// Lade die Daten, wenn eine Kategorie zum Bearbeiten übergeben wurde
onMounted(() => {
  if (props.category) {
    name.value = props.category.name
    description.value = props.category.description
    isActive.value = props.category.isActive
    isSavingsGoal.value = props.category.isSavingsGoal
    targetAmount.value = props.category.targetAmount
    targetDate.value = props.category.targetDate || ''
    categoryGroupId.value = props.category.categoryGroupId
    parentCategoryId.value = props.category.parentCategoryId
    balance.value = props.category.balance
  } else {
    // Setze Standardwerte für eine neue Kategorie
    if (categoryStore.categoryGroups.length > 0) {
      categoryGroupId.value = categoryStore.categoryGroups[0].id
    }
  }
})

// Konvertiere einen String in eine Zahl
const parseNumber = (value: string): number => {
  // Ersetze Komma durch Punkt für die Konvertierung
  const normalized = value.replace(/\./g, '').replace(',', '.')
  return parseFloat(normalized) || 0
}

// Formatiere eine Zahl für die Anzeige
const formatNumber = (value: number): string => {
  return value.toString().replace('.', ',')
}

// Speichere die Kategorie
const saveCategory = () => {
  const categoryData: Omit<Category, 'id'> = {
    name: name.value,
    description: description.value,
    isActive: isActive.value,
    isSavingsGoal: isSavingsGoal.value,
    targetAmount: targetAmount.value,
    targetDate: targetDate.value || null,
    categoryGroupId: categoryGroupId.value,
    parentCategoryId: parentCategoryId.value,
    balance: balance.value
  }
  
  emit('save', categoryData)
}

// Kategoriegruppen für das Dropdown
const categoryGroups = computed(() => {
  return categoryStore.categoryGroups
})

// Übergeordnete Kategorien für das Dropdown
const parentCategories = computed(() => {
  // Filtere die aktuelle Kategorie aus, um Zirkelbezüge zu vermeiden
  return categoryStore.categories
    .filter(cat => !props.category || cat.id !== props.category.id)
    .map(cat => ({
      id: cat.id,
      name: cat.name
    }))
})
</script>

<template>
  <form @submit.prevent="saveCategory" class="space-y-4">
    <div class="form-control">
      <label class="label">
        <span class="label-text">Name</span>
        <span class="text-error">*</span>
      </label>
      <input 
        type="text" 
        v-model="name" 
        class="input input-bordered" 
        required
        placeholder="Kategoriename"
      />
    </div>
    
    <div class="form-control">
      <label class="label">
        <span class="label-text">Beschreibung</span>
      </label>
      <input 
        type="text" 
        v-model="description" 
        class="input input-bordered" 
        placeholder="Kurze Beschreibung"
      />
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="form-control">
        <label class="label">
          <span class="label-text">Kategoriegruppe</span>
          <span class="text-error">*</span>
        </label>
        <select v-model="categoryGroupId" class="select select-bordered w-full" required>
          <option v-for="group in categoryGroups" :key="group.id" :value="group.id">
            {{ group.name }}
          </option>
        </select>
      </div>
      
      <div class="form-control">
        <label class="label">
          <span class="label-text">Übergeordnete Kategorie</span>
        </label>
        <select v-model="parentCategoryId" class="select select-bordered w-full">
          <option :value="null">Keine (Hauptkategorie)</option>
          <option v-for="category in parentCategories" :key="category.id" :value="category.id">
            {{ category.name }}
          </option>
        </select>
      </div>
    </div>
    
    <div class="form-control">
      <label class="label cursor-pointer">
        <span class="label-text">Als Sparziel verwenden</span>
        <input type="checkbox" v-model="isSavingsGoal" class="toggle toggle-primary" />
      </label>
    </div>
    
    <div v-if="isSavingsGoal" class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="form-control">
        <label class="label">
          <span class="label-text">Zielbetrag</span>
          <span class="text-error">*</span>
        </label>
        <div class="input-group">
          <input 
            type="text" 
            :value="formatNumber(targetAmount)" 
            @input="targetAmount = parseNumber(($event.target as HTMLInputElement).value)" 
            class="input input-bordered w-full" 
            :required="isSavingsGoal"
            placeholder="0,00"
          />
          <span>€</span>
        </div>
      </div>
      
      <div class="form-control">
        <label class="label">
          <span class="label-text">Zieldatum</span>
        </label>
        <input 
          type="date" 
          v-model="targetDate" 
          class="input input-bordered" 
          placeholder="Zieldatum"
        />
      </div>
    </div>
    
    <div v-if="isEdit" class="form-control">
      <label class="label">
        <span class="label-text">Aktueller Saldo</span>
      </label>
      <div class="input-group">
        <input 
          type="text" 
          :value="formatNumber(balance)" 
          @input="balance = parseNumber(($event.target as HTMLInputElement).value)" 
          class="input input-bordered w-full" 
          placeholder="0,00"
          :disabled="!isEdit"
        />
        <span>€</span>
      </div>
    </div>
    
    <div class="form-control">
      <label class="label cursor-pointer">
        <span class="label-text">Aktiv</span>
        <input type="checkbox" v-model="isActive" class="toggle toggle-primary" />
      </label>
    </div>
    
    <div class="flex justify-end space-x-2 pt-4">
      <button type="button" class="btn" @click="$emit('cancel')">Abbrechen</button>
      <button type="submit" class="btn btn-primary">Speichern</button>
    </div>
  </form>
</template>
