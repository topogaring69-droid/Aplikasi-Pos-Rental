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
  Edit3
} from 'lucide-react';
import { 
  fetchTransactions, 
  getTransactions,
  fetchExpenses, 
  getExpenses,
  fetchSettings, 
  getSettings,
  formatRupiah, 
  formatDateTime,
  formatDateOnly,
  getGdriveReceiptUrl
} from '../../lib/storage';
import { exportReportToPrintable } from '../../lib/pdfExport';
import { exportReportToExcel, exportExpensesReportToExcel } from '../../lib/excelExport';
import ModalDetail from '../../components/ModalDetail';
import StrukModal from '../../components/StrukModal';
import ModalEditPengeluaran from '../../components/ModalEditPengeluaran';

export default function LaporanPage() {
  const [transactions, setTransactions] = useState(() => getTransactions());
  const [expenses, setExpenses] = useState(() => getExpenses());
  const [settings, setSettings] = useState(() => getSettings());
  const [isLoading, setIsLoading] = useState(() => getTransactions().length === 0 && getExpenses().length === 0);

  // Tab: 'pemasukan' | 'pengeluaran'
  const [activeTab, setActiveTab] = useState('pemasukan');

  // Filter Periode
  const [period, setPeriod] = useState('bulan-ini');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [search, setSearch] = useState('');

  // Modal State
  const [selectedTx, setSelectedTx] = useState(null);
  const [strukTx, setStrukTx] = useState(null);
  const [zoomPhoto, setZoomPhoto] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);

  useEffect(() => {
    loadData();
    const today = new Date().toISOString().slice(0, 10);
    setCustomStart(today);
    setCustomEnd(today);
  }, []);

  const loadData = async () => {
    try {
      const [txList, expList] = await Promise.all([
        fetchTransactions(),
        fetchExpenses()
      ]);
      if (Array.isArray(txList)) setTransactions(txList);
      if (Array.isArray(expList)) setExpenses(expList);
      setIsLoading(false);
      fetchSettings().then((sett) => sett && setSettings(sett)).catch(() => {});
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

  const totalIncome = filteredTransactions.reduce((sum, tx) => sum + (Number(tx.total) || 0), 0);
  const totalExpense = filteredExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  const netProfit = totalIncome - totalExpense;

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

  const handleExportPengeluaranExcel = () => {
    exportExpensesReportToExcel(filteredExpenses, settings, getPeriodLabel());
  };

  const handleDownloadReceipt = async (photoUrl, expId = 'EXP') => {
    if (!photoUrl) return;
    try {
      const res = await fetch(photoUrl);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = photoUrl.endsWith('.jpg') || photoUrl.endsWith('.jpeg') ? 'jpg' : 'png';
      a.download = `nota_${expId}_${new Date().toISOString().slice(0, 10)}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      const a = document.createElement('a');
      a.href = photoUrl;
      a.download = `nota_${expId}.png`;
      a.target = '_blank';
      a.click();
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '800' }}>Laporan Keuangan</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Arus Kas Pemasukan & Pengeluaran</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={activeTab === 'pengeluaran' ? handleExportPengeluaranExcel : handleExportExcel}
            style={{ fontWeight: 700, background: '#ffffff', gap: '6px' }}
            title={activeTab === 'pengeluaran' ? "Ekspor laporan pengeluaran ke Excel (.xlsx)" : "Ekspor laporan keuangan lengkap ke Excel (.xlsx)"}
          >
            <Download size={14} />
            <span>Ekspor Excel</span>
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleExportPDF}
            style={{ gap: '6px' }}
          >
            <Download size={15} />
            <span>Ekspor PDF</span>
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

      {/* Kartu Ringkasan Finansial */}
      <div className="stat-card-grid">
        <div className="stat-card income">
          <div className="stat-label">Pemasukan</div>
          <div className="stat-val" style={{ color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
            {formatRupiah(totalIncome)}
          </div>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {filteredTransactions.length} Transaksi
          </span>
        </div>

        <div className="stat-card expense">
          <div className="stat-label">Pengeluaran</div>
          <div className="stat-val" style={{ color: 'var(--accent-rose)', fontFamily: 'var(--font-mono)' }}>
            {formatRupiah(totalExpense)}
          </div>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {filteredExpenses.length} Nota
          </span>
        </div>

        <div className="stat-card profit">
          <div className="stat-label">Laba Bersih</div>
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
            {netProfit >= 0 ? 'Surplus' : 'Defisit'}
          </span>
        </div>
      </div>

      {/* Bar Pencarian */}
      <div className="search-box">
        <Search className="search-icon" size={16} />
        <input
          type="text"
          className="search-input"
          placeholder="Cari dalam laporan (nopol, no. transaksi, keterangan)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Tab Segment */}
      <div className="tab-group">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'pemasukan' ? 'active' : ''}`}
          onClick={() => setActiveTab('pemasukan')}
        >
          Pemasukan ({filteredTransactions.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'pengeluaran' ? 'active' : ''}`}
          onClick={() => setActiveTab('pengeluaran')}
        >
          Pengeluaran ({filteredExpenses.length})
        </button>
      </div>

      {/* TAB 1: PEMASUKAN */}
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

      {/* TAB 2: PENGELUARAN */}
      {activeTab === 'pengeluaran' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
              * Menampilkan <strong>{filteredExpenses.length}</strong> catatan pengeluaran ({getPeriodLabel()}).
            </div>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={handleExportPengeluaranExcel}
              style={{ fontWeight: 700, background: '#ffffff', gap: '6px' }}
              title="Ekspor laporan pengeluaran terfilter ke Excel (.xlsx)"
            >
              <Download size={14} />
              <span>Export Excel</span>
            </button>
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
                      title="Nomor Transaksi Pengeluaran"
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
    </div>
  );
}
