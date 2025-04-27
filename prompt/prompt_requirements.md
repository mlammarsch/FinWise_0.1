1.) ich fürchte im planning service läuft noch etwas falsch. ich lege eine eine kategorie also einen typ kategorie transfer an und mir wird diese buchung, diese prognosebuchung die noch nicht ausgeführt ist in der budget month card also im budget service als prognosebuchung angezeigt. schaue unten in der spezifikation. ein kategorie transfer hat in der spalte budget zu erscheinen. nicht in der prognose. das ist das eine. zum anderen stelle ich fest oder habe ich das gefühl dass nur eine income buchung erstellt wird obwohl ich ein kategorie transfer aktiviert habe. möglicherweise ist das der fehler dass die prognose den type nicht beachtet. bitte prüfe was für ein buchungstype angelegt wird wenn ich eine kategorie transfer angelegt habe. bei einem kategorie transfer werden normalerweise auch eine buchung und eine gegenbuchung angelegt

2.) Die Saldoberechnung bei Prognosebuchungen erscheint mir genau um einen Monat nach hinten verschoben (Siehe Bildanhang). Hier liegt im Mai eine Planbuchung mit 20€ mit 3 maliger Wiederholung. Beschreibe mir den Unterschied zwisschen der Saldoberechnung projected und der realen. Bei Transaktionen werden die Salden korrekt berechnet. Es ist nur bei Prognosebuchung dieser Verzug um +1 Monat zu sehen.

# Spezifikationsvorgabe Budget Month Card Berechnungen


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

## Eigentliche Berechnungen der Ausgabekategorien für die BudgetMonthCard (Umsetzung prüfen)
Der Buchungstype ACCOUNTTRANSFER wird in folgender Berechnungsmethode in der BudgetMonthCard völlig ignoriert. Im Grunde genommen können alle ACCOUNTTRANSFERS weggefiltert werden, sofern es die unten aufgeführten Berechnungen erleichtert.
### 1. Budget (linke Spalte)
- Ausgangssituation (Anfangssaldo)
	- Diese Spalte fängt in jedem Monat mit Saldo 0 an ohne Vormonatssaldo einzubeziehen.
- Weitere Berechnung
	- Summe aller Transaktionen, Plan- und Prognosebuchungen des Types **CATEGORYTRANSFER** im jeweils betroffenen Monat nach valueDate.
	- ACCOUNTTRANSFER, EXPENSE und INCOME werden ignoriert und dürfen auf die Budgetspalte keinen Einfluss haben..
- Beispiel
	- Ausgangssituation betroffener Monat = immer 0
	- **CATEGORYTRANSFER** von KatA → KatB: A = –20 €, B = +20 €.
	- **CATEGORYTRANSFER** von KatC → KatB: C = –10 €, B = +10 €.
	- Ergebnis:
	    - A: 0+(-20) = **-20**
	    - C: 0+(-10) = **-10**
	    - B: 0+(+20)+(10) = **20**

### 2. Prognose (2. Spalte)
- Ausgangssituation (Anfangssaldo)
	- Diese Spalte fängt in jedem Monat mit Saldo 0 an ohne Vormonatssaldo einzubeziehen.
- Weitere Berechnung
	- Summe aller Plan- und Prognosebuchungen des Types **EXPENSE & INCOME** im jeweils betroffenen Monat nach valueDate.
	- ACCOUNTTRANSFER, CATEGORYTRANSFER werden ignoriert und dürfen auf die Prognosespalte keinen Einfluss haben..
	- Vor allem dürfen keine Transaktionen hier angezeigt werden. Diese Spalte zeigt nur die Prognose
- Beispiel (Monatsbetrachtung April 2025)
	- Ausgangssituation betroffener Monat = immer 0
	- **EXPENSE** KatA = –20 € valueDate 02.04.2025
	- **INCOME** KatA = +50 € valueDate 19.04.2025
	- **EXPENSE** KatA = –10 € valueDate 08.04.2025
	- **EXPENSE** KatA = –30 € valueDate 02.05.2025
	- Ergebnis für April 2025:
			- anzuzeigender Monatssaldo KatA in dieser Spalte: 0+(-20)+(+50)+(-10) = **20**
			- -30 werden ignoriert, da sie in in die Berechnung des Folgemonats gehören.

