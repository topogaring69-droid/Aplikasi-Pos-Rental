import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { initialFleet } from '@/lib/seedData';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let fleet = await prisma.fleet.findMany({
      orderBy: [{ brand: 'asc' }, { model: 'asc' }],
    });

    // Seed jika kosong
    if (fleet.length === 0) {
      for (const m of initialFleet) {
        await prisma.fleet.upsert({
          where: { nopol: m.nopol.toUpperCase().trim() },
          update: {},
          create: {
            id: m.id,
            nopol: m.nopol.toUpperCase().trim(),
            brand: m.brand,
            model: m.model,
            color: m.color || '',
            year: m.year || '',
            dailyRate: Number(m.dailyRate),
            status: m.status || 'available',
            taxAnnualDate: m.taxAnnualDate || null,
            taxFiveYearDate: m.taxFiveYearDate || null,
          },
        });
      }
      fleet = await prisma.fleet.findMany({
        orderBy: [{ brand: 'asc' }, { model: 'asc' }],
      });
    }

    return NextResponse.json({ success: true, data: fleet });
  } catch (error) {
    console.error('Prisma Armada GET Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const motor = await request.json();
    const id = motor.id || `MTR-${Date.now().toString().slice(-4)}`;
    const nopol = motor.nopol.toUpperCase().trim();

    const saved = await prisma.fleet.upsert({
      where: { nopol },
      update: {
        brand: motor.brand,
        model: motor.model,
        color: motor.color || '',
        year: motor.year || '',
        dailyRate: Number(motor.dailyRate),
        status: motor.status || 'available',
        taxAnnualDate: motor.taxAnnualDate || null,
        taxFiveYearDate: motor.taxFiveYearDate || null,
      },
      create: {
        id,
        nopol,
        brand: motor.brand,
        model: motor.model,
        color: motor.color || '',
        year: motor.year || '',
        dailyRate: Number(motor.dailyRate),
        status: motor.status || 'available',
        taxAnnualDate: motor.taxAnnualDate || null,
        taxFiveYearDate: motor.taxFiveYearDate || null,
      },
    });

    return NextResponse.json({ success: true, data: saved });
  } catch (error) {
    console.error('Prisma Armada POST Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const motor = await request.json();
    if (!motor.id) {
      return NextResponse.json({ success: false, error: 'ID motor wajib disertakan' }, { status: 400 });
    }

    const updated = await prisma.fleet.update({
      where: { id: motor.id },
      data: {
        nopol: motor.nopol?.toUpperCase().trim(),
        brand: motor.brand,
        model: motor.model,
        color: motor.color || '',
        year: motor.year || '',
        dailyRate: Number(motor.dailyRate),
        status: motor.status || 'available',
        taxAnnualDate: motor.taxAnnualDate || null,
        taxFiveYearDate: motor.taxFiveYearDate || null,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Prisma Armada PUT Error:', error);
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

    await prisma.fleet.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Prisma Armada DELETE Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
