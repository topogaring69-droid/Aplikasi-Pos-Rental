import ExcelJS from 'exceljs';
import { formatDateTime, formatDateOnly, formatRupiah, getPaymentStatus } from './storage';
import { formatRentalDuration } from './rentalPricing';
import { showAlert } from './sweetalert';

// Palet warna standar Excel
const COLORS = {
  HEADER_BG: 'FF0F172A',      // Dark Slate
  HEADER_TEXT: 'FFFFFFFF',    // Putih
  SUBHEADER_BG: 'FF047857',   // Emerald Green
  ZEBRA_BG: 'FFF8FAFC',       // Abu-abu terang
  BORDER: 'FFCBD5E1',         // Border abu-abu tipis
  TOTAL_BG: 'FFE2E8F0',       // Background baris total
  
  // Status Colors
  STATUS_GREEN_BG: 'FFDCFCE7',
  STATUS_GREEN_TXT: 'FF166534',
  STATUS_YELLOW_BG: 'FFFEF3C7',
  STATUS_YELLOW_TXT: 'FF92400E',
  STATUS_RED_BG: 'FFFEE2E2',
  STATUS_RED_TXT: 'FF991B1B',
  STATUS_GRAY_BG: 'FFF1F5F9',
  STATUS_GRAY_TXT: 'FF475569',
};

const BORDER_THIN = {
  top: { style: 'thin', color: { argb: COLORS.BORDER } },
  left: { style: 'thin', color: { argb: COLORS.BORDER } },
  bottom: { style: 'thin', color: { argb: COLORS.BORDER } },
  right: { style: 'thin', color: { argb: COLORS.BORDER } },
};

const BORDER_TOTAL = {
  top: { style: 'thin', color: { argb: COLORS.BORDER } },
  left: { style: 'thin', color: { argb: COLORS.BORDER } },
  bottom: { style: 'double', color: { argb: 'FF0F172A' } },
  right: { style: 'thin', color: { argb: COLORS.BORDER } },
};

// Helper unduh file dari workbook
async function saveWorkbook(workbook, filename) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

// Helper auto-fit lebar kolom
function autoFitColumns(worksheet, minWidth = 12) {
  worksheet.columns.forEach((column) => {
    let maxLen = 0;
    column.eachCell({ includeEmpty: false }, (cell) => {
      const len = cell.value ? String(cell.value).length : 0;
      if (len > maxLen) maxLen = len;
    });
    column.width = Math.max(minWidth, maxLen + 4);
  });
}

// Helper buat Kop Toko / Header Dokumen Formal
function createDocumentHeader(worksheet, title, settings = {}) {
  const storeName = settings?.storeName || 'SHELBY RENT';
  const tagline = settings?.tagline || 'Rental Motor Cepat & Terpercaya';
  const address = settings?.address || 'Komp. Ruko Bisnis, Area Stasiun';
  const phone = settings?.phone || '0812-3456-7890';

  // Baris 1: Nama Toko
  const row1 = worksheet.addRow([storeName.toUpperCase()]);
  row1.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF047857' } };
  row1.height = 24;

  // Baris 2: Tagline & Alamat
  const row2 = worksheet.addRow([`${tagline} | ${address} | Telp/WA: ${phone}`]);
  row2.font = { name: 'Calibri', size: 10, color: { argb: 'FF64748B' } };
  row2.height = 18;

  // Baris 3: Judul Laporan
  const row3 = worksheet.addRow([title.toUpperCase()]);
  row3.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FF0F172A' } };
  row3.height = 22;

  // Baris 4: Waktu Ekspor
  const row4 = worksheet.addRow([`Dicetak pada: ${formatDateTime(new Date().toISOString())}`]);
  row4.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF94A3B8' } };
  row4.height = 16;

  worksheet.addRow([]); // Baris kosong pemisah
}

