
Entwickle einen CSV-Importer für die FinWise-Anwendung, der es Benutzern ermöglicht, Transaktionsdaten aus CSV-Dateien in das System zu importieren. Der Importer soll über einen neuen Menüpunkt "Import" im Dropdown-Menü der Account Card in der Account View zugänglich sein. Durch Auswahl dieses Menüpunkts soll ein Modal-Dialog geöffnet werden, der den Importprozess steuert.

**FUNKTIONALITÄT:**

1.  **Datei-Upload:**
    *   Der Modal-Dialog soll eine Möglichkeit bieten, eine CSV-Datei vom lokalen Dateisystem über ein Explorer-Fenster auszuwählen und hochzuladen.

2.  **CSV-Konfiguration:**
    *   Der Dialog soll ein Formular enthalten, um die CSV-Datei zu konfigurieren:
        *   **Delimiter:** Ein Feld zur Auswahl des Delimiters (Trennzeichen). Es soll die Möglichkeit geben, einen benutzerdefinierten, einstelligen Delimiter anzugeben.
        *   **Datumsformat:** Ein Feld zur Auswahl des Datumsformats. Der Importer soll in der Lage sein, verschiedene Datumsformate zu erkennen und in das interne FinWise-Format zu konvertieren. Nutze und erweitere ggf. die bestehenden `Formatters` oder `DateUtils` (prüfe beide auf Relevanz) für die Datumsformatierung.
        *   **Titelzeile:** Eine Checkbox, um anzugeben, ob die CSV-Datei eine Titelzeile enthält.
        *   **Merge mit bestehenden Transaktionen:** Eine Checkbox, um anzugeben, ob Transaktionen, die bereits im System vorhanden sind und mit den importierten Daten übereinstimmen (gleiches Datum, Betrag und ähnlicher Empfänger), gemerged werden sollen (siehe Punkt 6).

3.  **Datenvorschau und Bearbeitung:**
    *   Nach dem Hochladen und Konfigurieren der CSV-Datei soll eine Tabelle angezeigt werden, die die erkannten Daten aus der CSV-Datei darstellt.
    *   Die Tabelle soll folgende Spalten enthalten:
        *   **Buchungsdatum:** (entspricht Wertstellungsdatum)
        *   **Betrag:** (positiv für Einnahmen, negativ für Ausgaben)
        *   **Notizen:**
        *   **Empfänger (CSV):** (Zeigt den Empfänger, wie er in der CSV-Datei steht)
        *   **Empfänger (FinWise):** (Dropdown-Menü für die Zuordnung, siehe Punkt 4)
        *   **Kategorie (CSV):** (Zeigt die Kategorie, wie sie in der CSV-Datei steht)
        *   **Kategorie (FinWise):** (Dropdown-Menü für die Zuordnung, siehe Punkt 4)
        *   **Importieren/Merge:** Eine Checkbox für jede Zeile. Standardmäßig sollen alle Checkboxen aktiviert sein (Import). Bei potenziellen Merges ändert sich die Bedeutung je nach Fall.
            *   Wenn die Option "Merge mit bestehenden Transaktionen" aktiv ist *und* eine passende Transaktion gefunden wurde, verwandelt sich die Checkbox in:
                *   **Tooltip/Erklärung bei Hover:** Eine Beschreibung, dass eine ähnliche Transaktion gefunden wurde und durch Aktivieren der Checkbox die neue Transaktion mit der bereits vorhandenen Transaktion gemerged wird. Hier ist es wichtig, deutlich zu machen, dass durch das Mergen eine neue Transaktion angelegt wird, die die Daten der CSV Datei übernimmt, aber die "alte" Transaktion weiterhin existiert.
                *   **Anzeige der potenziell zu mergenden Transaktion:** Unterhalb der Zeile mit der CSV-Transaktion soll die entsprechende Zeile aus dem Transaction Store (also die bereits existierende Transaktion) angezeigt werden, sodass der Benutzer die beiden Transaktionen vergleichen kann. Die angezeigte Transaktion soll (z.B. durch unterschiedliche Hintergrundfarbe) als "bereits vorhanden" gekennzeichnet werden.
            *   Wenn die Option "Merge mit bestehenden Transaktionen" aktiv ist *und keine* passende Transaktion gefunden wurde, soll die Checkbox wie gewohnt als "Importieren" behandelt werden.
            * Checkbox deaktiviert = Transaktion wird NICHT importiert und NICHT gemerged.
    *   Die UI-Komponenten des Modals sollen sich designtechnisch am Form "PlanningTransactionForm" orientieren. Zusätzlich kann die "RuleForm" (src\components\rules\RuleForm.vue) und die "Rule Admin View" als Designvorlage dienen.

