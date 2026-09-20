import { prisma } from '../lib/prisma.js';
import { ensureSystemInitialized } from './dbInitService.js';

export const customerService = {
  /**
   * Ambil seluruh pelanggan aktif (tidak termasuk yang di-soft delete)
   */
  async getAll() {
    await ensureSystemInitialized();

    return await prisma.customer.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * Ambil pelanggan aktif berdasarkan ID
   */
  async getById(id) {
    return await prisma.customer.findFirst({
      where: { id, deletedAt: null },
    });
  },

  /**
   * Tambah atau perbarui data pelanggan
   */
  async upsert(c) {
    if (!c || !c.name) {
      throw new Error('Nama pelanggan wajib diisi!');
    }

    const id = c.id || `CST-${Date.now().toString().slice(-4)}`;

    return await prisma.customer.upsert({
      where: { id },
      update: {
        name: c.name,
        phone: c.phone || '',
        nik: c.nik || '',
        address: c.address || '',
        emergencyContact: c.emergencyContact || '',
        notes: c.notes || '',
        totalRentals: c.totalRentals !== undefined ? Number(c.totalRentals) : undefined,
        deletedAt: null, // Restorasi jika sebelumnya terhapus
      },
      create: {
        id,
        name: c.name,
        phone: c.phone || '',
        nik: c.nik || '',
        address: c.address || '',
        emergencyContact: c.emergencyContact || '',
        notes: c.notes || '',
        totalRentals: Number(c.totalRentals) || 0,
        createdAt: c.createdAt ? new Date(c.createdAt) : new Date(),
        deletedAt: null,
      },
    });
  },

  /**
   * Hapus pelanggan secara aman (Soft Delete)
   */
  async softDelete(id) {
    const cust = await prisma.customer.findUnique({
      where: { id },
    });

    if (!cust) {
      return { success: true, id, message: 'Pelanggan sudah tidak ada di database' };
    }

    await prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { success: true, id };
  },
};
