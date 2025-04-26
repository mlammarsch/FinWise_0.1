Deine Aufgabe ist es, die Saldostruktur gänzlich mittels einem großen Refactouring zu zentralisieren. Dazu hier eine ausführliche Beschreibung, welche Art von Saldo in der App benötigt wird. Nach der Beschreibung meiner angenommene Sollstruktur mit der Implementation kannst Du die Analyse entnehmen, was bisher umgesetzt ist, und welche Unzulänglichkeiten sich daraus ergeben. Mit 4. wird ein Vorschlag zur Überarbeitung beschrieben, die es umzusetzen gilt. Siehe auch Zusammenfassung unter Punkt 5. unten. Der Budgetservice ist ein spezieller Service, der einen UI Bereich gestaltet. Dort müssen die Berechnungen mit ihren Spezialitäten so gelassen werden, jedoch die dort vorhandene Saldogenerierung, die zu bestimmten Berechnungen führt, soll dann über die zentralisierte Services, die es nun zu erstellen gibt, abgerufen werden.
Achte immer drauf: Businesslogik muss in Services gepackt werden und Datenlogik in Stores.

# Das große Ziel
Einheitliche Servicestruktur für gesamtheitliche Saldoberechnung, die von überall her (UI, Querservices) abgefragt werden kann. Eben, das Beispiel Budgetservice bezieht die Salden von da und rechnet dann für sich weiter.

## Grundsätzliches zu Buchungsarten (Types)
Buchungstypen:
- **CATEGORYTRANSFER**
	- Es handelt sich um eine reine Umbuchung 2er Kategorien, die sich auf deren Kontosalden entsprechend auswirkt.
	- Solch eine Buchung belastet eine Kategorie und entlastet eine andere. Sprich es gibt pro betroffene Kategorien selber betrachtet mal positive, mal negative Buchungen.
	- Bei CATEGORYTRANSFER sind keine Kontobuchungen betroffen, da es sich um reine Geldverschiebungen unter Kategorien handelt
- **ACCOUNTTRANSFER**
	- Es handelt sich um eine reine Umbuchung 2er physischer Accounts/Konten, die sich auf deren Kontosalden entsprechend auswirkt.
	- Solch eine Buchung belastet ein Konto und entlastet eine anderes. Sprich es gibt pro betroffene Konto selber betrachtet mal positive, mal negative Buchungen.
	- Bei ACCOUNTTRANSFERS sind keine Kategorie-Buchungen betroffen, da es sich um reine Geldverschiebungen unter Kontos handelt
- **EXPENSE**
	- Hierbei findet eine negative Ausgabe auf ein bestimmtes Konto statt, was dessen aktuellen Saldo verringert
	- Gleichzeitig wird bei einer Angabe einer Kategorie in selber Buchung, auch der Saldo der Kategorie negativ beeinflusst.
	- Bei EXPENSE sind auf jeden Fall das ausgewählte Konto betroffen und optional auch eine Kategorie.
- **INCOME**
	- Hierbei findet eine positive Einnahme auf ein bestimmtes Konto statt, was dessen aktuellen Saldo erhöht
	- Gleichzeitig wird bei einer Angabe einer Kategorie in selber Buchung, auch der Saldo der Kategorie positiv beeinflusst.
	- Einnahmen können auf Eingabekategorien und Ausgabekategorien geschehen.
	- Bei INCOME sind auf jeden Fall das ausgewählte Konto betroffen und optional auch eine Kategorie.

## Unterscheidung Transaktion und Prognosebuchung
Das App Finwise besitzt 2 Typen von Buchungen.
1. **Transaktion**
	- Bei einer Transaktion sprechen wir von einer tatsächlich erfolgten (abgewickelten) Buchung, die jede der vier oben genannten Buchungsarten beinhalten kann.
	- Transaktionen liegen zumeist in der Vergangenheit.
	- Transaktionen können auch in der Zukunft liegen.
	- Transaktionen können aus manueller Eingabe entstehen oder auch aus einem Abwicklungslauf fälliger Prognosebuchungen.
	- Transaktionen werden im TransactionService abgewickelt und im TransactionStore gespeichert.
