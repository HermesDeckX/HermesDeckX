const n="إعداد المهام المجدولة",e="استخدام مهام heartbeat للتحقق التلقائي وإرسال الملخصات وتنفيذ الصيانة",t={body:`## ما هو Heartbeat؟

Heartbeat هو نظام المهام المجدولة في HermesAgent:
- إرسال ملخص أخبار يومي
- فحص البريد كل ساعة
- إنشاء تقارير أسبوعية

## الإعداد في HermesDeckX

«مركز الإعدادات → الجدولة»:

- **enabled** — تفعيل heartbeat
- **intervalMinutes** — فترة التنفيذ
- **model** — يُنصح بنموذج اقتصادي

### ساعات النشاط
- **activeHoursStart/End** — مثلاً 8:00-22:00
- **timezone** — المنطقة الزمنية

## حقول الإعدادات

المسار: \`heartbeat\``,steps:["مركز الإعدادات → الجدولة","تفعيل heartbeat","ضبط الفترة والأوقات","اختيار النموذج","كتابة التعليمات","حفظ"]},a={name:n,description:e,content:t};export{t as content,a as default,e as description,n as name};
