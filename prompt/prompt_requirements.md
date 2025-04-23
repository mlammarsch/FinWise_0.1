Ich möchte das Formular src\components\rules\RuleForm.vue bearbeiten.
1.) Tausche bei den Aktionsausführungen für die Tagauswahl die Komponente aus. Statt der dort vorhandenen soll TagSearchableDropdown.vue eingebaut werden.
2.) Tausche bei den Aktionsausführungen für die Kategorie setzen die Komponente aus. Statt der dort vorhandenen soll src\components\ui\SelectCategory.vue eingebaut werden.
2.1) Tausche bei den Aktionsausführungen für die Konto setzen die Komponente aus. Statt der dort vorhandenen soll src\components\ui\SelectAccount.vue eingebaut werden.
3.) Es soll ein neuer Empfänger gesetzt werden können. Nimm also als mögliche weitere Aktion diesen Prozess mit auf. Nutze als Auswahl Combo die src\components\ui\SelectRecipient.vue Komponente.
4.) In den Bedingungen sind komischerweise im ersten Dropdown auch die Bedingungen mit beinhaltet. Weswegen gibt es dann das mittlere Dropdown, bei dem man zusätzlich enthält oder ist, etc. eingeben kann? Baue dies zu einer Art Kombination aus. Das erste Dropdown beschreibt die Source.
Sourcen:
- Empfänger
- Datum
- Wertstellung
- Betrag
- Kategorie
- Beschreibung
- Konto
Als Bedingung soll unterschieden werden, ob Number, Datum oder String:
Schränke die Möglichkeiten entsprechend ein.
String:
- ist
- enthält
- beginnt mit
- endet mit
Number:
- ist
- größer
- größer gleich
- kleiner
- kleiner gleich
- ungefähr (Toleranz 10%)
Datum:
- ist
- größer
- größer gleich
- kleiner
- kleiner gleich
Bei Konto, Kategorie und Empfänger "ist" muss anstelle dem freien Textfeld das jeweilige Select eingeblendet werden, was sich aus existierenden Elementen im Store bedient.
5.) Wenn mit "Regel testen" eine ncht gespeicherte Regel getestet wird, sollte die Regel die momentanen einstellungen benutzen und virtuell ausführen (nicht physisch). Sollte die Regel greifen, erstelle ein Modal  mit der Liste der ersten 20 Buchungen (Transaktionen), auf die die Regel zutreffen würde. Fasse irgendwo in dem Dialog auch zusammen, auf wie viele Buchungen insgesamt, die Regel zutreffen würde zum gegebenen Zeitpunkt.
Felder in der Liste:
- Datum
- Konto
- Empfänger
- Kategorie
- Betrag (CurrencyDisplay Komponente; kein integer)
- Notiz
- Reconciled y/n

Ich gebe Dir auch den TransactionService und -Store mit, in dem vermutlich die Rules greifen werden. Den genauen Ablauf kenne ich nicht. Wenn Dir noch Files fehlen, bitte melde Dich.
