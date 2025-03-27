<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { Category } from "../../types";
import { useCategoryStore } from "../../stores/categoryStore";
import { formatCurrency } from "../../utils/formatters";
import CurrencyDisplay from "../ui/CurrencyDisplay.vue";

const props = defineProps<{
  category?: Category;
  isOpen: boolean;
}>();

const emit = defineEmits(["close", "transfer"]);

const categoryStore = useCategoryStore();

const fromCategoryId = ref("");
const toCategoryId = ref("");
const amount = ref(0);
const date = ref(new Date().toISOString().split("T")[0]);
const note = ref("");

// Bei Übergabe einer Kategorie wird deren ID als Quelle gesetzt
watch(
  () => props.category,
  (cat) => {
    if (cat) {
      fromCategoryId.value = cat.id;
    }
  },
  { immediate: true }
);

// Konvertiert einen String in eine Zahl
const parseNumber = (value: string): number => {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  return parseFloat(normalized) || 0;
};

// Formatiert eine Zahl in einen String
const formatNumber = (value: number): string => {
  return value.toString().replace(".", ",");
};

// Ermittelt alle aktiven Kategorien außer der Quellkategorie
const toCategories = computed(() => {
  return categoryStore.categories
    .filter((cat) => cat.isActive && cat.id !== fromCategoryId.value)
    .map((cat) => ({ id: cat.id, name: cat.name }));
});

// Alle aktiven Kategorien (für Anzeige der Quellkategorie)
const fromCategories = computed(() => {
  return categoryStore.categories
    .filter((cat) => cat.isActive)
    .map((cat) => ({ id: cat.id, name: cat.name }));
});

// Ermittelt den aktuellen Saldo der Quellkategorie
const fromCategoryBalance = computed(() => {
  if (!fromCategoryId.value) return 0;
  const category = categoryStore.getCategoryById(fromCategoryId.value);
  return category ? category.balance : 0;
});

// Löst den Transfer zwischen Kategorien aus
const transferBetweenCategories = () => {
  if (!fromCategoryId.value || !toCategoryId.value || amount.value <= 0) return;

  emit("transfer", {
    fromCategoryId: fromCategoryId.value,
    toCategoryId: toCategoryId.value,
    amount: amount.value,
    date: date.value,
    note: note.value,
  });

  emit("close");
};
</script>

<template>
  <div v-if="isOpen" class="modal modal-open">
    <div class="modal-box">
      <h3 class="font-bold text-lg mb-4">Zwischen Kategorien übertragen</h3>
      <form @submit.prevent="transferBetweenCategories">
        <div class="space-y-4">
          <div class="form-control">
            <label class="label">
              <span class="label-text">Von Kategorie</span>
              <span class="text-error">*</span>
            </label>
            <select
              v-model="fromCategoryId"
              class="select select-bordered w-full"
              required
            >
              <option value="" disabled>Kategorie auswählen</option>
              <option
                v-for="category in fromCategories"
                :key="category.id"
                :value="category.id"
              >
                {{ category.name }}
                (<CurrencyDisplay
                  :amount="
                    categoryStore.getCategoryById(category.id)?.balance || 0
                  "
                  :show-zero="true"
                  :as-integer="true"
                />)
              </option>
            </select>
          </div>
          <div class="form-control">
            <label class="label">
              <span class="label-text">Zu Kategorie</span>
              <span class="text-error">*</span>
            </label>
            <select
              v-model="toCategoryId"
              class="select select-bordered w-full"
              required
            >
              <option value="" disabled>Kategorie auswählen</option>
              <option
                v-for="category in toCategories"
                :key="category.id"
                :value="category.id"
              >
                {{ category.name }}
              </option>
            </select>
          </div>
          <div class="form-control">
            <label class="label">
              <span class="label-text">Betrag</span>
              <span class="text-error">*</span>
            </label>
            <div class="input-group">
              <input
                type="text"
                :value="formatNumber(amount)"
                @input="amount = parseNumber(($event.target as HTMLInputElement).value)"
                class="input input-bordered w-full"
                required
                placeholder="0,00"
                :max="fromCategoryBalance"
              />
            </div>
            <label class="label">
              <span class="label-text-alt">
                Verfügbar:
                <CurrencyDisplay
                  :amount="fromCategoryBalance"
                  :show-zero="true"
                  :as-integer="true"
                />
              </span>
            </label>
          </div>
          <div class="form-control">
            <label class="label">
              <span class="label-text">Datum</span>
              <span class="text-error">*</span>
            </label>
            <input
              type="date"
              v-model="date"
              class="input input-bordered"
              required
            />
          </div>
          <div class="form-control">
            <label class="label">
              <span class="label-text">Notiz</span>
            </label>
            <input
              type="text"
              v-model="note"
              class="input input-bordered"
              placeholder="Grund für die Übertragung"
            />
          </div>
        </div>
        <div class="modal-action">
          <button type="button" class="btn" @click="$emit('close')">
            Abbrechen
          </button>
          <button type="submit" class="btn btn-primary">Übertragen</button>
        </div>
      </form>
    </div>
    <div class="modal-backdrop" @click="$emit('close')"></div>
  </div>
</template>
