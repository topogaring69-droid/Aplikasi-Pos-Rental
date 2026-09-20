import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { 
  verifyPassword, 
  createSession, 
  ensureInitialAdmin, 
  checkRateLimit, 
  recordFailedAttempt, 
  resetRateLimit 
} from '@/lib/auth';

export async function POST(request) {
  try {
    // 1. Pastikan akun bawaan admin sudah terverifikasi dan aman di database
    await ensureInitialAdmin();

    const body = await request.json();
    const username = (body.username || '').trim().toLowerCase();
    const password = body.password || '';

    // Ambil alamat IP & User Agent untuk keamanan dan identifikasi perangkat
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'Browser';
    const rateLimitKey = `login_${ip}_${username}`;

    // 2. Proteksi Brute-Force Rate Limiting
    const rateCheck = checkRateLimit(rateLimitKey, 5, 15 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: rateCheck.message,
          retryAfterSeconds: rateCheck.retryAfterSeconds,
        },
        { status: 429 }
      );
    }

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username dan kata sandi wajib diisi!' },
        { status: 400 }
      );
    }

    // 3. Cari Pengguna di Database SQLite
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user || !verifyPassword(password, user.password)) {
      recordFailedAttempt(rateLimitKey);
      const remainingAttempts = Math.max(0, rateCheck.remaining - 1);
      return NextResponse.json(
        {
          success: false,
          error: `Username atau kata sandi salah! (Sisa percobaan aman: ${remainingAttempts})`,
          remainingAttempts,
        },
        { status: 401 }
      );
    }

    // 4. Sukses Login: Reset counter percobaan gagal
    resetRateLimit(rateLimitKey);

    // 5. Buat Sesi Baru untuk Perangkat Ini (Multi-Perangkat Aktif Bersamaan)
    const session = await createSession(user.id, userAgent, ip);

    const response = NextResponse.json({
      success: true,
      message: 'Login berhasil!',
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
      token: session.token,
    });

    // 6. Set HTTP-Only Cookie yang Aman untuk Sesi Perangkat Ini
    response.cookies.set({
      name: 'pos_session_token',
      value: session.token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 Hari
    });

    return response;
  } catch (error) {
    console.error('API Login Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Terjadi kesalahan sistem saat login' },
      { status: 500 }
    );
  }
}
