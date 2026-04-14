const n="البداية السريعة",e="ثبّت وهيّئ وابدأ أول محادثة مع بوابة HermesAgent في 5 دقائق",t={body:`## المتطلبات

- Node.js 22+ (يُنصح بإصدار LTS)
- مفتاح API من مزود ذكاء اصطناعي (OpenAI / Anthropic / Google)

## الخطوات

### 1. تثبيت HermesAgent

\`\`\`bash
npm install -g hermesagent@latest
\`\`\`

### 2. تهيئة الإعدادات

\`\`\`bash
hermesagent init
\`\`\`

### 3. تشغيل البوابة

\`\`\`bash
hermesagent gateway run
\`\`\`

### 4. ربط HermesDeckX

افتح HermesDeckX وأدخل عنوان البوابة.

### 5. ربط قناة دردشة (اختياري)

1. «مركز الإعدادات → القنوات»
2. اختر نوع القناة
3. أدخل توكن البوت
4. احفظ`,steps:["تثبيت Node.js 22+","npm install -g hermesagent@latest","hermesagent init","إدخال مفتاح API","hermesagent gateway run","ربط HermesDeckX"]},s={name:n,description:e,content:t};export{t as content,s as default,e as description,n as name};
