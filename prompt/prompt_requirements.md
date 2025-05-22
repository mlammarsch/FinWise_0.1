## Architekturprüfung (Bereich Account und Transaction)
Du musst einheitlich über alle Dateien prüfen, ob die richtige servicelayer Struktur angewendet wird bei allen Teilbereichen der Software.
Ich habe festgestellt, dass die Kontosalden nicht mehr korrekt angezeigt werden in AccountCards und AccountGroupcards. Ich vermute, dass hier einige Dateien noch direkte Storeaufrufe verursachen. In den Stores sollen nur noch CRUD Funktionen vorhanden sein. Alle Geschäftslogiken müssen in die Service Dateien. UI bezugene Komponenten müssen so umgestellt werden, dass sie ausschließlich die Servicekomponenten nehmen. Auch die utils müssen das tun. Prüfe dort auch nochmal die Kompatibilität der accountTransfer.ts und categorytransfer.ts, ob da möglicherweise Dopplungen in den Servicefunktionen enthalten sind. Falls ja, konsolidiere die Funktionen.
Nimm Dir bei der Architekturprüfung den Planning Bereich als Vorbild. Dort ist die Logigverteilung (CRUD im Store; Geschäftslogik im Service) vorbildlich gelöst. Prüfe alle Bereiche. Vor massiiver Veränderungen halte mit mir aber Rücksprache und gib mir einen Risikobericht aus. Siehe auch unten das Thema Beschreibung.

## Fehler in der Transaktionsliste (Filterung)
Prüfe auch die src\components\transaction\TransactionList.vue. Dort greift die Filterpane nicht mehr. Weder die Monatsauswahl, noch die ganzen Dropdowns filtern korrekt. Sie filtern überhaupt nicht. Nur die Volltextsuche funktioniert bei beiden Listen gut. In der src\components\transaction\CategoryTransactionList.vue hingegen funktioniert die Filterpane korrekt.

## Anpassungen der restlichen Architektur gemäß fokgender Analyse
### Zusammengefasste Bewertung & Hinweise
#### Bereiche mit nicht optimal sauberer Layertrennung:
- reconciliationStore: Getter currentBalance und differenceValue enthalten Anzeige-Geschäftslogik (Saldoermittlung).
  - Sollte – falls einheitlich – ins Service-Layer verschoben werden.

- AccountStore und AccountService:
  - Saldo-Berechnung und Balancestatistiken geschehen auf Store-Ebene.
  - Falls weitere Saldotechnik vereinheitlicht werden soll (etwa über Zeiträume/dynamische Anfragen), empfiehlt sich die zentralisierte Bereitstellung über den Service.

- Utils: accountTransfers.ts und categoryTransfer.ts bieten eigene Implementierungen, die (teilweise) redundant zu Servicefunktionen sein können. Im aktuellen Stand wird aber in der UI durchgehend der Service genutzt.

#### Umsetzungsanweisung:

Im Planning und Transaction Bereich ist die Trennung bereits vorbildlich.
Account und Reconciliation Bereich müssen – zur maximalen Klarheit – ebenfalls auf die Service-Fassade zur Berechnung von Anzeige-/Saldo-/Infologik vereinheitlichen.
Filter-Stores und Hilfs-UI-Stores enthalten nur UI-Logik – das ist richtig so.

#### Dopplungen/Redundanzen bei accountTransfer.ts, categoryTransfer.ts:

Diese Utils geben die zentrale Logik direkt an den Service weiter (insbesondere addAccountTransfer und addCategoryTransfer). Aktuell gibt es keine doppelte Fachlogik gegenüber dem Service selbst, jedoch muss man ggf. aufpassen, dass alle Nutzer im Code immer die Servicefunktionen nutzen (und nicht die "alten" Utils).
Wenn in utils und in Service bei den Transfers nun redundate Funktionen existieren, die bspw. im Transactionbereich aus Account heraus oder Planung unterschiedlich sind, möchte ich, dass das einheitlich konsolidiert wird. Die Funktionsaufrufe aus der Planung sind die aktuellen. Allerdings war die Logik der Utils damals voll funktional. Ggf. müssten dann im Service die gleich funktionalen Aufrufe dahingehend ergänzt werden.