// ==================== 1. EKSPOR TRANSAKSI ====================
export async function exportTransactionsToExcel(transactions = [], fleet = [], settings = {}) {
  if (!transactions || transactions.length === 0) {
    showAlert({ title: 'Data Kosong', text: 'Tidak ada data transaksi untuk diekspor.', icon: 'info' });
    return;
  }

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Daftar Transaksi', {
    views: [{ showGridLines: true }],
  });

  createDocumentHeader(ws, 'Rekapitulasi Data Transaksi Sewa Rental', settings);

  // Header Tabel
  const headers = [
    'No',
    'ID Transaksi',
    'Nama Pelanggan',
    'No. HP',
    'No. Polisi',
    'Unit Motor',
    'Mulai Sewa',
    'Batas Selesai',
    'Durasi',
    'Tarif Pokok (Rp)',
    'Biaya Tambahan (Rp)',
    'Diskon (Rp)',
    'Total Tagihan (Rp)',
    'Dibayar (Rp)',
    'Sisa Tagihan (Rp)',
    'Metode Bayar',
    'Status Sewa',
    'Status Bayar',
  ];

  const headerRow = ws.addRow(headers);
  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.HEADER_BG } };
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: COLORS.HEADER_TEXT } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = BORDER_THIN;
  });

  let grandTotal = 0;
  let grandTotalDiscount = 0;
  let grandTotalPaid = 0;
  let grandTotalRemaining = 0;

  // Data Rows
  transactions.forEach((tx, idx) => {
    const isEven = idx % 2 === 1;
    const vehicle = fleet.find((f) => f.nopol?.toUpperCase() === tx.nopol?.toUpperCase());
    const vehicleName = vehicle ? `${vehicle.brand} ${vehicle.model}` : 'Motor Rental';
    const extraTotal = Array.isArray(tx.extraCosts)
      ? tx.extraCosts.reduce((a, b) => a + (Number(b.amount) || 0), 0)
      : 0;
    const discountAmount = Number(tx.discount || 0);

    const paySt = getPaymentStatus(tx);
    grandTotal += Number(tx.total) || 0;
    grandTotalDiscount += discountAmount;
    grandTotalPaid += paySt.paid;
    grandTotalRemaining += paySt.remaining;

    // Hitung status label sewa
    let stLabel = 'Aktif';
    let stBg = COLORS.STATUS_GREEN_BG;
    let stTxt = COLORS.STATUS_GREEN_TXT;

    const rawSt = (tx.status || 'active').toLowerCase();
    if (rawSt === 'booking') {
      stLabel = 'Booking';
      stBg = COLORS.STATUS_YELLOW_BG;
      stTxt = COLORS.STATUS_YELLOW_TXT;
    } else if (rawSt === 'selesai' || rawSt === 'completed') {
      stLabel = 'Selesai';
      stBg = COLORS.STATUS_GRAY_BG;
      stTxt = COLORS.STATUS_GRAY_TXT;
    } else {
      const end = new Date(tx.endDate).getTime();
      const now = Date.now();
      if (!isNaN(end) && end < now) {
        stLabel = 'Terlambat';
        stBg = COLORS.STATUS_RED_BG;
        stTxt = COLORS.STATUS_RED_TXT;
      }
    }

    // Hitung status warna pembayaran
    let payBg = COLORS.STATUS_GREEN_BG;
    let payTxt = COLORS.STATUS_GREEN_TXT;
    if (paySt.key === 'terhutang') {
      payBg = COLORS.STATUS_RED_BG;
      payTxt = COLORS.STATUS_RED_TXT;
    } else if (paySt.key === 'sebagian') {
      payBg = COLORS.STATUS_YELLOW_BG;
      payTxt = COLORS.STATUS_YELLOW_TXT;
    }

    const row = ws.addRow([
      idx + 1,
      tx.id,
      tx.customerName || 'Umum',
      tx.customerPhone || '-',
      tx.nopol,
      vehicleName,
      formatDateTime(tx.startDate),
      formatDateTime(tx.endDate),
      formatRentalDuration(tx.durationDays, tx.extendHours, tx.durationHours),
      Number(tx.rentalPrice) || 0,
      extraTotal,
      discountAmount,
      Number(tx.total) || 0,
      paySt.paid,
      paySt.remaining,
      tx.paymentMethod || 'Tunai',
      stLabel,
      paySt.label.toUpperCase(),
    ]);

    row.height = 22;
    row.eachCell((cell, colNum) => {
      cell.border = BORDER_THIN;
      cell.font = { name: 'Calibri', size: 10 };
      cell.alignment = { vertical: 'middle' };

      // Zebra background
      if (isEven) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.ZEBRA_BG } };
      }

      // Format mata uang & alignment kolom
      if (colNum === 1 || colNum === 5 || colNum === 9 || colNum === 16) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else if (colNum >= 10 && colNum <= 15) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.numFmt = '#,##0';
      }

      // Highlight status sewa
      if (colNum === 17) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: stBg } };
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: stTxt } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      }

      // Highlight status pembayaran
      if (colNum === 18) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: payBg } };
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: payTxt } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      }
    });
  });

  // Baris Total
  const totalRow = ws.addRow([
    'TOTAL',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    grandTotalDiscount,
    grandTotal,
    grandTotalPaid,
    grandTotalRemaining,
    '',
    '',
    '',
  ]);
  totalRow.height = 24;
  totalRow.eachCell((cell, colNum) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.TOTAL_BG } };
    cell.font = { name: 'Calibri', size: 11, bold: true };
    cell.border = BORDER_TOTAL;
    cell.alignment = { vertical: 'middle' };
    if (colNum >= 10 && colNum <= 15) {
      cell.alignment = { vertical: 'middle', horizontal: 'right' };
      cell.numFmt = '#,##0';
    }
  });

  ws.mergeCells(totalRow.number, 1, totalRow.number, 11);
  totalRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };

  autoFitColumns(ws);

  const filename = `transaksi_rental_shelby_${new Date().toISOString().slice(0, 10)}.xlsx`;
  await saveWorkbook(workbook, filename);
}

