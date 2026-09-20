import { NextResponse } from 'next/server';
import { verifySession, changeAdminPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const token =
      request.cookies.get('pos_session_token')?.value ||
      request.headers.get('authorization')?.replace('Bearer ', '');

    const sessionData = await verifySession(token);
    if (!sessionData || !sessionData.user) {
      return NextResponse.json(
        { success: false, error: 'Akses tidak diizinkan. Silakan login kembali.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    if (!currentPassword) {
      return NextResponse.json(
        { success: false, error: 'Password saat ini wajib diisi!' },
        { status: 400 }
      );
    }

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password baru minimal harus 8 karakter!' },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'Konfirmasi password baru tidak cocok!' },
        { status: 400 }
      );
    }

    await changeAdminPassword(sessionData.user.id, currentPassword, newPassword);

    return NextResponse.json({
      success: true,
      message: 'Password akun admin berhasil diperbarui dengan aman!',
    });
  } catch (error) {
    console.error('Change Password Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}
