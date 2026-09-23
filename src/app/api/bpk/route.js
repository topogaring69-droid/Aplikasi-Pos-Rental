import { NextResponse } from 'next/server';
import { bpkService } from '@/services/bpkService';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const bpk = await bpkService.getById(id);
      if (!bpk) {
        return NextResponse.json({ success: false, error: 'Data BPK tidak ditemukan' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: bpk });
    }

    const filters = {
      status: searchParams.get('status') || undefined,
      category: searchParams.get('category') || undefined,
      nopol: searchParams.get('nopol') || undefined,
      transactionId: searchParams.get('transactionId') || undefined,
      recipientName: searchParams.get('recipientName') || undefined,
    };

    const data = await bpkService.getAll(filters);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('BPK GET Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const created = await bpkService.create(body);
    return NextResponse.json({ success: true, data: created });
  } catch (error) {
    console.error('BPK POST Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, action, cancelReason, ...restData } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Nomor BPK (ID) wajib disertakan' }, { status: 400 });
    }

    if (action === 'cancel') {
      const cancelled = await bpkService.cancel(id, cancelReason);
      return NextResponse.json({ success: true, data: cancelled });
    }

    const updated = await bpkService.update(id, restData);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('BPK PUT Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Nomor BPK (ID) wajib disertakan' }, { status: 400 });
    }

    const result = await bpkService.softDelete(id);
    return NextResponse.json(result);
  } catch (error) {
    console.error('BPK DELETE Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
