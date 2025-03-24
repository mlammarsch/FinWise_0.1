<!-- MonthSelector.vue -->
<script setup lang="ts">
import { ref, computed, watch } from "vue";

const emit = defineEmits<{
  (e: "update-daterange", payload: { start: string; end: string }): void;
}>();

// Initialer Monat: aktueller Monat, erster Tag
const currentMonth = ref(
  new Date(new Date().getFullYear(), new Date().getMonth(), 1)
);

const formattedMonthYear = computed(() =>
  currentMonth.value.toLocaleDateString("de-DE", {
    year: "numeric",
    month: "long",
  })
);

const startDate = computed(
  () => currentMonth.value.toISOString().split("T")[0]
);

const endDate = computed(() => {
  const lastDay = new Date(
    currentMonth.value.getFullYear(),
    currentMonth.value.getMonth() + 1,
    0
  );
  return lastDay.toISOString().split("T")[0];
});

// Emit bei Änderung
watch(
  currentMonth,
  () => {
    emit("update-daterange", { start: startDate.value, end: endDate.value });
  },
  { immediate: true }
);

function previousMonth() {
  currentMonth.value = new Date(
    currentMonth.value.getFullYear(),
    currentMonth.value.getMonth() - 1,
    1
  );
}

function nextMonth() {
  currentMonth.value = new Date(
    currentMonth.value.getFullYear(),
    currentMonth.value.getMonth() + 1,
    1
  );
}
</script>

<template>
  <div class="join">
    <button
      class="btn join-item rounded-l-full btn-sm btn-soft border border-base-300 w-10"
      @click="previousMonth"
    >
      <Icon icon="mdi:chevron-left" class="text-lg" />
    </button>
    <button
      class="btn join-item btn-sm bg-base-100 border border-base-300 text-neutral w-30"
    >
      {{ formattedMonthYear }}
    </button>
    <button
      class="btn join-item rounded-r-full btn-sm btn-soft border border-base-300 w-10"
      @click="nextMonth"
    >
      <Icon icon="mdi:chevron-right" class="text-lg" />
    </button>
  </div>
</template>
