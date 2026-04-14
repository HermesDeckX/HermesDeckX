const e="Geplante Aufgaben einrichten",n="Heartbeat-Aufgaben verwenden, damit die AI automatisch Prüfungen, Zusammenfassungen und Wartungsarbeiten durchführt",t={body:`## Was sind Heartbeat-Aufgaben?

Heartbeat ist das System für geplante Aufgaben in HermesAgent:
- Tägliche Nachrichtenzusammenfassung senden
- Stündlich E-Mails prüfen
- Wöchentliche Berichte erstellen

## In HermesDeckX konfigurieren

« Einstellungszentrum → Planung »:

- **enabled** — Heartbeat aktivieren
- **intervalMinutes** — Ausführungsintervall
- **model** — Günstiges Modell empfohlen

### Aktive Zeitfenster
- **activeHoursStart/End** — z.B. 8:00-22:00
- **timezone** — Zeitzone

## Konfigurationsfelder

Pfad: \`heartbeat\``,steps:["Einstellungszentrum → Planung","Heartbeat aktivieren","Intervall und Zeitfenster konfigurieren","Heartbeat-Modell auswählen","Anweisungen erstellen","Speichern"]},a={name:e,description:n,content:t};export{t as content,a as default,n as description,e as name};
