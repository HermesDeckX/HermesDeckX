const n="Быстрый старт",e="Установите, настройте и начните первый разговор со шлюзом HermesAgent за 5 минут",t={body:`## Предварительные требования

- Node.js 22+ (рекомендуется LTS)
- API-ключ AI-провайдера (OpenAI / Anthropic / Google и т.д.)

## Шаги

### 1. Установить HermesAgent

\`\`\`bash
npm install -g hermesagent@latest
\`\`\`

### 2. Инициализировать конфигурацию

\`\`\`bash
hermesagent init
\`\`\`

### 3. Запустить шлюз

\`\`\`bash
hermesagent gateway run
\`\`\`

### 4. Подключить HermesDeckX

Откройте HermesDeckX и введите адрес шлюза.

### 5. Подключить чат-канал (опционально)

1. «Центр настроек → Каналы»
2. Выбрать тип канала
3. Ввести токен бота
4. Сохранить`,steps:["Установить Node.js 22+","npm install -g hermesagent@latest","hermesagent init","Ввести API-ключ","hermesagent gateway run","Подключить HermesDeckX"]},s={name:n,description:e,content:t};export{t as content,s as default,e as description,n as name};
