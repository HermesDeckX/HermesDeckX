const n="टूल अनुमति नीति",e="टूल अनुमति कॉन्फ़िगरेशन स्निपेट: परिदृश्य के अनुसार AI टूल्स का दायरा और एक्सेस स्तर नियंत्रित करें",o={snippet:`## टूल नीति उदाहरण

### न्यूनतम अनुमतियां (केवल चैट)
\`\`\`json
{ "tools": { "profile": "minimal" } }
\`\`\`

### प्रोग्रामिंग सहायक
\`\`\`json
{
  "tools": {
    "profile": "coding",
    "deny": ["exec.rm", "exec.sudo"],
    "exec": { "allowlist": ["node", "npm", "git", "python"] }
  }
}
\`\`\`

### पूर्ण एक्सेस + कस्टम प्रतिबंध
\`\`\`json
{
  "tools": {
    "profile": "full",
    "deny": ["browser"],
    "web": { "search": { "enabled": true }, "fetch": { "enabled": false } }
  }
}
\`\`\``},t={name:n,description:e,content:o};export{o as content,t as default,e as description,n as name};
