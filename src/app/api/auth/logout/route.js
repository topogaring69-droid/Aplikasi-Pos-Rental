import { NextResponse } from 'next/server';
import { deleteSession } from '@/lib/auth';

export async function POST(request) {
  try {
    const token = request.cookies.get('pos_session_token')?.value || 
      request.headers.get('authorization')?.replace('Bearer ', '');

    if (token) {
      await deleteSession(token);
    }

    const response = NextResponse.json({
      success: true,
      message: 'Perangkat ini berhasil logout',
    });

    // Hapus cookie sesi pada perangkat ini
    response.cookies.delete('pos_session_token');

    return response;
  } catch (error) {
    console.error('API Logout Error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal melakukan logout' },
      { status: 500 }
    );
  }
}
