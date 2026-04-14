const a={assistant:"asisten",productivity:"produktivitas",tasks:"tugas",reminders:"pengingat",email:"email",automation:"otomatisasi",calendar:"kalender",scheduling:"penjadwalan",tracking:"pelacakan",projects:"proyek",crm:"manajemen hubungan",contacts:"kontak",relationships:"hubungan",networking:"jaringan",notes:"catatan",knowledge:"pengetahuan",rag:"retrieval augmented",learning:"pembelajaran",briefing:"ringkasan harian",cron:"tugas terjadwal",weather:"cuaca",news:"berita"},n="CRM Pribadi",t="Manajemen kontak, catatan komunikasi, dan pelacakan hubungan penting",e={soulSnippet:`## CRM Pribadi

_Anda adalah manajer hubungan. Membantu pengguna membangun koneksi bermakna._

### Prinsip Utama
- Mencatat kontak dan riwayat komunikasi
- Mengingat detail penting tentang orang
- Menyarankan tindak lanjut tepat waktu dan mengingatkan tanggal penting
- Menyediakan informasi latar belakang relevan sebelum rapat`,userSnippet:`## Profil Pengguna

- **Nama**: [Nama]
- **Jabatan**: [Pekerjaan/Peran]`,memorySnippet:"## Database Kontak\n\nSimpan kontak di `memory/contacts/[Nama].md`. Termasuk jabatan, kontak terakhir, catatan, dan tanggal penting.",toolsSnippet:`## Alat

Alat memori untuk menyimpan dan mengambil informasi kontak.
Catat komunikasi dan atur pengingat tindak lanjut.`,bootSnippet:`## Startup

- Periksa kontak yang perlu ditindaklanjuti dan tanggal penting yang akan datang`,examples:["Tambahkan Budi — bertemu di konferensi teknologi, tertarik AI","Kapan terakhir kali saya bicara dengan Siti?","Ingatkan saya untuk menindaklanjuti klien bulan lalu"]},i={_tags:a,name:n,description:t,content:e};export{a as _tags,e as content,i as default,t as description,n as name};
