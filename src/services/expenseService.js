import path from 'path';
import fs from 'fs/promises';
import { prisma } from '../lib/prisma.js';
import { ensureSystemInitialized } from './dbInitService.js';
import { uploadToGoogleDrive } from '../lib/googleDrive.js';
import { put } from '@vercel/blob';

export const expenseService = {
  /**
   * Ambil seluruh pengeluaran aktif (tidak termasuk yang di-soft delete)
   */
  async getAll() {
    await ensureSystemInitialized();

    const list = await prisma.expense.findMany({
      where: { deletedAt: null },
      orderBy: { date: 'desc' },
    });

    return list.map((e) => ({
      ...e,
      receiptPhoto: e.receiptPhoto?.startsWith('/uploads/')
        ? e.receiptPhoto.replace('/uploads/', '/api/uploads/')
        : e.receiptPhoto,
    }));
  },

  /**
   * Ambil pengeluaran aktif berdasarkan ID
   */
  async getById(id) {
    const e = await prisma.expense.findFirst({
      where: { id, deletedAt: null },
    });

    if (!e) return null;

    return {
      ...e,
      receiptPhoto: e.receiptPhoto?.startsWith('/uploads/')
        ? e.receiptPhoto.replace('/uploads/', '/api/uploads/')
        : e.receiptPhoto,
    };
  },

  /**
   * Tambah atau simpan data pengeluaran (Mendukung upload berkas nota di backend saat submit)
   */
  async create(exp, fileData = null) {
    if (!exp || !exp.id || exp.amount === undefined) {
      throw new Error('Data pengeluaran tidak lengkap');
    }

    let receiptPhotoUrl = exp.receiptPhoto || null;
    let gdriveFileId = exp.gdriveFileId || null;
    let gdriveLink = exp.gdriveLink || null;

    // Jika ada file foto nota yang disertakan saat submit
    if (fileData && fileData.buffer) {
      const { buffer, fileName, mimeType } = fileData;
      const storageDriver = process.env.STORAGE_DRIVER || 'local';

      // 1. Prioritas Vercel Blob
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        try {
          const blob = await put(fileName, buffer, {
            access: 'public',
            contentType: mimeType,
          });
          receiptPhotoUrl = blob.url;
        } catch (blobErr) {
          throw new Error(`Gagal upload ke Vercel Blob: ${blobErr.message}. Pengeluaran batal disimpan.`);
        }
      }
      // 2. Google Drive OAuth 2.0
      else if (storageDriver === 'google_drive') {
        try {
          const driveResult = await uploadToGoogleDrive({
            fileName,
            buffer,
            mimeType,
          });
          receiptPhotoUrl = driveResult.gdriveLink || driveResult.webViewLink;
          gdriveFileId = driveResult.gdriveFileId;
          gdriveLink = driveResult.gdriveLink || driveResult.webViewLink;
        } catch (driveErr) {
          // HENTIKAN PENCATATAN DATABASE JIKA UPLOAD GAGAL!
          throw new Error(`Gagal mengunggah foto nota ke Google Drive: ${driveErr.message}. Pengeluaran tidak disimpan.`);
        }
      }
      // 3. Penyimpanan Lokal
      else {
        const uploadDir = path.join(process.cwd(), 'storage', 'uploads');
        await fs.mkdir(uploadDir, { recursive: true });
        const filePath = path.join(uploadDir, fileName);
        await fs.writeFile(filePath, buffer);
        receiptPhotoUrl = `/api/uploads/${fileName}`;
      }
    }

    if (receiptPhotoUrl?.startsWith('/uploads/')) {
      receiptPhotoUrl = receiptPhotoUrl.replace('/uploads/', '/api/uploads/');
    }

    // PENCATATAN KE DATABASE DILAKUKAN SETELAH PROSES UPLOAD BERHASIL
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
        deletedAt: null,
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
        deletedAt: null,
      },
    });

    return saved;
  },

  /**
   * Hapus pengeluaran secara aman (Soft Delete)
   */
  async softDelete(id) {
    const exp = await prisma.expense.findUnique({
      where: { id },
    });

    if (!exp) {
      return { success: true, id, message: 'Pengeluaran sudah tidak ada di database' };
    }

    await prisma.expense.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { success: true, id };
  },
};
