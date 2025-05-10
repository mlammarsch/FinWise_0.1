Prüfe im AccountService oder im Store. Ein Konto ind seine Zuordnung in eine Kontogruppe scheint nicht mandantenpersistent zu sein. Immer, wenn der Mandant umgeschalten wird, geht die Gruppenzuordnung verloren. Das Konto ist nur in der AccountAdminView sichtbar, jedoch keiner Gruppe mehr zugehörig. Das ist ein Bug. Behebe ihn. Debugge es bevor dur den code ausgibst. Accountgruppen sollen im Übrigen genauso Tenantabhängig sein. Unterschiedliche Tenants können unterschiedliche Kontogruppen besitzen.

Dies war die erste Analyse. Nimm die Informationen auf und prüfe, ob das die Abhilfe schafft:

**Problembeschreibung:**
Die Zuordnung eines Kontos zu einer Kontogruppe geht verloren, wenn der Mandant (Tenant) gewechselt wird. Das Konto ist danach zwar noch in der `AdminAccountsView` sichtbar, aber keiner Gruppe mehr zugeordnet. Zusätzlich sollen auch Kontogruppen selbst mandantenabhängig sein, d.h. unterschiedliche Mandanten können unterschiedliche Kontogruppen haben.

**Ursache (Vermutung):**
Konten und Kontogruppen sowie deren Zuordnungen werden derzeit nicht korrekt mandantenspezifisch im LocalStorage gespeichert und geladen. Beim Mandantenwechsel werden die Daten des neuen Mandanten nicht korrekt (oder gar nicht) für Konten und Kontogruppen nachgeladen, oder die globalen Daten überschreiben die mandantenspezifische Logik.

**Geplante Änderungen zur Behebung:**

1.  **Mandantenabhängige Speicherung von Konten und Kontogruppen:**
    *   Ich werde die Datei `src/utils/storageKey.ts` (neu erstellen oder anpassen, falls sie schon existiert, aber nicht mandantenfähig ist) so modifizieren, dass sie mandantenspezifische Storage-Keys generieren kann (z.B. `finwise_tenant_${tenantId}_accounts`).
    *   Im `accountStore.ts`:
        *   Die Funktionen `loadAccounts`, `saveAccounts` und `saveAccountGroups` werden angepasst, um diese mandantenspezifischen Keys zu verwenden. Sie holen sich die `currentTenantId` aus dem `sessionStore`.
        *   Beim Laden (`loadAccounts`) werden Standard-Kontogruppen nur dann initial angelegt, wenn für den *aktuell aktiven Mandanten* noch keine Gruppen vorhanden sind.
        *   Wenn kein Mandant aktiv ist, werden die `accounts` und `accountGroups` Arrays geleert.

2.  **Koordiniertes Neuladen der Daten beim Mandantenwechsel:**
    *   Ich werde eine Datei `src/services/DataService.ts` erstellen (oder die bestehende anpassen). Diese Service-Datei wird eine zentrale Funktion `reloadTenantData()` enthalten.
    *   Diese `reloadTenantData()` Funktion wird:
        *   Die `currentTenantId` aus dem `sessionStore` beziehen.
        *   Für jeden mandantenabhängigen Store (z.B. `accountStore`, `categoryStore`, etc.) eine Methode aufrufen, die die Daten für den aktuellen Mandanten initialisiert. Im `accountStore` könnte dies eine Methode wie `initializeTenantData()` sein, die zuerst die lokalen Arrays (`accounts`, `accountGroups`) leert und dann die mandantenspezifische `loadAccounts()`-Methode aufruft.
    *   In `sessionStore.ts`:
        *   Die Funktion `loadSession()` wird nach dem erfolgreichen Laden und Setzen von `currentTenantId` die `DataService.reloadTenantData()` aufrufen.
    *   In `TenantService.ts`:
        *   Die Funktion `switchTenant()` wird nach einem erfolgreichen Mandantenwechsel ebenfalls `DataService.reloadTenantData()` aufrufen. (Dies ist bereits teilweise angedeutet im Code, wird aber nun explizit mit der neuen `DataService`-Logik verbunden).

3.  **Anpassung der Stores für das Neuladen:**
    *   `accountStore.ts`:
        *   Eine neue Methode `initializeTenantData()` (oder ähnlich benannt) wird implementiert. Sie leert `accounts.value` und `accountGroups.value` und ruft dann die (jetzt mandantenfähige) `loadAccounts()`-Methode auf.
        *   Die bisherige `reset()`-Funktion wird ggf. angepasst oder durch `initializeTenantData()` in ihrer Rolle für den Mandantenwechsel abgelöst.

4.  **Logging-Anpassungen:**
    *   In allen modifizierten Dateien werde ich die Log-Einträge gemäß deinen Spezifikationen ( `debugLog`, `infoLog`, `warnLog`, `errorLog`) überprüfen und ggf. anpassen, inklusive der formatierten Ausgabe von Objekten und der Nennung von Klarnamen.

5.  **Kommentare:**
    *   Ich werde sicherstellen, dass alle geänderten Dateien und relevanten neuen Funktionen/Methoden die geforderten Kommentare (Dateipfad, Beschreibung, Props/Emits für Komponenten, Funktionsbeschreibungen) enthalten.

**Betroffene/Neu zu erstellende Dateien (basierend auf den bereitgestellten Informationen und dem Plan):**

*   `src/utils/storageKey.ts` (wird erstellt/angepasst)
*   `src/services/DataService.ts` (wird erstellt/angepasst)
*   `src/stores/accountStore.ts` (wird stark überarbeitet)
*   `src/stores/sessionStore.ts` (wird angepasst, um `DataService` zu nutzen)
*   `src/services/TenantService.ts` (wird angepasst, um `DataService` zu nutzen)

Die Views (`AccountsView.vue`, `AdminAccountsView.vue`) sollten von den Änderungen im Store profitieren und nach einem Mandantenwechsel automatisch die korrekten Daten anzeigen, ohne dass direkte Änderungen an ihnen zwingend notwendig sind, es sei denn, die Fehlerquelle liegt auch dort (was aktuell nicht vermutet wird).

Bitte gib mir ein "Go", wenn du mit diesem Plan einverstanden bist, oder lass mich wissen, wenn ich Aspekte falsch verstanden habe oder etwas ergänzt werden soll. Ich benötige keine weiteren Dateien, um mit diesen Änderungen zu beginnen.
