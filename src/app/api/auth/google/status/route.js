import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const refreshTokenSetting = await prisma.setting.findUnique({
      where: { key: 'google_drive_refresh_token' },
    });
    const emailSetting = await prisma.setting.findUnique({
      where: { key: 'google_drive_admin_email' },
    });
    const connectedAtSetting = await prisma.setting.findUnique({
      where: { key: 'google_drive_connected_at' },
    });

    const hasToken = Boolean(
      refreshTokenSetting?.value || process.env.GOOGLE_REFRESH_TOKEN
    );
    const email =
      emailSetting?.value ||
      (hasToken ? process.env.GOOGLE_ADMIN_EMAIL || 'topogaring69@gmail.com' : null);

    return NextResponse.json({
      success: true,
      connected: hasToken,
      email: hasToken ? email : null,
      connectedAt: connectedAtSetting?.value || null,
      folderId: process.env.GOOGLE_DRIVE_FOLDER_ID || null,
      isConfigured: Boolean(
        process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ),
    });
  } catch (error) {
    console.error('Google Status Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (body.action === 'disconnect') {
      await prisma.setting.deleteMany({
        where: {
          key: {
            in: [
              'google_drive_refresh_token',
              'google_drive_admin_email',
              'google_drive_connected_at',
            ],
          },
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Koneksi Google Drive berhasil diputuskan.',
      });
    }

    return NextResponse.json(
      { success: false, error: 'Aksi tidak dikenali' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Google Disconnect Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
