// Datei: store/categoryStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { Category } from '../types'

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

  function addCategory(category: Omit<Category, 'id' | 'balance' | 'transactionCount' | 'averageTransactionValue'>) {
    const newCategory: Category = {
      ...category,
      id: uuidv4(),
      balance: 0,
      transactionCount: 0,
      averageTransactionValue: 0
    }
    categories.value.push(newCategory)
    saveCategories()
    return newCategory
  }

  function updateCategory(id: string, updates: Partial<Category>) {
    const index = categories.value.findIndex(category => category.id === id)
    if (index !== -1) {
      categories.value[index] = { ...categories.value[index], ...updates }
      saveCategories()
      return true
    }
    return false
  }

  function deleteCategory(id: string) {
    categories.value = categories.value.filter(category => category.id !== id)
    saveCategories()
  }

  function updateCategoryBalance(id: string, amount: number) {
    const category = categories.value.find(category => category.id === id)
    if (category) {
      category.balance += amount
      category.transactionCount = (category.transactionCount || 0) + 1
      category.averageTransactionValue = category.balance / category.transactionCount || 0
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
    saveCategoryGroups()
    // Direkter Return aus aktualisiertem State
    return categoryGroups.value.find(g => g.id === newGroup.id)!
  }

  function deleteCategoryGroup(id: string) {
    const hasCategories = categories.value.some(cat => cat.categoryGroupId === id)
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
  }

  function saveCategories() {
    localStorage.setItem('finwise_categories', JSON.stringify(categories.value))
  }

  function saveCategoryGroups() {
    localStorage.setItem('finwise_categoryGroups', JSON.stringify(categoryGroups.value))
  }

  function reset() {
    categories.value = initialState.categories
    categoryGroups.value = initialState.categoryGroups
    loadCategories()
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
    reset
  }
})
