# Aufgabenbeschreibung.
Deine Aufgabe ist, alles was ich in der DOM Klammer <Alter Prompt/> stehen habe im Code zu reviewen, ob das vollständig umgesetzt ist. Es ist aus der letzten Umsetzungssession der Promt gewesen.
## Fehler, die ich feststellen konnte
- Offenbar gibt es keine Gegenbuchungen gibt, wenn es sich um Plantransfers handelt. Im Store ist nur die Hauptbuchung zu sehen.
- Weiterhin ist in der src\components\planning\PlanningTransactionForm.vue das Abspeichern der toCategoryId (CategoryTransfer) oder toAccountId (AccountTransfer). Wird nur bei einem Update der Planung und nochmaligem Setzen richtig abbgespeichert. Ich vermute bei der Neuerstellung ist ein Fehler bei der richtigen to* Zuteilung. Das muss gefixt werden.

Vor Codeaausgabe, erstelle mir erst eine Liste von Auffälligkeiten, die Dein Review ergeben hat. Ich habe alle betroffenen Services unten angeheftet, sowie alle betroffenen UI vue Dateien. Gehe auch mal in die src\utils\planningTransactionUtils.ts. Die war bei der Erstellung der Aufgabe nicht dabei und enthält möglicherweise weitere Anhaltspunkte.

<Alter Prompt>
# Beschreibung, wie Buchungen typisiert sind und was der Unterschied zwischen Transaktion und Prognosebchung ist.

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

---

# Fehlersuche und erwartete Anpassung
## Wie stellt sich das Fehlverhalten mir dar?
Ich habe gerade versucht, eine Buchung – eine Planbuchung im `PlanningService` – anzulegen, die dem Typ *CategoryTransfer* angehört.
Ich habe bei der Ausführung dieser Buchung bzw. in der Prognoseansicht festgestellt, dass offenbar nur eine Buchung angelegt wird, die aussieht wie eine *Income*-Buchung.

## Todo
Es gilt also im ersten Schritt zu prüfen:
- Wenn eine Planbuchung des Typs *CategoryTransfer* angelegt wird:
  → **Ist diese Buchung korrekt typisiert?**
- Sie muss `transactionType = CategoryTransfer` haben.
- Das muss bereits bei der Erstellung der Planbuchung korrekt gesetzt werden. (PlanningService oder src\components\planning\PlanningTransactionForm.vue)

Achtung:
- **Parallel prüfen in `src/components/planning/PlanningTransactionForm.vue`**, ob dort die Typisierung sauber an den `PlanningService` übergeben wird.
- Falls in PlanningTransactionForm.vue etwas hinterlegt ist, das its Businesslogik und sollte in den PlanningService übertragen werden.

Weiter:
- Überprüfen, ob auch alle anderen Buchungstypen – Einnahmen und Ausgaben – entsprechend als `Income` oder `Expense` typisiert sind.
- Dasselbe bei einem *AccountTransfer*: Dort muss der Typ `AccountTransfer` korrekt gesetzt werden, auch wenn es sich nur um eine Prognosebuchung handelt.


Wenn der PlanningService korrekt arbeitet:
- Prüfe, ob bei einer *Planbuchung* des Typs *CategoryTransfer* auch die **Gegenbuchung** richtig prognostiziert wird.
  → **Vergleich als Vorlage:** Das Verhalten eines *CategoryTransfer* im echten `TransactionService`.
  → Dieses Verhalten muss im Prognosebereich nachgebildet werden.
  → Sonst stimmen die Berechnungen des *ProjectedSaldo* (BalanceService) nicht.

Falls auch dort kein Fehler:
- Weiter in den BudgetService gehen.

**Spezifikation beachten:**
- *CategoryTransfers* → **Budget-Spalte** (erste Spalte).
- *Income* und *Expense* → **Prognose-Spalte** (zweite Spalte).

Wenn auch dort alles korrekt ist:
- Abschließend noch den BalanceService prüfen.

---

# Änderungsanforderung – **PlanningTransactionForm.vue**

Vergleichsmodul: **TransactionForm.vue**
Hinweis: Fokus liegt ausschließlich auf Planbuchungen!

## Verhalten bei EXPENSE und INCOME

- Der Dialog ist bereits korrekt formatiert im Template.
- **Empfänger** (`payee`) soll **kein Pflichtfeld** mehr sein. Validation entfernen!
- Beim Speichern müssen **toCategoryId** und **toAccountId** geleert werden, falls zuvor befüllt worden.
  → Annahme: Konto wird in **accountId**, Kategorie in **categoryId** gespeichert. Bitte bestätigen!
- Bei fehlerhaftem Payload laut Validierung: **Fehlermeldung** ausgeben.

## Verhalten bei ACCOUNTTRANSFER

- Der Dialog ist korrekt formatiert im Template.
- Statt Kategorie wird **toAccountId** angezeigt (Zielkonto).
- Beim Speichern müssen **toCategoryId** und **categoryId** geleert werden, falls zuvor befüllt worden.
  → Annahme: Quelle und Ziel werden in **accountId** und **toAccountId** gespeichert. Bitte bestätigen!
