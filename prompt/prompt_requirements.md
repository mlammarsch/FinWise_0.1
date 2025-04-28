# Implementierungsanforderung: User- und Tenant-Management mit LocalStorage, bcryptjs und UUID

---

## 1. Zielsetzung
Erweitere die bestehende App (Vue 3 + Pinia + LocalStorage) um ein echtes **User- und Tenant-System**:

- User-Login mit Passwort (lokal gehasht).
- Verwaltung mehrerer eigener Mandanten (Tenants).
- Mandanten sind vollständige Instanzen der App-Daten.
- Wechsel zwischen Tenants ohne Logout.
- Alle Daten tenant-getrennt.
- Lokale Datenhaltung, später API- und Token-kompatibel.

---

## 2. Technische Anforderungen

### 2.1 User-Struktur
| Feld        | Typ     |
| ----------- | ------- |
| id          | UUID (über installiertes `uuid`-Modul) |
| username    | String  |
| email       | String  |
| passwordHash | bcrypt-Hash (`bcryptjs`) |
| createdAt   | ISO8601 Timestamp |
| updatedAt   | ISO8601 Timestamp |

- Passwort-Hashing erfolgt lokal über **`bcryptjs`**.
- UUID wird generiert mit `v4()` aus **installiertem `uuid`-Modul** (`import { v4 as uuidv4 } from 'uuid'`).

### 2.2 Tenant-Struktur
| Feld        | Typ     |
| ----------- | ------- |
| id          | UUID (über `uuid`) |
| tenantName  | String  |
| userId      | UUID |
| createdAt   | ISO8601 Timestamp |
| updatedAt   | ISO8601 Timestamp |

- Jeder Tenant gehört genau einem User.
- Keine gemeinsamen Mandanten.

---

## 3. Datenhaltung

- **Eine einzige LocalStorage-/IndexedDB-Datenbank**.
- Alle Datensätze referenzieren `userId` + `tenantId`.
- Keine getrennten Datenbanken pro Tenant.

---

## 4. UI- und Routing-Flow

| Schritt | Beschreibung |
|--------|--------------|
| Login  | Username + Passwort-Eingabe. |
| Tenant-Auswahl | Bestehenden Tenant wählen oder neuen Tenant erstellen. |
| Dashboard | Zugriff auf die Daten des aktiven Tenants. |
| Tenant-Wechsel | Wechsel zwischen Tenants möglich ohne Logout. |
| Logout | Manuelles Abmelden möglich. LocalStorage bleibt erhalten. |

- Router-Guards absichern: Ohne aktiven User und Tenant keine Dashboard-Ansicht.
- Für den Tenantwechsel würde sich eine ComboBox Komponente nach dieser Vorlage eignen: src\components\ui\SelectRecipient.vue
- Mir ist generell wichtig, dass Du Dich bei Formularerstellung am Design der Dateien src\views\admin\AdminRecipientsView.vue und src\components\ui\SelectRecipient.vue hältst. Schau Dir dort auch eventuelle Komponenteneinbindungen an.

---

## 5. CRUD-Funktionalität für Tenants

- **Create:** Neuen Tenant anlegen.
  - Pflichtprüfung: Existiert Basiskategorie **"Verfügbare Mittel"**? Falls nicht → automatisch anlegen.
- **Read:** Alle eigenen Tenants laden.
- **Update:** Tenant-Name ändern.
- **Delete:** Tenant löschen inkl. aller zugehörigen Daten (hartes Löschen).
  - **Sicherheitsabfrage:** Über vorhandene Komponente `src/components/ui/ConfirmationModal.vue` einbauen.

Hinweis: Zwecks Formular Layout bietet sich der src\views\admin\AdminRecipientsView.vue as Vorlage an. Anstelle Verwendet in Buchungen dann eben Erstellungs- und Updatedatum anzeigen. Das würde das CRUD Formular rund machen.

---

## 6. Technische Details

| Thema                  | Umsetzung |
|------------------------|------------|
| UUID-Generierung       | `uuidv4()` aus installiertem `uuid`-Modul. |
| Passwort-Hashing       | `bcryptjs.hash(password, saltRounds)` |
| Password-Verification  | `bcryptjs.compare(password, passwordHash)` |
| Tokens (später)        | Strukturen für `accessToken` und `refreshToken` im UserStore vorbereiten, aktuell leer. |
| Store-Struktur         | Alle relevanten Stores anpassen auf `userId` + `tenantId`. |
| Service-Layer          | `UserService`, `TenantService`, `SessionService` implementieren. |
| Routing                | Guards für Auth und Tenant-Auswahl zwingend einbauen. |
| Error-Handling         | Klare Fehlertexte bei falschen Logins, fehlendem Tenant etc. |

---

## 7. Kritische Punkte

- Tenant-Löschung: Alle referenzierten Daten vollständig und sauber löschen.
- Keine toten Objekte im LocalStorage hinterlassen.
- UUIDs und bcrypt konsistent und performant einsetzen.
- Store-Initialisierung tenant- und userbezogen sicherstellen.


## 8. Ergänzungen zum Ausgabeverhalten wie in Systemprompt angegeben.
Da es sich um sehr viele Dateiausgaben andeln wird, empfehle ich eine iterative Vorgehensweise. Bei großen Dateien immer nach einer Datei eine Pause einlegen und von mir ein "weiter" anfordern. Kleinere Dateien dürfen auch 2 am Stück ausgegeben werden. Zu Beginn eine Liste aller Dateien ausgeben, die Du vorsiehst auszugeben.
