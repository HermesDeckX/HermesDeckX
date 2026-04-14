const a="Setup Bot Telegram",n="Buat bot Telegram dan hubungkan ke gateway HermesAgent",e={body:`## Buat Bot Telegram

### 1. Buat bot via BotFather
1. Cari @BotFather di Telegram
2. Kirim \`/newbot\`
3. Masukkan nama bot
4. Masukkan username (harus diakhiri \`bot\`)
5. Salin token

### 2. Konfigurasi di HermesDeckX
1. «Pusat Pengaturan → Saluran»
2. «Tambah Saluran» → Telegram
3. Tempel token
4. Simpan

### 3. Verifikasi koneksi
- Saluran harus menampilkan 🟢
- Kirim pesan ke bot
- Bot harus merespons`,steps:["Cari @BotFather","/newbot untuk membuat bot","Salin token","Tambah saluran Telegram di HermesDeckX","Tempel token dan simpan"]},t={name:a,description:n,content:e};export{e as content,t as default,n as description,a as name};
