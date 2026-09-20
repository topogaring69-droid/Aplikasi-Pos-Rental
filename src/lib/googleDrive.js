import { google } from 'googleapis';
import { Readable } from 'node:stream';
import { prisma } from './prisma';

/**
 * Mengunggah berkas ke Google Drive menggunakan akun admin (OAuth 2.0)
 * Menggunakan kuota penyimpanan 15 GB akun pribadi topogaring69@gmail.com
 */
export async function uploadToGoogleDrive({ fileName, buffer, base64Data, mimeType = 'image/jpeg' }) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  // 1. Ambil Refresh Token dari Database (tabel settings) atau dari .env
  let refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  if (!refreshToken) {
    try {
      const settingRow = await prisma.setting.findUnique({
        where: { key: 'google_drive_refresh_token' },
      });
      refreshToken = settingRow?.value;
    } catch (dbErr) {
      console.warn('Gagal membaca token Google Drive dari database:', dbErr.message);
    }
  }

  // 2. Validasi Kesiapan OAuth 2.0
  if (!clientId || !clientSecret) {
    throw new Error(
      'Kredensial GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET belum dikonfigurasi di file .env.'
    );
  }

  if (!refreshToken) {
    throw new Error(
      'Google Drive belum dihubungkan ke akun admin topogaring69@gmail.com. Silakan buka menu Pengaturan dan klik "Hubungkan Akun Google".'
    );
  }

  // 3. Siapkan File Buffer
  let fileBuffer = buffer;
  if (!fileBuffer && base64Data) {
    const cleanBase64 = base64Data.replace(/^data:[A-Za-z-+\/]+;base64,/, '');
    fileBuffer = Buffer.from(cleanBase64, 'base64');
  }

  if (!fileBuffer || fileBuffer.length === 0) {
    throw new Error('Berkas yang akan diunggah kosong atau tidak terbaca.');
  }

  // 4. Inisialisasi Klien Google OAuth 2.0
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  // 5. Unggah Berkas ke Folder Google Drive
  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: folderId ? [folderId] : undefined,
    },
    media: {
      mimeType,
      body: Readable.from(fileBuffer),
    },
    fields: 'id, name, webViewLink, webContentLink',
  });

  const fileId = response.data.id;

  // 6. Buat izin baca publik (agar foto nota dapat ditampilkan langsung di aplikasi kasir)
  try {
    await drive.permissions.create({
      fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });
  } catch (permErr) {
    // Abaikan jika folder sudah mewariskan izin
  }

  // Tautan CDN Google Drive untuk pratinjau gambar langsung di tag <img>
  const directLink = `https://lh3.googleusercontent.com/d/${fileId}`;

  return {
    success: true,
    gdriveFileId: fileId,
    gdriveLink: directLink,
    webViewLink:
      response.data.webViewLink ||
      `https://drive.google.com/file/d/${fileId}/view`,
  };
}
