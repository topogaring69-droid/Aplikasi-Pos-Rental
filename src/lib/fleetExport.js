import { formatRupiah, formatDateTime } from './storage';
import { showAlert } from './sweetalert';

/**
 * 1. Ekspor Data Armada ke format CSV (Excel Ready dengan UTF-8 BOM)
 */
export function exportFleetToCSV(fleet = []) {
  if (!fleet || fleet.length === 0) {
    showAlert({
      title: 'Armada Kosong',
      text: 'Tidak ada data armada untuk diekspor.',
      icon: 'info'
    });
    return;
  }

  const headers = [
    'No',
    'No. Polisi (Plat)',
    'Merk Kendaraan',
    'Tipe / Model',
    'Warna',
    'Tahun',
    'Tarif Sewa 24 Jam (IDR)',
    'Status Ketersediaan',
    'Jatuh Tempo Pajak Tahunan (PKB)',
    'Jatuh Tempo Pajak 5 Tahunan (Plat/STNK)',
  ];

  const statusMap = {
    available: 'Tersedia',
    rented: 'Sedang Disewa',
    maintenance: 'Dalam Servis / Perawatan',
  };

  const rows = fleet.map((m, idx) => [
    idx + 1,
    `"${m.nopol || ''}"`,
    `"${m.brand || ''}"`,
    `"${m.model || ''}"`,
    `"${m.color || '-'}"`,
    `"${m.year || '-'}"`,
    m.dailyRate || 0,
    `"${statusMap[m.status] || m.status || 'Tersedia'}"`,
    `"${m.taxAnnualDate || '-'}"`,
    `"${m.taxFiveYearDate || '-'}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

  // Tambahkan UTF-8 BOM agar langsung terbaca rapi dan tanpa error karakter di Microsoft Excel
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `inventaris_armada_shelby_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 2. Ekspor Data Armada ke Dokumen Cetak / PDF Formal Ber-kop SHELBY RENT
 */
export function exportFleetToPrintable(fleet = [], settings = {}) {
  const storeName = settings?.storeName || 'SHELBY RENT';
  const tagline = settings?.tagline || 'Rental Motor Cepat & Terpercaya';
  const address = settings?.address || 'Komp. Ruko Bisnis No. 12, Area Stasiun';
  const phone = settings?.phone || '0812-3456-7890';
  const logoUrl = settings?.logoUrl || '/images/logo-shelby-rent.png';

  const totalUnits = fleet.length;
  const availableCount = fleet.filter((m) => m.status === 'available').length;
  const rentedCount = fleet.filter((m) => m.status === 'rented').length;
  const maintenanceCount = fleet.filter((m) => m.status === 'maintenance').length;

  const printWindow = window.open('', '_blank', 'width=900,height=750');
  if (!printWindow) {
    showAlert({
      title: 'Izin Pop-up Dibutuhkan',
      text: 'Harap izinkan pop-up pada browser untuk mencetak atau menyimpan PDF inventaris armada.',
      icon: 'warning'
    });
    return;
  }

  const statusBadge = (st) => {
    switch (st) {
      case 'available':
        return '<span style="background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;padding:3px 8px;border-radius:6px;font-weight:700;font-size:11px;">TERSEDIA</span>';
      case 'rented':
        return '<span style="background:#fffbeb;color:#b45309;border:1px solid #fde68a;padding:3px 8px;border-radius:6px;font-weight:700;font-size:11px;">DISEWA</span>';
      case 'maintenance':
        return '<span style="background:#fff1f2;color:#e11d48;border:1px solid #fecdd3;padding:3px 8px;border-radius:6px;font-weight:700;font-size:11px;">SERVIS</span>';
      default:
        return `<span style="background:#f1f5f9;color:#475569;padding:3px 8px;border-radius:6px;font-size:11px;">${st}</span>`;
    }
  };

  const html = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Inventaris Armada Kendaraan - ${storeName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', -apple-system, sans-serif; }
    body { padding: 30px; color: #0f172a; background: #ffffff; font-size: 13px; line-height: 1.5; }
    .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px; }
    .brand-left { display: flex; align-items: center; gap: 14px; }
    .brand-left img { max-height: 52px; max-width: 120px; object-fit: contain; }
    .brand-left h1 { font-size: 22px; font-weight: 800; color: #059669; letter-spacing: 0.5px; }
    .brand-left p { font-size: 12px; color: #64748b; }
    .meta-right { text-align: right; font-size: 12px; color: #64748b; }
    .meta-right strong { color: #0f172a; font-size: 14px; display: block; margin-bottom: 2px; }
    
    .summary-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
    .card { padding: 12px 14px; border-radius: 8px; border: 1px solid #e2e8f0; background: #f8fafc; }
    .card .val { font-size: 20px; font-weight: 800; margin-top: 4px; font-family: monospace; }
    .card.green { background: #ecfdf5; border-color: #a7f3d0; color: #047857; }
    .card.amber { background: #fffbeb; border-color: #fde68a; color: #b45309; }
    .card.rose { background: #fff1f2; border-color: #fecdd3; color: #e11d48; }

    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th { background: #0f172a; color: #ffffff; padding: 10px; text-align: left; font-size: 12px; font-weight: 700; }
    td { padding: 9px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
    tr:nth-child(even) { background: #f8fafc; }
    .plate-badge { font-family: monospace; font-weight: 800; background: #0f172a; color: #ffffff; padding: 3px 8px; border-radius: 4px; font-size: 12px; display: inline-block; }
    .text-right { text-align: right; }
    
    .signatures { display: flex; justify-content: space-between; margin-top: 40px; padding: 0 40px; }
    .sig-box { text-align: center; width: 200px; }
    .sig-box .line { margin-top: 60px; border-bottom: 1px solid #0f172a; font-weight: 700; padding-bottom: 4px; }
    .sig-box .sub { font-size: 11px; color: #64748b; margin-top: 4px; }

    .print-actions { position: fixed; top: 15px; right: 20px; z-index: 100; display: flex; gap: 8px; }
    .btn { background: #059669; color: #ffffff; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 700; font-size: 12px; cursor: pointer; }
    .btn:hover { background: #047857; }
    @media print {
      body { padding: 15px; }
      .print-actions { display: none; }
    }
  </style>
</head>
<body>
  <div class="print-actions">
    <button class="btn" onclick="window.print()">Cetak / Simpan PDF</button>
  </div>

  <div class="header">
    <div class="brand-left">
      <img src="${logoUrl}" alt="Logo" onerror="this.style.display='none'" />
      <div>
        <h1>${storeName}</h1>
        <p>${tagline}</p>
        <p>${address} | Telp/WA: ${phone}</p>
      </div>
    </div>
    <div class="meta-right">
      <strong>INVENTARIS DATA ARMADA</strong>
      <div>Dicetak: ${formatDateTime(new Date().toISOString())}</div>
      <div>Petugas: ${settings?.cashierName || 'Admin Shelby'}</div>
    </div>
  </div>

  <div class="summary-cards">
    <div class="card">
      <div style="font-size:11px;color:#64748b;font-weight:700;">TOTAL KENDARAAN</div>
      <div class="val">${totalUnits} Unit</div>
    </div>
    <div class="card green">
      <div style="font-size:11px;font-weight:700;">UNIT TERSEDIA</div>
      <div class="val">${availableCount} Unit</div>
    </div>
    <div class="card amber">
      <div style="font-size:11px;font-weight:700;">SEDANG DISEWA</div>
      <div class="val">${rentedCount} Unit</div>
    </div>
    <div class="card rose">
      <div style="font-size:11px;font-weight:700;">DALAM SERVIS</div>
      <div class="val">${maintenanceCount} Unit</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:40px;">No</th>
        <th>No. Polisi</th>
        <th>Merk & Model</th>
        <th>Warna</th>
        <th>Tahun</th>
        <th class="text-right">Tarif Sewa (24 Jam)</th>
        <th style="text-align:center;">Status</th>
        <th style="text-align:center;">Pajak Tahunan</th>
        <th style="text-align:center;">Pajak 5 Thn (Plat)</th>
      </tr>
    </thead>
    <tbody>
      ${fleet.map((m, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td><span class="plate-badge">${m.nopol}</span></td>
          <td><strong>${m.brand}</strong> ${m.model}</td>
          <td>${m.color || '-'}</td>
          <td>${m.year || '-'}</td>
          <td class="text-right" style="font-family:monospace;font-weight:700;">${formatRupiah(m.dailyRate)}</td>
          <td style="text-align:center;">${statusBadge(m.status)}</td>
          <td style="text-align:center;font-size:11px;font-family:monospace;">${m.taxAnnualDate || '-'}</td>
          <td style="text-align:center;font-size:11px;font-family:monospace;">${m.taxFiveYearDate || '-'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="signatures">
    <div class="sig-box">
      <div class="sub">Petugas Pengelola Armada</div>
      <div class="line">${settings?.cashierName || 'Admin Operasional'}</div>
      <div class="sub">Staf Pelaksana</div>
    </div>
    <div class="sig-box">
      <div class="sub">Mengetahui & Menyetujui</div>
      <div class="line">Pimpinan / Pemilik</div>
      <div class="sub">${storeName}</div>
    </div>
  </div>
</body>
</html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
