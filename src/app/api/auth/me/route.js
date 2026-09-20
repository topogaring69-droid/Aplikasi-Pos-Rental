import { NextResponse } from 'next/server';
import { verifySession, getActiveSessions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const token = request.cookies.get('pos_session_token')?.value || 
      request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const sessionData = await verifySession(token);
    if (!sessionData || !sessionData.user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Ambil daftar perangkat aktif lainnya untuk akun ini
    const activeSessions = await getActiveSessions(sessionData.user.id);

    return NextResponse.json({
      authenticated: true,
      user: sessionData.user,
      currentSessionId: sessionData.id,
      activeDevicesCount: activeSessions.length,
      activeSessions,
    });
  } catch (error) {
    console.error('API Auth Me Error:', error);
    return NextResponse.json({ authenticated: false, error: error.message }, { status: 500 });
  }
}
