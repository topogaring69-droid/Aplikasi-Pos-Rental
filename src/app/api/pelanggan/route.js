import { NextResponse } from 'next/server';
import { customerService } from '@/services/customerService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await customerService.getAll();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Pelanggan GET Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const saved = await customerService.upsert(body);
    return NextResponse.json({ success: true, data: saved });
  } catch (error) {
    console.error('Pelanggan POST Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ success: false, error: 'ID pelanggan wajib disertakan' }, { status: 400 });
    }
    const updated = await customerService.upsert(body);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Pelanggan PUT Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID pelanggan tidak ditemukan' }, { status: 400 });
    }

    const result = await customerService.softDelete(id);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Pelanggan DELETE Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
