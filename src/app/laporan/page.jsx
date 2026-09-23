'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Calendar, 
  Search, 
  Printer, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Eye, 
  ArrowUpRight, 
  ArrowDownRight,
  ImageIcon,
  X,
  ExternalLink,
  Edit3,
  FileCheck2,
  Filter
} from 'lucide-react';
import { 
  fetchTransactions, 
  getTransactions,
  fetchExpenses, 
  getExpenses,
  fetchBpkList,
  getBpkList,
  fetchSettings, 
  getSettings, 
  formatRupiah, 
  formatDateTime, 
  formatDateOnly, 
  getGdriveReceiptUrl 
} from '../../lib/storage';
import { exportReportToPrintable, exportBpkReportToPrintable } from '../../lib/pdfExport';
import { exportReportToExcel, exportExpensesReportToExcel, exportBpkToExcel } from '../../lib/excelExport';
import ModalDetail from '../../components/ModalDetail';
import StrukModal from '../../components/StrukModal';
import ModalEditPengeluaran from '../../components/ModalEditPengeluaran';
import BpkDocumentModal from '../../components/BpkDocumentModal';

export default function LaporanPage() {
  const [transactions, setTransactions] = useState(() => getTransactions());
  const [expenses, setExpenses] = useState(() => getExpenses());
  const [bpkList, setBpkList] = useState(() => getBpkList());
  const [settings, setSettings] = useState(() => getSettings());
  const [isLoading, setIsLoading] = useState(() => getTransactions().length === 0 && getExpenses().length === 0);

  // Tab: 'pemasukan' | 'pengeluaran'
  const [activeTab, setActiveTab] = useState('pemasukan');

  // Sub-filter Pengeluaran: 'semua' | 'operasional' | 'bpk'
  const [expenseSubView, setExpenseSubView] = useState('semua');

  // Filter Periode
  const [period, setPeriod] = useState('bulan-ini');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [search, setSearch] = useState('');

  // Filter Khusus BPK
  const [bpkCategoryFilter, setBpkCategoryFilter] = useState('all');
  const [bpkStatusFilter, setBpkStatusFilter] = useState('all');

  // Modal State
  const [selectedTx, setSelectedTx] = useState(null);
  const [strukTx, setStrukTx] = useState(null);
  const [zoomPhoto, setZoomPhoto] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);
  const [viewingBpkDoc, setViewingBpkDoc] = useState(null);

  useEffect(() => {
    loadData();
    const today = new Date().toISOString().slice(0, 10);
    setCustomStart(today);
    setCustomEnd(today);
  }, []);

  const loadData = async () => {
    try {
      const [txList, expList, bList, sett] = await Promise.all([
        fetchTransactions().catch(() => getTransactions()),
        fetchExpenses().catch(() => getExpenses()),
        fetchBpkList().catch(() => getBpkList()),
        fetchSettings().catch(() => getSettings()),
      ]);

      if (Array.isArray(txList)) setTransactions(txList);
      if (Array.isArray(expList)) setExpenses(expList);
      if (Array.isArray(bList)) setBpkList(bList);
      if (sett) setSettings(sett);

      setIsLoading(false);
    } catch {
      setIsLoading(false);
    }
  };

  const filterByDate = (itemDateStr) => {
    if (!itemDateStr) return false;
    const itemDate = new Date(itemDateStr);
    const now = new Date();

    if (period === 'semua') return true;

    if (period === 'hari-ini') {
      return (
        itemDate.getDate() === now.getDate() &&
        itemDate.getMonth() === now.getMonth() &&
        itemDate.getFullYear() === now.getFullYear()
      );
    }

    if (period === '7-hari') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return itemDate >= sevenDaysAgo;
    }

    if (period === 'bulan-ini') {
      return (
        itemDate.getMonth() === now.getMonth() &&
        itemDate.getFullYear() === now.getFullYear()
      );
    }

    if (period === 'kustom') {
      const start = customStart ? new Date(customStart + 'T00:00:00') : new Date(0);
      const end = customEnd ? new Date(customEnd + 'T23:59:59') : new Date();
      return itemDate >= start && itemDate <= end;
    }

    return true;
  };

  const filteredTransactions = transactions
    .filter((tx) => filterByDate(tx.startDate || tx.createdAt))
    .filter((tx) => {
      const q = search.toLowerCase();
      return (
        tx.id.toLowerCase().includes(q) ||
        (tx.nopol || '').toLowerCase().includes(q) ||
        (tx.customerName || '').toLowerCase().includes(q)
      );
    });

  const filteredExpenses = expenses
    .filter((exp) => filterByDate(exp.date || exp.createdAt))
    .filter((exp) => {
      const q = search.toLowerCase();
      return (
        (exp.description || '').toLowerCase().includes(q) ||
        (exp.nopol || '').toLowerCase().includes(q) ||
        (exp.category || '').toLowerCase().includes(q)
      );
    });

  // Filtered BPK
  const filteredBpk = bpkList
    .filter((b) => filterByDate(b.date || b.createdAt))
    .filter((b) => {
      if (bpkCategoryFilter !== 'all' && b.category !== bpkCategoryFilter) return false;
      if (bpkStatusFilter !== 'all' && b.status !== bpkStatusFilter) return false;
      const q = search.toLowerCase();
      return (
        (b.id || '').toLowerCase().includes(q) ||
        (b.recipientName || '').toLowerCase().includes(q) ||
        (b.category || '').toLowerCase().includes(q) ||
        (b.nopol || '').toLowerCase().includes(q) ||
        (b.transactionId || '').toLowerCase().includes(q) ||
        (b.customerName || '').toLowerCase().includes(q) ||
        (b.description || '').toLowerCase().includes(q)
      );
    });

  const totalIncome = filteredTransactions.reduce((sum, tx) => sum + (Number(tx.total) || 0), 0);
  const totalExpense = filteredExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  const netProfit = totalIncome - totalExpense;

  const totalBpkPaid = filteredBpk
    .filter((b) => b.status === 'Sudah Dibayar')
    .reduce((sum, b) => sum + (Number(b.amount) || 0), 0);

  const totalBpkCustFee = filteredBpk
    .filter((b) => b.status === 'Sudah Dibayar')
    .reduce((sum, b) => sum + (Number(b.customerFee) || 0), 0);

  const totalBpkMargin = totalBpkCustFee > 0 ? (totalBpkCustFee - totalBpkPaid) : 0;

  const getPeriodLabel = () => {
    switch (period) {
      case 'hari-ini': return 'Hari Ini';
      case '7-hari': return '7 Hari Terakhir';
      case 'bulan-ini': return 'Bulan Ini';
      case 'kustom': return `${formatDateOnly(customStart)} s/d ${formatDateOnly(customEnd)}`;
      default: return 'Semua Periode';
    }
  };

  const handleExportPDF = () => {
    if (!settings) return;
    if (activeTab === 'pengeluaran' && expenseSubView === 'bpk') {
      exportBpkReportToPrintable({
        settings,
        periodLabel: getPeriodLabel(),
        totalBpkAmount: totalBpkPaid,
        bpkList: filteredBpk
      });
      return;
    }

    exportReportToPrintable({
      settings,
      periodLabel: getPeriodLabel(),
      totalIncome,
      totalExpense,
      netProfit,
      incomeList: filteredTransactions,
      expenseList: filteredExpenses
    });
  };

  const handleExportExcel = () => {
    if (activeTab === 'pengeluaran' && expenseSubView === 'bpk') {
      exportBpkToExcel(filteredBpk, settings, getPeriodLabel());
      return;
    }

    if (activeTab === 'pengeluaran') {
      exportExpensesReportToExcel(filteredExpenses, settings, getPeriodLabel());
      return;
    }

    exportReportToExcel({
      settings,
      periodLabel: getPeriodLabel(),
      totalIncome,
      totalExpense,
      netProfit,
      incomeList: filteredTransactions,
      expenseList: filteredExpenses
    });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '800' }}>Laporan Keuangan & Pengeluaran</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Arus Kas Pemasukan, Pengeluaran & Bukti Kas (BPK)</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={handleExportExcel}
            style={{ fontWeight: 700, background: '#ffffff', gap: '6px' }}
            title="Ekspor laporan ke file Excel (.xlsx)"
          >
            <Download size={14} />
            <span>Ekspor Excel</span>
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleExportPDF}
            style={{ gap: '6px' }}
            title="Cetak atau simpan laporan sebagai PDF"
          >
            <Printer size={14} />
            <span>Cetak PDF</span>
          </button>
        </div>
      </div>

      {/* Filter Periode */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '12px' }}>
        {[
          { key: 'bulan-ini', label: 'Bulan Ini' },
          { key: 'hari-ini', label: 'Hari Ini' },
          { key: '7-hari', label: '7 Hari' },
          { key: 'semua', label: 'Semua' },
          { key: 'kustom', label: 'Rentang Tanggal' }
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            className={`btn btn-sm ${period === item.key ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setPeriod(item.key)}
            style={{ whiteSpace: 'nowrap', borderRadius: '20px' }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {period === 'kustom' && (
        <div className="card" style={{ padding: '12px', marginBottom: '14px', background: 'var(--bg-input)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label className="form-label">Dari Tanggal</label>
              <input
                type="date"
                className="form-control"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">Sampai Tanggal</label>
              <input
                type="date"
                className="form-control"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Kartu Ringkasan Finansial Utama */}
      <div className="stat-card-grid">
        <div className="stat-card income">
          <div className="stat-label">Pemasukan Rental</div>
          <div className="stat-val" style={{ color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
            {formatRupiah(totalIncome)}
          </div>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {filteredTransactions.length} Transaksi
          </span>
        </div>

        <div className="stat-card expense">
          <div className="stat-label">Total Pengeluaran Kas</div>
          <div className="stat-val" style={{ color: 'var(--accent-rose)', fontFamily: 'var(--font-mono)' }}>
            {formatRupiah(totalExpense)}
          </div>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {filteredExpenses.length} Nota (Termasuk BPK Lunas)
          </span>
        </div>

        <div className="stat-card profit">
          <div className="stat-label">Laba Bersih Operasional</div>
          <div 
            className="stat-val" 
            style={{ 
              color: netProfit >= 0 ? '#60a5fa' : 'var(--accent-rose)', 
              fontFamily: 'var(--font-mono)' 
            }}
          >
            {formatRupiah(netProfit)}
          </div>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {netProfit >= 0 ? 'Surplus Kas' : 'Defisit Kas'}
          </span>
        </div>
      </div>

      {/* Bar Pencarian */}
      <div className="search-box">
        <Search className="search-icon" size={16} />
        <input
          type="text"
          className="search-input"
          placeholder="Cari dalam laporan (nopol, no. transaksi, penerima, keterangan)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Tab Segment Utama */}
      <div className="tab-group" style={{ marginBottom: '14px' }}>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'pemasukan' ? 'active' : ''}`}
          onClick={() => setActiveTab('pemasukan')}
        >
          Pemasukan Rental ({filteredTransactions.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'pengeluaran' ? 'active' : ''}`}
          onClick={() => setActiveTab('pengeluaran')}
        >
          Pengeluaran & BPK ({filteredExpenses.length})
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: PEMASUKAN                                         */}
      {/* ======================================================== */}
      {activeTab === 'pemasukan' && (
        <div>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '8px' }}>
            * Klik nomor transaksi untuk membuka detail transaksi & struk
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-dim)' }}>
              Tidak ada data transaksi pemasukan pada periode ini.
            </div>
          ) : (
            filteredTransactions.map((tx) => {
              const extraTotal = (tx.extraCosts || []).reduce((s, c) => s + (Number(c.amount) || 0), 0);
              return (
                <div
                  key={tx.id}
                  className="list-item"
                  onClick={() => setSelectedTx(tx)}
                  title="Klik untuk membuka detail transaksi"
                >
                  <div className="item-top">
                    <span 
                      className="item-id" 
                      style={{ color: 'var(--primary)', textDecoration: 'underline', fontWeight: '800' }}
                    >
                      {tx.id}
                    </span>
                    <span className="badge badge-plate">{tx.nopol}</span>
                  </div>

                  <div className="item-middle">
                    <div>
                      <div className="item-title">{tx.customerName}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Sewa: {formatRupiah(tx.rentalPrice)} {extraTotal > 0 && `+ Tambahan: ${formatRupiah(extraTotal)}`}
                      </div>
                    </div>
                    <div className="item-amount" style={{ color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                      {formatRupiah(tx.total)}
                    </div>
                  </div>

                  <div className="item-bottom">
                    <span>{formatDateTime(tx.startDate)}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="badge badge-success" style={{ fontSize: '10px' }}>
                        {tx.paymentMethod}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--primary)' }}>Lihat Detail &rarr;</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: PENGELUARAN & BPK                                 */}
      {/* ======================================================== */}
      {activeTab === 'pengeluaran' && (
        <div>
          {/* Sub-selector Filter Pengeluaran */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                className={`btn btn-sm ${expenseSubView === 'semua' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setExpenseSubView('semua')}
                style={{ fontSize: '11.5px', borderRadius: '16px' }}
              >
                Semua Pengeluaran ({filteredExpenses.length})
              </button>

              <button
                type="button"
                className={`btn btn-sm ${expenseSubView === 'bpk' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setExpenseSubView('bpk')}
                style={{ fontSize: '11.5px', borderRadius: '16px', gap: '4px' }}
              >
                <FileCheck2 size={13} />
                <span>Khusus BPK ({filteredBpk.length})</span>
              </button>
            </div>

            {expenseSubView === 'bpk' && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <select
                  className="form-control form-control-sm"
                  value={bpkCategoryFilter}
                  onChange={(e) => setBpkCategoryFilter(e.target.value)}
                  style={{ fontSize: '11px', padding: '2px 8px', width: 'auto' }}
                >
                  <option value="all">Semua Keperluan</option>
                  <option value="Antar motor">Antar motor</option>
                  <option value="Jemput motor">Jemput motor</option>
                  <option value="Antar & jemput motor">Antar & jemput motor</option>
                  <option value="Operasional">Operasional</option>
                  <option value="Lainnya">Lainnya</option>
                </select>

                <select
                  className="form-control form-control-sm"
                  value={bpkStatusFilter}
                  onChange={(e) => setBpkStatusFilter(e.target.value)}
                  style={{ fontSize: '11px', padding: '2px 8px', width: 'auto' }}
                >
                  <option value="all">Semua Status</option>
                  <option value="Sudah Dibayar">Sudah Dibayar</option>
                  <option value="Draft">Draft</option>
                  <option value="Dibatalkan">Dibatalkan</option>
                </select>
              </div>
            )}
          </div>

          {/* VIEW KHUSUS BPK */}
          {expenseSubView === 'bpk' ? (
            <div>
              {/* Ringkasan BPK Report */}
              <div className="card" style={{ padding: '12px 14px', background: '#eff6ff', borderColor: '#bfdbfe', marginBottom: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', fontSize: '12px' }}>
                  <div>
                    <div style={{ fontSize: '10.5px', color: '#64748b' }}>Total BPK (Sudah Dibayar):</div>
                    <strong style={{ fontSize: '15px', color: '#e11d48', fontFamily: 'monospace' }}>{formatRupiah(totalBpkPaid)}</strong>
                  </div>
                  <div>
                    <div style={{ fontSize: '10.5px', color: '#64748b' }}>Jumlah Dokumen BPK:</div>
                    <strong style={{ fontSize: '15px', color: '#0284c7' }}>{filteredBpk.length} Dokumen</strong>
                  </div>
                  <div>
                    <div style={{ fontSize: '10.5px', color: '#64748b' }}>Biaya Pelanggan:</div>
                    <strong style={{ fontSize: '14px', color: '#0f172a' }}>{formatRupiah(totalBpkCustFee)}</strong>
                  </div>
                  <div>
                    <div style={{ fontSize: '10.5px', color: '#64748b' }}>Selisih Efisiensi Tim:</div>
                    <strong style={{ fontSize: '14px', color: '#166534' }}>{formatRupiah(totalBpkMargin)}</strong>
                  </div>
                </div>
              </div>

              {filteredBpk.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-dim)' }}>
                  Tidak ada data Bukti Pengeluaran Kas (BPK) pada periode & filter ini.
                </div>
              ) : (
                filteredBpk.map((b) => (
                  <div 
                    key={b.id} 
                    className="list-item" 
                    onClick={() => setViewingBpkDoc(b)}
                    style={{ cursor: 'pointer' }}
                    title="Klik untuk membuka dokumen resmi BPK"
                  >
                    <div className="item-top">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span 
                          style={{ 
                            fontFamily: 'monospace', 
                            fontWeight: '800', 
                            fontSize: '12px',
                            color: b.status === 'Dibatalkan' ? '#991b1b' : 'var(--primary)',
                            background: b.status === 'Dibatalkan' ? '#fee2e2' : 'rgba(16, 185, 129, 0.1)',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            border: `1px solid ${b.status === 'Dibatalkan' ? '#fca5a5' : 'rgba(16, 185, 129, 0.25)'}`
                          }}
                        >
                          {b.id}
                        </span>

                        <span style={{ 
                          fontSize: '10.5px', 
                          fontWeight: '700',
                          padding: '1px 6px',
                          borderRadius: '8px',
                          background: b.status === 'Sudah Dibayar' ? '#dcfce7' : (b.status === 'Dibatalkan' ? '#fee2e2' : '#f1f5f9'),
                          color: b.status === 'Sudah Dibayar' ? '#166534' : (b.status === 'Dibatalkan' ? '#991b1b' : '#475569')
                        }}>
                          {b.status}
                        </span>

                        <span className="badge" style={{ fontSize: '11px', background: '#f1f5f9' }}>
                          {b.category}
                        </span>

                        {b.nopol && <span className="badge badge-plate">{b.nopol}</span>}
                      </div>

                      <div className="item-amount" style={{ color: b.status === 'Dibatalkan' ? '#94a3b8' : 'var(--accent-rose)', fontFamily: 'monospace' }}>
                        {formatRupiah(b.amount)}
                      </div>
                    </div>

                    <div className="item-middle">
                      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginTop: '2px' }}>
                        Penerima: <strong>{b.recipientName}</strong> {b.recipientRole ? `(${b.recipientRole})` : ''}
                        {b.customerName ? ` &bull; Pelanggan: ${b.customerName}` : ''}
                        {b.transactionId ? ` (${b.transactionId})` : ''}
                      </div>
                      {b.description && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {b.description}
                        </div>
                      )}
                    </div>

                    <div className="item-bottom" style={{ marginTop: '8px' }}>
                      <span>{formatDateTime(b.date)}</span>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {Number(b.customerFee) > 0 && (
                          <span style={{ fontSize: '11px', color: '#166534', fontWeight: '600' }}>
                            Biaya Pelanggan: {formatRupiah(b.customerFee)}
                          </span>
                        )}
                        <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: '700' }}>
                          Lihat Dokumen BPK &rarr;
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            /* VIEW SEMUA PENGELUARAN */
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '8px' }}>
                * Menampilkan <strong>{filteredExpenses.length}</strong> catatan pengeluaran kas ({getPeriodLabel()}).
              </div>

              {filteredExpenses.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-dim)' }}>
                  Tidak ada data pengeluaran pada periode ini.
                </div>
              ) : (
                filteredExpenses.map((exp) => (
                  <div key={exp.id} className="list-item" style={{ cursor: 'default' }}>
                    <div className="item-top">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span 
                          style={{ 
                            fontFamily: 'var(--font-mono)', 
                            fontWeight: '800', 
                            fontSize: '12px',
                            color: 'var(--primary)',
                            background: 'rgba(16, 185, 129, 0.1)',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            border: '1px solid rgba(16, 185, 129, 0.25)',
                            letterSpacing: '0.3px'
                          }}
                        >
                          {exp.id}
                        </span>
                        <span className="badge" style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', fontSize: '11px' }}>
                          {exp.category || 'Umum'}
                        </span>
                        {exp.isVehicleRelated && exp.nopol ? (
                          <span className="badge badge-plate">{exp.nopol}</span>
                        ) : (
                          <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Toko</span>
                        )}
                      </div>
                      <div className="item-amount" style={{ color: 'var(--accent-rose)', fontFamily: 'var(--font-mono)' }}>
                        {formatRupiah(exp.amount)}
                      </div>
                    </div>

                    <div className="item-middle">
                      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginTop: '2px' }}>
                        {exp.description}
                      </div>
                    </div>

                    <div className="item-bottom" style={{ marginTop: '8px' }}>
                      <span>{formatDateTime(exp.date)}</span>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{ height: '28px', padding: '2px 10px', fontSize: '11px', gap: '4px', color: 'var(--accent-amber)', borderColor: 'rgba(245, 158, 11, 0.4)' }}
                          onClick={() => setEditingExpense(exp)}
                          title="Edit transaksi pengeluaran ini"
                        >
                          <Edit3 size={13} />
                          <span>Edit</span>
                        </button>
                        {exp.receiptPhoto && (
                          <>
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              style={{ height: '28px', padding: '2px 8px', fontSize: '11px', gap: '4px' }}
                              onClick={() => setZoomPhoto({ url: getGdriveReceiptUrl(exp) || exp.receiptPhoto, exp })}
                              title="Lihat Foto Nota"
                            >
                              <ImageIcon size={12} />
                              <span>Lihat</span>
                            </button>
                            <a
                              href={getGdriveReceiptUrl(exp) || exp.receiptPhoto}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-secondary btn-sm"
                              style={{ height: '28px', padding: '2px 8px', fontSize: '11px', gap: '4px', color: 'var(--primary)', borderColor: 'var(--primary-border)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                              title="Buka Berkas Nota di Google Drive"
                            >
                              <ExternalLink size={12} />
                              <span>Drive</span>
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal Detail Transaksi */}
      {selectedTx && (
        <ModalDetail
          tx={selectedTx}
          onClose={() => setSelectedTx(null)}
          onPrint={(item) => {
            setSelectedTx(null);
            setStrukTx(item);
          }}
        />
      )}

      {/* Modal Cetak Struk */}
      {strukTx && settings && (
        <StrukModal
          tx={strukTx}
          settings={settings}
          onClose={() => setStrukTx(null)}
        />
      )}

      {/* Modal Zoom & Unduh Nota */}
      {zoomPhoto && (
        <div className="modal-overlay" onClick={() => setZoomPhoto(null)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div>
                <div className="modal-title">Lampiran Nota Pengeluaran</div>
                {zoomPhoto.exp && (
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {zoomPhoto.exp.id} - {zoomPhoto.exp.description} ({formatRupiah(zoomPhoto.exp.amount)})
                  </div>
                )}
              </div>
              <button type="button" className="btn-icon" onClick={() => setZoomPhoto(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ textAlign: 'center', padding: '16px' }}>
              <img
                src={typeof zoomPhoto === 'string' ? zoomPhoto : zoomPhoto.url}
                alt="Nota Pengeluaran"
                style={{ width: '100%', maxHeight: '65vh', objectFit: 'contain', borderRadius: '10px', border: '1px solid var(--border)', background: '#f8fafc' }}
              />
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: '8px' }}>
              <a 
                href={typeof zoomPhoto === 'string' ? getGdriveReceiptUrl(zoomPhoto) : (getGdriveReceiptUrl(zoomPhoto.exp) || zoomPhoto.url)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary" 
                style={{ flex: 2, gap: '6px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <ExternalLink size={16} />
                <span>Buka di Google Drive</span>
              </a>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ flex: 1 }}
                onClick={() => setZoomPhoto(null)}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edit Pengeluaran */}
      {editingExpense && (
        <ModalEditPengeluaran
          exp={editingExpense}
          onClose={() => setEditingExpense(null)}
          onSaveSuccess={async () => {
            await loadData();
          }}
        />
      )}

      {/* Modal Dokumen BPK */}
      {viewingBpkDoc && (
        <BpkDocumentModal
          bpk={viewingBpkDoc}
          settings={settings}
          onClose={() => setViewingBpkDoc(null)}
        />
      )}
    </div>
  );
}
