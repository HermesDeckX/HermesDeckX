const n="Pemangkasan Konteks",a="Kontrol jumlah konteks yang dikirim ke AI — kurangi system prompt dan riwayat yang tidak perlu untuk menghemat token",t={body:`## Mengapa Memangkas Konteks?

Setiap permintaan AI mengirim konteks lengkap:
- System prompt (SOUL.md, USER.md, dll.)
- Riwayat percakapan
- Definisi tool
- Konten memori

Lebih banyak konteks = biaya lebih tinggi dan respons potensial lebih lambat.

## Strategi Pemangkasan

### 1. Optimalkan system prompt
- Jaga SOUL.md singkat (di bawah 500 kata)
- Hapus penjelasan yang tidak perlu
- Gunakan daftar daripada paragraf panjang

### 2. Kontrol riwayat
- Aktifkan kompresi
- Konfigurasi auto-reset
- Gunakan \`/compact\` secara manual

### 3. Batasi tool
- Gunakan profil tool yang sesuai
- Setiap definisi tool mengonsumsi token

### 4. Optimalkan memori
- Bersihkan file lama secara berkala

## Estimasi Dampak

| Optimasi | Penghematan Token |
|----------|-------------------|
| Pemangkasan prompt | 10-20% |
| Pengaturan kompresi | 30-60% |
| Profil minimal vs full | 15-25% |
| Optimasi memori | 5-15% |

## Field Konfigurasi

Path: \`agents.defaults.compaction\`, \`tools.profile\`, \`session.autoReset\``},e={name:n,description:a,content:t};export{t as content,e as default,a as description,n as name};
