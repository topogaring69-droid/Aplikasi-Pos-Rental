import { prisma } from '../lib/prisma.js';
import { 
  initialCustomers, 
  initialFleet, 
  initialTransactions, 
  initialExpenses, 
  initialBpk,
  initialSettings 
} from '../lib/seedData.js';
import { ensureInitialAdmin } from '../lib/auth.js';

/**
 * Layanan Inisialisasi Database Produksi (Hanya dijalankan 1 kali saat pertama kali setup).
 * Menjamin akun admin, pengaturan default toko, dan data awal (armada, pelanggan, transaksi, pengeluaran) tersedia.
 * Data awal hanya dimasukkan pada inisialisasi pertama dan tidak pernah diulang.
 * 
 * Menggunakan cache in-memory agar tidak membebani DB pada setiap API request.
 */

// Cache di level proses: setelah terverifikasi, tidak perlu query DB lagi
let _isInitialized = false;
let _initPromise = null;

export async function ensureSystemInitialized() {
  // Fast path: sudah pernah diverifikasi di proses ini
  if (_isInitialized) return { initialized: true, freshlySeeded: false };

  // Mutex: jika sedang ada proses inisialisasi yang berjalan, tunggu hasilnya
  if (_initPromise) return _initPromise;

  _initPromise = _doInitialize();
  try {
    return await _initPromise;
  } finally {
    _initPromise = null;
  }
}

async function _doInitialize() {
  try {
    // 1. Periksa penanda apakah database sudah pernah diinisialisasi
    const initSetting = await prisma.setting.findUnique({
      where: { key: 'system_initialized' },
    });

    if (initSetting && initSetting.value === 'true') {
      // Pastikan akun admin tetap ada jika belum dibuat
      await ensureInitialAdmin();
      _isInitialized = true;
      return { initialized: true, freshlySeeded: false };
    }

    console.log('Memulai inisialisasi awal database produksi...');

    // 2. Buat Akun Admin Pertama
    await ensureInitialAdmin();

    // 3. Masukkan Pengaturan Default Toko
    for (const [k, v] of Object.entries(initialSettings)) {
      await prisma.setting.upsert({
        where: { key: k },
        update: {},
        create: {
          key: k,
          value: typeof v === 'object' ? JSON.stringify(v) : String(v),
        },
      });
    }

    // 4. Masukkan Data Awal Produksi (Armada, Pelanggan, Transaksi, Pengeluaran)
    console.log('Menyuntikkan data awal produksi...');

    for (const c of initialCustomers) {
      await prisma.customer.upsert({
        where: { id: c.id },
        update: {},
        create: {
          id: c.id,
          name: c.name,
          phone: c.phone || '',
          nik: c.nik || '',
          address: c.address || '',
          emergencyContact: c.emergencyContact || '',
          notes: c.notes || '',
          totalRentals: c.totalRentals || 0,
          createdAt: new Date(c.createdAt || Date.now()),
          deletedAt: null,
        },
      });
    }

    for (const m of initialFleet) {
      await prisma.fleet.upsert({
        where: { nopol: m.nopol.toUpperCase().trim() },
        update: {},
        create: {
          id: m.id,
          nopol: m.nopol.toUpperCase().trim(),
          brand: m.brand,
          model: m.model,
          color: m.color || '',
          year: m.year ? String(m.year) : '',
          dailyRate: Number(m.dailyRate),
          status: m.status || 'available',
          taxAnnualDate: m.taxAnnualDate || null,
          taxFiveYearDate: m.taxFiveYearDate || null,
          createdAt: new Date(m.createdAt || Date.now()),
          deletedAt: null,
        },
      });
    }

    for (const t of initialTransactions) {
      await prisma.transaction.upsert({
        where: { id: t.id },
        update: {},
        create: {
          id: t.id,
          nopol: t.nopol,
          customerId: t.customerId || null,
          customerName: t.customerName,
          customerPhone: t.customerPhone || '',
          startDate: t.startDate,
          endDate: t.endDate,
          durationDays: Number(t.durationDays) || 1,
          durationHours: Number(t.durationHours) || (Number(t.durationDays) || 1) * 24,
          rentalPrice: Number(t.rentalPrice),
          extraCosts: JSON.stringify(t.extraCosts || []),
          total: Number(t.total),
          paymentMethod: t.paymentMethod || 'Tunai',
          amountPaid: Number(t.amountPaid) || Number(t.total),
          changeAmount: Number(t.changeAmount) || 0,
          notes: t.notes || '',
          createdAt: new Date(t.createdAt || Date.now()),
          deletedAt: null,
        },
      });
    }

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
          deletedAt: null,
        },
      });
    }

    for (const b of (initialBpk || [])) {
      await prisma.bpk.upsert({
        where: { id: b.id },
        update: {},
        create: {
          id: b.id,
          date: b.date,
          paymentMethod: b.paymentMethod || 'Tunai',
          recipientName: b.recipientName,
          recipientRole: b.recipientRole || '',
          category: b.category,
          categoryOther: b.categoryOther || '',
          isRentalRelated: Boolean(b.isRentalRelated),
          transactionId: b.transactionId || null,
          nopol: b.nopol || null,
          customerName: b.customerName || '',
          customerPhone: b.customerPhone || '',
          customerFee: Number(b.customerFee || 0),
          amount: Number(b.amount),
          description: b.description || '',
          status: b.status || 'Sudah Dibayar',
          createdByName: b.createdByName || 'Admin',
          createdAt: new Date(b.createdAt || Date.now()),
          deletedAt: null,
        },
      });
    }

    console.log('Data awal produksi berhasil dimasukkan.');

    // 5. Kunci Penanda agar Inisialisasi Tidak Pernah Terulang Kembali
    await prisma.setting.upsert({
      where: { key: 'system_initialized' },
      update: { value: 'true' },
      create: { key: 'system_initialized', value: 'true' },
    });

    console.log('Inisialisasi awal database produksi selesai dan dikunci secara permanen.');
    _isInitialized = true;
    return { initialized: true, freshlySeeded: true };
  } catch (error) {
    console.warn('ensureSystemInitialized warning:', error.message);
    return { initialized: false, error: error.message };
  }
}

