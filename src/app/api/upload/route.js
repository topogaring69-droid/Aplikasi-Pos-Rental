import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import { uploadToGoogleDrive } from '@/lib/googleDrive';
import { verifySession } from '@/lib/auth';

export async function POST(request) {
  try {
    // 1. Verifikasi Otentikasi Sesi (Proteksi Akses)
    const token = request.cookies.get('pos_session_token')?.value || 
      request.headers.get('authorization')?.replace('Bearer ', '');
    const sessionData = await verifySession(token);

    if (!sessionData || !sessionData.user) {
      return NextResponse.json(
        { success: false, error: 'Akses tidak diizinkan. Silakan login terlebih dahulu.' },
        { status: 401 }
      );
    }

    const storageDriver = process.env.STORAGE_DRIVER || 'local';
    const contentType = request.headers.get('content-type') || '';

    let fileBuffer;
    let fileName;
    let mimeType = 'image/jpeg';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');
      if (!file) {
        return NextResponse.json({ success: false, error: 'Berkas tidak ditemukan' }, { status: 400 });
      }
      const bytes = await file.arrayBuffer();
      fileBuffer = Buffer.from(bytes);
      mimeType = file.type || 'image/jpeg';
      const ext = path.extname(file.name) || '.jpg';
      fileName = `nota_${Date.now()}_${Math.random().toString(36).substring(2, 7)}${ext}`;
    } else {
      // JSON payload base64
      const body = await request.json();
      const base64Data = body.base64;
      if (!base64Data) {
        return NextResponse.json({ success: false, error: 'Data base64 tidak ditemukan' }, { status: 400 });
      }
      const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches) {
        mimeType = matches[1];
        fileBuffer = Buffer.from(matches[2], 'base64');
      } else {
        fileBuffer = Buffer.from(base64Data, 'base64');
      }
      const ext = mimeType.includes('png') ? '.png' : '.jpg';
      fileName = `nota_${Date.now()}_${Math.random().toString(36).substring(2, 7)}${ext}`;
    }

    // CABANG PENYIMPANAN: LOKAL PRIVAT vs GOOGLE DRIVE (.env)
    if (storageDriver === 'google_drive') {
      const driveResult = await uploadToGoogleDrive({
        fileName,
        buffer: fileBuffer,
        mimeType
      });
      return NextResponse.json({
        success: true,
        driver: 'google_drive',
        url: driveResult.gdriveLink || `/api/uploads/${fileName}`,
        gdriveFileId: driveResult.gdriveFileId,
        gdriveLink: driveResult.gdriveLink
      });
    } else {
      // Mode Lokal: Simpan di folder PRIVAT storage/uploads (Bukan di public!)
      const uploadDir = path.join(process.cwd(), 'storage', 'uploads');
      await fs.mkdir(uploadDir, { recursive: true });
      const filePath = path.join(uploadDir, fileName);
      await fs.writeFile(filePath, fileBuffer);

      return NextResponse.json({
        success: true,
        driver: 'local',
        url: `/api/uploads/${fileName}`,
        fileName
      });
    }
  } catch (error) {
    console.error('API Upload Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
