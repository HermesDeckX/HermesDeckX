const e="Gedächtnisfunktion fehlerhaft",n="Fehlerbehebung wenn der AI-Assistent sich nicht an frühere Gesprächsinhalte oder Benutzerpräferenzen erinnern kann",t={question:"Was tun, wenn der AI-Assistent sich nicht an frühere Gespräche erinnert?",answer:`## Gedächtnismechanismus verstehen

HermesAgents Gedächtnissystem hat zwei Ebenen:
1. **Sitzungsgedächtnis** — Kontext des aktuellen Gesprächs (automatisch verwaltet)
2. **Dauerhaftes Gedächtnis** — Zwischen Sitzungen gespeicherte Informationen (MEMORY.md-Datei)

## Fehlerbehebungsschritte

### 1. Sitzungsstatus prüfen
- Bei kürzlichem Sitzungsreset wurde der Verlauf gelöscht
- Prüfen Sie, ob Auto-Reset aktiv ist
- Komprimierungseinstellungen prüfen

### 2. Dauerhafte Gedächtniseinstellungen prüfen
- \`memory\`-Tool aktiviert?
- MEMORY.md existiert und hat Inhalt?
- \`memoryFlush\` aktiviert?

### 3. Häufige Probleme

**AI vergisst Präferenzen**: Sagen Sie explizit « Merke dir: Ich mag X »

**Gespräch fühlt sich unterbrochen an**: \`compaction.threshold\` erhöhen

## Konfigurationsfelder

Pfade: \`agents.defaults.compaction\`, \`tools.memory\``},s={name:e,description:n,content:t};export{t as content,s as default,n as description,e as name};
