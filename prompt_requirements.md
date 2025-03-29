Ich möchte die BudgetView ändern.
Dieser Templatebereich darf bei vertikalem Seitenüberlauf nicht scrollbar werden. Fest und sticky:
<template>
  <div class="p-4 flex flex-col">
    <!-- Zeile 1: Navigation + Headerbereich -->
    <div class="mb-4 shrink-0">
      <div class="flex items-center justify-between mb-4">
        <h1 class="text-2xl font-bold">Budgetübersicht</h1>
        <div class="flex items-center gap-2">
          <button class="btn btn-sm" @click="monthOffset--">&laquo;</button>
          <button class="btn btn-sm" @click="monthOffset++">&raquo;</button>
          <select
            v-model.number="numMonths"
            class="select select-bordered select-sm w-20"
          >
            <option v-for="n in 6" :key="n" :value="n">{{ n }} Monate</option>
          </select>
        </div>
      </div>
    </div>
  </div>
  <div class="h-full flex overflow-x-auto">
    <div
      :style="{ flex: '0 0 calc(100% / ' + totalColumns + ')' }"
      class="flex flex-col overflow-hidden"
    ></div>
    <div
      v-for="month in months"
      :key="month.key"
      :style="{ flex: '0 0 calc(100% / ' + totalColumns + ')' }"
      class="flex flex-col overflow-hidden"
    >
      <BudgetMonthHeaderCard
        :label="month.label"
        :toBudget="200"
        :budgeted="0"
        :overspent="0"
        :available="200"
        :nextMonth="0"
      />
    </div>
  </div>


  Dieser Bereich hingegen muss vertikal scrollbar werden, sobald die gesamte Seite überläuft.
  <!-- Zeile 2: Datenbereich (scrollbar) -->
  <div class="grow overflow-hidden">
    <div class="h-full flex overflow-x-auto">
      <!-- Kategorie-Spalte -->
      <div
        :style="{ flex: '0 0 calc(100% / ' + totalColumns + ')' }"
        class="flex flex-col overflow-hidden"
      >
        <BudgetCategoryColumn
          v-model:expanded="expanded"
          class="h-full overflow-y-auto"
        />
      </div>

      <!-- Monats-Spalten -->
      <div
        v-for="month in months"
        :key="month.key"
        :style="{ flex: '0 0 calc(100% / ' + totalColumns + ')' }"
        class="flex flex-col overflow-hidden"
      >
        <div class="overflow-y-auto h-full">
          <BudgetMonthCard
            :month="month"
            :categories="categories"
            :expanded="expanded"
          />
        </div>
      </div>
    </div>
  </div>
</template>

Achtung, Zur Screenhöhe gehören auch die Bereiche des Headers und Footers. Wenn wir von einer Gesamtscreenheigt ausgehen, bezieht das das App-Layout mit ein. Der Footer soll also unten in der Seite immer sichbar sein und nur der Datenbereich bei Übergröße scrollen. Bei Datenbereich und Kategorienspalte sollen jeweils die Header Zeilen sticky sein beim Scrollen.
Bevor Du Code ausgibst, beschreibe in Deinen Worten, wie Du meine Anforderung verstanden hast.
