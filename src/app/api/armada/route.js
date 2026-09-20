import { NextResponse } from 'next/server';
import { fleetService } from '@/services/fleetService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await fleetService.getAll();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Armada GET Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const motor = await request.json();
    const saved = await fleetService.upsert(motor);
    return NextResponse.json({ success: true, data: saved });
  } catch (error) {
    console.error('Armada POST Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const motor = await request.json();
    if (!motor.id) {
      return NextResponse.json({ success: false, error: 'ID motor wajib disertakan' }, { status: 400 });
    }
    const updated = await fleetService.upsert(motor);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Armada PUT Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID motor wajib disertakan' }, { status: 400 });
    }

    const result = await fleetService.softDelete(id);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Armada DELETE Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
