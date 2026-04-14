const n="Mulai Cepat",a="Instal, konfigurasi, dan mulai percakapan pertama dengan gateway HermesAgent dalam 5 menit",e={body:`## Prasyarat

- Node.js 22+ (LTS direkomendasikan)
- Kunci API penyedia AI (OpenAI / Anthropic / Google, dll.)

## Langkah

### 1. Instal HermesAgent

\`\`\`bash
npm install -g hermesagent@latest
\`\`\`

### 2. Inisialisasi konfigurasi

\`\`\`bash
hermesagent init
\`\`\`

### 3. Mulai gateway

\`\`\`bash
hermesagent gateway run
\`\`\`

### 4. Hubungkan HermesDeckX

Buka HermesDeckX dan masukkan alamat gateway.

### 5. Hubungkan saluran chat (opsional)

1. «Pusat Pengaturan → Saluran»
2. Pilih jenis saluran
3. Masukkan token bot
4. Simpan`,steps:["Instal Node.js 22+","npm install -g hermesagent@latest","hermesagent init","Masukkan kunci API","hermesagent gateway run","Hubungkan HermesDeckX"]},s={name:n,description:a,content:e};export{e as content,s as default,a as description,n as name};
