const a="Biaya Token Tinggi",n="Analisis dan optimasi konsumsi token model AI untuk mengurangi biaya API",e={question:"Apa yang harus dilakukan jika biaya token terlalu tinggi? Bagaimana mengurangi biaya API?",answer:`## Analisis Biaya

### 1. Lihat statistik penggunaan
Buka halaman «Penggunaan» HermesDeckX:
- Lihat konsumsi harian/mingguan/bulanan
- Urutkan berdasarkan model, saluran, pengguna

### 2. Penyebab umum konsumsi tinggi

| Penyebab | Dampak | Solusi |
|----------|--------|--------|
| Riwayat terlalu panjang | Pengiriman riwayat besar | Aktifkan kompresi atau auto-reset |
| Model mahal | GPT-4.5, Claude Opus | Beralih ke GPT-4o-mini |
| Panggilan tool sering | Token tambahan per panggilan | Sesuaikan kebijakan tool |
| Banyak sub-agen | Konsumsi independen | Batasi kedalaman dan jumlah |

### 3. Strategi optimasi

**Pengaturan kompresi** (paling efektif):
- «Pusat Pengaturan → Agen → Kompresi»
- Atur \`threshold\` ke 30000-50000
- Aktifkan \`memoryFlush\`

## Field Konfigurasi

Path: \`agents.defaults.model\`, \`agents.defaults.compaction\`, \`heartbeat\``},i={name:a,description:n,content:e};export{e as content,i as default,n as description,a as name};
