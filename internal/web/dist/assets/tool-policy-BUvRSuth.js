const n="سياسة صلاحيات الأدوات",e="مقتطف إعداد صلاحيات الأدوات: التحكم في نطاق ومستوى وصول الأدوات المتاحة للذكاء الاصطناعي",o={snippet:`## أمثلة سياسة الأدوات

### صلاحيات دنيا (دردشة فقط)
\`\`\`json
{ "tools": { "profile": "minimal" } }
\`\`\`

### مساعد برمجة
\`\`\`json
{
  "tools": {
    "profile": "coding",
    "deny": ["exec.rm", "exec.sudo"],
    "exec": { "allowlist": ["node", "npm", "git", "python"] }
  }
}
\`\`\`

### وصول كامل + قيود مخصصة
\`\`\`json
{
  "tools": {
    "profile": "full",
    "deny": ["browser"],
    "web": { "search": { "enabled": true }, "fetch": { "enabled": false } }
  }
}
\`\`\``},t={name:n,description:e,content:o};export{o as content,t as default,e as description,n as name};
