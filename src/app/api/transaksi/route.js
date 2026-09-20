import { NextResponse } from 'next/server';
import { transactionService } from '@/services/transactionService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await transactionService.getAll();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Transaksi GET Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const tx = await request.json();
    const data = await transactionService.create(tx);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Transaksi POST Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const tx = await request.json();
    if (!tx.id) {
      return NextResponse.json({ success: false, error: 'ID transaksi wajib disertakan' }, { status: 400 });
    }

    let data;
    if (tx.action === 'activate') {
      data = await transactionService.activateTransaction(tx.id);
    } else if (tx.action === 'complete') {
      data = await transactionService.completeTransaction(tx.id, tx.notes);
    } else if (tx.action === 'pay') {
      data = await transactionService.recordPayment(tx.id, {
        additionalAmount: tx.additionalAmount,
        paymentMethod: tx.paymentMethod,
        notes: tx.notes
      });
    } else {
      data = await transactionService.update(tx.id, tx);
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Transaksi PUT Error:', error);
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

    const result = await transactionService.softDelete(id);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Transaksi DELETE Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
