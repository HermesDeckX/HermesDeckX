const e="Telegram-Bot einrichten",n="Einen Telegram-Bot erstellen und mit dem HermesAgent-Gateway verbinden",t={body:`## Telegram-Bot erstellen

### 1. Bot über BotFather erstellen
1. @BotFather in Telegram suchen
2. \`/newbot\` senden
3. Bot-Name eingeben
4. Benutzername eingeben (muss auf \`bot\` enden)
5. Token kopieren

### 2. In HermesDeckX konfigurieren
1. « Einstellungszentrum → Kanäle »
2. « Kanal hinzufügen » → Telegram
3. Token einfügen
4. Speichern

### 3. Verbindung prüfen
- Telegram-Kanal sollte 🟢 anzeigen
- Nachricht an den Bot senden
- Bot sollte antworten

## Konfigurationsfelder

Pfad: \`channels[].type: "telegram"\``,steps:["@BotFather in Telegram finden","/newbot senden","Token kopieren","Telegram-Kanal in HermesDeckX hinzufügen","Token einfügen und speichern"]},r={name:e,description:n,content:t};export{t as content,r as default,n as description,e as name};
