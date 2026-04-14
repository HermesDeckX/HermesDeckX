const a="Gateway Tidak Berjalan",n="Mengatasi masalah gateway HermesAgent yang tidak bisa dimulai atau bekerja tidak normal",e={question:"Apa yang harus dilakukan jika gateway tidak bisa dimulai atau bekerja tidak normal?",answer:`## Langkah Penyelesaian

### 1. Periksa status gateway
Indikator di bagian atas dasbor HermesDeckX:
- 🟢 Berjalan — Normal
- 🔴 Berhenti — Perlu dimulai
- 🟡 Memulai — Menunggu

### 2. Periksa penggunaan port
Gateway menggunakan port 18789 secara default.
- **Windows**: \`netstat -ano | findstr 18789\`
- **macOS/Linux**: \`lsof -i :18789\`

### 3. Periksa file konfigurasi
- \`~/.hermesdeckx/config.yaml\` harus ada dan berformat benar

### 4. Periksa versi Node.js
- HermesAgent memerlukan Node.js 18+
- Periksa dengan \`node --version\`
- Node.js 22 LTS direkomendasikan

### 5. Periksa log
- Lokasi: \`~/.hermesdeckx/logs/\`

### 6. Instal ulang
- \`npm install -g hermesagent@latest\`

## Perbaikan Cepat

Klik «Mulai Gateway» di HermesDeckX atau jalankan \`hermesagent gateway run\`.`},i={name:a,description:n,content:e};export{e as content,i as default,n as description,a as name};
