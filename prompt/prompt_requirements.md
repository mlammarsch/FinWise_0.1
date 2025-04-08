# Softwarearchitektur-Analyse: FinWise Applikation

## Zusammenfassung einer Codeanalyse

Die FinWise Applikation ist eine moderne Vue 3-basierte Personal-Finance-Anwendung mit einem starken Fokus auf Budget-Management, Transaktionsverwaltung und Planung. Die Anwendung nutzt Pinia als Zustandsverwaltung, Vue Router für die Navigation und folgt einem komponentenbasierten Ansatz mit Composition API.

## Architekturanalyse

### Stärken

1. **Modularisierung**: Das Projekt ist in logische Bereiche unterteilt (Komponenten, Stores, Views, Utils), was die Wartbarkeit verbessert.

2. **Pinia Store-Struktur**: Die Verwendung von Pinia für das State Management sorgt für gute Kapselung und Trennung von Datenmanagement und UI.

3. **TypeScript**: Der durchgängige Einsatz von TypeScript erhöht die Codequalität und ermöglicht bessere IDE-Unterstützung.

4. **Komponenten-Isolation**: Komponenten sind relativ isoliert und arbeiten über Props und Emits, was die Wiederverwendung fördert.

5. **Local Storage Persistenz**: Die Daten werden im Local Storage persistiert, sodass die Anwendung auch ohne Backend funktioniert.

### Schwachstellen

1. **Zirkuläre Abhängigkeiten**: Einige Stores importieren sich gegenseitig, was zu zirkulären Abhängigkeiten führen kann.

2. **Redundante Funktionalitäten**: Es gibt ähnliche Filterlogik in verschiedenen Views.

3. **Store-Überlastung**: Einige Stores wie `transactionStore` enthalten sehr viele Funktionen, was deren Wartbarkeit erschwert.

4. **Fehlende Abstraktion von Datenpersistenz**: Die Local Storage Logik ist direkt in den Stores implementiert.

5. **Performance bei großen Datenmengen**: Bei einer größeren Anzahl von Transaktionen könnten Performance-Probleme auftreten, da oft alle Transaktionen gefiltert werden.

## Empfehlungen zur Verbesserung

### 1. Einführung eines Service Layers

**Problem:** Stores haben zu viele Verantwortlichkeiten und es gibt zirkuläre Abhängigkeiten.

**Lösung:**
- Einführen eines Service Layers, der als Vermittler zwischen Stores und UI-Komponenten agiert
- Komplexe Operationen wie `addAccountTransfer` und `calculateRunningBalances` sollten im Service Layer liegen
- Beispielimplementierung:

```typescript
// src/services/TransactionService.ts
import { useTransactionStore } from '@/stores/transactionStore';
import { useAccountStore } from '@/stores/accountStore';

export const TransactionService = {
  addAccountTransfer(fromAccountId: string, toAccountId: string, amount: number, date: string, note: string) {
    const transactionStore = useTransactionStore();
    const accountStore = useAccountStore();

    // Implementierung hier...
  },

  // Weitere Methoden
};
```

### 2. Data Access Layer für Persistenz

**Problem:** Local Storage Logik ist direkt in den Stores implementiert.

**Lösung:**
- Einführen eines Data Access Layers, der die Persistenzlogik abstrahiert
- Ermöglicht einfachen Wechsel zu einer anderen Persistenz-Methode (z.B. IndexedDB, REST API)
- Beispielimplementierung:

```typescript
// src/data/LocalStorageAdapter.ts
export const LocalStorageAdapter = {
  save(key: string, data: any): void {
    localStorage.setItem(`finwise_${key}`, JSON.stringify(data));
  },

  load<T>(key: string): T | null {
    const data = localStorage.getItem(`finwise_${key}`);
    return data ? JSON.parse(data) : null;
  },

  remove(key: string): void {
    localStorage.removeItem(`finwise_${key}`);
  }
};

// src/data/DataService.ts
import { LocalStorageAdapter } from './LocalStorageAdapter';

export class DataService {
  private adapter = LocalStorageAdapter;

  saveAccounts(accounts: Account[]): void {
    this.adapter.save('accounts', accounts);
  }

  loadAccounts(): Account[] | null {
    return this.adapter.load<Account[]>('accounts');
  }

  // Weitere Methoden
}
```

