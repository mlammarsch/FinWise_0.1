import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { Category } from '../types'

export const useCategoryStore = defineStore('category', () => {
  // State
  const categories = ref<Category[]>([])

  const initialState = {
    categories: []
  }

  // Getters
  const getCategoryById = computed(() => {
    return (id: string) => categories.value.find(category => category.id === id)
  })

  const getCategoriesByParentId = computed(() => {
    return (parentId: string | null) => categories.value
      .filter(category => category.parentCategoryId === parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  })

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

  // Actions
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

  // Persistenz
  function loadCategories() {
    const savedCategories = localStorage.getItem('finwise_categories')
    if (savedCategories) {
      categories.value = JSON.parse(savedCategories)
    }
  }

  function saveCategories() {
    localStorage.setItem('finwise_categories', JSON.stringify(categories.value))
  }

  function reset() {
    categories.value = initialState.categories
    loadCategories()
  }

  // Initialisiere beim ersten Laden
  loadCategories()

  return {
    categories,
    getCategoryById,
    getCategoriesByParentId,
    rootCategories,
    savingsGoals,
    addCategory,
    updateCategory,
    deleteCategory,
    updateCategoryBalance,
    loadCategories,
    reset
  }
})