2. **Prognosebuchung**
	- Bei einer Prognosebuchung sprechen wir von einer virtuellen Buchung aus einer Planbuchung heraus, die einmalig ausgeführt wird, oder wahlweise auch Regel-Prognosebuchungen erzeugt.
	- Prognosebuchungen liegen zumeist in der Zukunft
	- Prognosebuchung können auch in der Vergangenheit liegen. Man spricht hier von "fälligen Prognosebuchungen"
	- Über einen Abwicklungslauf werden fällige Prognosebuchungen bei Flag "forecastOnly=true" einfach gelöscht, in dem die Planbuchung bei einmaligem Vorkommnis gelöscht wird, oder das Datum auf das nächste reguläre Ereignis umdatiert wird.
	- Bei Flag "forecastOnly=false" geschieht das gleiche im Plan- und Prognosebereich, jedoch wird hier eine reale Transaktion passend dazu angelegt.
	- Planungs- und Prognosebuchungen werden jeweils im PlanningService abgewickelt und im PlanningStore gespeichert.

Fragestellung: Unklar ist mir, welche Zuständigkeit der BudgetService genau hat?

## Salden  (Erklärung)
Ein Konto- als auch Kategoriensaldo ist "immer die Summe aller Transaktionen (Balance) zuzüglich aller Prognosebuchungen (projectedBalance) (fällige oder nicht fällige)". Jedes Konto hat Salden und jede Kategorie hat Salden, die wir wie folgt genauer betrachten
### Unterscheidung Salden
- Alle Account Salden beziehen sich ausschließlich auf Date.
- Alle Category Salden beziehen sich auf valueDate.
- Innerhalb der beiden Saldengruppen gibt es jeweils den realen Saldo, der nur Transaktionen berücksichtigt (Balance), die erfolgt sind.
- Parallel läuft noch ein prognostizierter Saldo (ProjectedBalance) mit, der erst  mal ebenfalls alle Transaktionen enthält, aber auch zusätzlich die Prognosen noch mit hochrechnet bis auf 24 Monate in Zukunft. Also die nun folgende Saldoberechnungsstruktur muss immer auf 2 Mal betrachtet werden. Tatsächliche Saldostruktur und tatsächliche plus Prognosestruktur.
### Welche Salden werden in der App benötigt
- **Aktueller Saldo** (todayBalance)
	- Dies ist der Date.Now() Saldo
	- Er wird also berechnet aus allen Transaktionen bis zum heutigen Datum.
- **Laufender Saldo** (runningBalance)
	- Ein laufender Saldo ist immer der Saldo, der bei einer Transaktion oder Prognosebuchung unter Aufsummierung aller vorangegangenen Buchungen inkl. dieser aktuellen nach Datum sortiert berechnet.
- **Monatssaldo (dynamisch rekursiv berechnet)** (monthlyBalance)
	- Der **Monatssaldo** ist der **prognostizierte Endsaldo eines Monats**. Er ergibt sich aus:
	    - dem **End-Saldo des Vormonats**,
	    - **plus** allen Transaktionen und Prognosebuchungen

	- Diese Berechnung ist **rekursiv**:
	    Der Monatssaldo hängt **immer vom Vormonatssaldo ab**, der wiederum aus dessen Vormonatssaldo abgeleitet wird – und so weiter. Es wird also **monatlich aufaddiert**, ausgehend von einem Startpunkt (z. B. dem Erfassungsbeginn oder Startsaldo).

	- Die Salden „rollen“ über die Monate hinweg (speziell projectedBalance):
	    Der **aktuelle Monat** ist im nächsten Rechenschritt der **Vormonat des Folgezeitpunkts**. Dadurch entstehen **kontinuierliche, gleitende Salden** ohne feste Grenzen – ideal für dynamische Monatsvergleiche. Die Prognoseinterpolation soll bei Appstart immer 24 Monate in die Zukunft durchrechnen.

### Wofür die Trennung von balance und projectedBalance?
Je nach Anforderung benötigen wir in einer Ansich nur die Balance. In anderen Geschäftsbereichen wie Budget oder Kontoprognose benötigen wir die projectedBalance.

