import path from 'path';
import fs from 'fs/promises';
import { prisma } from '../lib/prisma.js';
import { ensureSystemInitialized } from './dbInitService.js';
import { uploadToGoogleDrive } from '../lib/googleDrive.js';
import { put } from '@vercel/blob';

function formatDateDigits(dateInput) {
  if (!dateInput) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
  }
  if (typeof dateInput === 'string') {
    const m = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      return `${m[1]}${m[2]}${m[3]}`;
    }
  }
  const dt = new Date(dateInput);
  if (isNaN(dt.getTime())) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
  }
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

let _hasMigrated = false;

export const expenseService = {
  /**
   * Buat Nomor Transaksi Pengeluaran unik dengan format: PG-YYYYMMDD-001
   */
  async generateNextId(dateInput) {
    const dateDigits = formatDateDigits(dateInput);
    const prefix = `PG-${dateDigits}-`;

    // Cari seluruh pengeluaran dengan tanggal ini (termasuk deletedAt untuk cegah duplikasi)
    const existing = await prisma.expense.findMany({
      where: {
        id: {
          startsWith: prefix,
        },
      },
      select: { id: true },
    });

    let maxSeq = 0;
    for (const item of existing) {
      const parts = item.id.split('-');
      if (parts.length >= 3) {
        const seq = parseInt(parts[2], 10);
        if (!isNaN(seq) && seq > maxSeq) {
          maxSeq = seq;
        }
      }
    }

    let nextSeq = maxSeq + 1;
    let candidateId = `${prefix}${String(nextSeq).padStart(3, '0')}`;

    // Verifikasi bahwa ID belum pernah digunakan
    let exists = await prisma.expense.findUnique({ where: { id: candidateId } });
    while (exists) {
      nextSeq += 1;
      candidateId = `${prefix}${String(nextSeq).padStart(3, '0')}`;
      exists = await prisma.expense.findUnique({ where: { id: candidateId } });
    }

    return candidateId;
  },

  /**
   * Migrasikan data pengeluaran lama yang belum berformat PG-YYYYMMDD-XXX
   */
  async migrateLegacyExpenses() {
    if (_hasMigrated) return;
    _hasMigrated = true;

    try {
      const legacy = await prisma.expense.findMany({
        where: {
          NOT: {
            id: {
              startsWith: 'PG-',
            },
          },
        },
        orderBy: [
          { date: 'asc' },
          { createdAt: 'asc' },
        ],
      });

      if (legacy.length === 0) return;

      console.log(`[expenseService] Menemukan ${legacy.length} data pengeluaran lama untuk dimigrasikan ke format PG-YYYYMMDD-XXX...`);

      for (const item of legacy) {
        const newId = await this.generateNextId(item.date || item.createdAt);
        await prisma.expense.update({
          where: { id: item.id },
          data: { id: newId },
        });
        console.log(`[expenseService] Migrasi sukses: ${item.id} -> ${newId}`);
      }
    } catch (err) {
      console.error('[expenseService] Gagal memigrasikan data pengeluaran lama:', err);
    }
  },

  /**
   * Ambil seluruh pengeluaran aktif (tidak termasuk yang di-soft delete)
   */
  async getAll() {
    await ensureSystemInitialized();
    await this.migrateLegacyExpenses();

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
   * Tambah atau simpan data pengeluaran baru
   */
  async create(exp, fileData = null) {
    if (!exp || exp.amount === undefined) {
      throw new Error('Data pengeluaran tidak lengkap');
    }

    // Pastikan nomor transaksi pengeluaran otomatis PG-YYYYMMDD-XXX
    if (!exp.id || exp.id.startsWith('EXP-')) {
      exp.id = await this.generateNextId(exp.date);
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

    // PENCATATAN KE DATABASE
    const saved = await prisma.expense.upsert({
      where: { id: exp.id },
      update: {
        isVehicleRelated: Boolean(exp.isVehicleRelated),
        nopol: exp.isVehicleRelated ? (exp.nopol || null) : null,
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
        nopol: exp.isVehicleRelated ? (exp.nopol || null) : null,
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
   * Edit / perbarui pengeluaran yang sudah ada tanpa merubah nomor transaksi (ID)
   */
  async update(id, expData, fileData = null) {
    if (!id) {
      throw new Error('ID pengeluaran wajib disertakan untuk pembaruan');
    }

    const existing = await prisma.expense.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error(`Data pengeluaran dengan nomor ${id} tidak ditemukan`);
    }

    let receiptPhotoUrl = expData.receiptPhoto !== undefined ? expData.receiptPhoto : existing.receiptPhoto;
    let gdriveFileId = expData.gdriveFileId !== undefined ? expData.gdriveFileId : existing.gdriveFileId;
    let gdriveLink = expData.gdriveLink !== undefined ? expData.gdriveLink : existing.gdriveLink;

    if (fileData && fileData.buffer) {
      const { buffer, fileName, mimeType } = fileData;
      const storageDriver = process.env.STORAGE_DRIVER || 'local';

      if (process.env.BLOB_READ_WRITE_TOKEN) {
        try {
          const blob = await put(fileName, buffer, {
            access: 'public',
            contentType: mimeType,
          });
          receiptPhotoUrl = blob.url;
        } catch (blobErr) {
          throw new Error(`Gagal upload ke Vercel Blob: ${blobErr.message}. Pembaruan pengeluaran dibatalkan.`);
        }
      } else if (storageDriver === 'google_drive') {
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
          throw new Error(`Gagal mengunggah foto nota ke Google Drive: ${driveErr.message}.`);
        }
      } else {
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

    const isVeh = expData.isVehicleRelated !== undefined ? Boolean(expData.isVehicleRelated) : existing.isVehicleRelated;

    const updated = await prisma.expense.update({
      where: { id },
      data: {
        isVehicleRelated: isVeh,
        nopol: isVeh ? (expData.nopol !== undefined ? (expData.nopol || null) : existing.nopol) : null,
        category: expData.category || existing.category,
        amount: expData.amount !== undefined ? Number(expData.amount) : existing.amount,
        description: expData.description !== undefined ? String(expData.description) : existing.description,
        date: expData.date || existing.date,
        receiptPhoto: receiptPhotoUrl,
        gdriveFileId,
        gdriveLink,
        deletedAt: null,
      },
    });

    return updated;
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

