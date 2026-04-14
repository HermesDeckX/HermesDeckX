const e="النسخ الاحتياطي والاستعادة",n="نسخ احتياطي لإعدادات وذاكرة وسجل محادثات HermesAgent مع دعم الترحيل لأجهزة جديدة",s={body:`## ماذا تنسخ؟

| العنصر | المسار | الأهمية |
|--------|--------|--------|
| ملف الإعدادات | \`~/.hermesdeckx/config.yaml\` | أساسي |
| إعدادات الوكلاء | \`~/.hermesdeckx/agents/\` | أساسي |
| ملفات الذاكرة | \`~/.hermesdeckx/memory/\` | مهم |
| سجل الجلسات | \`~/.hermesdeckx/sessions/\` | اختياري |
| بيانات الاعتماد | \`~/.hermesdeckx/credentials/\` | مهم |

## طرق النسخ الاحتياطي

### الطريقة 1: يدوي
\`\`\`bash
cp -r ~/.hermesdeckx ~/hermesdeckx-backup-$(date +%Y%m%d)
\`\`\`

### الطريقة 2: CLI
\`\`\`bash
hermesagent config export > backup.yaml
\`\`\`

### الطريقة 3: واجهة HermesDeckX
«تصدير الإعدادات» أسفل مركز الإعدادات.

## الاستعادة

1. تثبيت HermesAgent
2. نسخ الملفات إلى \`~/.hermesdeckx/\`
3. تشغيل البوابة`,steps:["تحديد نطاق النسخ","تنفيذ النسخ","التخزين بأمان","للاستعادة، انسخ إلى ~/.hermesdeckx/ وأعد التشغيل"]},c={name:e,description:n,content:s};export{s as content,c as default,n as description,e as name};
