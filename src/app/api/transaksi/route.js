import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { initialTransactions } from '@/lib/seedData';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let list = await prisma.transaction.findMany({
      orderBy: { createdAt: 'desc' },
    });

    if (list.length === 0) {
      for (const t of initialTransactions) {
        await prisma.transaction.create({
          data: {
            id: t.id,
            nopol: t.nopol,
            customerId: t.customerId || null,
            customerName: t.customerName,
            customerPhone: t.customerPhone || '',
            startDate: t.startDate,
            endDate: t.endDate,
            durationDays: Number(t.durationDays) || 1,
            durationHours: Number(t.durationHours) || (Number(t.durationDays) || 1) * 24,
            rentalPrice: Number(t.rentalPrice),
            extraCosts: JSON.stringify(t.extraCosts || []),
            total: Number(t.total),
            paymentMethod: t.paymentMethod || 'Tunai',
            amountPaid: Number(t.amountPaid) || Number(t.total),
            changeAmount: Number(t.changeAmount) || 0,
            notes: t.notes || '',
            createdAt: new Date(t.createdAt || Date.now()),
          },
        });
      }
      list = await prisma.transaction.findMany({
        orderBy: { createdAt: 'desc' },
      });
    }

    const transactions = list.map((t) => ({
      ...t,
      durationHours: t.durationHours || (t.durationDays || 1) * 24,
      extraCosts: t.extraCosts ? JSON.parse(t.extraCosts) : [],
      createdAt: t.createdAt.toISOString(),
    }));

    return NextResponse.json({ success: true, data: transactions });
  } catch (error) {
    console.error('Prisma Transaksi GET Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const tx = await request.json();

    const durationDays = Number(tx.durationDays) || Math.ceil((Number(tx.durationHours) || 24) / 24) || 1;
    const durationHours = Number(tx.durationHours) || durationDays * 24;

    // 1. Simpan Transaksi ke Prisma
    const saved = await prisma.transaction.upsert({
      where: { id: tx.id },
      update: {
        nopol: tx.nopol,
        customerId: tx.customerId || null,
        customerName: tx.customerName,
        customerPhone: tx.customerPhone || '',
        startDate: tx.startDate,
        endDate: tx.endDate,
        durationDays: durationDays,
        durationHours: durationHours,
        rentalPrice: Number(tx.rentalPrice),
        extraCosts: JSON.stringify(tx.extraCosts || []),
        total: Number(tx.total),
        paymentMethod: tx.paymentMethod || 'Tunai',
        amountPaid: Number(tx.amountPaid) || Number(tx.total),
        changeAmount: Number(tx.changeAmount) || 0,
        notes: tx.notes || '',
      },
      create: {
        id: tx.id,
        nopol: tx.nopol,
        customerId: tx.customerId || null,
        customerName: tx.customerName,
        customerPhone: tx.customerPhone || '',
        startDate: tx.startDate,
        endDate: tx.endDate,
        durationDays: durationDays,
        durationHours: durationHours,
        rentalPrice: Number(tx.rentalPrice),
        extraCosts: JSON.stringify(tx.extraCosts || []),
        total: Number(tx.total),
        paymentMethod: tx.paymentMethod || 'Tunai',
        amountPaid: Number(tx.amountPaid) || Number(tx.total),
        changeAmount: Number(tx.changeAmount) || 0,
        notes: tx.notes || '',
        createdAt: tx.createdAt ? new Date(tx.createdAt) : new Date(),
      },
    });

    // 2. Perbarui status kendaraan menjadi 'rented'
    if (tx.nopol) {
      await prisma.fleet.updateMany({
        where: { nopol: tx.nopol.toUpperCase() },
        data: { status: 'rented' },
      });
    }

    // 3. Tambahkan totalRentals pada master pelanggan (hanya jika pelanggan terdaftar/baru)
    if (tx.customerId) {
      await prisma.customer.updateMany({
        where: { id: tx.customerId },
        data: { totalRentals: { increment: 1 } },
      });
    } else if (tx.customerName) {
      const existing = await prisma.customer.findFirst({
        where: {
          OR: [
            { name: { equals: tx.customerName } },
            { phone: { equals: tx.customerPhone || '___' } },
          ],
        },
      });

      if (existing) {
        await prisma.customer.update({
          where: { id: existing.id },
          data: { totalRentals: { increment: 1 } },
        });
      } else {
        await prisma.customer.create({
          data: {
            id: `CST-${Date.now().toString().slice(-4)}`,
            name: tx.customerName,
            phone: tx.customerPhone || '',
            totalRentals: 1,
            notes: 'Pelanggan baru dari transaksi kasir',
          },
        });
      }
    }

    return NextResponse.json({ success: true, data: tx });
  } catch (error) {
    console.error('Prisma Transaksi POST Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const tx = await request.json();
    if (!tx.id) {
      return NextResponse.json({ success: false, error: 'ID transaksi wajib disertakan' }, { status: 400 });
    }

    // Cek transaksi lama untuk mendeteksi perubahan nopol kendaraan
    const oldTx = await prisma.transaction.findUnique({ where: { id: tx.id } });
    if (oldTx && oldTx.nopol && oldTx.nopol.toUpperCase() !== tx.nopol.toUpperCase()) {
      // Kembalikan armada lama ke available
      await prisma.fleet.updateMany({
        where: { nopol: oldTx.nopol.toUpperCase() },
        data: { status: 'available' },
      });
    }

    const durationDays = Number(tx.durationDays) || Math.ceil((Number(tx.durationHours) || 24) / 24) || 1;
    const durationHours = Number(tx.durationHours) || durationDays * 24;

    const updated = await prisma.transaction.update({
      where: { id: tx.id },
      data: {
        nopol: tx.nopol,
        customerId: tx.customerId || null,
        customerName: tx.customerName,
        customerPhone: tx.customerPhone || '',
        startDate: tx.startDate,
        endDate: tx.endDate,
        durationDays: durationDays,
        durationHours: durationHours,
        rentalPrice: Number(tx.rentalPrice),
        extraCosts: JSON.stringify(tx.extraCosts || []),
        total: Number(tx.total),
        paymentMethod: tx.paymentMethod || 'Tunai',
        amountPaid: Number(tx.amountPaid) || Number(tx.total),
        changeAmount: Number(tx.changeAmount) || 0,
        notes: tx.notes || '',
      },
    });

    // Pastikan armada baru berstatus rented
    if (tx.nopol) {
      await prisma.fleet.updateMany({
        where: { nopol: tx.nopol.toUpperCase() },
        data: { status: 'rented' },
      });
    }

    return NextResponse.json({ success: true, data: { ...updated, extraCosts: tx.extraCosts } });
  } catch (error) {
    console.error('Prisma Transaksi PUT Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID transaksi wajib disertakan' }, { status: 400 });
    }

    const tx = await prisma.transaction.findUnique({ where: { id } });
    if (tx && tx.nopol) {
      await prisma.fleet.updateMany({
        where: { nopol: tx.nopol.toUpperCase() },
        data: { status: 'available' },
      });
    }

    await prisma.transaction.delete({ where: { id } });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Prisma Transaksi DELETE Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
