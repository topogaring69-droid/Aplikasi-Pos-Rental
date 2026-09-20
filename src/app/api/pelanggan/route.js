import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { initialCustomers } from '@/lib/seedData';

export const dynamic = 'force-dynamic';

// GET: Ambil daftar seluruh pelanggan dari Prisma
export async function GET() {
  try {
    let customers = await prisma.customer.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // Seed data jika masih kosong
    if (customers.length === 0) {
      for (const c of initialCustomers) {
        await prisma.customer.upsert({
          where: { id: c.id },
          update: {},
          create: {
            id: c.id,
            name: c.name,
            phone: c.phone || '',
            nik: c.nik || '',
            address: c.address || '',
            emergencyContact: c.emergencyContact || '',
            notes: c.notes || '',
            totalRentals: c.totalRentals || 0,
            createdAt: new Date(c.createdAt || Date.now()),
          },
        });
      }
      customers = await prisma.customer.findMany({
        orderBy: { createdAt: 'desc' },
      });
    }

    return NextResponse.json({ success: true, data: customers });
  } catch (error) {
    console.error('Prisma Customers GET Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Tambah atau perbarui data pelanggan
export async function POST(request) {
  try {
    const body = await request.json();
    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json({ success: false, error: 'Nama pelanggan wajib diisi' }, { status: 400 });
    }

    const id = body.id || `CST-${Date.now().toString().slice(-4)}`;
    const saved = await prisma.customer.upsert({
      where: { id },
      update: {
        name,
        phone: body.phone || '',
        nik: body.nik || '',
        address: body.address || '',
        emergencyContact: body.emergencyContact || '',
        notes: body.notes || '',
        totalRentals: Number(body.totalRentals) || 0,
      },
      create: {
        id,
        name,
        phone: body.phone || '',
        nik: body.nik || '',
        address: body.address || '',
        emergencyContact: body.emergencyContact || '',
        notes: body.notes || '',
        totalRentals: Number(body.totalRentals) || 0,
        createdAt: body.createdAt ? new Date(body.createdAt) : new Date(),
      },
    });

    return NextResponse.json({ success: true, data: saved });
  } catch (error) {
    console.error('Prisma Customers POST Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Perbarui data pelanggan
export async function PUT(request) {
  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ success: false, error: 'ID pelanggan wajib disertakan' }, { status: 400 });
    }

    const updated = await prisma.customer.update({
      where: { id: body.id },
      data: {
        name: body.name?.trim(),
        phone: body.phone || '',
        nik: body.nik || '',
        address: body.address || '',
        emergencyContact: body.emergencyContact || '',
        notes: body.notes || '',
        totalRentals: Number(body.totalRentals) || 0,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Prisma Customers PUT Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Hapus pelanggan
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID pelanggan tidak ditemukan' }, { status: 400 });
    }

    await prisma.customer.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Prisma Customers DELETE Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