## Vergleich Ihrer Sollstruktur mit der bestehenden Implementation

### 1. Festgestellte Sollstruktur (Ihre Beschreibung)

**Transaktionstypen:**
- Klare Trennung und Wirkung für Accounts und Categories (Transfers wirken **nie** doppelt).
- **EXPENSE/INCOME:** können auch beide Saldotypen (Account _und_ Category) berühren.

**Saldoarten:**
- **todayBalance:** Nur reale Transaktionen bis heute (Date/valueDate).
- **runningBalance:** Fortlaufender Saldo pro Buchung, z. B. für Listen/Charts.
- **monthlyBalance:** Monatsweise Rückkopplung – Saldierung von Vormonat + (Transaktionen + Planung/Prognose).
- **projectedBalance:** Sämtliche Salden als Historie+24 Monate Forecast mit aktuellen Planungsständen.

**Trennung:**
- _Accounts_ → Salden nach **date**
- _Categories_ → Salden nach **valueDate**

**Rekursion:**
- Der Saldo eines Monats ist immer eine kumulierte Fortschreibung aus dem Vormonat – inklusive aller neuen Transaktionen/Prognosebuchungen des Monats (monatsbasierende Rollup-Logik).

**Technische Konsequenz:**
- Es benötigt **eine zentrale Salden-Schicht**, die je Entität nach datum/valueDate filtert, und die sowohl die laufende Gesamtprojektion als Array als auch Einzel-Werte liefern kann.
- **Alle Services/Komponenten greifen immer auf diese zentrale Schicht zu**.

---

### 2. Ihre Implementation heute (aus monthlyBalanceStore, runningBalances, BudgetService etc.)

**a) monthlyBalanceStore.ts:**
- Hat eine zentrale, aber _in sich gewachsene und inkonsistente_ Logik:
  - getrennte Arrays für account/category/projection
  - Berechnung teils dupliziert, teils unterschiedlich (z.B. Prognosen je Kategorie in Service, je Account im Store...)

**b) runningBalances.ts:**
- Kalkuliert den Saldo auf Basis von Transaktionslisten (z.B. für Listen-View, Charts)
- Teils eigene Filter, die sich mit denen in monthlyBalanceStore überschneiden.

**c) BudgetService/BudgetView:**
- Baut auf eigene Weise Budget/Saldo je Kategorie, manchmal unter Einbezug, manchmal unabhängig von monthlyBalanceStore.

**d) Services (AccountService, CategoryService):**
- Greifen zwar auf monthlyBalanceStore zu, aber haben gelegentlich auch eigene Filter/Logik.
- runningBalance (laufender Saldo für Listen) ist **nicht** zentralisiert: Manchmal per Funktion, manchmal pro Transaktionsliste (UX-View).

---

## 3. Abweichungen / Unzulänglichkeiten

- Es **existiert keine klare zentrale Stelle**, die _alle_ Salden berechnet und andere (bis auf Listendarstellung) konsequent darauf zugreifen lässt.
- **Monatssalden und laufende Salden** liegen teils in utils, teils als eingebettete Methoden in Stores/Services/Views.
- **Prognosen vs. Ist** sind sehr ungleich („projected“ nur in monthlyBalanceStore praktikabel).
- Die Unterscheidung zwischen **category.valueDate** und **account.date** ist im Code da, aber nicht konsequent getrennt abstrahiert (z. B. runningBalances nutzt nur date).
- **BudgetService** ist ein Sammelbecken für Kategorie-Budget-Logik, aber es mischt eigene Saldenfilter mit monthlyBalanceStore und ignoriert Teilaspekte der Projektionslogik.

---

## 4. Vorschlag für Refactoring: Zentrale Salden-Verwaltung

### 4.1 Ziel

- Es gibt _eine einzige zentrale_ Klasse/Service (z. B. `BalanceService`), die
    - für _Accounts_ und _Categories_
    - für _jedes gewünschte Intervall_ (Tag, Monat, Periode, heute, Stichtag, Liste)
    - sowohl _Ist- als auch Projektionswerte_
  _liefert und persistiert_ (soweit sinnvoll).
- **Alle** anderen Services/Geschäftsbereiche greifen **nur darauf zu**.

