const e="Sicherung und Wiederherstellung",n="HermesAgent-Konfiguration, Gedächtnis und Gesprächsverlauf sichern, mit Unterstützung für Migration auf neue Geräte",r={body:`## Was sichern?

| Element | Pfad | Wichtigkeit |
|---------|------|------------|
| Konfiguration | \`~/.hermesdeckx/config.yaml\` | Essentiell |
| Agenten-Konfig | \`~/.hermesdeckx/agents/\` | Essentiell |
| Gedächtnisdateien | \`~/.hermesdeckx/memory/\` | Wichtig |
| Sitzungsverlauf | \`~/.hermesdeckx/sessions/\` | Optional |
| Zugangsdaten | \`~/.hermesdeckx/credentials/\` | Wichtig |

## Sicherungsmethoden

### Methode 1: Manuell
\`\`\`bash
cp -r ~/.hermesdeckx ~/hermesdeckx-backup-$(date +%Y%m%d)
\`\`\`

### Methode 2: CLI
\`\`\`bash
hermesagent config export > meine-sicherung.yaml
\`\`\`

### Methode 3: HermesDeckX UI
« Konfiguration exportieren » am unteren Rand des Einstellungszentrums.

## Wiederherstellen

1. HermesAgent installieren
2. Dateien nach \`~/.hermesdeckx/\` kopieren
3. Gateway starten

## Konfigurationsfelder

Pfad: \`~/.hermesdeckx/\``,steps:["Sicherungsumfang bestimmen","Sicherung durchführen","Sicher aufbewahren","Zur Wiederherstellung nach ~/.hermesdeckx/ kopieren"]},s={name:e,description:n,content:r};export{r as content,s as default,n as description,e as name};
