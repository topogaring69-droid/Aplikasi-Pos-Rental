# Panduan Penggunaan & Konversi POS Rental Motor ke Android

Aplikasi **POS Rental Motor** ini telah dibangun dengan arsitektur **Next.js (App Router)** yang dioptimalkan khusus untuk perangkat **Mobile (Mobile-First)** dan siap dikonversi ke **Web App Android (PWA & APK)**.

---

## 1. Menjalankan Aplikasi di Komputer (Mode Pengembangan)

Buka terminal (Command Prompt / PowerShell) di folder proyek:
```bash
cd "d:\Aplikasi POS"
npm.cmd run dev
```
Buka browser di komputer pada alamat: **`http://localhost:3000`**.

---

## 2. Mengakses & Menguji Langsung di HP Android (Dalam Satu Jaringan WiFi)

Agar operator kasir dapat langsung menggunakan aplikasi melalui HP Android:
1. Pastikan HP dan komputer terhubung ke jaringan **WiFi yang sama**.
2. Cari alamat IP lokal komputer Anda (ketik `ipconfig` di CMD, lihat *IPv4 Address*, misal: `192.168.1.50`).
3. Jalankan aplikasi dengan akses jaringan:
   ```bash
   npx next dev -H 0.0.0.0
   ```
4. Buka browser **Google Chrome** di HP Android, lalu ketik alamat:
   ```
   http://192.168.1.50:3000
   ```
   Aplikasi akan langsung tampil dalam tata letak mobile yang mulus dan responsif.

---

## 3. Konversi ke Aplikasi Android (Metode 1: PWA / Web App Android)

Metode ini **paling cepat dan praktis**, tanpa perlu menginstal Android Studio:
1. Buka aplikasi di Google Chrome HP Android (seperti langkah di atas atau setelah di-hosting di Vercel/Netlify/server lokal).
2. Tekan tombol **Menu (titik tiga)** di pojok kanan atas Chrome.
3. Pilih opsi **"Tambahkan ke Layar Utama"** atau **"Install Aplikasi"**.
4. Ikon **POS Rental Motor** akan langsung muncul di menu aplikasi HP Android Anda.
5. Saat dibuka, aplikasi akan berjalan layar penuh (*fullscreen standalone*) layaknya aplikasi Android asli, lengkap dengan bottom navigation bar dan ikon launcher.

---

## 4. Konversi ke File APK Android Mandiri (Metode 2: Capacitor & Android Studio)

Jika Anda ingin menghasilkan file **`.apk`** murni yang dapat dibagikan atau dipasang di perangkat kasir Android mana pun:

### Langkah A: Buat Build Statis
Aplikasi ini sudah dikonfigurasi dengan `output: 'export'` di `next.config.mjs`. Jalankan:
```bash
npm.cmd run build
```
Perintah ini akan membuat folder **`out/`** yang berisi seluruh berkas HTML, CSS, dan JavaScript statis.

### Langkah B: Inisialisasi Android dengan Capacitor
Jalankan perintah berikut di terminal:
```bash
# 1. Tambahkan platform Android
npx cap add android

# 2. Sinkronkan folder out/ ke proyek Android
npx cap sync android

# 3. Buka proyek di Android Studio
npx cap open android
```

### Langkah C: Build APK di Android Studio
1. Setelah Android Studio terbuka, tunggu proses Gradle Sync selesai.
2. Pada menu atas Android Studio, klik **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
3. Setelah proses selesai, klik tautan **locate** untuk mengambil file **`app-debug.apk`**.
4. Salin file `.apk` tersebut ke smartphone Android dan instal langsung!

---

## 5. Fitur Utama Sesuai Dokumen PDF

| Fitur | Deskripsi |
|---|---|
| **Menu Transaksi** | ID unik otomatis, referensi nomor polisi, rincian sewa pokok + biaya tambahan dinamis, pembayaran & kembalian, modal detail transaksi lengkap, dan cetak struk kasir. |
| **Menu Pengeluaran** | Opsi pengeluaran kendaraan (wajib nopol) atau pengeluaran umum, nominal biaya, keterangan, tanggal otomatis, upload foto nota/kuitansi dengan preview zoom, serta menu edit/hapus pengeluaran. |
| **Menu Laporan** | Pemisahan tab Pemasukan dan Pengeluaran, filter periode (Hari ini, 7 hari, Bulan ini, Kustom), klik nomor transaksi untuk membuka detail, kartu ringkasan laba bersih, serta tombol **Ekspor PDF** resmi. |
| **Menu Akun & Struk** | Profil kasir, pengamanan kunci layar PIN, pengaturan identitas struk (nama usaha, alamat, telp, logo, catatan kaki) dengan **Live Preview Thermal Receipt** 58mm/80mm yang otomatis terhubung ke struk transaksi. |
| **Armada Motor** | Master katalog nopol, tipe motor, tarif harian, dan status ketersediaan (Tersedia, Disewa, Servis). |
| **Offline-First & Backup** | Data tersimpan aman di IndexedDB/LocalStorage lokal, serta fitur ekspor & impor cadangan data JSON. |
