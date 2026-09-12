# SiPraktikum — Website Manajemen Praktikum

Website untuk asisten praktikum mengelola kelas/shift praktikum: absensi,
jadwal, tugas & pengumpulannya, serta rekap nilai. Praktikan bisa join kelas
pakai kode kelas, lihat jadwal, absen, kumpulkan tugas, dan lihat nilai.

Dibangun pakai **Next.js 14 + Supabase**, satu project Supabase dipakai
bareng untuk banyak kelas praktikum sekaligus (multi-tenant), sama seperti
Zora.

## 1. Setup Supabase (backend & database)

1. Buka [supabase.com](https://supabase.com), buat project baru (gratis).
2. Di project, buka menu **SQL Editor** → **New query**.
3. Buka file `supabase/schema.sql` di folder ini, copy semua isinya, paste ke
   SQL Editor, lalu klik **Run**. Ini akan membuat semua tabel, aturan
   keamanan (RLS), dan bucket penyimpanan file tugas.
4. Buka menu **Authentication** → **Providers**, pastikan **Email** aktif.
   Kalau mau supaya user tidak perlu konfirmasi email dulu untuk bisa login
   (lebih praktis buat testing awal), matikan "Confirm email" di
   **Authentication → Settings**.
5. Buka menu **Project Settings → API**, catat dua nilai ini:
   - **Project URL**
   - **anon public key**

## 2. Konfigurasi project

1. Copy file `.env.local.example` jadi `.env.local`.
2. Isi `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` dengan
   nilai dari langkah Supabase di atas.

## 3. Jalankan di komputer (opsional, buat coba-coba dulu)

```bash
npm install
npm run dev
```

Buka `http://localhost:3000` di browser.

## 4. Deploy ke Vercel (biar bisa diakses semua orang)

Caranya sama seperti waktu deploy Zora dulu:

1. Upload semua file project ini ke repository GitHub baru (lewat halaman
   web GitHub: buat repo baru → "uploading an existing file" → drag semua
   file & folder).
2. Buka [vercel.com](https://vercel.com) → **Add New Project** → pilih repo
   GitHub tadi.
3. Sebelum klik Deploy, buka bagian **Environment Variables**, tambahkan:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   (isi sama seperti di `.env.local`)
4. Klik **Deploy**. Setelah selesai, kamu dapat link seperti
   `nama-project.vercel.app` yang bisa dibagikan ke praktikan.

## 5. Cara pakai

**Sebagai asisten:**
1. Daftar akun, pilih role "Asisten".
2. Buka menu **Kelas** → buat kelas praktikum baru → dapat kode kelas unik.
3. Bagikan kode kelas itu ke praktikanmu (lewat WA/grup kelas).
4. Isi **Jadwal** pertemuan, buka **Absensi** tiap pertemuan untuk menandai
   kehadiran, buat **Tugas** dengan deadline, lalu beri **Nilai** di menu
   Nilai setelah praktikan mengumpulkan.

**Sebagai praktikan:**
1. Daftar akun, pilih role "Praktikan", masukkan kode kelas dari asisten
   (atau join belakangan lewat menu Jadwal).
2. Lihat **Jadwal**, cek **Absensi** sendiri, upload tugas di menu
   **Tugas**, dan pantau **Nilai**.

## Struktur data (ringkas)

- `profiles` — data user (asisten/praktikan)
- `kelas_praktikum` — 1 kelas/shift, dipegang 1 asisten, punya kode unik
- `anggota_kelas` — praktikan yang tergabung di suatu kelas
- `jadwal_praktikum` — daftar pertemuan per kelas
- `absensi` — kehadiran praktikan per pertemuan
- `tugas_praktikum` — tugas/laporan yang harus dikumpulkan
- `pengumpulan_tugas` — file yang dikumpulkan + nilai dari asisten

## Yang bisa dikembangkan lagi

- Notifikasi (WA/Telegram/Web Push) H-1 sebelum deadline tugas, seperti fitur
  reminder yang ada di Zora.
- Export rekap nilai & absensi ke Excel/PDF.
- Halaman khusus koordinator praktikum yang mengawasi banyak asisten sekaligus.
