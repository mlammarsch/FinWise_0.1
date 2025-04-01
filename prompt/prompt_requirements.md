Änderung am CategoryTransfermodal.
1) Wenn der Dialog aus der Category Transactionlist aufgeht, soll gleich das Betragsfeld fokusiert werden und der Betrag komplett markiert sein.
2) Warum wird der "Mode" nicht an das Modal übergeben. Im Log steht mode = undefined? Wird das nicht benötigt? Das wäre doch durchgängiger, wenn es einen Mode gäbe? Wie das auch bei den Modes fill und transfer schon gegeben war.
3) Überschrift ändern zu "Kategorietransfer bearbeiten" ändern. Übernimm bitte alle Änderungen und gib mir die Datei vollständig aus.

Änderungen in der SelectCategory:
1) Prüfe bitte, inwieweit es möglich ist in der SelectCategory in der Spalte der aktuellen Salden, den Saldo des aktuellen Monats von month.DateNow() abzubilden. Hintergrund. Es kann sein, dass in einer Kategorie bereits in Monaten in der Zukunft liegend bereits Buchungen vorliegen, die dann fälschlicherweise im Saldo mit eingerechnet wären. Stelle die Saldenanzeige dahingehend um. Stand - aktuell laufender Monat. Ohne, dass man diese Prop in die Komponente nehmen muss. Einfach von der Systemzeit ausgehend.