- Fehlerhaftes Payload → **Fehlermeldung** ausgeben.
- Problem aktuell: **toAccountId wird beim ersten Speichern nicht gesetzt, sondern erst, wenn ich die Planbuchung erneut im Bearbeitungsmodus öffne (Unterschied Update/Create?)**.
- Betrag darf **größer oder kleiner 0**, aber **nicht 0** sein.
- Transferbetrag wird dem **accountId** zugeordnet (analog TransactionForm.vue).
- Beim Speichern eines ACCOUNTTRANSFER:
  - Es muss **zusätzlich eine Plangegenbuchung** erstellt und korrekt zugeordnet werden (analog zum Transactionservice).
  - Annahme: **Derzeit wird keine Gegenbuchung erzeugt**.
- Beim Löschen:
  - **PlanningView**: Nur die zugehörige **Prognosebuchung** löschen (Vorkommnis, datumsbezogen).
  - **AdminPlanningView**: Gesamte **Planung und Folgeprognosen** löschen.

---

## Verhalten bei CATEGORYTRANSFER

- Der Dialog ist korrekt formatiert im Template.
- Statt Konto wird **toCategoryId** angezeigt (Zielkategorie).
- Beim Speichern müssen **toAccountId** und **accountId** geleert werden, falls zuvor befüllt worden.
  → Annahme: Quell- und Zielkategorie werden in **categoryId** und **toCategoryId** gespeichert. Bitte bestätigen!
- Fehlerhaftes Payload → **Fehlermeldung** ausgeben.
- Problem aktuell: **toCategoryId wird beim ersten Speichern nicht gesetzt, sondern erst, wenn ich die Planbuchung erneut im Bearbeitungsmodus öffne (Unterschied Update/Create?)**.
- Betrag darf **größer oder kleiner 0**, aber **nicht 0** sein.
- Transferbetrag wird der **categoryId** zugeordnet.
  Hinweis: Umsetzung in realen Buchungen erfolgt über **CategoryTransferModal.vue**, nicht über TransactionForm.vue.
- Beim Speichern eines CATEGORYTRANSFER:
  - Es muss **zusätzlich eine Plangegenbuchung** erstellt und korrekt zugeordnet werden.
  - Annahme: **Derzeit wird keine Gegenbuchung erzeugt**.
- Beim Löschen:
  - **PlanningView**: Nur die zugehörige **Prognosebuchung** löschen (datumsbezogen).
  - **AdminPlanningView**: Gesamte **Planung und Folgeprognosen** löschen.

---



# Änderungsanforderung – **AdminPlanningView** und **PlanningView**

---

## Grundverhalten (bleibt bestehen)

- **AdminPlanningView**: Alle Planbuchungen werden **unabhängig vom Planungsdatum** gelistet.
- **PlanningView**: Nur das **Prognosevorkommnis** pro **gefiltertem Datum** wird angezeigt.

---

## Änderungen in der AdminPlanningView

### Tabellenstruktur

- Spalte **Name** bleibt erhalten.
- **Neue Spalte:** **Buchungstyp** (zwischen Name und Empfänger).
- Zusätzliche Spalten einfügen:
  - **Empfänger** (Payee)
  - **Quelle** (anstelle Konto)
  - **Ziel** (anstelle Kategorie)
  - **Intervall** (Wiederholungsfrequenz)
  - **Startdatum** (StartDate)

**Spaltenüberschriften Konto/Kategorie → umbenennen in Quelle/Ziel.**

### Verhalten bei Transfers

- **AccountTransfer**:
  - **Quelle**: Quellkonto (**accountId**)
  - **Ziel**: Zielkonto (**toAccountId**)
- **CategoryTransfer**:
  - **Quelle**: Quellkategorie (**categoryId**)
  - **Ziel**: Zielkategorie (**toCategoryId**)

### Behandlung von Gegenbuchungen

- Nur die **Original-Planbuchung** anzeigen.
- Beim **Löschen oder Bearbeiten** einer Transferbuchung: Immer auch die verknüpfte **Gegenbuchung** automatisch löschen bzw. aktualisieren.

---

## Änderungen in der PlanningView

### Tabellenstruktur

- Spalte **Name** bleibt erhalten.
- **Neue Spalte:** **Buchungstyp** (zwischen Name und Empfänger).
- Spalten **Konto** und **Kategorie** umbenennen in **Quelle** und **Ziel**.

### Verhalten bei Transfers

- Nur die **Original-Planbuchung** anzeigen.
- Beim **Löschen oder Bearbeiten** einer Buchung: Immer auch die verknüpfte **Gegenbuchung** automatisch löschen bzw. aktualisieren.

---

## Darstellung der neuen Spalte "Buchungstyp"

| Typ               | Icon                                    | Farbe    |
|-------------------|-----------------------------------------|----------|
| AccountTransfer    | `mdi:bank-transfer`                     | Warning  |
| CategoryTransfer   | `mdi:briefcase-transfer-outline`        | Warning  |
| Expense            | `mdi:bank-transfer-out`                 | Error    |
| Income             | `mdi:bank-transfer-in`                  | Success  |

- Icons in der Spalte "Buchungstyp" anzeigen, keine Textdarstellung.
- Farbige Icons je nach Buchungstyp für bessere visuelle Trennung.
- Icons mit Tooltip und den deutschen Typen Bezeichnungen ausstatten
</Alter Prompt>
