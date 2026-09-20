# Panduan Integrasi Penyimpanan Cloud Google Drive

Dokumen ini menjelaskan cara menghubungkan **Google Drive** ke aplikasi **POS Rental Motor** untuk penyimpanan permanen foto nota pengeluaran dan cadangan basis data di cloud.

---

## 1. Persiapan Akun Google Cloud (Gratis)

1. Buka **[Google Cloud Console](https://console.cloud.google.com/)** dan login dengan akun Google Anda.
2. Buat proyek baru, misalnya: `POS Rental Motor Drive`.
3. Masuk ke menu **APIs & Services** > **Library**, cari **Google Drive API**, lalu klik **Enable**.

---

## 2. Membuat Kredensial Service Account

1. Buka **APIs & Services** > **Credentials** > **Create Credentials** > pilih **Service Account**.
2. Beri nama: `pos-drive-uploader`.
3. Setelah Service Account terbuat, klik akun tersebut, buka tab **Keys** > **Add Key** > **Create new key** (pilih format **JSON**).
4. Berkas kunci `.json` akan otomatis terunduh ke komputer Anda.

---

## 3. Menyiapkan Folder di Google Drive

1. Buka [Google Drive](https://drive.google.com/) di akun Google utama Anda.
2. Buat folder baru, misalnya: **Nota POS Rental Motor**.
3. Klik kanan folder tersebut > **Bagikan (Share)**.
4. Masukkan alamat email Service Account (contoh: `pos-drive-uploader@proyek-anda.iam.gserviceaccount.com`) sebagai **Editor**.
5. Salin ID folder dari URL browser (bagian setelah `/folders/XXXXXXX`).

---

## 4. Menghubungkan ke Aplikasi

Buat berkas `.env.local` di folder `d:/Aplikasi POS/`:
```env
GOOGLE_SERVICE_ACCOUNT_EMAIL="pos-drive-uploader@proyek-anda.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBA...-----END PRIVATE KEY-----\n"
GOOGLE_DRIVE_FOLDER_ID="ID_FOLDER_GOOGLE_DRIVE_ANDA"
```

Instal pustaka resmi Google APIs:
```bash
npm.cmd install googleapis
```

---

## 5. Status Saat Ini di Aplikasi

- Database SQLite (`pos_rental.db`) pada tabel `expenses` telah memiliki kolom khusus:
  - `gdrive_file_id` (ID berkas unik di Google Drive)
  - `gdrive_link` (Tautan akses langsung foto nota)
- Modul [src/lib/googleDrive.js](file:///d:/Aplikasi%20POS/src/lib/googleDrive.js) telah disiapkan sehingga saat kredensial di atas diaktifkan, seluruh foto nota pengeluaran akan otomatis terunggah ke Google Drive secara instan.