4.  **Empfänger- und Kategorie-Mapping und Ähnlichkeitssuche:**
    *   **Bedingte Anzeige der Dropdowns:** Die Spalten "Empfänger (FinWise)" und "Kategorie (FinWise)" werden *nur* angezeigt, wenn in der CSV-Konfiguration ein entsprechendes Mapping für Auftraggeber (Empfänger) oder Kategorie aktiviert wurde.
    *   **Empfänger (FinWise) - Spalte:**
        *  Für jede Zeile wird ein Dropdown angezeigt, dessen Inhalt die bereits vorhandenen Empfänger sind.
        *  **Automatischer Vorschlag:** Direkt nach dem Laden der Daten wird *für jede Zeile* eine Ähnlichkeitssuche durchgeführt. Wenn ein ähnlicher Empfänger gefunden wird, wird dieser Empfänger *automatisch im Dropdown vorausgewählt*.
        *  **"Neu erstellen"-Option:** Das Dropdown-Menü soll auch einen Eintrag "Neu erstellen" enthalten. Wenn KEIN ähnlicher Empfänger gefunden wird (oder die Ähnlichkeit zu gering ist), soll die Option "Neu erstellen" *automatisch vorausgewählt* sein.  Der Prozess für "Neu erstellen" soll dem in der `SelectRecipient.vue` Komponente entsprechen.
        *   **Manuelle Merge-Option:** Unterhalb des Dropdown-Menüs sollen die restlichen Ergebnisse der Ähnlichkeitssuche (falls vorhanden) angezeigt werden, mit der Option, den neuen Empfänger mit einem der vorgeschlagenen, ähnlichen Einträge zusammenzuführen ("Merge"). Eine Checkbox neben jedem Suchergebnis könnte die Merge-Option aktivieren.
    *   **Kategorie (FinWise) - Spalte:** (Funktioniert analog zur Empfänger (FinWise) - Spalte, nur für Kategorien)
        *  Für jede Zeile wird ein Dropdown angezeigt, dessen Inhalt die bereits vorhandenen Kategorien sind.
        *  **Automatischer Vorschlag:** Direkt nach dem Laden der Daten wird *für jede Zeile* eine Ähnlichkeitssuche durchgeführt. Wenn eine ähnliche Kategorie gefunden wird, wird diese Kategorie *automatisch im Dropdown vorausgewählt*.
        *  **"Neu erstellen"-Option:** Das Dropdown-Menü soll auch einen Eintrag "Neu erstellen" enthalten. Wenn KEINE ähnliche Kategorie gefunden wird (oder die Ähnlichkeit zu gering ist), soll die Option "Neu erstellen" *automatisch vorausgewählt* sein. Siehe auch hier: src\components\ui\SelectCategory.vue.
        *   **Manuelle Merge-Option:** Unterhalb des Dropdown-Menüs sollen die restlichen Ergebnisse der Ähnlichkeitssuche (falls vorhanden) angezeigt werden, mit der Option, die neue Kategorie mit einer der vorgeschlagenen, ähnlichen Einträge zusammenzuführen ("Merge"). Eine Checkbox neben jedem Suchergebnis könnte die Merge-Option aktivieren.