### 3. Optimiertes State Management

**Problem:** Stores sollten fokussierter sein und weniger Funktionalität enthalten.

**Lösung:**
- Aufteilen großer Stores in kleinere, fokussiertere Stores
- Beispiel: Teilen des `transactionStore` in `transactionStore`, `transactionFilterStore` und `transactionReconciliationStore`
- Beispielimplementierung:

```typescript
// src/stores/transactionStore.ts - Fokus auf grundlegende Transaktionsverwaltung
import { defineStore } from 'pinia'
import { Transaction } from '@/types'
import { DataService } from '@/data/DataService'

export const useTransactionStore = defineStore('transaction', () => {
  const transactions = ref<Transaction[]>([])
  const dataService = new DataService()

  function addTransaction(transaction: Omit<Transaction, 'id'>): Transaction {
    // Implementation...
  }

  function updateTransaction(id: string, updates: Partial<Transaction>): boolean {
    // Implementation...
  }

  function deleteTransaction(id: string): boolean {
    // Implementation...
  }

  return { transactions, addTransaction, updateTransaction, deleteTransaction }
})

// src/stores/transactionFilterStore.ts - Fokus auf Transaktionsfilterung
import { defineStore } from 'pinia'
import { useTransactionStore } from './transactionStore'

export const useTransactionFilterStore = defineStore('transactionFilter', () => {
  const filters = reactive({
    startDate: '',
    endDate: '',
    accountId: '',
    categoryId: '',
    // weitere Filter
  })

  const transactionStore = useTransactionStore()

  const filteredTransactions = computed(() => {
    // Filterlogik...
  })

  return { filters, filteredTransactions }
})
```

### 4. Zentrale Filterung und Suche

**Problem:** Redundante Filterlogik in verschiedenen Views.

**Lösung:**
- Erstellen eines zentralen Filterservice und wiederverwendbarer Filter-Hooks
- Beispielimplementierung:

```typescript
// src/composables/useFiltering.ts
import { ref, computed } from 'vue'

export function useFiltering<T>(
  items: Ref<T[]>,
  filterFn: (item: T, filters: Record<string, any>) => boolean
) {
  const filters = ref({})
  const searchQuery = ref('')

  const filteredItems = computed(() => {
    let result = items.value

    if (searchQuery.value.trim()) {
      // Suchlogik
    }

    // Anwenden aller aktiven Filter
    return result.filter(item => filterFn(item, filters.value))
  })

  function setFilter(key: string, value: any) {
    filters.value[key] = value
  }

  function clearFilters() {
    filters.value = {}
    searchQuery.value = ''
  }

  return {
    filters,
    searchQuery,
    filteredItems,
    setFilter,
    clearFilters
  }
}
```

### 5. Lazy Loading und Virtualisierung

**Problem:** Performance bei großen Datenmengen.

**Lösung:**
- Implementierung von Lazy Loading für Views
- Verwendung von virtualisierten Listen für Hochleistungsdarstellung großer Datensätze
- Beispielimplementierung:

```typescript
// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/transactions',
      name: 'transactions',
      component: () => import('../views/TransactionsView.vue'), // Lazy loading
    },
    // weitere Routen
  ],
})

// In einer großen Listendarstellung virtualisierte Liste verwenden
// Beispiel mit vue-virtual-scroller in einer Komponente
<script setup>
import { RecycleScroller } from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'

// Component logic
</script>

<template>
  <RecycleScroller
    class="scroller"
    :items="transactions"
    :item-size="50"
    key-field="id"
    v-slot="{ item }"
  >
    <TransactionCard :transaction="item" />
  </RecycleScroller>
</template>
```

### 6. Debugger und Logger optimieren

**Problem:** Der aktuelle Logger ist einfach und könnte leistungsfähiger sein.

**Lösung:**
- Erweiterung des Loggers um Level (INFO, WARN, ERROR)
- Kategorie-basiertes Logging mit Filterung
- Beispielimplementierung:

