import { prisma } from '../lib/prisma.js';
import { ensureSystemInitialized } from './dbInitService.js';

export const transactionService = {
  /**
   * Ambil seluruh transaksi aktif (tidak termasuk yang di-soft delete)
   */
  async getAll() {
    await ensureSystemInitialized();

    const list = await prisma.transaction.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    return list.map((t) => ({
      ...t,
      durationHours: t.durationHours || (t.durationDays || 1) * 24,
      extraCosts: t.extraCosts ? JSON.parse(t.extraCosts) : [],
      createdAt: t.createdAt.toISOString(),
    }));
  },

  /**
   * Ambil transaksi aktif berdasarkan ID
   */
  async getById(id) {
    const t = await prisma.transaction.findFirst({
      where: { id, deletedAt: null },
    });

    if (!t) return null;

    return {
      ...t,
      durationHours: t.durationHours || (t.durationDays || 1) * 24,
      extraCosts: t.extraCosts ? JSON.parse(t.extraCosts) : [],
      createdAt: t.createdAt.toISOString(),
    };
  },

  /**
   * Tambah atau simpan transaksi baru
   */
  async create(tx) {
    const nopol = (tx?.nopol || tx?.carNopol || '').toUpperCase().trim();
    if (!nopol) {
      throw new Error('Data transaksi tidak lengkap: nopol wajib diisi');
    }

    const id = tx.id || `TRX-${Date.now()}`;
    const durationDays = Number(tx.durationDays) || Math.ceil((Number(tx.durationHours) || 24) / 24) || 1;
    const durationHours = Number(tx.durationHours) || durationDays * 24;
    const startDate = tx.startDate || new Date().toISOString();
    const endDate = tx.endDate || new Date(Date.now() + durationDays * 86400000).toISOString();
    const rentalPrice = Number(tx.rentalPrice != null ? tx.rentalPrice : (tx.pricePerDay != null ? tx.pricePerDay : 0));
    const total = Number(tx.total != null ? tx.total : (rentalPrice * durationDays));

    const status = tx.status || 'active';

    // 1. Simpan Transaksi ke Prisma
    const saved = await prisma.transaction.upsert({
      where: { id },
      update: {
        nopol,
        customerId: tx.customerId || null,
        customerName: tx.customerName || 'Pelanggan Umum',
        customerPhone: tx.customerPhone || '',
        startDate,
        endDate,
        durationDays,
        durationHours,
        rentalPrice,
        extraCosts: JSON.stringify(tx.extraCosts || []),
        total,
        paymentMethod: tx.paymentMethod || 'Tunai',
        amountPaid: Number(tx.amountPaid != null ? tx.amountPaid : total),
        changeAmount: Number(tx.changeAmount || 0),
        status,
        notes: tx.notes || '',
        deletedAt: null,
      },
      create: {
        id,
        nopol,
        customerId: tx.customerId || null,
        customerName: tx.customerName || 'Pelanggan Umum',
        customerPhone: tx.customerPhone || '',
        startDate,
        endDate,
        durationDays,
        durationHours,
        rentalPrice,
        extraCosts: JSON.stringify(tx.extraCosts || []),
        total,
        paymentMethod: tx.paymentMethod || 'Tunai',
        amountPaid: Number(tx.amountPaid != null ? tx.amountPaid : total),
        changeAmount: Number(tx.changeAmount || 0),
        status,
        notes: tx.notes || '',
        createdAt: tx.createdAt ? new Date(tx.createdAt) : new Date(),
        deletedAt: null,
      },
    });

    // 2. Perbarui status armada menjadi 'rented' jika status sewa aktif
    if (nopol && status === 'active') {
      await prisma.fleet.updateMany({
        where: { nopol, deletedAt: null },
        data: { status: 'rented' },
      });
    }

    // 3. Tambahkan akumulasi rental pada pelanggan
    if (tx.customerId) {
      await prisma.customer.updateMany({
        where: { id: tx.customerId },
        data: { totalRentals: { increment: 1 } },
      });
    } else if (tx.customerName) {
      const existing = await prisma.customer.findFirst({
        where: {
          deletedAt: null,
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
            deletedAt: null,
          },
        });
      }
    }

    return {
      ...saved,
      durationHours,
      extraCosts: tx.extraCosts || [],
      createdAt: saved.createdAt.toISOString(),
    };
  },

  /**
   * Perbarui transaksi
   */
  async update(id, tx) {
    const oldTx = await prisma.transaction.findFirst({
      where: { id, deletedAt: null },
    });

    if (!oldTx) {
      throw new Error('Transaksi tidak ditemukan atau telah dihapus');
    }

    // Jika nopol berganti, kembalikan armada lama ke status available
    if (oldTx.nopol && oldTx.nopol.toUpperCase() !== tx.nopol?.toUpperCase()) {
      await prisma.fleet.updateMany({
        where: { nopol: oldTx.nopol.toUpperCase(), deletedAt: null },
        data: { status: 'available' },
      });
    }

    const durationDays = Number(tx.durationDays) || Math.ceil((Number(tx.durationHours) || 24) / 24) || 1;
    const durationHours = Number(tx.durationHours) || durationDays * 24;
    const nextStatus = tx.status || oldTx.status || 'active';

    const updated = await prisma.transaction.update({
      where: { id },
      data: {
        nopol: tx.nopol || oldTx.nopol,
        customerId: tx.customerId !== undefined ? (tx.customerId || null) : oldTx.customerId,
        customerName: tx.customerName || oldTx.customerName,
        customerPhone: tx.customerPhone !== undefined ? tx.customerPhone : oldTx.customerPhone,
        startDate: tx.startDate || oldTx.startDate,
        endDate: tx.endDate || oldTx.endDate,
        durationDays: durationDays,
        durationHours: durationHours,
        rentalPrice: tx.rentalPrice != null ? Number(tx.rentalPrice) : oldTx.rentalPrice,
        extraCosts: tx.extraCosts ? JSON.stringify(tx.extraCosts) : oldTx.extraCosts,
        total: tx.total != null ? Number(tx.total) : oldTx.total,
        paymentMethod: tx.paymentMethod || oldTx.paymentMethod,
        amountPaid: tx.amountPaid != null ? Number(tx.amountPaid) : oldTx.amountPaid,
        changeAmount: tx.changeAmount != null ? Number(tx.changeAmount) : oldTx.changeAmount,
        status: nextStatus,
        notes: tx.notes !== undefined ? tx.notes : oldTx.notes,
      },
    });

    // Sinkronisasi status armada
    const activeNopol = (tx.nopol || oldTx.nopol || '').toUpperCase();
    if (activeNopol) {
      if (nextStatus === 'selesai') {
        await prisma.fleet.updateMany({
          where: { nopol: activeNopol, deletedAt: null },
          data: { status: 'available' },
        });
      } else if (nextStatus === 'active') {
        await prisma.fleet.updateMany({
          where: { nopol: activeNopol, deletedAt: null },
          data: { status: 'rented' },
        });
      }
    }

    return {
      ...updated,
      durationHours,
      extraCosts: tx.extraCosts || (oldTx.extraCosts ? JSON.parse(oldTx.extraCosts) : []),
      createdAt: updated.createdAt.toISOString(),
    };
  },

  /**
   * Aktifkan sewa (misal dari status Booking ke Aktif saat motor diambil)
   */
  async activateTransaction(id) {
    const tx = await prisma.transaction.findFirst({
      where: { id, deletedAt: null },
    });

    if (!tx) {
      throw new Error('Transaksi tidak ditemukan');
    }

    const durationHours = tx.durationHours || (tx.durationDays || 1) * 24;
    const now = new Date();
    const newStartDate = now.toISOString();
    const newEndDate = new Date(now.getTime() + durationHours * 3600000).toISOString();

    const updated = await prisma.transaction.update({
      where: { id },
      data: {
        status: 'active',
        startDate: newStartDate,
        endDate: newEndDate,
      },
    });

    if (tx.nopol) {
      await prisma.fleet.updateMany({
        where: { nopol: tx.nopol.toUpperCase(), deletedAt: null },
        data: { status: 'rented' },
      });
    }

    return {
      ...updated,
      durationHours,
      extraCosts: tx.extraCosts ? JSON.parse(tx.extraCosts) : [],
      createdAt: updated.createdAt.toISOString(),
    };
  },

  /**
   * Selesaikan sewa (mengembalikan motor ke armada & mengubah status menjadi selesai)
   */
  async completeTransaction(id, extraNotes = '') {
    const tx = await prisma.transaction.findFirst({
      where: { id, deletedAt: null },
    });

    if (!tx) {
      throw new Error('Transaksi tidak ditemukan');
    }

    const updatedNotes = extraNotes 
      ? (tx.notes ? `${tx.notes} | ${extraNotes}` : extraNotes)
      : tx.notes;

    const updated = await prisma.transaction.update({
      where: { id },
      data: {
        status: 'selesai',
        notes: updatedNotes,
      },
    });

    if (tx.nopol) {
      await prisma.fleet.updateMany({
        where: { nopol: tx.nopol.toUpperCase(), deletedAt: null },
        data: { status: 'available' },
      });
    }

    return {
      ...updated,
      durationHours: tx.durationHours || (tx.durationDays || 1) * 24,
      extraCosts: tx.extraCosts ? JSON.parse(tx.extraCosts) : [],
      createdAt: updated.createdAt.toISOString(),
    };
  },

  /**
   * Hapus transaksi secara aman (Soft Delete)
   */
  async softDelete(id) {
    const tx = await prisma.transaction.findUnique({
      where: { id },
    });

    if (!tx) {
      return { success: true, id, message: 'Transaksi sudah tidak ada di database' };
    }

    // Kembalikan armada menjadi available jika transaksi dibatalkan / dihapus
    if (tx.nopol) {
      await prisma.fleet.updateMany({
        where: { nopol: tx.nopol.toUpperCase(), deletedAt: null },
        data: { status: 'available' },
      });
    }

    // Terapkan soft delete
    await prisma.transaction.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { success: true, id };
  },
};
