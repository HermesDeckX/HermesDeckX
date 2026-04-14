const n="مشكلة صلاحيات صندوق الرمل",o="حل مشاكل صلاحيات Docker sandbox غير الكافية أو رفض الوصول للملفات أو فشل بدء الحاوية",s={question:"ماذا أفعل عند مشاكل الصلاحيات في وضع صندوق الرمل؟",answer:`## مشاكل الصلاحيات الشائعة

### 1. Docker غير مثبت أو لا يعمل
- هل Docker Desktop مثبت ويعمل؟
- **Windows**: افتح Docker Desktop
- **macOS**: افتح Docker Desktop
- **Linux**: \`sudo systemctl start docker\`

### 2. فشل بدء الحاوية
- صورة Docker غير موجودة: \`docker pull\`
- ذاكرة غير كافية
- مساحة قرص غير كافية

### 3. رفض الوصول للملفات
- تحقق من وضع الوصول: \`none\` / \`ro\` / \`rw\`
- إذا احتجت الكتابة، غيّر إلى \`rw\`

### 4. مشاكل الوصول للشبكة

### 5. صلاحيات التنفيذ

## البدائل

- تعطيل sandbox مؤقتاً (بيئات موثوقة فقط)
- استخدام Podman كبديل

## حقول الإعدادات

المسار: \`agents.defaults.sandbox\``},e={name:n,description:o,content:s};export{s as content,e as default,o as description,n as name};
