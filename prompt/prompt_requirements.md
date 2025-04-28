# Änderungsanforderungen
## Transaktionserstellungen aus Planbuchungen
1.) Prüfe, ob sichergestellt, dass nur im Falle von forecastOnly=false eine Planbuchung in eine Transaktion übergehnt bei Ausführung. Andernfals wird nur die Instans der Planbuchung gelöscht und bei existierenden Folgebuchungen wäre das neue Datum der Planbuchung das der nächsten Instanz. Gibt es keine Folgebuchung, verschwindet die abgearbeitete Planbuchung ganz aus dem System.
2.) Prüfe, ob sichergestellt ist, dass bei Ausführung der Planbuchungen auch nur aktivierte Planbuchungen berücksichtigt sind. Deaktivierte sollen ignoriert werden, auch wenn es dafür fällige Buchungen gäbe.
3.) Deaktivierte Buchungen dürfen auch nicht saldiert werden im Balance Service. Bei Aktivierung und deaktivierung muss die Kalkulierung der Balance durchgestartet werden, um das System konsistent zu halten.
