const e="Kostenoptimierung",n="AI-Nutzungskosten umfassend senken — Modellauswahl, Komprimierung, Heartbeat und Werkzeugstrategie",t={body:`## Kostenoptimierungs-Checkliste

### 1. Richtiges Modell wählen
- Alltag: GPT-4o-mini / Claude Haiku / Gemini Flash
- Komplexe Aufgaben: GPT-4o / Claude Sonnet
- Nicht standardmäßig das teuerste Modell verwenden

### 2. Komprimierung aktivieren
- Threshold 30000-50000
- memoryFlush aktivieren

### 3. Heartbeat optimieren
- Günstigstes Modell für Heartbeat
- Intervall erhöhen (30-60 Min)
- Aktive Zeitfenster konfigurieren

### 4. Subagenten-Strategie
- Günstige Modelle für Subagenten
- Tiefe und Anzahl begrenzen

### 5. Werkzeugsteuerung
- \`minimal\` oder \`messaging\` Profil
- Unnötige Werkzeuge deaktivieren

### 6. Sitzungsverwaltung
- Täglicher Auto-Reset
- Regelmäßig \`/compact\`

## Konfigurationsfelder

Pfade: \`agents.defaults.model\`, \`agents.defaults.compaction\`, \`heartbeat\`, \`tools.profile\``},i={name:e,description:n,content:t};export{t as content,i as default,n as description,e as name};
