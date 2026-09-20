import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { initialExpenses } from '@/lib/seedData';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let list = await prisma.expense.findMany({
      orderBy: { date: 'desc' },
    });

    if (list.length === 0) {
      for (const e of initialExpenses) {
        await prisma.expense.create({
          data: {
            id: e.id,
            isVehicleRelated: Boolean(e.isVehicleRelated),
            nopol: e.nopol || null,
            category: e.category || 'Umum',
            amount: Number(e.amount),
            description: e.description || '',
            date: e.date || new Date().toISOString(),
            receiptPhoto: e.receiptPhoto || null,
            gdriveFileId: e.gdriveFileId || null,
            gdriveLink: e.gdriveLink || null,
            createdAt: new Date(e.createdAt || Date.now()),
          },
        });
      }
      list = await prisma.expense.findMany({
        orderBy: { date: 'desc' },
      });
    }

    const expenses = list.map((e) => ({
      ...e,
      receiptPhoto: e.receiptPhoto?.startsWith('/uploads/')
        ? e.receiptPhoto.replace('/uploads/', '/api/uploads/')
        : e.receiptPhoto,
      createdAt: e.createdAt.toISOString(),
    }));

    return NextResponse.json({ success: true, data: expenses });
  } catch (error) {
    console.error('Prisma Pengeluaran GET Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const exp = await request.json();
    const normalizedReceiptPhoto = exp.receiptPhoto?.startsWith('/uploads/')
      ? exp.receiptPhoto.replace('/uploads/', '/api/uploads/')
      : (exp.receiptPhoto || null);

    const saved = await prisma.expense.upsert({
      where: { id: exp.id },
      update: {
        isVehicleRelated: Boolean(exp.isVehicleRelated),
        nopol: exp.nopol || null,
        category: exp.category || 'Umum',
        amount: Number(exp.amount),
        description: exp.description || '',
        date: exp.date || new Date().toISOString(),
        receiptPhoto: normalizedReceiptPhoto,
        gdriveFileId: exp.gdriveFileId || null,
        gdriveLink: exp.gdriveLink || null,
      },
      create: {
        id: exp.id,
        isVehicleRelated: Boolean(exp.isVehicleRelated),
        nopol: exp.nopol || null,
        category: exp.category || 'Umum',
        amount: Number(exp.amount),
        description: exp.description || '',
        date: exp.date || new Date().toISOString(),
        receiptPhoto: normalizedReceiptPhoto,
        gdriveFileId: exp.gdriveFileId || null,
        gdriveLink: exp.gdriveLink || null,
        createdAt: exp.createdAt ? new Date(exp.createdAt) : new Date(),
      },
    });

    return NextResponse.json({ success: true, data: saved });
  } catch (error) {
    console.error('Prisma Pengeluaran POST Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const exp = await request.json();
    if (!exp.id) {
      return NextResponse.json({ success: false, error: 'ID pengeluaran wajib disertakan' }, { status: 400 });
    }

    const normalizedReceiptPhoto = exp.receiptPhoto?.startsWith('/uploads/')
      ? exp.receiptPhoto.replace('/uploads/', '/api/uploads/')
      : (exp.receiptPhoto || null);

    const updated = await prisma.expense.update({
      where: { id: exp.id },
      data: {
        isVehicleRelated: Boolean(exp.isVehicleRelated),
        nopol: exp.nopol || null,
        category: exp.category || 'Umum',
        amount: Number(exp.amount),
        description: exp.description || '',
        date: exp.date,
        receiptPhoto: normalizedReceiptPhoto,
        gdriveFileId: exp.gdriveFileId || null,
        gdriveLink: exp.gdriveLink || null,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Prisma Pengeluaran PUT Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID pengeluaran wajib disertakan' }, { status: 400 });
    }

    await prisma.expense.delete({ where: { id } });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Prisma Pengeluaran DELETE Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
