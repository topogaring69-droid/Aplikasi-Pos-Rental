import { formatRupiah, formatDateTime, formatDateOnly, getGdriveReceiptUrl } from './storage';
import { showAlert } from './sweetalert';

export function exportReportToPrintable(data) {
  const {
    settings,
    periodLabel,
    totalIncome,
    totalExpense,
    netProfit,
    incomeList,
    expenseList
  } = data;

  const printWindow = window.open('', '_blank', 'width=900,height=750');
  if (!printWindow) {
    showAlert({
      title: 'Izin Pop-up Dibutuhkan',
      text: 'Harap izinkan pop-up pada browser untuk mencetak atau menyimpan PDF laporan.',
      icon: 'warning'
    });
    return;
  }

  const html = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Laporan Keuangan - ${settings.storeName || 'POS Rental Motor'}</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
    }
    body {
      padding: 30px;
      color: #1e293b;
      background: #ffffff;
      font-size: 13px;
      line-height: 1.5;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 15px;
      margin-bottom: 20px;
    }
    .header h1 {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: 0.5px;
      color: #047857;
      text-transform: uppercase;
    }
    .header p {
      font-size: 12px;
      color: #64748b;
      margin-top: 3px;
    }
    .report-title {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding: 10px 14px;
      background: #f1f5f9;
      border-radius: 8px;
    }
    .report-title h2 {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
    }
    .report-title .badge {
      font-size: 12px;
      font-weight: 600;
      color: #047857;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 25px;
    }
    .summary-card {
      padding: 12px 16px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      background: #f8fafc;
    }
    .summary-card.green {
      border-color: #a7f3d0;
      background: #ecfdf5;
    }
    .summary-card.red {
      border-color: #fecdd3;
      background: #fff1f2;
    }
    .summary-card.blue {
      border-color: #bfdbfe;
      background: #eff6ff;
    }
    .summary-card .label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
    }
    .summary-card .val {
      font-size: 18px;
      font-weight: 800;
      margin-top: 4px;
    }
    .val-green { color: #047857; }
    .val-red { color: #e11d48; }
    .val-blue { color: #1d4ed8; }

    .section-title {
      font-size: 14px;
      font-weight: 700;
      margin: 20px 0 10px;
      padding-left: 8px;
      border-left: 4px solid #059669;
      color: #0f172a;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 12px;
    }
    th {
      background: #f1f5f9;
      color: #475569;
      font-weight: 600;
      text-align: left;
      padding: 8px 10px;
      border-bottom: 2px solid #cbd5e1;
    }
    td {
      padding: 8px 10px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: top;
    }
    tr:nth-child(even) td {
      background: #fafafa;
    }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .bold { font-weight: 700; }
    .plate-badge {
      display: inline-block;
      padding: 2px 6px;
      background: #0f172a;
      color: #ffffff;
      border-radius: 4px;
      font-family: monospace;
      font-size: 11px;
      font-weight: 700;
    }
    .empty-row {
      text-align: center;
      color: #94a3b8;
      font-style: italic;
      padding: 20px;
    }
    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 40px;
      page-break-inside: avoid;
    }
    .sig-box {
      text-align: center;
      width: 200px;
    }
    .sig-box .line {
      margin-top: 60px;
      border-bottom: 1px solid #334155;
      padding-bottom: 4px;
      font-weight: 600;
    }
    .sig-box .sub {
      font-size: 11px;
      color: #64748b;
    }
    .print-actions {
      position: fixed;
      bottom: 20px;
      right: 20px;
      display: flex;
      gap: 10px;
    }
    .btn {
      padding: 10px 18px;
      background: #059669;
      color: #ffffff;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    }
    .btn:hover { background: #047857; }
    @media print {
      body { padding: 15px; }
      .print-actions { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${settings.storeName || 'POS RENTAL MOTOR'}</h1>
    <p>${settings.tagline || ''}</p>
    <p>${settings.address || ''} | Telp/WA: ${settings.phone || '-'}</p>
  </div>

  <div class="report-title">
    <h2>LAPORAN KEUANGAN KASIR & PEMBUKUAN</h2>
    <div class="badge">Periode: ${periodLabel}</div>
  </div>

  <div class="summary-grid">
    <div class="summary-card green">
      <div class="label">Total Pemasukan</div>
      <div class="val val-green">${formatRupiah(totalIncome)}</div>
    </div>
    <div class="summary-card red">
      <div class="label">Total Pengeluaran</div>
      <div class="val val-red">${formatRupiah(totalExpense)}</div>
    </div>
    <div class="summary-card blue">
      <div class="label">Laba Bersih</div>
      <div class="val val-blue">${formatRupiah(netProfit)}</div>
    </div>
  </div>

  <div class="section-title">1. RINCIAN PEMASUKAN DARI TRANSAKSI SEWA</div>
  <table>
    <thead>
      <tr>
        <th>No. Transaksi</th>
        <th>No. Polisi</th>
        <th>Pelanggan</th>
        <th>Tanggal Sewa</th>
        <th>Sewa Pokok</th>
        <th>Biaya Tambahan</th>
        <th class="text-right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${
        incomeList.length === 0
          ? '<tr><td colspan="7" class="empty-row">Tidak ada transaksi pemasukan pada periode ini.</td></tr>'
          : incomeList
              .map((tx) => {
                const extraSum = (tx.extraCosts || []).reduce((acc, c) => acc + (Number(c.amount) || 0), 0);
                return `
              <tr>
                <td class="bold">${tx.id}</td>
                <td><span class="plate-badge">${tx.nopol || '-'}</span></td>
                <td>${tx.customerName || '-'}<br><span style="color:#64748b;font-size:11px;">${tx.customerPhone || ''}</span></td>
                <td>${formatDateTime(tx.startDate)}</td>
                <td>${formatRupiah(tx.rentalPrice)}</td>
                <td>${extraSum > 0 ? formatRupiah(extraSum) : '-'}</td>
                <td class="text-right bold val-green">${formatRupiah(tx.total)}</td>
              </tr>
            `;
              })
              .join('')
      }
    </tbody>
  </table>

  <div class="section-title">2. RINCIAN PENGELUARAN (KENDARAAN & OPERASIONAL)</div>
  <table>
    <thead>
      <tr>
        <th>No. Pengeluaran</th>
        <th>Kategori</th>
        <th>Terkait Nopol</th>
        <th>Tanggal</th>
        <th>Keterangan</th>
        <th style="text-align:center;">Lampiran Nota</th>
        <th class="text-right">Jumlah Biaya</th>
      </tr>
    </thead>
    <tbody>
      ${
        expenseList.length === 0
          ? '<tr><td colspan="7" class="empty-row">Tidak ada pengeluaran pada periode ini.</td></tr>'
          : expenseList
              .map((exp) => {
                const gdriveUrl = getGdriveReceiptUrl(exp);
                return `
              <tr>
                <td class="bold">${exp.id}</td>
                <td><span style="display:inline-block;padding:2px 6px;background:#e2e8f0;border-radius:4px;font-size:11px;">${exp.category || 'Umum'}</span></td>
                <td>${exp.isVehicleRelated && exp.nopol ? `<span class="plate-badge">${exp.nopol}</span>` : '<span style="color:#94a3b8;">Umum</span>'}</td>
                <td>${formatDateTime(exp.date)}</td>
                <td>${exp.description || '-'}</td>
                <td style="text-align:center;">
                  ${gdriveUrl ? `
                    <a href="${gdriveUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:4px;color:#059669;font-weight:600;text-decoration:none;font-size:11px;background:#ecfdf5;padding:3px 8px;border-radius:4px;border:1px solid #a7f3d0;" title="Buka berkas di Google Drive">
                      <span>🔗</span>
                      <span>Google Drive</span>
                    </a>
                  ` : '<span style="color:#94a3b8;font-size:11px;">-</span>'}
                </td>
                <td class="text-right bold val-red">${formatRupiah(exp.amount)}</td>
              </tr>
            `;
              })
              .join('')
      }
    </tbody>
  </table>

  <div class="signatures">
    <div class="sig-box">
      <div class="sub">Dicetak pada: ${formatDateTime(new Date().toISOString())}</div>
      <div class="line">${settings.cashierName || 'Operator Kasir'}</div>
      <div class="sub">Petugas Kasir</div>
    </div>
    <div class="sig-box">
      <div class="sub">Mengetahui,</div>
      <div class="line">Pimpinan / Pemilik</div>
      <div class="sub">${settings.storeName || 'Owner Rental'}</div>
    </div>
  </div>

  <div class="print-actions">
    <button class="btn" onclick="window.print()">🖨️ Cetak / Simpan PDF</button>
  </div>
</body>
</html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

export function exportBpkReportToPrintable(data) {
  const {
    settings,
    periodLabel,
    totalBpkAmount,
    bpkList = []
  } = data;

  const printWindow = window.open('', '_blank', 'width=950,height=800');
  if (!printWindow) {
    showAlert({
      title: 'Izin Pop-up Dibutuhkan',
      text: 'Harap izinkan pop-up pada browser untuk mencetak atau menyimpan PDF laporan BPK.',
      icon: 'warning'
    });
    return;
  }

  const activeBpk = bpkList.filter((b) => b.status === 'Sudah Dibayar');
  const totalPaid = activeBpk.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
  const totalCustFee = activeBpk.reduce((sum, b) => sum + (Number(b.customerFee) || 0), 0);
  const totalMargin = totalCustFee > 0 ? (totalCustFee - totalPaid) : 0;

  const html = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Laporan Bukti Pengeluaran Kas (BPK) - ${settings.storeName || 'POS Rental'}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif; }
    body { padding: 25px; color: #1e293b; background: #ffffff; font-size: 12px; line-height: 1.5; }
    .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
    .header h1 { font-size: 20px; font-weight: 800; color: #047857; text-transform: uppercase; }
    .header p { font-size: 11px; color: #64748b; margin-top: 2px; }
    .report-title { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding: 8px 12px; background: #f1f5f9; border-radius: 6px; }
    .report-title h2 { font-size: 14px; font-weight: 700; color: #0f172a; }
    .report-title .badge { font-size: 11px; font-weight: 600; color: #047857; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
    .summary-card { padding: 10px 14px; border-radius: 8px; border: 1px solid #e2e8f0; background: #f8fafc; }
    .summary-card.red { border-color: #fecdd3; background: #fff1f2; }
    .summary-card.green { border-color: #a7f3d0; background: #ecfdf5; }
    .summary-card.blue { border-color: #bfdbfe; background: #eff6ff; }
    .summary-card .label { font-size: 10px; font-weight: 600; text-transform: uppercase; color: #64748b; }
    .summary-card .val { font-size: 16px; font-weight: 800; margin-top: 2px; font-family: monospace; }
    .val-red { color: #e11d48; }
    .val-green { color: #047857; }
    .val-blue { color: #1d4ed8; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
    th { background: #0f172a; color: #ffffff; padding: 8px; text-align: left; font-weight: 600; border: 1px solid #0f172a; }
    td { padding: 6px 8px; border: 1px solid #cbd5e1; vertical-align: middle; }
    tr:nth-child(even) td { background: #f8fafc; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .bold { font-weight: 700; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 30px; page-break-inside: avoid; }
    .sig-box { text-align: center; }
    .sig-box .line { border-bottom: 1px solid #0f172a; width: 60%; margin: 50px auto 4px; font-weight: 700; }
    .sig-box .sub { font-size: 11px; color: #64748b; }
    @media print { .print-actions { display: none !important; } body { padding: 15px; } }
    .print-actions { text-align: center; margin-top: 20px; }
    .btn { background: #047857; color: white; border: none; padding: 8px 20px; border-radius: 6px; font-weight: 700; cursor: pointer; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${settings.storeName || 'SHELBY RENT'}</h1>
    <p>${settings.tagline || 'Rental Motor Cepat & Terpercaya'} | ${settings.address || 'Komp. Ruko Bisnis'} | Telp/WA: ${settings.phone || '-'}</p>
  </div>

  <div class="report-title">
    <h2>LAPORAN BUKTI PENGELUARAN KAS (BPK)</h2>
    <span class="badge">Periode: ${periodLabel}</span>
  </div>

  <div class="summary-grid">
    <div class="summary-card red">
      <div class="label">Total Pengeluaran BPK (Lunas)</div>
      <div class="val val-red">${formatRupiah(totalPaid)}</div>
    </div>
    <div class="summary-card blue">
      <div class="label">Jumlah Dokumen BPK</div>
      <div class="val val-blue">${bpkList.length} Dokumen</div>
    </div>
    <div class="summary-card">
      <div class="label">Biaya Antar dari Pelanggan</div>
      <div class="val">${formatRupiah(totalCustFee)}</div>
    </div>
    <div class="summary-card green">
      <div class="label">Selisih Antar (Efisiensi)</div>
      <div class="val val-green">${formatRupiah(totalMargin)}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:4%;">No</th>
        <th>No. BPK</th>
        <th>Tanggal</th>
        <th>Status</th>
        <th>Dibayarkan Kepada</th>
        <th>Keperluan</th>
        <th>No. Transaksi / Nopol</th>
        <th>Pelanggan</th>
        <th class="text-right">Biaya Pelanggan</th>
        <th class="text-right">Biaya BPK</th>
        <th>Keterangan</th>
      </tr>
    </thead>
    <tbody>
      ${
        bpkList.length === 0
          ? '<tr><td colspan="11" class="text-center" style="padding:20px;color:#94a3b8;">Tidak ada data BPK pada periode ini.</td></tr>'
          : bpkList.map((b, idx) => `
              <tr>
                <td class="text-center">${idx + 1}</td>
                <td class="bold">${b.id}</td>
                <td>${formatDateTime(b.date)}</td>
                <td class="text-center">
                  <span style="padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;background:${b.status === 'Sudah Dibayar' ? '#dcfce7' : (b.status === 'Dibatalkan' ? '#fee2e2' : '#f1f5f9')};color:${b.status === 'Sudah Dibayar' ? '#166534' : (b.status === 'Dibatalkan' ? '#991b1b' : '#475569')}">
                    ${b.status}
                  </span>
                </td>
                <td class="bold">${b.recipientName} ${b.recipientRole ? `<small>(${b.recipientRole})</small>` : ''}</td>
                <td>${b.category} ${b.categoryOther ? `(${b.categoryOther})` : ''}</td>
                <td>${b.transactionId ? `<strong>${b.transactionId}</strong> / ${b.nopol || '-'}` : (b.nopol ? `<span style="font-weight:700;">${b.nopol}</span>` : '-')}</td>
                <td>${b.customerName || '-'}</td>
                <td class="text-right">${Number(b.customerFee) > 0 ? formatRupiah(b.customerFee) : '-'}</td>
                <td class="text-right bold val-red">${formatRupiah(b.amount)}</td>
                <td>${b.description || '-'}</td>
              </tr>
            `).join('')
      }
    </tbody>
  </table>

  <div class="signatures">
    <div class="sig-box">
      <div class="sub">Dicetak pada: ${formatDateTime(new Date().toISOString())}</div>
      <div class="line">${settings.cashierName || 'Operator Kasir'}</div>
      <div class="sub">Petugas Kasir</div>
    </div>
    <div class="sig-box">
      <div class="sub">Mengetahui,</div>
      <div class="line">Pimpinan / Pemilik</div>
      <div class="sub">${settings.storeName || 'Owner Rental'}</div>
    </div>
  </div>

  <div class="print-actions">
    <button class="btn" onclick="window.print()">🖨️ Cetak / Simpan PDF</button>
  </div>
</body>
</html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
