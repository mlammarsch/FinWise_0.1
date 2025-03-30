// Datei: src/stores/categoryStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { Category } from '../types'
import { debugLog } from '@/utils/logger'

type CategoryGroup = {
  id: string
  name: string
  sortOrder: number
  isIncomeGroup: boolean
}

export const useCategoryStore = defineStore('category', () => {
  const categories = ref<Category[]>([])
  const categoryGroups = ref<CategoryGroup[]>([])

  const initialState = {
    categories: [],
    categoryGroups: []
  }

  const getCategoryById = computed(() => {
    return (id: string) => categories.value.find(category => category.id === id)
  })

  function findCategoryById(id: string) {
    return categories.value.find(category => category.id === id)
  }

  const getCategoriesByParentId = computed(() => {
    return (parentId: string | null) => categories.value
      .filter(category => category.parentCategoryId === parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  })

  const getChildCategories = (parentId: string) => {
    return categories.value
      .filter(category => category.parentCategoryId === parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }

  const rootCategories = computed(() => {
    return categories.value
      .filter(category => category.parentCategoryId === null)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  })

  const savingsGoals = computed(() => {
    return categories.value
      .filter(category => category.isSavingsGoal)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  })

  const categoriesByGroup = computed(() => {
    const grouped: Record<string, Category[]> = {}
    for (const group of categoryGroups.value) {
      grouped[group.id] = categories.value
        .filter(cat => cat.categoryGroupId === group.id && !cat.parentCategoryId)
        .sort((a, b) => a.sortOrder - b.sortOrder)
    }
    return grouped
  })

  function addCategory(category: Omit<Category, 'id' | 'balance' | 'startBalance' | 'transactionCount' | 'averageTransactionValue'>) {
    const newCategory: Category = {
      ...category,
      id: uuidv4(),
      balance: 0,
      startBalance: 0,
      transactionCount: 0,
      averageTransactionValue: 0
    }
    categories.value.push(newCategory)
    debugLog("[categoryStore] addCategory:", newCategory)
    saveCategories()
    return newCategory
  }

  function updateCategory(id: string, updates: Partial<Category>) {
    const index = categories.value.findIndex(category => category.id === id)
    if (index !== -1) {
      categories.value[index] = { ...categories.value[index], ...updates }
      debugLog("[categoryStore] updateCategory - Updated:", categories.value[index])
      saveCategories()
      return true
    }
    return false
  }

  function deleteCategory(id: string) {
    categories.value = categories.value.filter(category => category.id !== id)
    debugLog("[categoryStore] deleteCategory - Deleted category id:", id)
    saveCategories()
  }

  function updateCategoryBalance(id: string, amount: number) {
    const category = categories.value.find(category => category.id === id)
    if (category) {
      category.balance += amount
      category.transactionCount = (category.transactionCount || 0) + 1
      category.averageTransactionValue = category.balance / category.transactionCount || 0
      debugLog("[categoryStore] updateCategoryBalance", {
        id: category.id,
        balance: category.balance,
        transactionCount: category.transactionCount,
        averageTransactionValue: category.averageTransactionValue
      })
      saveCategories()
      return true
    }
    return false
  }

  function addCategoryGroup(group: Omit<CategoryGroup, 'id'>): CategoryGroup {
    const newGroup: CategoryGroup = {
      id: uuidv4(),
      ...group
    }
    categoryGroups.value.push(newGroup)
    debugLog("[categoryStore] addCategoryGroup:", newGroup)
    saveCategoryGroups()
    return categoryGroups.value.find(g => g.id === newGroup.id)!
  }

  function deleteCategoryGroup(id: string) {
    const hasCategories = categories.value.some(cat => cat.categoryGroupId === id)
    debugLog("[categoryStore] deleteCategoryGroup", { id, result: hasCategories ? "Failed" : "Success" })
    if (hasCategories) return false
    categoryGroups.value = categoryGroups.value.filter(group => group.id !== id)
    saveCategoryGroups()
    return true
  }

  function loadCategories() {
    const savedCategories = localStorage.getItem('finwise_categories')
    if (savedCategories) {
      categories.value = JSON.parse(savedCategories)
    }

    const savedGroups = localStorage.getItem('finwise_categoryGroups')
    if (savedGroups) {
      categoryGroups.value = JSON.parse(savedGroups)
    }
    debugLog("[categoryStore] loadCategories - Loaded categories:", categories.value)

    // Sicherstellen, dass zentrale Kategorie "Verfügbare Mittel" existiert
    if (!categories.value.find(c => c.name === "Verfügbare Mittel")) {
      addCategory({
        name: "Verfügbare Mittel",
        parentCategoryId: null,
        sortOrder: 9999,
        isActive: true,
        isIncomeCategory: true,
        isSavingsGoal: false,
        categoryGroupId: null
      });
      debugLog("[categoryStore] loadCategories - 'Verfügbare Mittel' Kategorie angelegt.");
    }
  }

  function saveCategories() {
    localStorage.setItem('finwise_categories', JSON.stringify(categories.value))
    debugLog("[categoryStore] saveCategories - Saved categories.")
  }

  function saveCategoryGroups() {
    localStorage.setItem('finwise_categoryGroups', JSON.stringify(categoryGroups.value))
    debugLog("[categoryStore] saveCategoryGroups - Saved category groups.")
  }

  function reset() {
    categories.value = initialState.categories
    categoryGroups.value = initialState.categoryGroups
    debugLog("[categoryStore] reset - Reset to initial state.")
    loadCategories()
  }

  function setMonthlySnapshot() {
    categories.value.forEach(category => {
      category.startBalance = category.balance
      debugLog("[categoryStore] setMonthlySnapshot - Category:", {
        id: category.id,
        newStartBalance: category.startBalance
      })
    })
    saveCategories()
  }

  loadCategories()

  return {
    categories,
    categoryGroups,
    getCategoryById,
    findCategoryById,
    getCategoriesByParentId,
    getChildCategories,
    rootCategories,
    savingsGoals,
    categoriesByGroup,
    addCategory,
    updateCategory,
    deleteCategory,
    updateCategoryBalance,
    addCategoryGroup,
    deleteCategoryGroup,
    loadCategories,
    reset,
    setMonthlySnapshot
  }
})
