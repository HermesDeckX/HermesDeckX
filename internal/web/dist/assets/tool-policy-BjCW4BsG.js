const n="Kebijakan Izin Tool",o="Snippet konfigurasi izin tool: kontrol cakupan dan tingkat akses tool AI berdasarkan skenario",e={snippet:`## Contoh Kebijakan Tool

### Izin minimal (hanya chat)
\`\`\`json
{ "tools": { "profile": "minimal" } }
\`\`\`

### Asisten programming
\`\`\`json
{
  "tools": {
    "profile": "coding",
    "deny": ["exec.rm", "exec.sudo"],
    "exec": { "allowlist": ["node", "npm", "git", "python"] }
  }
}
\`\`\`

### Akses penuh + pembatasan kustom
\`\`\`json
{
  "tools": {
    "profile": "full",
    "deny": ["browser"],
    "web": { "search": { "enabled": true }, "fetch": { "enabled": false } }
  }
}
\`\`\``},a={name:n,description:o,content:e};export{e as content,a as default,o as description,n as name};
