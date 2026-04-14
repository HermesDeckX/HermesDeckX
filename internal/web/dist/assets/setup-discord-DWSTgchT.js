const n="Setup Bot Discord",a="Buat bot Discord dan hubungkan ke gateway HermesAgent",t={body:`## Buat Bot Discord

### 1. Buat aplikasi Discord
1. Buka discord.com/developers/applications
2. «New Application»
3. Halaman «Bot» → «Add Bot»

### 2. Dapatkan token
1. «Reset Token»
2. Salin token
3. Aktifkan «Message Content Intent» (penting!)

### 3. Undang bot ke server
1. «OAuth2 → URL Generator»
2. Pilih izin \`bot\`
3. Salin URL dan buka

### 4. Konfigurasi di HermesDeckX
1. «Pusat Pengaturan → Saluran»
2. «Tambah Saluran» → Discord
3. Tempel token
4. Simpan`,steps:["Buat aplikasi di Discord","Buat bot dan salin token","Aktifkan Message Content Intent","Buat link undangan","Tambah saluran Discord di HermesDeckX","Tempel token dan simpan"]},e={name:n,description:a,content:t};export{t as content,e as default,a as description,n as name};
