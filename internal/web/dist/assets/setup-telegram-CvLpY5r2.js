const e="Telegram बॉट सेटअप",n="Telegram बॉट बनाएं और HermesAgent गेटवे से कनेक्ट करें",t={body:`## Telegram बॉट बनाएं

### 1. BotFather से बॉट बनाएं
1. Telegram में @BotFather खोजें
2. \`/newbot\` भेजें
3. बॉट का नाम दर्ज करें
4. यूज़रनेम दर्ज करें (\`bot\` से समाप्त होना चाहिए)
5. टोकन कॉपी करें

### 2. HermesDeckX में कॉन्फ़िगर करें
1. «सेटिंग सेंटर → चैनल»
2. «चैनल जोड़ें» → Telegram
3. टोकन पेस्ट करें
4. सेव करें

### 3. कनेक्शन सत्यापित करें
- चैनल 🟢 दिखाना चाहिए
- बॉट को संदेश भेजें
- बॉट को जवाब देना चाहिए`,steps:["@BotFather खोजें","/newbot से बॉट बनाएं","टोकन कॉपी करें","HermesDeckX में Telegram चैनल जोड़ें","टोकन पेस्ट करें और सेव करें"]},r={name:e,description:n,content:t};export{t as content,r as default,n as description,e as name};
