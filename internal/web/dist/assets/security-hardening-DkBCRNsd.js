const n="تعزيز الأمان",o="إعداد أمني شامل — التحكم في الوصول وتقييد الأدوات وسياسات الشبكة والتشفير",a={body:`## قائمة إعداد الأمان

### 1. تفعيل المصادقة
- وضع \`token\` (موصى) أو \`password\`
- **إلزامي للوصول من خارج localhost**

### 2. إعداد تشفير TLS
- تفعيل TLS للوصول الخارجي

### 3. تقييد الوصول للقنوات
لكل قناة:
- **allowFrom** — معرفات مستخدمين محددة فقط
- **dmPolicy** — تقييد DM
- **groupPolicy** — التحكم في ردود المجموعة

### 4. تقييد الأدوات
- ملف تعريف مناسب (\`full\` / \`coding\` / \`messaging\` / \`minimal\`)
- قائمة deny للأدوات الخطيرة
- exec allowlist للأوامر

### 5. تفعيل صندوق الرمل
- Docker sandbox لتنفيذ الكود
- Workspace في \`ro\` افتراضياً

## مستويات الأمان الموصاة

| المستوى | السيناريو | الإعداد |
|---------|----------|--------|
| **أساسي** | شخصي، محلي | افتراضي |
| **قياسي** | LAN / Tailscale | Auth + allowFrom |
| **عالي** | شبكة عامة | Auth + TLS + allowFrom + sandbox + قيود |

## حقول الإعدادات

المسارات: \`gateway.auth\`، \`gateway.tls\`، \`channels[].allowFrom\`، \`tools.profile\`، \`agents.defaults.sandbox\``},l={name:n,description:o,content:a};export{a as content,l as default,o as description,n as name};
