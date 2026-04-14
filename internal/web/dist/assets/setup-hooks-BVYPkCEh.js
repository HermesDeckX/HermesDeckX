const e="Webhooks einrichten",n="Webhooks verwenden, um externe Ereignisse (GitHub, Monitoring-Alerts usw.) zur AI-Verarbeitung zu senden",i={body:`## Was sind Hooks?

Hooks ermöglichen externen Systemen, Ereignisse an HermesAgent zu senden. Die AI kann sie automatisch verarbeiten.

## Häufige Szenarien

| Szenario | Quelle | AI-Verarbeitung |
|----------|--------|----------------|
| Code-Review | GitHub Webhook | AI reviewt PR und kommentiert |
| Server-Alerts | Monitoring | AI analysiert und benachrichtigt |
| Formulareinreichung | Web-Formular | AI verarbeitet und antwortet |

## In HermesDeckX konfigurieren

1. « Einstellungszentrum → Hooks »
2. « Hook hinzufügen »
3. System generiert eindeutige Webhook-URL
4. Event-Mapping konfigurieren
5. URL im externen System eintragen

## Konfigurationsfelder

Pfad: \`hooks\``,steps:["Einstellungszentrum → Hooks","Neuen Hook erstellen","Mapping-Template definieren","Webhook-URL kopieren","URL im externen System eintragen"]},r={name:e,description:n,content:i};export{i as content,r as default,n as description,e as name};