5.  **Import-Prozess:**
    *   Nachdem der Benutzer die zu importierenden Transaktionen ausgewählt, die Konfiguration überprüft und ggf. neue Empfänger/Kategorien erstellt oder mit bestehenden zusammengeführt hat, soll ein "Importieren"-Button den Import-Prozess starten.
    *   Während des Imports soll ein visueller Indikator (z.B. eine "Eieruhr") angezeigt werden, um den Benutzer über den Fortschritt zu informieren.
    *   Der Import soll *synchron* ablaufen.
    *   **Nach Abschluss des Imports:**
        *   Soll nicht nur ein Informationsbanner angezeigt werden, sondern eine Tabelle, die alle importierten Transaktionen und ihre Zuordnungen (Konto, Empfänger, Kategorie) anzeigt. Diese Tabelle soll sich am Design der Tabelle in `src\components\rules\RuleForm.vue` orientieren, die anzeigt, welche Regeln auf welche Transaktionen angewendet wurden. Oder auch src\components\transaction\TransactionList.vue bspw.

6.  **Merge-Logik:**
    *   Die Merge-Logik ist nun in Punkt 3 (Datenvorschau und Bearbeitung) beschrieben.

7.  **Fehlerbehandlung:**
    *   Das Buchungsdatum und der Betrag sind Pflichtfelder. Wenn diese Felder fehlen oder ungültig sind, soll eine Fehlermeldung angezeigt und der Import der betreffenden Zeile verhindert werden. Nutze einen Validator für diese Felder.
    *   Bei anderen Fehlern während des Imports (z.B. ungültiges Datumsformat) soll der Import der betreffenden Zeile ebenfalls verhindert und eine entsprechende Fehlermeldung angezeigt werden.

8.  **Datenbank-Interaktion:**
    *   Alle importierten Transaktionen müssen dem Konto zugeordnet werden, von dem aus der Importer gestartet wurde.
    *   Der Import und die damit verbundenen Aktionen (z.B. Merging, Erstellen neuer Empfänger/Kategorien) müssen über den Service Layer abgewickelt werden.
    *   **Nach dem Import MÜSSEN die Rules ausgeführt werden.** Dies sollte bereits im Transaction-Service implementiert sein/werden.
    *   Nach dem Import müssen die Balance Services (Account und Monthly Balance) entsprechend neu berechnet werden.
    *   **Alle Seiten und Dialoge, die Transaktionsdaten anzeigen (insbesondere Monthly-, Daily-Seiten und Kontoübersicht), müssen nach dem Import aktualisiert werden, um die aktuellen Daten anzuzeigen.**

9.  **Mandantenfähigkeit:**
    *   Stelle sicher, dass bei jeder Buchung der Mandant und der User korrekt berücksichtigt werden. Die Mandantenzugehörigkeit ergibt sich aus dem Konto, dem die Transaktion zugeordnet wird.

**ZUSÄTZLICHE HINWEISE:**

*   Berücksichtige bei der Entwicklung die bestehenden UI-Komponenten und Designrichtlinien der existierenden Dialoge (Farben, Rahmen, Schriftgrößen, Feldlabels aka Fieldset (siehe src\components\planning\PlanningTransactionForm.vue), Validater, etc.).
*   Achte auf eine klare und intuitive Benutzerführung.
*   Der Dialog soll vollständig in deutsch sein.
*   Erstausgabe: Wiederhole zuerst die Anforderung und erkläre bei jedem Punkt, was das für Dich an Veränderungenen bedeutet und welche Dateien Du dafür veränderst oder neu anlegst. Erst nach meinem Go erfolgen dann die Dateiausgaben Deinerseits.
*   Den Importdialog hinterlege am besten in den transaction Ordner.
