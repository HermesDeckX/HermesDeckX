const n="البوابة لا تعمل",e="حل مشاكل عدم بدء تشغيل بوابة HermesAgent أو عملها بشكل غير طبيعي",s={question:"ماذا أفعل إذا لم تبدأ البوابة أو عملت بشكل غير طبيعي؟",answer:`## خطوات الحل

### 1. التحقق من حالة البوابة
مؤشر في أعلى لوحة تحكم HermesDeckX:
- 🟢 تعمل — طبيعي
- 🔴 متوقفة — تحتاج تشغيل
- 🟡 جارٍ البدء — في الانتظار

### 2. التحقق من استخدام المنفذ
البوابة تستخدم المنفذ 18789 افتراضياً.
- **Windows**: \`netstat -ano | findstr 18789\`
- **macOS/Linux**: \`lsof -i :18789\`

### 3. التحقق من ملف الإعدادات
- \`~/.hermesdeckx/config.yaml\` يجب أن يكون موجوداً وبتنسيق صحيح

### 4. التحقق من إصدار Node.js
- HermesAgent يتطلب Node.js 18+
- تحقق بـ \`node --version\`
- يُنصح بـ Node.js 22 LTS

### 5. التحقق من السجلات
- الموقع: \`~/.hermesdeckx/logs/\`

### 6. إعادة التثبيت
- \`npm install -g hermesagent@latest\`

## حل سريع

انقر «تشغيل البوابة» في HermesDeckX أو نفّذ \`hermesagent gateway run\`.`},t={name:n,description:e,content:s};export{s as content,t as default,e as description,n as name};
