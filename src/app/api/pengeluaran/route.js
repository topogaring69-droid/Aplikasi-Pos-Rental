import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { initialExpenses } from '@/lib/seedData';
import path from 'node:path';
import fs from 'node:fs/promises';
import { uploadToGoogleDrive } from '@/lib/googleDrive';
import { put } from '@vercel/blob';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let list = await prisma.expense.findMany({
      orderBy: { date: 'desc' },
    });

    if (list.length === 0) {
      for (const e of initialExpenses) {
        await prisma.expense.upsert({
          where: { id: e.id },
          update: {},
          create: {
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
    const contentType = request.headers.get('content-type') || '';
    let exp = {};
    let file = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      file = formData.get('file');

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
    } else {
      exp = await request.json();
    }

    if (!exp.id) {
      exp.id = `EXP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    let receiptPhotoUrl = exp.receiptPhoto;
    let gdriveFileId = exp.gdriveFileId || null;
    let gdriveLink = exp.gdriveLink || null;

    // JIKA ADA FILE FOTO YANG DIUNGGAH SAAT PROSES SUBMIT:
    if (file && typeof file === 'object' && file.size > 0) {
      const bytes = await file.arrayBuffer();
      const fileBuffer = Buffer.from(bytes);
      const ext = path.extname(file.name) || '.jpg';
      const fileName = `nota_${Date.now()}_${Math.random().toString(36).substring(2, 7)}${ext}`;
      const mimeType = file.type || 'image/jpeg';
      const storageDriver = process.env.STORAGE_DRIVER || 'local';

      // 1. Prioritas Vercel Blob (jika token Vercel Blob tersedia di cloud)
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        try {
          const blob = await put(fileName, fileBuffer, {
            access: 'public',
            contentType: mimeType,
          });
          receiptPhotoUrl = blob.url;
        } catch (blobErr) {
          console.error('Vercel Blob Upload Gagal:', blobErr);
          return NextResponse.json(
            { success: false, error: `Gagal upload ke Vercel Blob: ${blobErr.message}. Pengeluaran batal disimpan.` },
            { status: 500 }
          );
        }
      }
      // 2. Google Drive (OAuth 2.0 Akun Admin)
      else if (storageDriver === 'google_drive') {
        try {
          const driveResult = await uploadToGoogleDrive({
            fileName,
            buffer: fileBuffer,
            mimeType,
          });
          receiptPhotoUrl = driveResult.gdriveLink || driveResult.webViewLink;
          gdriveFileId = driveResult.gdriveFileId;
          gdriveLink = driveResult.gdriveLink || driveResult.webViewLink;
        } catch (driveErr) {
          console.error('Google Drive Upload Gagal:', driveErr);
          // HENTIKAN PENCATATAN DATABASE JIKA UPLOAD GAGAL!
          return NextResponse.json(
            {
              success: false,
              error: `Gagal mengunggah foto nota ke Google Drive: ${driveErr.message}. Pengeluaran tidak disimpan ke database.`,
            },
            { status: 500 }
          );
        }
      }
      // 3. Mode Penyimpanan Lokal (storage/uploads)
      else {
        const uploadDir = path.join(process.cwd(), 'storage', 'uploads');
        await fs.mkdir(uploadDir, { recursive: true });
        const filePath = path.join(uploadDir, fileName);
        await fs.writeFile(filePath, fileBuffer);
        receiptPhotoUrl = `/api/uploads/${fileName}`;
      }
    }

    // Normalisasi format URL jika lokal
    if (receiptPhotoUrl?.startsWith('/uploads/')) {
      receiptPhotoUrl = receiptPhotoUrl.replace('/uploads/', '/api/uploads/');
    }

    // PENCATATAN KE DATABASE HANYA DILAKUKAN SETELAH PROSES UPLOAD SELESAI DAN BERHASIL
    const saved = await prisma.expense.upsert({
      where: { id: exp.id },
      update: {
        isVehicleRelated: Boolean(exp.isVehicleRelated),
        nopol: exp.nopol || null,
        category: exp.category || 'Umum',
        amount: Number(exp.amount),
        description: exp.description || '',
        date: exp.date || new Date().toISOString(),
        receiptPhoto: receiptPhotoUrl || null,
        gdriveFileId,
        gdriveLink,
      },
      create: {
        id: exp.id,
        isVehicleRelated: Boolean(exp.isVehicleRelated),
        nopol: exp.nopol || null,
        category: exp.category || 'Umum',
        amount: Number(exp.amount),
        description: exp.description || '',
        date: exp.date || new Date().toISOString(),
        receiptPhoto: receiptPhotoUrl || null,
        gdriveFileId,
        gdriveLink,
        createdAt: exp.createdAt ? new Date(exp.createdAt) : new Date(),
      },
    });

    return NextResponse.json({ success: true, data: saved });
  } catch (error) {
    console.error('Prisma Pengeluaran POST Error:', error);
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
