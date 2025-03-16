import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { Category, CategoryGroup } from '../types'
import { v4 as uuidv4 } from 'uuid'

export const useCategoryStore = defineStore('category', () => {
  const categories = ref<Category[]>([
    {
      id: uuidv4(),
      name: 'Lebensmittel',
      categoryGroupId: '1',
      icon: 'mdi-food-apple',
      budget: 300,
      isIncome: false
    },
    {
      id: uuidv4(),
      name: 'Gehalt',
      categoryGroupId: '2',
      icon: 'mdi-cash',
      isIncome: true
    }
  ])

  const categoryGroups = ref<CategoryGroup[]>([
    {
      id: '1',
      name: 'Fixkosten'
    },
    {
      id: '2',
      name: 'Einkommen'
    },
    {
      id: '3',
      name: 'Sparen'
    }
  ])

  const savingsGoals = ref([
    {
      id: uuidv4(),
      name: 'Notgroschen',
      targetAmount: 5000,
      balance: 1000,
      targetDate: '2024-12-31'
    }
  ])

  const getCategoryById = (id: string) => {
    return categories.value.find(category => category.id === id)
  }

  const addCategory = (category: Category) => {
    categories.value.push(category)
  }

  const updateCategory = (category: Category) => {
    const index = categories.value.findIndex(c => c.id === category.id)
    if (index !== -1) {
      categories.value[index] = category
    }
  }

  const deleteCategory = (id: string) => {
    categories.value = categories.value.filter(category => category.id !== id)
  }

  const addCategoryGroup = (categoryGroup: CategoryGroup) => {
    categoryGroups.value.push(categoryGroup)
  }

  const updateCategoryGroup = (categoryGroup: CategoryGroup) => {
    const index = categoryGroups.value.findIndex(cg => cg.id === categoryGroup.id)
    if (index !== -1) {
      categoryGroups.value[index] = categoryGroup
    }
  }

  const deleteCategoryGroup = (id: string) => {
    categoryGroups.value = categoryGroups.value.filter(categoryGroup => categoryGroup.id !== id)
  }

  const updateCategoryBalance = (categoryId: string, amount: number) => {
    const category = categories.value.find(c => c.id === categoryId)
    if (category) {
      // Initialize balance if not available
      if (typeof (category as any).balance !== 'number') {
        ;(category as any).balance = 0
      }
      ;(category as any).balance += amount
    }
  }

  // Computed property to group categories by categoryGroupId
  const categoriesByGroup = computed(() => {
    const groupedCategories: { [key: string]: Category[] } = {}
    categories.value.forEach(category => {
      if (!groupedCategories[category.categoryGroupId]) {
        groupedCategories[category.categoryGroupId] = []
      }
      groupedCategories[category.categoryGroupId].push(category)
    })
    return groupedCategories
  })

  // Method to get child categories
  function getChildCategories(parentId: string) {
    return categories.value.filter(category => category.parentCategoryId === parentId)
  }


  return {
    categories,
    categoryGroups,
    savingsGoals,
    getCategoryById,
    addCategory,
    updateCategory,
    deleteCategory,
    addCategoryGroup,
    updateCategoryGroup,
    deleteCategoryGroup,
    updateCategoryBalance,
    categoriesByGroup, // Expose the computed property
    getChildCategories
  }
})