// ==================== 2. EKSPOR ARMADA ====================
export async function exportFleetToExcel(fleet = [], settings = {}) {
  if (!fleet || fleet.length === 0) {
    showAlert({ title: 'Armada Kosong', text: 'Tidak ada data armada untuk diekspor.', icon: 'info' });
    return;
  }

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Inventaris Armada', {
    views: [{ showGridLines: true }],
  });

  createDocumentHeader(ws, 'Laporan Inventaris Armada Kendaraan Motor', settings);

  const headers = [
    'No',
    'No. Polisi (Plat)',
    'Merk Kendaraan',
    'Tipe / Model',
    'Warna',
    'Tahun',
    'Tarif Sewa 24 Jam (Rp)',
    'Status Ketersediaan',
    'Jatuh Tempo Pajak Tahunan (PKB)',
    'Jatuh Tempo Pajak 5 Tahunan (Plat)',
  ];

  const headerRow = ws.addRow(headers);
  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.HEADER_BG } };
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: COLORS.HEADER_TEXT } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = BORDER_THIN;
  });

  const statusMap = {
    available: { label: 'Tersedia', bg: COLORS.STATUS_GREEN_BG, txt: COLORS.STATUS_GREEN_TXT },
    rented: { label: 'Sedang Disewa', bg: COLORS.STATUS_YELLOW_BG, txt: COLORS.STATUS_YELLOW_TXT },
    maintenance: { label: 'Dalam Servis', bg: COLORS.STATUS_RED_BG, txt: COLORS.STATUS_RED_TXT },
  };

  fleet.forEach((m, idx) => {
    const isEven = idx % 2 === 1;
    const stInfo = statusMap[m.status] || { label: m.status, bg: COLORS.STATUS_GRAY_BG, txt: COLORS.STATUS_GRAY_TXT };

    const row = ws.addRow([
      idx + 1,
      m.nopol,
      m.brand,
      m.model,
      m.color || '-',
      m.year || '-',
      Number(m.dailyRate) || 0,
      stInfo.label,
      m.taxAnnualDate || '-',
      m.taxFiveYearDate || '-',
    ]);

    row.height = 22;
    row.eachCell((cell, colNum) => {
      cell.border = BORDER_THIN;
      cell.font = { name: 'Calibri', size: 10 };
      cell.alignment = { vertical: 'middle' };

      if (isEven) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.ZEBRA_BG } };
      }

      if (colNum === 1 || colNum === 2 || colNum === 6 || colNum >= 9) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else if (colNum === 7) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.numFmt = '#,##0';
      }

      if (colNum === 8) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: stInfo.bg } };
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: stInfo.txt } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      }
    });
  });

  autoFitColumns(ws);

  const filename = `inventaris_armada_shelby_${new Date().toISOString().slice(0, 10)}.xlsx`;
  await saveWorkbook(workbook, filename);
}

