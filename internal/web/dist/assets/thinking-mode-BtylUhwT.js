const n="Denkmodus",e="Tiefes Denken aktivieren für bessere komplexe Schlussfolgerungsfähigkeit — Qualität bei Mathematik, Programmierung und Analyse verbessern",t={body:`## Was ist der Denkmodus?

Der Denkmodus (erweitertes Denken, Gedankenkette) ermöglicht der AI, « Schritt für Schritt zu denken » bevor sie antwortet.

## Wann verwenden?

| Aufgabentyp | Empfohlen? |
|-------------|------------|
| Komplexe Mathematik/Logik | ✅ Ja |
| Mehrstufige Programmierung | ✅ Ja |
| Datenanalyse | ✅ Ja |
| Einfache Q&A | ❌ Nein (Token-Verschwendung) |
| Alltagsgespräch | ❌ Nein |

## In HermesDeckX konfigurieren

### Standardmodus
- **thinkingDefault**
  - \`off\` — Kein Denken (Standard)
  - \`minimal\` — Kurzes Denken
  - \`full\` — Vollständiges erweitertes Denken

### Pro Gespräch umschalten
- \`/think\` — Für nächste Nachricht aktivieren
- \`/think off\` — Deaktivieren

## Kostenauswirkung

- **Kurzes Denken:** ~20-50% zusätzliche Tokens
- **Vollständiges Denken:** ~50-200% zusätzliche Tokens

## Konfigurationsfelder

Pfad: \`agents.defaults.thinkingDefault\``},i={name:n,description:e,content:t};export{t as content,i as default,e as description,n as name};
