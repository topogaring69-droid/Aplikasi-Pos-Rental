import { NextResponse } from 'next/server';
import { settingsService } from '@/services/settingsService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await settingsService.getSettings();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Pengaturan GET Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const data = await settingsService.saveSettings(body);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Pengaturan POST Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
