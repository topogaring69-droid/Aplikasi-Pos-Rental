import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      return NextResponse.redirect(
        new URL(
          '/pengaturan?error=' +
            encodeURIComponent(`Persetujuan Google dibatalkan: ${errorParam}`),
          request.url
        )
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL(
          '/pengaturan?error=' +
            encodeURIComponent('Kode otorisasi dari Google tidak ditemukan.'),
          request.url
        )
      );
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const allowedAdminEmail = (
      process.env.GOOGLE_ADMIN_EMAIL || 'topogaring69@gmail.com'
    ).toLowerCase();

    const origin = request.nextUrl.origin;
    const redirectUri =
      process.env.GOOGLE_REDIRECT_URI || `${origin}/api/auth/google/callback`;

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    // Tukar kode otorisasi dengan access token & refresh token
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Ambil identitas email akun Google yang baru saja login
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();
    const loggedInEmail = (userInfo.email || '').toLowerCase();

    // VALIDASI KEAMANAN: Batasi secara ketat hanya untuk akun admin
    if (loggedInEmail !== allowedAdminEmail) {
      return NextResponse.redirect(
        new URL(
          '/pengaturan?error=' +
            encodeURIComponent(
              `Akses ditolak! Akun ${loggedInEmail} bukan akun admin yang terdaftar (${allowedAdminEmail}).`
            ),
          request.url
        )
      );
    }

    // Simpan token ke database PostgreSQL (tabel settings)
    if (tokens.refresh_token) {
      await prisma.setting.upsert({
        where: { key: 'google_drive_refresh_token' },
        update: { value: tokens.refresh_token },
        create: { key: 'google_drive_refresh_token', value: tokens.refresh_token },
      });
    }

    await prisma.setting.upsert({
      where: { key: 'google_drive_admin_email' },
      update: { value: loggedInEmail },
      create: { key: 'google_drive_admin_email', value: loggedInEmail },
    });

    await prisma.setting.upsert({
      where: { key: 'google_drive_connected_at' },
      update: { value: new Date().toISOString() },
      create: { key: 'google_drive_connected_at', value: new Date().toISOString() },
    });

    return NextResponse.redirect(
      new URL(
        '/pengaturan?success=' +
          encodeURIComponent(
            `Google Drive berhasil terhubung dengan akun admin ${loggedInEmail}!`
          ),
        request.url
      )
    );
  } catch (error) {
    console.error('Google OAuth Callback Error:', error);
    return NextResponse.redirect(
      new URL(
        '/pengaturan?error=' +
          encodeURIComponent(`Gagal menghubungkan Google: ${error.message}`),
        request.url
      )
    );
  }
}
