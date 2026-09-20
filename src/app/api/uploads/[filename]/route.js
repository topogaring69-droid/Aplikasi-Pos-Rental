import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import { verifySession } from '@/lib/auth';

const MIME_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf',
  '.svg': 'image/svg+xml',
};

export async function GET(request, context) {
  try {
    const params = await context.params;
    const rawFilename = params?.filename || '';

    // 1. Verifikasi Otentikasi Sesi (Wajib Login untuk Akses Berkas)
    const token = request.cookies.get('pos_session_token')?.value || 
      request.headers.get('authorization')?.replace('Bearer ', '') ||
      request.nextUrl.searchParams.get('token');

    const sessionData = await verifySession(token);
    if (!sessionData || !sessionData.user) {
      return NextResponse.json(
        { error: 'Akses ditolak. Silakan login untuk melihat berkas ini.' },
        { status: 401 }
      );
    }

    // 2. Proteksi Path Traversal & Sanitasi Nama Berkas
    const sanitizedFilename = path.basename(rawFilename);
    if (!sanitizedFilename || sanitizedFilename !== rawFilename || rawFilename.includes('..') || rawFilename.includes('/') || rawFilename.includes('\\')) {
      return NextResponse.json(
        { error: 'Nama berkas tidak valid atau terdeteksi potensi serangan path traversal.' },
        { status: 400 }
      );
    }

    // 3. Resolusi Path Direktori Privat
    const storageDir = path.resolve(process.cwd(), 'storage', 'uploads');
    const filePath = path.resolve(storageDir, sanitizedFilename);

    // Pastikan path berkas tetap berada di dalam direktori storage/uploads
    if (!filePath.startsWith(storageDir)) {
      return NextResponse.json(
        { error: 'Akses direktori di luar batas tidak diizinkan.' },
        { status: 403 }
      );
    }

    // 4. Periksa Keberadaan Berkas di Storage Privat
    let fileBuffer;
    try {
      fileBuffer = await fs.readFile(filePath);
    } catch (err) {
      // Fallback migrasi jika masih tersisa di public/uploads
      const legacyPublicPath = path.resolve(process.cwd(), 'public', 'uploads', sanitizedFilename);
      try {
        fileBuffer = await fs.readFile(legacyPublicPath);
        // Otomatis pindahkan ke privat storage
        await fs.writeFile(filePath, fileBuffer);
        await fs.unlink(legacyPublicPath).catch(() => {});
      } catch (legacyErr) {
        return NextResponse.json({ error: 'Berkas tidak ditemukan.' }, { status: 404 });
      }
    }

    // 5. Tentukan MIME Type yang Sesuai
    const ext = path.extname(sanitizedFilename).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // 6. Kembalikan Response Berkas dengan Header Keamanan
    return new Response(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'private, no-transform, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
        'Content-Disposition': `inline; filename="${encodeURIComponent(sanitizedFilename)}"`,
      },
    });
  } catch (error) {
    console.error('Secure File Access Error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan saat memproses berkas.' }, { status: 500 });
  }
}