### 3. Transaktionen (3. Spalte)#
- Ausgangssituation (Anfangssaldo)
	- Diese Spalte fängt in jedem Monat mit Saldo 0 an.
	- Ausschlaggebendes Datum bei Kategoriesalden: valueDate
- Weitere Berechnung
	- Summe aus allen im jeweiligen Month(valueDate) gespeicherten **EXPENSE** und **INCOME** Transaktionen.
	- Wichtig ist, dass hier ausschließlich Transaktionen einfließen
	- Keine Prognosebuchungen!
	- Hier dürfen keine CATEGORYTRANSFER oder ACCOUNTTRANSFER Buchungen erscheinen. Weder Transaktionen, noch Planbuchungen.
- Beispiel (Monatsbetrachtung April 2025)
	- Ausgangssituation betroffener Monat = immer 0
	- **EXPENSE** KatA = –20 € valueDate 02.04.2025
	- **INCOME** KatA = +50 € valueDate 19.04.2025
	- **EXPENSE** KatA = –10 € valueDate 08.04.2025
	- **EXPENSE** KatA = –30 € valueDate 02.05.2025
	- Ergebnis für April 2025:
	    - anzuzeigender Monatssaldo KatA in dieser Spalte: 0+(-20)+(+50)+(-10) = **20**
	    - -30 werden ignoriert, da sie in in die Berechnung des Folgemonats gehören.

### 4. Saldo (rechte Spalte)
- Ausgangssituation (Anfangssaldo)
	- Diese Spalte fängt in jedem Monat mit Saldo 0 an, muss aber automatisch den Vormonatssaldo aufsummieren.
	- Ausschlaggebendes Datum bei Kategoriesalden: valueDate
- Weitere Berechnung nach Ausgangssituation
	- Hinzunahme der Summe aus allen im jeweiligen Month(valueDate) gespeicherten **EXPENSE** und **INCOME** Transaktionen und Prognosebuchungen (Siehe 2. Transaktionen)
	- Hinzunahme der unter 1. Budget ermittelten Werte für den jeweilig betroffenen Monat
- Beispiel (Monatsbetrachtung April 2025)
	- Ausgangssituation betroffener Monat = 0
	- Saldo Vormonat März2025 = 120
	- **EXPENSE** KatA = –20 € valueDate 02.04.2025
	- **INCOME** KatA = +50 € valueDate 19.04.2025
	- **EXPENSE** KatA = –10 € valueDate 08.04.2025
	- **EXPENSE** KatA = –30 € valueDate 02.05.2025
	- **CATEGORYTRANSFER** von KatA → KatB: A = –20 €, B = +20 €.
	- **CATEGORYTRANSFER** von KatC → KatB: C = –10 €, B = +10 €.
	- Ergebnis für April 2025:
		- KatA: Vormonat 120 + (–20 + 50 –10) + (–20) = 120 + 20 – 20 = **120**

## Eltern- und Kind-Kategorien  (Umsetzung prüfen)
In der BudgetMonthcard können Kategorien in Gruppen von Eltern- und Kindkategorien eingeteilt werden. Die Auflistung von 1-3 stellt immer die eigenen Berechnungen da. Bei Elternkategorien ist folgende zusätzliche Betrachtung notwendig.
- **Eltern** summieren **alle** Werte ihrer Unterkategorien (Differenzen anteilig).
- **Kind** zeigt nur eigene Transfers, Ausgaben, Planung und Saldo.
- Beispiel:
    - Kind K1 Saldo = 30 €
    - Kind K2 Saldo = 70 €
        → Eltern E.Saldo = 30 + 70 + E.eigeneSaldo.

### Wichtiger Hinweis zur Berechnungsreihenfolge der Elternkategorie
Erst soll jede Kategorie seine eigenen Werte berechnen, wie es nach oben genannter Specification ist. Danach soll jede Elternkategorie rekursiv alle fertig errechneten Werte pro einzelne Spalte aufrechnen. Also die Aufsummierung pro Spalte autark lassen. Dann passt das, da die eigentliche Verrechnung ohne die Kindskategorien bereits erledigt ist.
