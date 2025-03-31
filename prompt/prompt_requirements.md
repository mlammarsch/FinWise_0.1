Wir arbeiten in der src\components\budget\BudgetMonthCard.vue und öffnen mit Rechtsklick ein Kontext Dropdown. Darin sind derzeit 2 Optionen.
Fülle auf von... umd Transferiere zu....

Anforderung 1: src\components\ui\SelectCategory.vue
1. Wenn 2 der Komponenten in einem Dialog liegen und eine davon bekommt den Fokus, dann öffnen beide Kategorien ihre Listen. Können die Selects isoliert voneinander arbeiten?
2. Bei der Navigation mit den Pfeilen läuft die Liste nicht passend mit. Die selektierte Option muss immer im Sichtfeld bleiben.
3. Im Augenblick, wenn ich ESC drücke, wird das ganze Modal geschlossen. Lass mal das Modal noch offen. Mit Esc möchte ich bei Fcus der SelectCategories deren Liste schließen und den Suchbegriff leeren, sowie den Fokus in dem Suchfeld belassen.

Anforderung 2:
Speziell im der src\components\budget\CategoryTransferModal.vue sollen die SelectCategories vorgefiltert werden. Es dürfen keine Einnahmekategorien erscheinen. Das soll das Modal bereits vorfiltern und die Einnahmekategorien als Array an die SelectCategory "FilterOutArray" übergeben.

Anforderung 3:
Bei Klick auf Transferiere zu... wird der Mode "transfer" an das Modal src\components\budget\CategoryTransferModal.vue gegeben. Außerdem wird auch die aktuelle KategorieID mitgegeben. Es muss auch der passende Monat übergeben werden (Auftrag an die BudgetMonthCard.vue ) von dem aus das Dropdown eröffnet wurde, da wir diesen Wert im Dialog weiter verarbeiten müssen.

Das geöffnete Modal soll bei Mode "transfer" nun folgende Funktionen nach dem Öffnen durchführen:
1. In das Select Von Kategorie (fromCategoryId) muss die übergebene ID initial an die SelectCategoryKomponente gegeben werden, damit da die aktuell benutzte Kategorie in von Kategorie vorbelegt wird.
2. Setze in das Datumsfeld den letzten Tag des übergebenen Monats. Bau eine Funktion, die den übergebenen Monat in ein korrektes Datum umrechnet.

Anforderung 3:
Bei Klick auf Fülle auf von... wird der Mode "fill" an das Modal src\components\budget\CategoryTransferModal.vue gegeben. Außerdem wird auch die aktuelle KategorieID mitgegeben. Es muss auch der passende Monat übergeben werden (Auftrag an die BudgetMonthCard.vue ) von dem aus das Dropdown eröffnet wurde, da wir diesen Wert im Dialog weiter verarbeiten müssen.

Das geöffnete Modal soll bei Mode "fill" nun folgende Funktionen nach dem Öffnen durchführen:
1. In das Select Zu Kategorie (toCategoryId) muss die übergebene ID initial an die SelectCategoryKomponente gegeben werden, damit da die aktuell benutzte Kategorie in zu Kategorie vorbelegt wird.
2. Setze in das Datumsfeld den letzten Tag des übergebenen Monats. Bau eine Funktion, die den übergebenen Monat in ein korrektes Datum umrechnet.
