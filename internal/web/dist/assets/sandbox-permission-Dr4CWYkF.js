const a="Masalah Izin Sandbox",n="Mengatasi masalah izin Docker sandbox yang tidak memadai, akses file ditolak, atau kegagalan memulai container",e={question:"Apa yang harus dilakukan saat ada masalah izin di mode sandbox?",answer:`## Masalah Izin Umum

### 1. Docker tidak terinstal atau tidak berjalan
- Docker Desktop terinstal dan berjalan?
- **Windows**: Buka Docker Desktop
- **macOS**: Buka Docker Desktop
- **Linux**: \`sudo systemctl start docker\`

### 2. Gagal memulai container
- Image Docker tidak ada: \`docker pull\`
- Memori tidak cukup
- Ruang disk tidak cukup

### 3. Akses file ditolak
- Periksa mode akses: \`none\` / \`ro\` / \`rw\`
- Jika perlu menulis, ubah ke \`rw\`

### 4. Masalah akses jaringan

### 5. Izin eksekusi

## Alternatif

- Nonaktifkan sandbox sementara (hanya lingkungan tepercaya)
- Gunakan Podman sebagai alternatif

## Field Konfigurasi

Path: \`agents.defaults.sandbox\``},s={name:a,description:n,content:e};export{e as content,s as default,n as description,a as name};