/**
 * Fungsi bantuan eksplisit untuk menyuntikkan data demo (Hanya untuk keperluan pengujian lokal/staging).
 * Tidak dipanggil secara otomatis oleh sistem produksi.
 */
export async function seedDemoData() {
  console.log('Menyuntikkan data demo atas permintaan eksplisit...');

  for (const c of initialCustomers) {
    await prisma.customer.upsert({
      where: { id: c.id },
      update: {},
      create: {
        id: c.id,
        name: c.name,
        phone: c.phone || '',
        nik: c.nik || '',
        address: c.address || '',
        emergencyContact: c.emergencyContact || '',
        notes: c.notes || '',
        totalRentals: c.totalRentals || 0,
        createdAt: new Date(c.createdAt || Date.now()),
        deletedAt: null,
      },
    });
  }

  for (const m of initialFleet) {
    await prisma.fleet.upsert({
      where: { nopol: m.nopol.toUpperCase().trim() },
      update: {},
      create: {
        id: m.id,
        nopol: m.nopol.toUpperCase().trim(),
        brand: m.brand,
        model: m.model,
        color: m.color || '',
        year: m.year ? String(m.year) : '',
        dailyRate: Number(m.dailyRate),
        status: m.status || 'available',
        taxAnnualDate: m.taxAnnualDate || null,
        taxFiveYearDate: m.taxFiveYearDate || null,
        createdAt: new Date(m.createdAt || Date.now()),
        deletedAt: null,
      },
    });
  }

  for (const t of initialTransactions) {
    await prisma.transaction.upsert({
      where: { id: t.id },
      update: {},
      create: {
        id: t.id,
        nopol: t.nopol,
        customerId: t.customerId || null,
        customerName: t.customerName,
        customerPhone: t.customerPhone || '',
        startDate: t.startDate,
        endDate: t.endDate,
        durationDays: Number(t.durationDays) || 1,
        durationHours: Number(t.durationHours) || (Number(t.durationDays) || 1) * 24,
        rentalPrice: Number(t.rentalPrice),
        extraCosts: JSON.stringify(t.extraCosts || []),
        total: Number(t.total),
        paymentMethod: t.paymentMethod || 'Tunai',
        amountPaid: Number(t.amountPaid) || Number(t.total),
        changeAmount: Number(t.changeAmount) || 0,
        notes: t.notes || '',
        createdAt: new Date(t.createdAt || Date.now()),
        deletedAt: null,
      },
    });
  }

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
        deletedAt: null,
      },
    });
  }

  console.log('Data demo berhasil disuntikkan.');
  return { success: true };
}
