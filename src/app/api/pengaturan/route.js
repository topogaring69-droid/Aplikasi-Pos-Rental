import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { initialSettings } from '@/lib/seedData';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const list = await prisma.setting.findMany();
    const settings = { ...initialSettings };

    for (const r of list) {
      if (r.key === 'isPinEnabled') {
        settings[r.key] = r.value === 'true';
      } else {
        settings[r.key] = r.value;
      }
    }

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error('Prisma Pengaturan GET Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    for (const [k, v] of Object.entries(body)) {
      await prisma.setting.upsert({
        where: { key: k },
        update: { value: typeof v === 'object' ? JSON.stringify(v) : String(v) },
        create: { key: k, value: typeof v === 'object' ? JSON.stringify(v) : String(v) },
      });
    }

    return NextResponse.json({ success: true, data: body });
  } catch (error) {
    console.error('Prisma Pengaturan POST Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
