Verbesserungsbedarf in Budget- und Planungselementen:

Es gibt Bereiche, in denen noch direkt auf die Stores verwiesen wird, anstatt den Service Layer zu nutzen. Hier einige Beispiele:

BudgetMonthCard.vue: Die Logik zur Berechnung von Salden (calculateCategorySaldo, calculateIncomeCategorySaldo) und zur Aggregation von Ausgaben (aggregateExpense, aggregateIncome) könnte in einen BudgetService ausgelagert werden. Dies würde die Komponente entlasten und die Logik wiederverwendbar machen.

CategoryTransferModal.vue: Die Logik, Kategorien zu übertragen, ist auch in der Komponente vorhanden. Es wäre besser all dies in den CategoryService auszulagern.

CategoryTransactionList.vue: Die Methode editTransaction sollte besser in den TransactionService ausgelagert werden.

Konkrete Beispiele, wo noch direkt auf Stores zugegriffen wird:

In vielen Komponenten (z.B. AccountCard.vue, CategoryTransactionList.vue) werden die Namen von Kategorien, Konten oder Empfängern direkt über accountStore.getAccountById(), categoryStore.getCategoryById() usw. abgerufen.  Diese Zugriffe sollten idealerweise auch über den Service Layer erfolgen, um eine einheitliche Datenzugriffsschicht zu gewährleisten.

Empfehlungen für den Prompt in anderen Bereichen:

Um eine durchgängige Refactorierung zu erreichen, sollte der Prompt folgende Punkte umfassen:

Identifizierung von Komponenten mit direkten Store-Zugriffen: Suche in den UI-Komponenten nach direkten Zugriffen auf accountStore, categoryStore, etc.
Auslagerung der Logik in Services: Verlagere die betroffene Logik in die entsprechenden Services (z.B. BudgetService, PlanningService, CategoryService, TransactionService).
Einheitliche Datenzugriffsschicht: Stelle sicher, dass alle Datenzugriffe über den Service Layer erfolgen.
Entlastung der Komponenten: Reduziere komplexe Logik in den Komponenten und mache sie "dümmer" (dumb components).
Props definieren: Definiere die entsprechende Variablen als Props, die in die Komponente übertragen werden soll.
Service Methoden implementieren: Definiere eine oder mehrere Servicemethoden die aufgerufen werden sollen.

Vorschlag die AccountCard zu verändern:

Derzeit werden die Accountdaten über den useAccountStore geladen. Hierbei wird aber nur der Name und die Farbe geladen, aber keine Aktionen ausgeführt wie im TransactionService.

Potenzielle Props:

accountId: string - Die ID des Kontos, das die Komponente anzeigen soll.

Service-Methode:

getAccountInfo(accountId: string) - Gibt ein Objekt mit allen relevanten Informationen für die Kontoanzeige zurück (Name, Saldo, weitere Details).

Aufgabe:
Bis hier habe ich erklärt, welche konkrete Beispiele refacturiert werden müss
