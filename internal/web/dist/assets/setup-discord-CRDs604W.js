const n="إعداد بوت Discord",e="إنشاء بوت Discord وربطه ببوابة HermesAgent",o={body:`## إنشاء بوت Discord

### 1. إنشاء تطبيق Discord
1. اذهب إلى discord.com/developers/applications
2. «New Application»
3. صفحة «Bot» → «Add Bot»

### 2. الحصول على التوكن
1. «Reset Token»
2. انسخ التوكن
3. فعّل «Message Content Intent» (مهم!)

### 3. دعوة البوت للسيرفر
1. «OAuth2 → URL Generator»
2. اختر صلاحية \`bot\`
3. انسخ الرابط وافتحه

### 4. الإعداد في HermesDeckX
1. «مركز الإعدادات → القنوات»
2. «إضافة قناة» → Discord
3. الصق التوكن
4. احفظ`,steps:["إنشاء تطبيق في Discord","إنشاء بوت ونسخ التوكن","تفعيل Message Content Intent","إنشاء رابط الدعوة","إضافة قناة Discord في HermesDeckX","لصق التوكن وحفظ"]},s={name:n,description:e,content:o};export{o as content,s as default,e as description,n as name};
