import { prisma } from '../lib/prisma.js';
import { ensureSystemInitialized } from './dbInitService.js';
import { expenseService } from './expenseService.js';

function extractYear(dateInput) {
  if (!dateInput) return new Date().getFullYear().toString();
  if (typeof dateInput === 'string') {
    const match = dateInput.match(/^(\d{4})/);
    if (match) return match[1];
  }
  const dt = new Date(dateInput);
  if (!isNaN(dt.getTime())) return dt.getFullYear().toString();
  return new Date().getFullYear().toString();
}

export const bpkService = {
  /**
   * Buat Nomor BPK otomatis berurutan dengan format: BPK-YYYY-00001
   */
  async generateNextId(dateInput) {
    const year = extractYear(dateInput);
    const prefix = `BPK-${year}-`;

    // Cari seluruh BPK dengan tahun ini (termasuk yang di-soft-delete agar ID tidak duplikat)
    const existing = await prisma.bpk.findMany({
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
    let candidateId = `${prefix}${String(nextSeq).padStart(5, '0')}`;

    // Pastikan belum pernah digunakan
    let exists = await prisma.bpk.findUnique({ where: { id: candidateId } });
    while (exists) {
      nextSeq += 1;
      candidateId = `${prefix}${String(nextSeq).padStart(5, '0')}`;
      exists = await prisma.bpk.findUnique({ where: { id: candidateId } });
    }

    return candidateId;
  },

  /**
   * Ambil seluruh data BPK (tidak termasuk yang dihapus permanen/soft delete)
   */
  async getAll(filters = {}) {
    await ensureSystemInitialized();

    const where = {
      deletedAt: null,
    };

    if (filters.status && filters.status !== 'all') {
      where.status = filters.status;
    }

    if (filters.category && filters.category !== 'all') {
      where.category = filters.category;
    }

    if (filters.nopol) {
      where.nopol = { contains: filters.nopol.toUpperCase(), mode: 'insensitive' };
    }

    if (filters.transactionId) {
      where.transactionId = { contains: filters.transactionId, mode: 'insensitive' };
    }

    if (filters.recipientName) {
      where.recipientName = { contains: filters.recipientName, mode: 'insensitive' };
    }

    const list = await prisma.bpk.findMany({
      where,
      orderBy: [
        { date: 'desc' },
        { createdAt: 'desc' },
      ],
      include: {
        transaction: {
          select: {
            id: true,
            nopol: true,
            customerName: true,
            customerPhone: true,
            extraCosts: true,
            total: true,
            status: true,
          },
        },
      },
    });

    return list.map((item) => ({
      ...item,
      transactionExtraCosts: item.transaction?.extraCosts
        ? (typeof item.transaction.extraCosts === 'string' ? JSON.parse(item.transaction.extraCosts) : item.transaction.extraCosts)
        : [],
    }));
  },

  /**
   * Ambil satu BPK berdasarkan ID
   */
  async getById(id) {
    if (!id) return null;

    const bpk = await prisma.bpk.findFirst({
      where: { id, deletedAt: null },
      include: {
        transaction: true,
        expense: true,
      },
    });

    if (!bpk) return null;

    return {
      ...bpk,
      transactionExtraCosts: bpk.transaction?.extraCosts
        ? (typeof bpk.transaction.extraCosts === 'string' ? JSON.parse(bpk.transaction.extraCosts) : bpk.transaction.extraCosts)
        : [],
    };
  },

  /**
   * Buat / Simpan BPK Baru
   */
  async create(data) {
    if (!data.recipientName || !data.recipientName.trim()) {
      throw new Error('Nama penerima wajib diisi');
    }
    if (!data.category || !data.category.trim()) {
      throw new Error('Keperluan / jenis pengeluaran wajib diisi');
    }
    const amount = Number(data.amount);
    if (isNaN(amount) || amount <= 0) {
      throw new Error('Jumlah pengeluaran harus berupa angka lebih besar dari 0');
    }
    if (data.isRentalRelated && !data.transactionId) {
      throw new Error('Nomor transaksi rental wajib dipilih jika pengeluaran terkait sewa unit');
    }

    const date = data.date || new Date().toISOString();
    const id = data.id && data.id.startsWith('BPK-') ? data.id : await this.generateNextId(date);
    const status = data.status || 'Sudah Dibayar';

    let expenseId = null;

    // Jika status "Sudah Dibayar", otomatis catat ke modul Pengeluaran Kas (Expense)
    if (status === 'Sudah Dibayar') {
      const expCategory = data.category === 'Operasional'
        ? 'Operasional Toko'
        : (data.category.includes('Antar') || data.category.includes('Jemput') ? 'Biaya Antar / Jemput' : 'Lain-lain');

      const expDesc = `[BPK ${id}] ${data.category} - ${data.recipientName}${data.recipientRole ? ` (${data.recipientRole})` : ''}: ${data.description || 'Pengeluaran resmi BPK'}`;

      const newExpense = await expenseService.create({
        category: expCategory,
        amount,
        description: expDesc,
        date,
        isVehicleRelated: Boolean(data.nopol),
        nopol: data.nopol ? data.nopol.toUpperCase().trim() : null,
      });

      expenseId = newExpense.id;
    }

    const created = await prisma.bpk.create({
      data: {
        id,
        date,
        paymentMethod: data.paymentMethod || 'Tunai',
        recipientName: data.recipientName.trim(),
        recipientRole: (data.recipientRole || '').trim(),
        category: data.category.trim(),
        categoryOther: (data.categoryOther || '').trim(),
        isRentalRelated: Boolean(data.isRentalRelated),
        transactionId: data.isRentalRelated ? (data.transactionId || null) : null,
        nopol: data.nopol ? data.nopol.toUpperCase().trim() : null,
        customerName: (data.customerName || '').trim(),
        customerPhone: (data.customerPhone || '').trim(),
        customerFee: Number(data.customerFee || 0),
        amount,
        description: (data.description || '').trim(),
        status,
        expenseId,
        createdByName: data.createdByName || 'Admin Kasir',
        createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
        deletedAt: null,
      },
    });

    return created;
  },

  /**
   * Perbarui BPK yang sudah ada
   */
  async update(id, data) {
    if (!id) throw new Error('ID BPK wajib disertakan');

    const existing = await prisma.bpk.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error(`Data BPK dengan nomor ${id} tidak ditemukan`);
    }

    const newStatus = data.status || existing.status;
    const newAmount = data.amount !== undefined ? Number(data.amount) : existing.amount;
    const newDate = data.date || existing.date;
    const newCategory = data.category || existing.category;
    const newRecipient = data.recipientName || existing.recipientName;
    const newRole = data.recipientRole !== undefined ? data.recipientRole : existing.recipientRole;
    const newDesc = data.description !== undefined ? data.description : existing.description;
    const newNopol = data.nopol !== undefined ? (data.nopol ? data.nopol.toUpperCase().trim() : null) : existing.nopol;

    let expenseId = existing.expenseId;

    // Sinkronisasi status dengan modul Pengeluaran Kas (Expense):
    if (newStatus === 'Sudah Dibayar') {
      const expCategory = newCategory === 'Operasional'
        ? 'Operasional Toko'
        : (newCategory.includes('Antar') || newCategory.includes('Jemput') ? 'Biaya Antar / Jemput' : 'Lain-lain');

      const expDesc = `[BPK ${id}] ${newCategory} - ${newRecipient}${newRole ? ` (${newRole})` : ''}: ${newDesc || 'Pengeluaran resmi BPK'}`;

      if (expenseId) {
        // Perbarui data pengeluaran yang sudah terhubung
        await expenseService.update(expenseId, {
          category: expCategory,
          amount: newAmount,
          description: expDesc,
          date: newDate,
          isVehicleRelated: Boolean(newNopol),
          nopol: newNopol,
        });
      } else {
        // Buat pengeluaran baru jika sebelumnya berstatus Draft / Dibatalkan
        const newExp = await expenseService.create({
          category: expCategory,
          amount: newAmount,
          description: expDesc,
          date: newDate,
          isVehicleRelated: Boolean(newNopol),
          nopol: newNopol,
        });
        expenseId = newExp.id;
      }
    } else {
      // Jika status Draft atau Dibatalkan, hapus/nonaktifkan pengeluaran dari pembukuan
      if (expenseId) {
        await expenseService.softDelete(expenseId);
      }
    }

    const updated = await prisma.bpk.update({
      where: { id },
      data: {
        date: newDate,
        paymentMethod: data.paymentMethod || existing.paymentMethod,
        recipientName: newRecipient.trim(),
        recipientRole: (newRole || '').trim(),
        category: newCategory.trim(),
        categoryOther: data.categoryOther !== undefined ? (data.categoryOther || '').trim() : existing.categoryOther,
        isRentalRelated: data.isRentalRelated !== undefined ? Boolean(data.isRentalRelated) : existing.isRentalRelated,
        transactionId: data.isRentalRelated ? (data.transactionId || null) : null,
        nopol: newNopol,
        customerName: data.customerName !== undefined ? (data.customerName || '').trim() : existing.customerName,
        customerPhone: data.customerPhone !== undefined ? (data.customerPhone || '').trim() : existing.customerPhone,
        customerFee: data.customerFee !== undefined ? Number(data.customerFee) : existing.customerFee,
        amount: newAmount,
        description: (newDesc || '').trim(),
        status: newStatus,
        expenseId,
        updatedAt: new Date(),
      },
    });

    return updated;
  },

  /**
   * Batalkan BPK (Status diubah ke 'Dibatalkan' dan pengeluaran dilepas dari pembukuan)
   */
  async cancel(id, reason = '') {
    if (!id) throw new Error('ID BPK wajib disertakan');

    const existing = await prisma.bpk.findUnique({ where: { id } });
    if (!existing) throw new Error('Data BPK tidak ditemukan');

    // Jika memiliki relasi expense, nonaktifkan (soft delete) pengeluaran tersebut
    if (existing.expenseId) {
      await expenseService.softDelete(existing.expenseId);
    }

    const appendNote = reason ? ` [DIBATALKAN: ${reason}]` : ' [DIBATALKAN]';
    const updatedDesc = (existing.description || '') + appendNote;

    const updated = await prisma.bpk.update({
      where: { id },
      data: {
        status: 'Dibatalkan',
        description: updatedDesc,
        updatedAt: new Date(),
      },
    });

    return updated;
  },

  /**
   * Hapus BPK secara aman (Soft Delete)
   */
  async softDelete(id) {
    if (!id) throw new Error('ID BPK wajib disertakan');

    const existing = await prisma.bpk.findUnique({ where: { id } });
    if (!existing) return { success: true, id };

    // Soft delete expense terkait jika ada
    if (existing.expenseId) {
      await expenseService.softDelete(existing.expenseId);
    }

    await prisma.bpk.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return { success: true, id };
  },
};
