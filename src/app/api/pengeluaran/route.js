import { NextResponse } from 'next/server';
import path from 'node:path';
import { expenseService } from '@/services/expenseService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await expenseService.getAll();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Pengeluaran GET Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let exp = {};
    let fileData = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');

      exp = {
        id: formData.get('id'),
        isVehicleRelated: formData.get('isVehicleRelated') === 'true',
        nopol: formData.get('nopol') || null,
        category: formData.get('category') || 'Umum',
        amount: Number(formData.get('amount')) || 0,
        description: formData.get('description') || '',
        date: formData.get('date') || new Date().toISOString(),
        receiptPhoto: formData.get('receiptPhoto') || null,
        gdriveFileId: formData.get('gdriveFileId') || null,
        gdriveLink: formData.get('gdriveLink') || null,
        createdAt: formData.get('createdAt') || new Date().toISOString(),
      };

      if (file && typeof file === 'object' && file.size > 0) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const ext = path.extname(file.name) || '.jpg';
        const fileName = `nota_${Date.now()}_${Math.random().toString(36).substring(2, 7)}${ext}`;
        const mimeType = file.type || 'image/jpeg';
        fileData = { buffer, fileName, mimeType };
      }
    } else {
      exp = await request.json();
    }

    if (!exp.id) {
      exp.id = `EXP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const saved = await expenseService.create(exp, fileData);
    return NextResponse.json({ success: true, data: saved });
  } catch (error) {
    console.error('Pengeluaran POST Error:', error);
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

    const result = await expenseService.softDelete(id);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Pengeluaran DELETE Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
