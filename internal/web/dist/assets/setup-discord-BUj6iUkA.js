const n="Настроить бота Discord",e="Создать бота Discord и подключить его к шлюзу HermesAgent",s={body:`## Создание бота Discord

### 1. Создать приложение Discord
1. Перейдите на discord.com/developers/applications
2. «New Application»
3. Страница «Bot» → «Add Bot»

### 2. Получить токен
1. «Reset Token»
2. Скопировать токен
3. Включить «Message Content Intent» (важно!)

### 3. Пригласить бота на сервер
1. «OAuth2 → URL Generator»
2. Выбрать разрешение \`bot\`
3. Скопировать URL и открыть
4. Выбрать сервер

### 4. Настроить в HermesDeckX
1. «Центр настроек → Каналы»
2. «Добавить канал» → Discord
3. Вставить токен
4. Сохранить

## Поля конфигурации

Путь: \`channels[].type: "discord"\``,steps:["Создать приложение в Discord","Создать бота и скопировать токен","Включить Message Content Intent","Сгенерировать ссылку-приглашение","Добавить канал Discord в HermesDeckX","Вставить токен и сохранить"]},o={name:n,description:e,content:s};export{s as content,o as default,e as description,n as name};
