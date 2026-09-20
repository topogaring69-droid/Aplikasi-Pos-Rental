'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  fetchTransactions, 
  getTransactions,
  fetchFleet, 
  getFleet,
  fetchSettings, 
  getSettings,
  activateTransaction, 
  completeTransaction, 
  deleteTransaction, 
  getTransactionStatus, 
  formatRupiah, 
  formatDateTime 
} from '../../lib/storage';
import { showToast, showConfirm, showError } from '../../lib/sweetalert';
import { SkeletonList, SkeletonSearchBar } from '../../components/Skeleton';
import ModalDetail from '../../components/ModalDetail';
import StrukModal from '../../components/StrukModal';
import { exportTransactionsToExcel } from '../../lib/excelExport';

export default function TransaksiPage() {
  const [transactions, setTransactions] = useState(() => getTransactions());
  const [fleet, setFleet] = useState(() => getFleet());
  const [settings, setSettings] = useState(() => getSettings());
  const [loading, setLoading] = useState(() => getTransactions().length === 0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, booking, aktif, hampir-selesai, terlambat, selesai
  const [processingId, setProcessingId] = useState(null);

  // Modals
  const [detailTx, setDetailTx] = useState(null);
  const [receiptTx, setReceiptTx] = useState(null);

  const loadData = async () => {
    try {
      // 1. Fokus cepat: muat transaksi utama
      const txList = await fetchTransactions();
      if (Array.isArray(txList)) setTransactions(txList);
      setLoading(false);

      // 2. Muat referensi armada & pengaturan di latar belakang tanpa memblokir
      fetchFleet().then((f) => Array.isArray(f) && setFleet(f)).catch(() => {});
      fetchSettings().then((s) => s && setSettings(s)).catch(() => {});
    } catch (err) {
      console.error('Gagal memuat transaksi:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Tambahkan kalkulasi status dinamis untuk setiap transaksi
  const transactionsWithStatus = useMemo(() => {
    return transactions.map((tx) => {
      const st = getTransactionStatus(tx);
      const vehicle = fleet.find((f) => f.nopol?.toUpperCase() === tx.nopol?.toUpperCase());
      return {
        ...tx,
        calculatedStatus: st,
        vehicleModel: vehicle ? `${vehicle.brand} ${vehicle.model}` : 'Motor Rental'
      };
    });
  }, [transactions, fleet]);

  // Hitung jumlah data per status untuk badge filter tab
  const counts = useMemo(() => {
    const res = {
      all: transactionsWithStatus.length,
      booking: 0,
      aktif: 0,
      'hampir-selesai': 0,
      terlambat: 0,
      selesai: 0
    };

    transactionsWithStatus.forEach((tx) => {
      const k = tx.calculatedStatus.key;
      if (res[k] !== undefined) {
        res[k]++;
      }
    });

    return res;
  }, [transactionsWithStatus]);

  // Filter daftar transaksi berdasarkan nama pelanggan (prioritas utama) dan tab status
  const filteredTransactions = useMemo(() => {
    let list = transactionsWithStatus;

    // Filter tab status
    if (statusFilter !== 'all') {
      list = list.filter((tx) => tx.calculatedStatus.key === statusFilter);
    }

    // Filter pencarian nama pelanggan (dan nomor plat / telp sebagai toleransi tambahan)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((tx) => {
        const nameMatch = (tx.customerName || '').toLowerCase().includes(q);
        const phoneMatch = (tx.customerPhone || '').toLowerCase().includes(q);
        const nopolMatch = (tx.nopol || '').toLowerCase().includes(q);
        return nameMatch || phoneMatch || nopolMatch;
      });
    }

    return list;
  }, [transactionsWithStatus, statusFilter, searchQuery]);

  // Handler: Aktifkan Sewa (untuk Booking)
  const handleActivate = async (tx) => {
    const ok = await showConfirm({
      title: 'Aktifkan Sewa?',
      text: `Mulai masa sewa untuk pelanggan ${tx.customerName} (${tx.nopol})? Status unit akan diubah menjadi Disewa.`,
      confirmButtonText: 'Ya, Aktifkan',
      cancelButtonText: 'Batal',
      icon: 'question',
      isDanger: false
    });

    if (!ok) return;

    setProcessingId(tx.id);
    try {
      await activateTransaction(tx.id);
      showToast('Sewa berhasil diaktifkan!');
      await loadData();
    } catch (err) {
      showError('Gagal Mengaktifkan', err.message || 'Terjadi kesalahan sistem');
    } finally {
      setProcessingId(null);
    }
  };

  // Handler: Selesaikan Sewa (untuk Aktif / Hampir Selesai / Terlambat)
  const handleComplete = async (tx) => {
    const isLate = tx.calculatedStatus.key === 'terlambat';
    let extraNote = 'Unit dikembalikan';

    let alertText = `Konfirmasi pengembalian unit ${tx.nopol} oleh pelanggan ${tx.customerName}? Status unit motor akan dikembalikan menjadi Tersedia.`;
    if (isLate) {
      extraNote = `Unit dikembalikan terlambat ${tx.calculatedStatus.lateHours} jam`;
      alertText += `\n\nPerhatian: Transaksi ini terlambat ${tx.calculatedStatus.lateHours} jam. Pastikan periksa denda dan kelengkapan unit motor.`;
    }

    const ok = await showConfirm({
      title: 'Selesaikan Sewa?',
      text: alertText,
      confirmButtonText: 'Ya, Selesaikan',
      cancelButtonText: 'Batal',
      icon: isLate ? 'warning' : 'question',
      isDanger: false
    });

    if (!ok) return;

    setProcessingId(tx.id);
    try {
      await completeTransaction(tx.id, extraNote);
      showToast('Sewa telah diselesaikan dan unit motor kembali tersedia!');
      await loadData();
    } catch (err) {
      showError('Gagal Menyelesaikan', err.message || 'Terjadi kesalahan sistem');
    } finally {
      setProcessingId(null);
    }
  };

  // Handler: Hapus Transaksi
  const handleDelete = async (tx) => {
    const ok = await showConfirm({
      title: 'Hapus Transaksi?',
      text: `Hapus catatan transaksi ${tx.id} atas nama ${tx.customerName}? Unit motor terkait akan dikembalikan ke status Tersedia.`,
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
      icon: 'warning',
      isDanger: true
    });

    if (!ok) return;

    setProcessingId(tx.id);
    try {
      await deleteTransaction(tx.id);
      showToast('Transaksi berhasil dihapus');
      await loadData();
    } catch (err) {
      showError('Gagal Menghapus', err.message || 'Terjadi kesalahan sistem');
    } finally {
      setProcessingId(null);
    }
  };

  const tabs = [
    { key: 'all', label: 'Semua' },
    { key: 'booking', label: 'Booking' },
    { key: 'aktif', label: 'Aktif' },
    { key: 'hampir-selesai', label: 'Hampir Selesai' },
    { key: 'terlambat', label: 'Terlambat' },
    { key: 'selesai', label: 'Selesai' }
  ];

  return (
    <div className="page-container" style={{ paddingBottom: '100px' }}>
      {/* Header Halaman */}
      <div className="page-header" style={{ marginBottom: '14px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
            Transaksi Sewa
          </h2>
          <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
            Kelola status sewa, waktu pengembalian, dan armada rental
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => exportTransactionsToExcel(filteredTransactions, fleet, settings)}
            className="btn btn-outline"
            style={{ padding: '8px 14px', fontSize: '12px', fontWeight: 700, borderRadius: '10px', background: '#ffffff' }}
            title="Ekspor daftar transaksi ke file Excel (.xlsx)"
          >
            Ekspor Excel
          </button>
          <Link 
            href="/" 
            className="btn btn-primary"
            style={{ padding: '8px 14px', fontSize: '12px', fontWeight: 700, borderRadius: '10px' }}
          >
            Sewa Baru
          </Link>
        </div>
      </div>

      {/* 1. Tampilan Pertama: Pencarian Berdasarkan Nama Pelanggan */}
      <div style={{ marginBottom: '14px' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input
            id="search-customer-input"
            type="text"
            className="form-input"
            placeholder="Cari berdasarkan nama pelanggan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '12px 14px',
              paddingRight: searchQuery ? '80px' : '14px',
              fontSize: '14px',
              borderRadius: '12px',
              backgroundColor: '#ffffff',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
              border: '1.5px solid var(--border)'
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '10px',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--text-muted)',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Hapus
            </button>
          )}
        </div>
        {searchQuery.trim() && (
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', paddingLeft: '4px' }}>
            Menyaring hasil untuk pelanggan: <strong>{searchQuery}</strong>
          </div>
        )}
      </div>

      {/* 2. Filter Tab Status (Booking, Aktif, Hampir Selesai, Terlambat, Selesai) */}
      <div 
        style={{ 
          display: 'flex', 
          overflowX: 'auto', 
          gap: '6px', 
          paddingBottom: '8px', 
          marginBottom: '16px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
      >
        {tabs.map((tab) => {
          const isActive = statusFilter === tab.key;
          const count = counts[tab.key] || 0;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              style={{
                flexShrink: 0,
                padding: '8px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: isActive ? 700 : 500,
                border: isActive ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                backgroundColor: isActive ? 'var(--primary)' : '#ffffff',
                color: isActive ? '#ffffff' : 'var(--text-main)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
            >
              <span>{tab.label}</span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: '10px',
                  backgroundColor: isActive ? 'rgba(255, 255, 255, 0.25)' : 'var(--bg-card)',
                  color: isActive ? '#ffffff' : 'var(--text-muted)'
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. Daftar Transaksi */}
      {loading ? (
        <SkeletonList count={4} variant="transaction" />
      ) : filteredTransactions.length === 0 ? (
        <div 
          className="card text-center" 
          style={{ padding: '36px 20px', borderRadius: '16px', backgroundColor: '#ffffff' }}
        >
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
            Tidak ada transaksi
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 16px 0' }}>
            {searchQuery 
              ? `Tidak ditemukan transaksi dengan nama pelanggan "${searchQuery}"`
              : `Belum ada data pada status "${tabs.find(t => t.key === statusFilter)?.label || statusFilter}"`
            }
          </p>
          <Link href="/" className="btn btn-secondary btn-sm" style={{ display: 'inline-block' }}>
            Buka Kasir Sewa
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredTransactions.map((tx) => {
            const st = tx.calculatedStatus;
            const isProcessing = processingId === tx.id;

            return (
              <div 
                key={tx.id} 
                className="card" 
                style={{ 
                  borderRadius: '14px', 
                  padding: '14px 16px', 
                  backgroundColor: '#ffffff',
                  border: st.key === 'terlambat' ? '1.5px solid rgba(225, 29, 72, 0.4)' : '1px solid var(--border)',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
                }}
              >
                {/* Baris Atas: Nama Pelanggan & Badge Status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)' }}>
                      {tx.customerName}
                    </div>
                    {tx.customerPhone ? (
                      <a 
                        href={`https://wa.me/${tx.customerPhone.replace(/[^0-9]/g, '')}`} 
                        target="_blank" 
                        rel="noreferrer"
                        style={{ fontSize: '11px', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}
                      >
                        {tx.customerPhone} (WhatsApp)
                      </a>
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Tanpa No. HP</span>
                    )}
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span 
                      className={`badge ${st.badgeClass}`} 
                      style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '12px', fontWeight: 700 }}
                    >
                      {st.label}
                    </span>
                    <div style={{ fontSize: '10px', color: st.color, fontWeight: 700, marginTop: '3px' }}>
                      {st.subtext}
                    </div>
                  </div>
                </div>

                {/* Detail Kendaraan & Jadwal */}
                <div 
                  style={{ 
                    backgroundColor: 'var(--bg-card)', 
                    borderRadius: '10px', 
                    padding: '10px 12px', 
                    fontSize: '12px',
                    marginBottom: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Armada Motor:</span>
                    <strong style={{ color: 'var(--text-main)' }}>{tx.nopol} ({tx.vehicleModel})</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Mulai Sewa:</span>
                    <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{formatDateTime(tx.startDate)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Batas Selesai:</span>
                    <span style={{ color: st.key === 'terlambat' ? 'var(--accent-rose)' : 'var(--text-main)', fontWeight: 700 }}>
                      {formatDateTime(tx.endDate)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border)', paddingTop: '4px', marginTop: '2px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Total Biaya:</span>
                    <strong style={{ color: 'var(--text-main)', fontSize: '13px' }}>{formatRupiah(tx.total)}</strong>
                  </div>
                </div>

                {/* Tombol Aksi: Bersih, Teks Murni Tanpa Hardcoded Icon */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                  {/* Tombol Aktifkan (Khusus Booking) */}
                  {st.key === 'booking' && (
                    <button
                      type="button"
                      className="btn btn-success btn-sm"
                      onClick={() => handleActivate(tx)}
                      disabled={isProcessing}
                      style={{ fontWeight: 700, padding: '7px 14px' }}
                    >
                      {isProcessing ? 'Memproses...' : 'Aktifkan'}
                    </button>
                  )}

                  {/* Tombol Selesaikan (Untuk Aktif, Hampir Selesai, Terlambat) */}
                  {(st.key === 'aktif' || st.key === 'hampir-selesai' || st.key === 'terlambat') && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => handleComplete(tx)}
                      disabled={isProcessing}
                      style={{ fontWeight: 700, padding: '7px 14px' }}
                    >
                      {isProcessing ? 'Memproses...' : 'Selesaikan'}
                    </button>
                  )}

                  {/* Tombol Detail */}
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setDetailTx(tx)}
                    disabled={isProcessing}
                    style={{ padding: '7px 12px' }}
                  >
                    Detail
                  </button>

                  {/* Tombol Struk */}
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setReceiptTx(tx)}
                    disabled={isProcessing}
                    style={{ padding: '7px 12px' }}
                  >
                    Struk
                  </button>

                  {/* Tombol Hapus */}
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(tx)}
                    disabled={isProcessing}
                    style={{ marginLeft: 'auto', padding: '7px 12px' }}
                  >
                    Hapus
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Detail Transaksi */}
      {detailTx && (
        <ModalDetail
          tx={detailTx}
          onClose={() => setDetailTx(null)}
          onPrint={(t) => {
            setDetailTx(null);
            setReceiptTx(t);
          }}
        />
      )}

      {/* Modal Cetak Struk */}
      {receiptTx && (
        <StrukModal
          tx={receiptTx}
          settings={settings}
          onClose={() => setReceiptTx(null)}
        />
      )}
    </div>
  );
}
