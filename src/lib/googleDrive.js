/**
 * Modul Integrasi Google Drive untuk Bukti Nota & Cadangan Berkas
 * 
 * Penggunaan di Masa Datang:
 * 1. Buat Service Account di Google Cloud Console (https://console.cloud.google.com).
 * 2. Aktifkan 'Google Drive API'.
 * 3. Masukkan kunci rahasia ke environment variable:
 *    - GOOGLE_SERVICE_ACCOUNT_EMAIL
 *    - GOOGLE_PRIVATE_KEY
 *    - GOOGLE_DRIVE_FOLDER_ID
 */

export async function uploadToGoogleDrive({ fileName, base64Data, mimeType = 'image/jpeg' }) {
  // Simulasi/Hook integrasi Google Drive API
  // Saat kredensial Google Drive diaktifkan:
  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    try {
      // Contoh alur menggunakan Google APIs Client Library:
      // const drive = google.drive({ version: 'v3', auth });
      // const res = await drive.files.create({ ... });
      // return { gdriveFileId: res.data.id, gdriveLink: res.data.webViewLink };
    } catch (err) {
      console.error('Google Drive Upload Error:', err);
    }
  }

  // Jika belum dikonfigurasi, simpan penanda berkas lokal
  return {
    gdriveFileId: `local-file-${Date.now()}`,
    gdriveLink: null,
    isLocal: true
  };
}