```typescript
// src/utils/logger.ts
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export const LogConfig = reactive({
  level: LogLevel.INFO,
  enabledCategories: new Set<string>(['store', 'ui', 'service']),
});

export function log(level: LogLevel, category: string, message: string, ...args: any[]) {
  if (level >= LogConfig.level && LogConfig.enabledCategories.has(category)) {
    const levelPrefix = LogLevel[level].padEnd(5);
    console.log(`[${levelPrefix}][${category}] ${message}`, ...args);
  }
}

export const logger = {
  debug: (category: string, message: string, ...args: any[]) => log(LogLevel.DEBUG, category, message, ...args),
  info: (category: string, message: string, ...args: any[]) => log(LogLevel.INFO, category, message, ...args),
  warn: (category: string, message: string, ...args: any[]) => log(LogLevel.WARN, category, message, ...args),
  error: (category: string, message: string, ...args: any[]) => log(LogLevel.ERROR, category, message, ...args)
};
```

## Vollständige Änderungsspezifikation

### 1. Service Layer einführen

1. Erstellen eines `/services`-Verzeichnisses
2. Implementieren der folgenden Services:
   - `AccountService.ts`: Konto-Management und -Operationen
   - `TransactionService.ts`: Transaktionsverwaltung und Berechnungen
   - `BudgetService.ts`: Budget-Logik und Kalkulationen
   - `PlanningService.ts`: Planungslogik und Wiederholungen
   - `SearchService.ts`: Zentrale Such- und Filterfunktionalität

### 2. Data Access Layer

1. Erstellen eines `/data`-Verzeichnisses
2. Implementieren der folgenden Adapter:
   - `LocalStorageAdapter.ts`: Aktuelle Local Storage Implementierung
   - `IDBAdapter.ts`: Alternative IndexedDB-Implementierung
   - `DataService.ts`: Einheitliche Schnittstelle für Datenzugriffe

### 3. Store-Refactoring

1. Überarbeiten des `transactionStore.ts`:
   - Entfernen von Filter- und Berechnungsfunktionen
   - Fokus auf CRUD-Operationen
2. Erstellen neuer spezialisierter Stores:
   - `transactionFilterStore.ts`: Filterlogik für Transaktionen
   - `reconciliationStore.ts`: Logik für Kontoabgleiche
   - `searchStore.ts`: Store für Suchfunktionalität
3. Aktualisieren aller Importe und Verwendungen in Komponenten

### 4. Performance-Optimierungen

1. Lazy Loading aller Views über router:
   - Überarbeiten von `router/index.ts`
2. Virtualisierte Listen für große Datensätze:
   - Installation und Konfiguration von `vue-virtual-scroller`
   - Umstellung der Listen in:
     - `TransactionList.vue`
     - `CategoryTransactionList.vue`
     - Andere lange Listen
3. Optimieren von Berechnungen:
   - Caching von häufig verwendeten Berechnungen
   - Computed-Properties mit `notifyParentUpdate: false`

### 5. Code-Qualität und Konsistenz

1. Einführen eines ESLint-Configs mit strikte Regeln:
   - Keine zirkulären Abhängigkeiten
   - Konsistente Formatierung
   - Strikte TypeScript-Prüfungen
2. Automatisierte Tests:
   - Einheitentests für Servicefunktionen
   - Komponentententests für UI-Komponenten
   - End-to-End-Tests für kritische Flows

## Abschluss

Die empfohlenen Änderungen würden die Architektur der FinWise-Applikation deutlich verbessern, indem sie Separation of Concerns, Performance und Wartbarkeit erhöhen. Dabei bleibt die bestehende Funktionalität erhalten, während technische Schulden abgebaut und die Anwendung zukunftssicher gemacht wird.

Die Einführung eines Service Layers und eines Data Access Layers macht die Anwendung flexibler und bereitet sie auf zukünftige Anforderungen vor, wie die Integration mit einem Backend oder andere Persistenzmechanismen. Die Performance-Optimierungen würden die Anwendung auch bei größeren Datenmengen responsiv halten.

# Aufgabe
Der Data ServiceLayer existiert nun. Nun realisieren wir Schritt 2, DataAccessLayer.