// ==================== 3. EKSPOR PELANGGAN ====================
export async function exportCustomersToExcel(customers = [], settings = {}) {
  if (!customers || customers.length === 0) {
    showAlert({ title: 'Pelanggan Kosong', text: 'Tidak ada data pelanggan untuk diekspor.', icon: 'info' });
    return;
  }

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Master Pelanggan', {
    views: [{ showGridLines: true }],
  });

  createDocumentHeader(ws, 'Master Data Pelanggan Rental', settings);

  const headers = [
    'No',
    'ID Pelanggan',
    'Nama Lengkap',
    'No. WhatsApp / HP',
    'NIK / No. KTP',
    'Alamat Domisili',
    'Kontak Darurat',
    'Total Transaksi Sewa',
    'Catatan Khusus',
  ];

  const headerRow = ws.addRow(headers);
  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.HEADER_BG } };
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: COLORS.HEADER_TEXT } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = BORDER_THIN;
  });

  customers.forEach((c, idx) => {
    const isEven = idx % 2 === 1;

    const row = ws.addRow([
      idx + 1,
      c.id,
      c.name,
      c.phone || '-',
      c.nik || '-',
      c.address || '-',
      c.emergencyContact || '-',
      c.totalRentals || 0,
      c.notes || '-',
    ]);

    row.height = 22;
    row.eachCell((cell, colNum) => {
      cell.border = BORDER_THIN;
      cell.font = { name: 'Calibri', size: 10 };
      cell.alignment = { vertical: 'middle' };

      if (isEven) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.ZEBRA_BG } };
      }

      if (colNum === 1 || colNum === 2 || colNum === 4 || colNum === 5) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else if (colNum === 8) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.font = { name: 'Calibri', size: 10, bold: true };
      }
    });
  });

  autoFitColumns(ws);

  const filename = `data_pelanggan_shelby_${new Date().toISOString().slice(0, 10)}.xlsx`;
  await saveWorkbook(workbook, filename);
}

