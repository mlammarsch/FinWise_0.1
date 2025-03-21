import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { Recipient } from '../types'

export const useRecipientStore = defineStore('recipient', () => {
  // State
  const recipients = ref<Recipient[]>([]) // Initialize as empty array

  // Getters
  const getRecipientById = computed(() => {
    return (id: string) => recipients.value.find(recipient => recipient.id === id)
  })

  // Actions
  function addRecipient(recipient: Omit<Recipient, 'id'>) {
    const newRecipient: Recipient = { id: uuidv4(), ...recipient }
    recipients.value.push(newRecipient)
    saveRecipients()
    return newRecipient
  }

  function updateRecipient(id: string, updates: Partial<Recipient>) {
    const index = recipients.value.findIndex(recipient => recipient.id === id)
    if (index !== -1) {
      recipients.value[index] = { ...recipients.value[index], ...updates }
      saveRecipients()
      return true
    }
    return false
  }

  function deleteRecipient(id: string) {
    recipients.value = recipients.value.filter(recipient => recipient.id !== id)
    saveRecipients()
    return true
  }

  // Persistenz
  function loadRecipients() {
    const savedRecipients = localStorage.getItem('finwise_recipients')
    if (savedRecipients) {
      recipients.value = JSON.parse(savedRecipients)
    }
  }

  function saveRecipients() {
    localStorage.setItem('finwise_recipients', JSON.stringify(recipients.value))
  }

  // Initialisierung beim Laden
  loadRecipients()

  function reset() {
    recipients.value = []
    loadRecipients()
  }
  
  return {
    recipients,
    getRecipientById,
    addRecipient,
    updateRecipient,
    deleteRecipient,
    loadRecipients,
    reset
  }
})
