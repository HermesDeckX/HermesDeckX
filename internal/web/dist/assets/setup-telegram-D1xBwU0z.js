const e="Настроить бота Telegram",n="Создать бота Telegram и подключить его к шлюзу HermesAgent",t={body:`## Создание бота Telegram

### 1. Создать бота через BotFather
1. Найдите @BotFather в Telegram
2. Отправьте \`/newbot\`
3. Введите имя бота
4. Введите username (должен заканчиваться на \`bot\`)
5. Скопируйте токен

### 2. Настроить в HermesDeckX
1. «Центр настроек → Каналы»
2. «Добавить канал» → Telegram
3. Вставить токен
4. Сохранить

### 3. Проверить подключение
- Канал должен показывать 🟢
- Отправьте сообщение боту
- Бот должен ответить

## Поля конфигурации

Путь: \`channels[].type: "telegram"\``,steps:["Найти @BotFather","/newbot для создания бота","Скопировать токен","Добавить канал Telegram в HermesDeckX","Вставить токен и сохранить"]},r={name:e,description:n,content:t};export{t as content,r as default,n as description,e as name};
