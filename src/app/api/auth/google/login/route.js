import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        new URL(
          '/pengaturan?error=' +
            encodeURIComponent(
              'GOOGLE_CLIENT_ID atau GOOGLE_CLIENT_SECRET belum disetel di file .env.'
            ),
          request.url
        )
      );
    }

    // Tentukan Redirect URI secara dinamis (localhost atau Vercel production)
    const origin = request.nextUrl.origin;
    const redirectUri =
      process.env.GOOGLE_REDIRECT_URI || `${origin}/api/auth/google/callback`;

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    // Generate URL persetujuan Google dengan access_type: 'offline' untuk mendapatkan Refresh Token
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
      ],
    });

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Google OAuth Login Error:', error);
    return NextResponse.redirect(
      new URL('/pengaturan?error=' + encodeURIComponent(error.message), request.url)
    );
  }
}
