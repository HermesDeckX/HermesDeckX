const n="Шлюз не запущен",e="Решение проблем, когда шлюз HermesAgent не запускается или работает некорректно",s={question:"Что делать, если шлюз не запускается или работает некорректно?",answer:`## Шаги по устранению

### 1. Проверить статус шлюза
Индикатор в верхней части панели HermesDeckX:
- 🟢 Работает — Нормально
- 🔴 Остановлен — Необходим запуск
- 🟡 Запускается — Ожидание

### 2. Проверить использование порта
Шлюз по умолчанию использует порт 18789.
- **Windows**: \`netstat -ano | findstr 18789\`
- **macOS/Linux**: \`lsof -i :18789\`

### 3. Проверить файл конфигурации
- \`~/.hermesdeckx/config.yaml\` должен существовать и иметь корректный формат

### 4. Проверить версию Node.js
- HermesAgent требует Node.js 18+
- \`node --version\` для проверки
- Рекомендуется Node.js 22 LTS

### 5. Проверить логи
- Расположение: \`~/.hermesdeckx/logs/\`

### 6. Переустановить
- \`npm install -g hermesagent@latest\`

## Быстрое решение

Нажмите «Запустить шлюз» в HermesDeckX или выполните \`hermesagent gateway run\`.`},t={name:n,description:e,content:s};export{s as content,t as default,e as description,n as name};
