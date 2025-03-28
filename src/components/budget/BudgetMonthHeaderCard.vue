<script setup lang="ts">
const props = defineProps<{
  label: string;
  toBudget: number;
  available?: number;
  overspent?: number;
  budgeted?: number;
  nextMonth?: number;
}>();
</script>

<template>
  <div
    class="min-w-[12rem] border-l border-base-300 bg-base-100 sticky top-0 z-30"
  >
    <div class="p-2 border-b border-base-300 text-center font-bold">
      {{ props.label }}
    </div>
    <div class="p-2 text-sm space-y-1 flex flex-col items-center">
      <div>
        <strong>{{ props.available ?? "200" }}</strong> Available funds
      </div>
      <div>-{{ props.overspent ?? 0 }} Overspent in prev</div>
      <div>-{{ props.budgeted ?? 0 }} Budgeted</div>
      <div>-{{ props.nextMonth ?? 0 }} For next month</div>
    </div>
  </div>
</template>

<style scoped>
</style>
