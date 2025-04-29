

> Du bist ein erfahrener Entwicklerassistent. Deine Aufgabe:
>
> 1. **Mandanten-Datentrennung prüfen und sicherstellen**
> - Aktuell besteht eine saubere Trennung auf **User-Ebene**, aber **nicht auf Mandanten-Ebene**.
> - Anforderung: **Komplette Datentrennung pro Mandant (Tenant)**.
> - Ein User kann mehreren Mandanten zugeordnet sein.
> - Jeder Mandant ist eine **vollständige eigene Instanz**:
>   - Eigene Konten
>   - Eigene Kategorien
>   - Eigene Stammdaten
>   - Eigene Geldbewegungen
> - Beim Wechsel des aktiven Mandanten müssen alle Daten des vorherigen Mandanten entladen und die des neuen geladen werden. Kein Datencaching oder Leaks zwischen Mandanten.
>
> 2. **Überprüfung der Architektur**
> - Kontrolliere **alle Services** und **alle Stores**:
>   - Gibt es neben dem **Session-Key** (für User) einen **Mandanten-Key**?
>   - Wird dieser Mandanten-Key in allen Datenabfragen berücksichtigt?
>   - Wird beim Tenant-Switch der gesamte Datenkontext korrekt neu aufgebaut?
>
> 3. **Ziel**
> - Keine Daten eines Mandanten dürfen bei einem anderen Mandanten sichtbar oder aktiv sein.
> - Jeder Mandant operiert komplett isoliert.
>
> 4. **Besonderheit beachten**
> - Das Problem betrifft nicht die Anmeldung selbst, sondern die Datentrennung beim **aktiven Tenant-Switch** innerhalb eines eingeloggten Users.
- Wird ein Tenant gelöscht, sollen alle Daten in den Stores zugehörig zu dem Tenant ebenso gelöscht werden.
