import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { Tag } from '../types'

export const useTagStore = defineStore('tag', () => {
  // State
  const tags = ref<Tag[]>([])

  // Getters
  const getTagById = computed(() => {
    return (id: string) => tags.value.find(tag => tag.id === id)
  })

  const rootTags = computed(() => {
    return tags.value.filter(tag => tag.parentTagId === null)
  })

  const getChildTags = computed(() => {
    return (parentId: string) => {
      return tags.value.filter(tag => tag.parentTagId === parentId)
    }
  })

  const getTagsByIds = computed(() => {
    return (ids: string[]) => tags.value.filter(tag => ids.includes(tag.id))
  })

  // Actions
  function addTag(tag: Omit<Tag, 'id'>) {
    const newTag: Tag = {
      ...tag,
      id: uuidv4()
    }
    tags.value.push(newTag)
    saveTags()
    return newTag
  }

  function updateTag(id: string, updates: Partial<Tag>) {
    const index = tags.value.findIndex(tag => tag.id === id)
    if (index !== -1) {
      tags.value[index] = { ...tags.value[index], ...updates }
      saveTags()
      return true
    }
    return false
  }

  function deleteTag(id: string) {
    // Prüfe, ob es Unter-Tags gibt
    const hasChildren = tags.value.some(tag => tag.parentTagId === id)
    if (hasChildren) {
      return false
    }

    tags.value = tags.value.filter(tag => tag.id !== id)
    saveTags()
    return true
  }

  // Persistenz
  function loadTags() {
    const savedTags = localStorage.getItem('finwise_tags')
    if (savedTags) {
      tags.value = JSON.parse(savedTags)
    }
  }

  function saveTags() {
    localStorage.setItem('finwise_tags', JSON.stringify(tags.value))
  }

  // Initialisiere beim ersten Laden
  loadTags()

function reset() {
  tags.value = []
  loadTags()
}

return {
  tags,
  getTagById,
  rootTags,
  getChildTags,
  getTagsByIds,
  addTag,
  updateTag,
  deleteTag,
  loadTags,
  reset
}

})
