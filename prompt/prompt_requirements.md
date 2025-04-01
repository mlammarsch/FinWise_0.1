**Fehleranalyse und Korrektur der Saldo- und Transaktionsberechnung**

Ein Test mit initialen Salden und Transaktionen von 0€ hat folgendes ergeben:

*   **Kindkategorien:** Saldo wird korrekt angezeigt.
*   **Mutter- und Eigenständige Kategorien:** Saldo wird mit 0€ angezeigt, was fehlerhaft ist. Mutterkategorie sollte 20€ und eigenständige Kategorie 10€ anzeigen.

**Ursachenanalyse:**

Das Problem scheint darin zu liegen, dass bei der Saldo-Berechnung Kategorie-Transfers nicht berücksichtigt werden. Im Gegensatz dazu werden ACCOUNTTRANSFERS berücksichtigt.

**Korrektur der Saldo-Berechnung:**

Die korrigierte Saldo-Berechnung muss folgende Transaktionsarten berücksichtigen:

*   **ACCOUNTTRANSFER:**  Geldtransfers zwischen Konten.
*   **CATEGORYTRANSFER:** Geldtransfers zwischen Kategorien.
*   **EXPENSES:** Ausgaben.
*   **INCOME:** Einnahmen.

Die **korrigierte Saldo Formel** lautet demnach:

`Saldo aktueller Monat = Saldo Vormonat + ACCOUNTTRANSFER + CATEGORYTRANSFER + EXPENSES + INCOME`

**Korrektur der Transaktions-Berechnung:**

Entgegen meiner vorherigen Aussage (Spezifikationsfehler) dürfen **CATEGORYTRANSFER**s nicht in den Einzeltransaktionen auftauchen. Die angezeigten Transaktionen bestehen also nur aus Konto Transaktionen und Ausgaben und Einnahmen. Der korrigierte Text:

Die korrigierte Formel lautet demnach:

`Transaktionen aktueller Monat = ACCOUNTTRANSFER + EXPENSES + INCOME`

**Berücksichtigung von Eltern-Kind-Beziehungen (Wiederholung zur Vollständigkeit):**

Die obigen Formeln gelten für **Eigene Kategorien** sowie Buchungen, welche direkt auf die **Elternkategorie** gebucht wurden. Ist eine Elternkategorie vorhanden so werden die Ergbnisse der direkten Kinder in die Anzeige mit einberechnet.

Die korrigierte Saldo-Berechnung für die **Elternkategorie** mit Berücksichtigung der Kindkategorien lautet:

`Saldo aktueller Monat = Saldo Vormonat (Mutterkategorie) + ACCOUNTTRANSFER + CATEGORYTRANSFER + EXPENSES + INCOME (Mutterkategorie) + Σ Saldo aktueller Monat (alle Kindkategorien)`

`Transaktionen aktueller Monat = ACCOUNTTRANSFER + EXPENSES + INCOME (Mutterkategorie) + Σ Transaktionen aktueller Monat (alle Kindkategorien)`

**Test-Szenario:**

*   **Eigene Kategorie:** Summe aus aus ACCOUNTTRANSFER + EXPENSES + INCOME + Saldo Vormonat
*   **Elternkategorie:** Summe aus Saldo aller direkten Kinder. Zusätzlich wie Eigene Kategorie die ACCOUNTTRANSFER + EXPENSES + INCOME + Saldo Vormonat der Elternkategorie selbst.
*   **Kindskategorie:** Summe aus ACCOUNTTRANSFER + EXPENSES + INCOME + Saldo Vormonat

**Zusammenfassung:**

Die Saldo-Berechnung muss um die Einbeziehung von `CATEGORYTRANSFER`s erweitert werden. Die Transaktionsberechnung sollte weiterhin nur `ACCOUNTTRANSFER`, `EXPENSES` und `INCOME` berücksichtigen. Elter- und Kindkategorien addieren gemäß der Beschreibung ihren Wert. Dies sollte die fehlerhaften Saldo-Anzeigen für Mutter- und eigenständige Kategorien beheben.
