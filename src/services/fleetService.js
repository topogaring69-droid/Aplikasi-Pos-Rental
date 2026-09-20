import { prisma } from '../lib/prisma.js';
import { ensureSystemInitialized } from './dbInitService.js';

export const fleetService = {
  /**
   * Ambil seluruh armada aktif (tidak termasuk yang di-soft delete)
   */
  async getAll() {
    await ensureSystemInitialized();

    return await prisma.fleet.findMany({
      where: { deletedAt: null },
      orderBy: [{ brand: 'asc' }, { model: 'asc' }],
    });
  },

  /**
   * Ambil unit armada aktif berdasarkan ID
   */
  async getById(id) {
    return await prisma.fleet.findFirst({
      where: { id, deletedAt: null },
    });
  },

  /**
   * Tambah atau perbarui data armada
   * Jika nopol pernah di-soft delete, otomatis direstorasi kembali (deletedAt: null).
   */
  async upsert(m) {
    if (!m || !m.nopol) {
      throw new Error('Nomor polisi kendaraan wajib diisi!');
    }

    const nopolUpper = m.nopol.toUpperCase().trim();

    // Cek apakah nopol sudah ada di database (termasuk yang soft-deleted)
    const existing = await prisma.fleet.findFirst({
      where: { nopol: nopolUpper },
    });

    if (existing) {
      // Perbarui dan aktifkan kembali
      return await prisma.fleet.update({
        where: { id: existing.id },
        data: {
          brand: m.brand || existing.brand,
          model: m.model || existing.model,
          color: m.color || '',
          year: m.year != null ? String(m.year) : (existing.year || ''),
          dailyRate: Number(m.dailyRate) || existing.dailyRate,
          status: m.status || existing.status,
          taxAnnualDate: m.taxAnnualDate || null,
          taxFiveYearDate: m.taxFiveYearDate || null,
          deletedAt: null, // Restorasi jika sebelumnya terhapus
        },
      });
    }

    // Jika belum pernah ada, buat baru
    return await prisma.fleet.create({
      data: {
        id: m.id || `MTR-${Date.now().toString().slice(-4)}`,
        nopol: nopolUpper,
        brand: m.brand,
        model: m.model,
        color: m.color || '',
        year: m.year != null ? String(m.year) : '',
        dailyRate: Number(m.dailyRate),
        status: m.status || 'available',
        taxAnnualDate: m.taxAnnualDate || null,
        taxFiveYearDate: m.taxFiveYearDate || null,
        deletedAt: null,
      },
    });
  },

  /**
   * Perbarui status ketersediaan unit armada
   */
  async updateStatus(nopol, status) {
    if (!nopol) return;

    return await prisma.fleet.updateMany({
      where: { nopol: nopol.toUpperCase().trim(), deletedAt: null },
      data: { status },
    });
  },

  /**
   * Hapus unit armada secara aman (Soft Delete)
   */
  async softDelete(id) {
    const unit = await prisma.fleet.findUnique({
      where: { id },
    });

    if (!unit) {
      throw new Error('Armada tidak ditemukan');
    }

    await prisma.fleet.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { success: true, id };
  },
};
