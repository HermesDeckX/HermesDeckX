const e="Modell antwortet nicht",n="Fehlerbehebung wenn das AI-Modell nicht antwortet oder die Zeitüberschreitung erreicht — API-Schlüssel, Kontingent und Netzwerk prüfen",r={question:"Was tun, wenn das AI-Modell nicht antwortet oder die Zeitüberschreitung erreicht?",answer:`## Fehlerbehebungsschritte

### 1. API-Schlüssel prüfen
- Schlüssel eingegeben und korrekt?
- Nicht abgelaufen oder widerrufen?
- Schlüssel in der Anbieterkonsole neu generieren

### 2. Kontingent und Guthaben prüfen
- **OpenAI** — platform.openai.com
- **Anthropic** — console.anthropic.com
- **Google** — Cloud Console

### 3. Modellverfügbarkeit prüfen
- Modellname korrekt geschrieben?
- Manche Modelle erfordern spezielle Zugriffsrechte
- Anderes Modell zum Testen verwenden

### 4. Netzwerkverbindung prüfen

### 5. Fallback-Modell verwenden
- Fallback-Kette für hohe Verfügbarkeit konfigurieren

## Schnellfix

Diagnose → model.reachable prüfen.`},t={name:e,description:n,content:r};export{r as content,t as default,n as description,e as name};