// ==================== 4. EKSPOR PENGELUARAN ====================
export async function exportExpensesToExcel(expenses = [], settings = {}) {
  if (!expenses || expenses.length === 0) {
    showAlert({ title: 'Pengeluaran Kosong', text: 'Tidak ada data pengeluaran untuk diekspor.', icon: 'info' });
    return;
  }

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Catatan Pengeluaran', {
    views: [{ showGridLines: true }],
  });

  createDocumentHeader(ws, 'Rekapitulasi Biaya Pengeluaran & Servis', settings);

  const headers = [
    'No',
    'ID Pengeluaran',
    'Kategori',
    'Terkait Kendaraan (Nopol)',
    'Tanggal Pengeluaran',
    'Keterangan / Rincian',
    'Tautan Bukti Nota',
    'Jumlah Biaya (Rp)',
  ];

  const headerRow = ws.addRow(headers);
  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.HEADER_BG } };
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: COLORS.HEADER_TEXT } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = BORDER_THIN;
  });

  let totalBiaya = 0;

  expenses.forEach((exp, idx) => {
    const isEven = idx % 2 === 1;
    totalBiaya += Number(exp.amount) || 0;

    const row = ws.addRow([
      idx + 1,
      exp.id,
      exp.category || 'Umum',
      exp.isVehicleRelated && exp.nopol ? exp.nopol : 'Umum (Non-Kendaraan)',
      formatDateTime(exp.date),
      exp.description || '-',
      exp.gdriveLink || (exp.receiptPhoto ? 'Foto Lokal' : '-'),
      Number(exp.amount) || 0,
    ]);

    row.height = 22;
    row.eachCell((cell, colNum) => {
      cell.border = BORDER_THIN;
      cell.font = { name: 'Calibri', size: 10 };
      cell.alignment = { vertical: 'middle' };

      if (isEven) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.ZEBRA_BG } };
      }

      if (colNum === 1 || colNum === 2 || colNum === 4 || colNum === 5) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else if (colNum === 8) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.numFmt = '#,##0';
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.STATUS_RED_TXT } };
      }
    });
  });

  // Baris Total Pengeluaran
  const totalRow = ws.addRow(['TOTAL PENGELUARAN', '', '', '', '', '', '', totalBiaya]);
  totalRow.height = 24;
  totalRow.eachCell((cell, colNum) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.TOTAL_BG } };
    cell.font = { name: 'Calibri', size: 11, bold: true };
    cell.border = BORDER_TOTAL;
    cell.alignment = { vertical: 'middle' };
    if (colNum === 8) {
      cell.alignment = { vertical: 'middle', horizontal: 'right' };
      cell.numFmt = '#,##0';
    }
  });

  ws.mergeCells(totalRow.number, 1, totalRow.number, 7);
  totalRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };

  autoFitColumns(ws);

  const filename = `pengeluaran_shelby_${new Date().toISOString().slice(0, 10)}.xlsx`;
  await saveWorkbook(workbook, filename);
}

