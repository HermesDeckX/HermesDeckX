const n="Discord-Bot einrichten",e="Einen Discord-Bot erstellen und mit dem HermesAgent-Gateway verbinden",t={body:`## Discord-Bot erstellen

### 1. Discord-Anwendung erstellen
1. discord.com/developers/applications öffnen
2. « New Application » klicken
3. « Bot »-Seite → « Add Bot »

### 2. Token erhalten
1. « Reset Token » klicken
2. Token kopieren
3. « Message Content Intent » aktivieren (wichtig!)

### 3. Bot zum Server einladen
1. « OAuth2 → URL Generator »
2. \`bot\`-Berechtigung auswählen
3. URL kopieren und öffnen

### 4. In HermesDeckX konfigurieren
1. « Einstellungszentrum → Kanäle »
2. « Kanal hinzufügen » → Discord
3. Token einfügen
4. Speichern

## Konfigurationsfelder

Pfad: \`channels[].type: "discord"\``,steps:["Discord-Anwendung erstellen","Bot erstellen und Token kopieren","Message Content Intent aktivieren","Einladungslink generieren","Discord-Kanal in HermesDeckX hinzufügen","Token einfügen und speichern"]},i={name:n,description:e,content:t};export{t as content,i as default,e as description,n as name};
