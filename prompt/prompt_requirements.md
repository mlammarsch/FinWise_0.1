# Spezifikationsvorgabe Budget Month Card Berechnungen
Deine Aufgabe ist es, den Bestandscode und deren bisherigen Berechnungen mit der nun folgenden Spezifikation abzugleichen und später in einem 2. Iterationsschritt Code-technisch anzupassen. Es geht hier konkret nur um Kategorien, die der Gruppe Ausgaben zugeteilt sind.
Gib nach einem ersten, sorgfältigen Review eine liste aus, welche Funktion, in welcher Datei mit der Spezifikation übereinstimmt, wo es Abweichungen gint (Detailbeschreibungen dazu). Neben der Funktion benötige ich natürlich auch eine Kurzbeschreibung, was diese Funktion im eigentlichen tut.
Mache vor der Umsetzungsiteration eine präzise Liste, was Du umzusetzen vermagst. Ich gebe Dir dann entweder das "go" zur Umsetzung oder korrigiere Möglicherweise. Bei der Korrektur kann es sein, dass ich nochmals auf Stellen in meiner Spezifikation hier verweise, die ich aus Deiner Verständnisliste nicht herauslesen kann.

Bei der Umsetzung ist darauf zu achten, dass ich absolut keine Änderung im Templatedesign wünsche. Die Fragen und die Änderungsanforderungen beziehen sich einzig auf Bestandscodeänderungen im Scriptbereich der Dateien. Sprich, bestehende Funktionen müssen überprüft und im Bedarfsfalle angepasst werden. Nicht involvierte Funktionalitäten müssen so bestehen bleiben, wie umgesetzt.Bei der Dateiausgabe reicht immer die Ausgabe des Scriptteils bei vue Dateien. Bei ts-Dateien immer betroffene Funktionen gesamthaft ausgeben, die ich dann mit den Bestandsfunktionen austauschen kann. Bei neuen Funktionen, erwähne explizit "Neufunktion"


## Grundsätzliches zu Buchungsarten (Erklärung)
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

## Unterscheidung Transaktion und Prognosebuchung (Erklärung)
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
Ein Konto- als auch Kategoriensaldo ist "immer die Summe aller Transaktionen zuzüglich aller Prognosebuchungen (fällige oder nicht fällige)". Jedes Konto hat Salden und jede Kategorie hat Salden, die wir wie folgt genauer betrachten
### Unterscheidung Salden
- **Aktueller Saldo**
	- Dies ist der Date.Now() Saldo
	- Er wird also berechnet aus allen Transaktionen und Prognosebuchung die <= Date.Now() sind.
- **Laufender Saldo**
	- Ein laufender Saldo ist immer der Saldo, der bei einer Transaktion oder Prognosebuchung unter Aufsummierung aller vorangegangenen Buchungen inkl dieser aktuellen nach Datum sortiert berechnet.
		- Bei der Datumsberechnung ist zu beachten, dass alle Kontensalden nach Date berechnet werden müssen. Alle Kategorien nach dem Wertstellungsdatum.
- **Monatssaldo (dynamisch rekursiv berechnet)**
	- Der **Monatssaldo** ist der **prognostizierte Endsaldo eines Monats**. Er ergibt sich aus:
	    - dem **Saldo des Vormonats** (inkl. Transaktionen & Prognosen bis inkl. Monatsende),
	    - **plus** allen Transaktionen und Prognosebuchungen mit `valueDate` im aktuellen Monat (positiv wie negativ),
	    - **plus** den CATEGORYTRANSFERS des aktuellen Monats.

	- Diese Berechnung ist **rekursiv**:
	    Der Monatssaldo hängt **immer vom Vormonatssaldo ab**, der wiederum aus dessen Vormonatssaldo abgeleitet wird – und so weiter. Es wird also **monatlich aufaddiert**, ausgehend von einem Startpunkt (z. B. dem Erfassungsbeginn oder Startsaldo).

	- Die Salden „rollen“ über die Monate hinweg:
	    Der **aktuelle Monat** ist im nächsten Rechenschritt der **Vormonat des Folgezeitpunkts**. Dadurch entstehen **kontinuierliche, gleitende Salden** ohne feste Grenzen – ideal für dynamische Monatsvergleiche.

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

### 2. Transaktionen (mittlere Spalte)#
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

### 3. Saldo (rechte Spalte)
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

## Andere Umsetzungshinweise (Umsetzung prüfen)
- EXPENSE und INCOME ohne Kategorie werden in der ganzen Berechnung komplett ignoriert, da nicht auswertbar.
- Überall auf Date basierende Berechnungen müssen auf valueDate umgestellt werden. Das gilt nur für die Kategorienaldenberechnung. Nicht die Berechnung der Kontosalden.
- Alle Buchungen müssen im PlanningService (Planbuchung & Prognosebuchungen) und im TransactionService (reale Transaktionen) stattfinden. Keinen Categoryservice oder BudgetService für Betragsbewegungen nutzen. Budgetservice ist hauptsächlich für die Darstellung der BudgetMonthCard da.
- Alle Prognosebuchungen müssen 24 Monate in die Zukunft interpoliert werden, sofern sie endlos sind
- Ein INCOME verursacht grundsätzlich eine Verrechnung mit verfügbaren Mitteln. Anpassungen dieser INCOME Buchungen darüberhinaus, verursachen ebenso Nachverrechnungen mit verfügbaren Mitteln. Diese Verrechnungsmethode ist grundsätzlich korrekt. Sie darf aber explizit nur dann vorkommen, wenn eine Kategorie der Kategoriegruppe "Einnahme" bebucht wird. Wenn eine INCOME Buchung auf eine Ausgabenkategorie kommt, darf keine Kategorieverschiebung nach verfügbare Mittel erfolgen.
- Konzentriere Dich darauf, dass die montlyBalanceStore korrekt gefüttert wird. Ich verweise nochmals oben auf die kontinuierlichen Monatsüberläufe ("Rollen") der Monatsendsalden zum Folgemonat.

Falls Du offene Fragen haben solltest, stelle sie sofort nach Deiner Analyse. Wenn Du noch weitere Dateien benötigst außer denen, die ich hier mit prompte, sag mir vor der Umsetzung bescheid. Prüfe die Situation für die Umsetzung sehr sorgfältig. Wir haben es hier mit einem sehr komplexen Berechnungskonstrukt zu tun. Aber Du bist für sowas absoluter Experte.