// ==================== 5. EKSPOR LAPORAN KEUANGAN ====================
export async function exportReportToExcel(reportData) {
  const {
    settings,
    periodLabel,
    totalIncome,
    totalExpense,
    netProfit,
    incomeList = [],
    expenseList = [],
  } = reportData;

  const workbook = new ExcelJS.Workbook();

  // SHEET 1: RINGKASAN & PEMASUKAN
  const wsIncome = workbook.addWorksheet('Ringkasan & Pemasukan', {
    views: [{ showGridLines: true }],
  });

  createDocumentHeader(wsIncome, `Laporan Keuangan Kasir (${periodLabel})`, settings);

  // Kartu Ringkasan Finansial dalam Excel
  const s1 = wsIncome.addRow(['TOTAL PEMASUKAN', totalIncome]);
  s1.getCell(1).font = { bold: true };
  s1.getCell(2).numFmt = '#,##0';
  s1.getCell(2).font = { bold: true, color: { argb: 'FF166534' } };

  const s2 = wsIncome.addRow(['TOTAL PENGELUARAN', totalExpense]);
  s2.getCell(1).font = { bold: true };
  s2.getCell(2).numFmt = '#,##0';
  s2.getCell(2).font = { bold: true, color: { argb: 'FF991B1B' } };

  const s3 = wsIncome.addRow(['LABA BERSIH (NET PROFIT)', netProfit]);
  s3.getCell(1).font = { bold: true };
  s3.getCell(2).numFmt = '#,##0';
  s3.getCell(2).font = { bold: true, color: { argb: netProfit >= 0 ? 'FF166534' : 'FF991B1B' } };

  wsIncome.addRow([]); // Blank line

  // Header Pemasukan
  const incHeaders = [
    'No',
    'No. Transaksi',
    'No. Polisi',
    'Pelanggan',
    'Tanggal Sewa',
    'Sewa Pokok (Rp)',
    'Biaya Tambahan (Rp)',
    'Total Bayar (Rp)',
    'Metode Bayar',
  ];
  const incHeaderRow = wsIncome.addRow(incHeaders);
  incHeaderRow.height = 26;
  incHeaderRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.HEADER_BG } };
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: COLORS.HEADER_TEXT } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = BORDER_THIN;
  });

  incomeList.forEach((tx, idx) => {
    const isEven = idx % 2 === 1;
    const extraSum = Array.isArray(tx.extraCosts)
      ? tx.extraCosts.reduce((a, b) => a + (Number(b.amount) || 0), 0)
      : 0;

    const row = wsIncome.addRow([
      idx + 1,
      tx.id,
      tx.nopol,
      tx.customerName || 'Umum',
      formatDateTime(tx.startDate),
      Number(tx.rentalPrice) || 0,
      extraSum,
      Number(tx.total) || 0,
      tx.paymentMethod || 'Tunai',
    ]);

    row.height = 22;
    row.eachCell((cell, colNum) => {
      cell.border = BORDER_THIN;
      cell.font = { name: 'Calibri', size: 10 };
      cell.alignment = { vertical: 'middle' };

      if (isEven) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.ZEBRA_BG } };
      }

      if (colNum === 1 || colNum === 3 || colNum === 9) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else if (colNum >= 6 && colNum <= 8) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.numFmt = '#,##0';
      }
    });
  });

  // Total Pemasukan Row
  const totalIncRow = wsIncome.addRow(['TOTAL PEMASUKAN', '', '', '', '', '', '', totalIncome, '']);
  totalIncRow.height = 24;
  totalIncRow.eachCell((cell, colNum) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.TOTAL_BG } };
    cell.font = { name: 'Calibri', size: 11, bold: true };
    cell.border = BORDER_TOTAL;
    cell.alignment = { vertical: 'middle' };
    if (colNum === 8) {
      cell.alignment = { vertical: 'middle', horizontal: 'right' };
      cell.numFmt = '#,##0';
    }
  });
  wsIncome.mergeCells(totalIncRow.number, 1, totalIncRow.number, 7);
  totalIncRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };

  autoFitColumns(wsIncome);

  // SHEET 2: RINCIAN PENGELUARAN
  const wsExpense = workbook.addWorksheet('Rincian Pengeluaran', {
    views: [{ showGridLines: true }],
  });

  createDocumentHeader(wsExpense, `Daftar Pengeluaran (${periodLabel})`, settings);

  const expHeaders = [
    'No',
    'No. Pengeluaran',
    'Kategori',
    'Terkait Nopol',
    'Tanggal',
    'Keterangan',
    'Jumlah Biaya (Rp)',
  ];
  const expHeaderRow = wsExpense.addRow(expHeaders);
  expHeaderRow.height = 26;
  expHeaderRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.SUBHEADER_BG } };
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: COLORS.HEADER_TEXT } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = BORDER_THIN;
  });

  expenseList.forEach((exp, idx) => {
    const isEven = idx % 2 === 1;
    const row = wsExpense.addRow([
      idx + 1,
      exp.id,
      exp.category || 'Umum',
      exp.isVehicleRelated && exp.nopol ? exp.nopol : 'Umum',
      formatDateTime(exp.date),
      exp.description || '-',
      Number(exp.amount) || 0,
    ]);

    row.height = 22;
    row.eachCell((cell, colNum) => {
      cell.border = BORDER_THIN;
      cell.font = { name: 'Calibri', size: 10 };
      cell.alignment = { vertical: 'middle' };

      if (isEven) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.ZEBRA_BG } };
      }

      if (colNum === 1 || colNum === 4) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else if (colNum === 7) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
        cell.numFmt = '#,##0';
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.STATUS_RED_TXT } };
      }
    });
  });

  const totalExpRow = wsExpense.addRow(['TOTAL PENGELUARAN', '', '', '', '', '', totalExpense]);
  totalExpRow.height = 24;
  totalExpRow.eachCell((cell, colNum) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.TOTAL_BG } };
    cell.font = { name: 'Calibri', size: 11, bold: true };
    cell.border = BORDER_TOTAL;
    cell.alignment = { vertical: 'middle' };
    if (colNum === 7) {
      cell.alignment = { vertical: 'middle', horizontal: 'right' };
      cell.numFmt = '#,##0';
    }
  });
  wsExpense.mergeCells(totalExpRow.number, 1, totalExpRow.number, 6);
  totalExpRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };

  autoFitColumns(wsExpense);

  const filename = `laporan_keuangan_shelby_${new Date().toISOString().slice(0, 10)}.xlsx`;
  await saveWorkbook(workbook, filename);
}
