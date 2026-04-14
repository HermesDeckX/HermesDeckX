const n="تحسين التكاليف",t="تقليل تكاليف استخدام AI بشكل شامل — اختيار النموذج والضغط وheartbeat واستراتيجية الأدوات",e={body:`## قائمة تحسين التكاليف

### 1. اختيار النموذج المناسب
- يومياً: GPT-4o-mini / Claude Haiku / Gemini Flash
- مهام معقدة: GPT-4o / Claude Sonnet
- لا تستخدم أغلى نموذج افتراضياً

### 2. تفعيل الضغط
- Threshold 30000-50000
- تفعيل memoryFlush

### 3. تحسين heartbeat
- أرخص نموذج لـ heartbeat
- زيادة الفترة (30-60 دقيقة)
- إعداد ساعات النشاط

### 4. استراتيجية الوكلاء الفرعيين
- نماذج رخيصة للوكلاء الفرعيين
- تحديد العمق والعدد

### 5. التحكم في الأدوات
- ملف تعريف \`minimal\` أو \`messaging\`
- تعطيل الأدوات غير الضرورية

### 6. إدارة الجلسات
- إعادة تعيين تلقائي يومي
- \`/compact\` دوري

## حقول الإعدادات

المسارات: \`agents.defaults.model\`، \`agents.defaults.compaction\`، \`heartbeat\`، \`tools.profile\``},a={name:n,description:t,content:e};export{e as content,a as default,t as description,n as name};