### 4.2 Struktureller Vorschlag

#### **a) BalanceService**

- Schichtmodell:
    - **Input:** Aktuelle Transaktionslisten + Planungs-Transaktionen
    - **API:**
        - `getTodayBalance(entityType, id)` (nur bis heute, nur Transaktionen)
        - `getRunningBalances(entityType, id, [start, end], {includeProjection: false})`
        - `getMonthlyBalances(entityType, id, [start, end], {includeProjection: true})`
        - `getProjectedBalance(entityType, id, asOf)`
        - Ggf. `getPreviousMonthEndBalance(...)` und weitere spezialisierte

- Intern:
    - Klar gekapseltes Wissen, was Saldo ist (je Typ, je Buchungsart, inkl. Unterscheidung valueDate vs. date).
    - Berechnet/Cache monthly + projected + running je Account/Category auf Bedarf (Picker-Callback oder persistiert).
    - Legt strikt pro-Entity (Konto/Kategorie), pro Zeitraum (Monat/Tag), pro Sichtart (Ist/Forecast) ab.

- **Persistiert** werden nur _Monatssalden_ (ggf. als Array: `balances[entityType][id][year][month]`),
  alles andere ist Ableitung davon/dynamisch.

#### **b) Schnittstellenänderungen an Stores/Services**

- **AccountService, CategoryService, BudgetService, Dashboard:**
  - Lesen Saldi **immer** ausschließlich über BalanceService.
  - Die Abfrage der Balances ist einfach und klar typisierbar.
- **Transaction- und PlanningStore** liefern „Rohdaten“, nie Zwischenstände.
- **runningBalances.ts** wird in BalanceService konsolidiert – weitere Listen/Charts (UX) nutzen nur noch die zentrale API.

#### **c) Werte-Definition je Typ** (`getBalanceForDate` Beispiel):

- **Für Accounts**:
  - Nutze `tx.accountId`, _filter date_
  - Types: EXPENSE(-), INCOME(+), ACCOUNTTRANSFER(+/-), RECONCILE(±)
  - CATEGORYTRANSFER ignorieren
- **Für Categories**:
  - Nutze `tx.categoryId`, _filter valueDate_
  - Types: EXPENSE(-), INCOME(+), RECONCILE(±), CATEGORYTRANSFER(+/- für eigene ID)
  - ACCOUNTTRANSFER ignorieren

#### **d) Monthly/Projected-Logik**

- _Per Entity_ wird für jede Buchung und Plan-Buchung (Forecast), für jeden Monat/jeden Tag, der Saldo berechnet.
- _Projektierte Werte_ bauen auf Monatssalden + geplante, noch nicht realisierte Buchungen.
- _Vormonats-Rückkopplung_: Für jede Periode ist der Saldo der Vormonatssaldo + alle Bewegungen im aktuellen Monat.

#### **e) „Businesslogik“ Separation**

- **Saldenberechnung** ist _immer_ Aufgabe von `BalanceService`.
- **Businessentscheidungen** (z. B. auto-Transfer bei INCOME, Validierung, etc.) bleiben im jeweiligen Service.

---

## 5. Zusammenfassung – ToDo/Refactoring-Matrix

| Schritt   | Aufgabe / Umstellung            |
|-----------|---------------------------------|
| 1         | Neuen zentralen `BalanceService` entwickeln, inkl. interface und Testabdeckung |
| 2         | `monthlyBalanceStore` auf reines Persistence-Layer (für Monatsstände) reduzieren |
| 3         | `runningBalances.ts` und Konsorten in den neuen Service konsolidieren           |
| 4         | Sämtliche Services (`AccountService`, `BudgetService`, etc.) greifen nur auf Balances über den neuen Service zu (wo nötig) |
| 5         | Doppelte/redundante Filter/Teillogik ("getXBalanceForDate", "calculate*Saldo", etc.) entfernen |
| 6         | `BudgetService` vollständig entkoppeln: Er liefert *nur* Aggregationen/Budget-Reports – sämtlicher Saldo immer via BalanceService |
| 7         | Künftige Multi-Tenant-Struktur: BalanceService immer tenant-aware gestalten    |
