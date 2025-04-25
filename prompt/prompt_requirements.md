Ich habe eben über das Category Transfermodal eine CATEGORYTRANSFER ausgelöst. Diese wurde richtig übernommen. Nur, die BudgetMonthCard schreibt nur in der Instanz des jeweiligen Buchungsmonat die richtige Saldoberechnung vor. Ich konnte auch feststellen, dass diese Berechnung nicht im MontlyBalaceStore ankommt.
Im Folgemonat-Instanz der BudgetMonthCard steht der Saldo wieder auf Null, obwohl eigentlich die Implementation es vorsehen müsste, den Saldo in den Folgemonat zu übergeben. Siehe Bild im Anhang. Der Saldo der Herkunftskategorie verfügbare Mittel in der BudgetMonthHeaderCard stimmt komischerweise.
Siehe die Verkettung der BudgetMonthcard auch in der BudgetView.

Hier die Beschreibung, wie sich die drei Spalten in der BudgetMonthcard verhalten sollten:

## Salden  (Erklärung)
Ein Konto- als auch Kategoriensaldo ist "immer die Summe aller Transaktionen zuzüglich aller Prognosebuchungen (fällige oder nicht fällige)". Jedes Konto hat Salden und jede Kategorie hat Salden, die wir wie folgt genauer betrachten
### Unterscheidung Salden
- **Aktueller Saldo**
	- Dies ist der Date.Now() Saldo
	- Er wird also berechnet aus allen Transaktionen und Prognosebuchung die %3C= Date.Now() sind.
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

## Eigentliche Berechnungen der BudgetMonthCard (Umsetzung prüfen)
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

# Deine Aufgabe
Im MonthlyBalanceSore wird eine so genannte projectedbalance als auch eine normal balance geführt. Sowohl für ACCOUNT als auch CATEGORY. Das ist unnötig. Wir haben das bereits mit delegatoren vereinheitlicht. Allerdings werden diese Delegator Funktionen auch mit Parameter aufgerufen, die möglicherweise über die Delegatoren nicht mehr funktionieren? Fakt ist, dass im Budgetservice diese Funktion:
  // SALDO-SPALTE: Vormonatssaldo + Budget + Transaktionen
  const saldo = previousMonthSaldo + totalBudget + transactionsAmount;
  keine Salden >0 zurückgibt.
  Im Store stehen aber definitiv Salden drin.
  Irgend eine Berechnung kommt nicht im Store an, bzw. die Getter rufen den Saldo nicht ab. Die Struktur der Setter und Getter muss gesamtheitlich vereinheitlicht werden von der BudgetView/inkl der BudgetMonthCard, über Service bis hinunter zum Store.
