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
  getPaymentStatus,
  recordTransactionPayment,
  formatRupiah, 
  formatDateTime 
} from '../../lib/storage';
import { showToast, showConfirm, showError } from '../../lib/sweetalert';
import { SkeletonList } from '../../components/Skeleton';
import ModalDetail from '../../components/ModalDetail';
import StrukModal from '../../components/StrukModal';
import { exportTransactionsToExcel } from '../../lib/excelExport';
import { formatRentalDuration } from '../../lib/rentalPricing';

export default function TransaksiPage() {
  const [transactions, setTransactions] = useState(() => getTransactions());
  const [fleet, setFleet] = useState(() => getFleet());
  const [settings, setSettings] = useState(() => getSettings());
  const [loading, setLoading] = useState(() => getTransactions().length === 0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, booking, aktif, hampir-selesai, terlambat, selesai
  const [paymentFilter, setPaymentFilter] = useState('all'); // all, terhutang, sebagian, lunas
  const [processingId, setProcessingId] = useState(null);

  // Modals
  const [detailTx, setDetailTx] = useState(null);
  const [receiptTx, setReceiptTx] = useState(null);

  // Quick Settle / Pelunasan Modal State
  const [payingTx, setPayingTx] = useState(null);
  const [additionalPayment, setAdditionalPayment] = useState('');
  const [payMethod, setPayMethod] = useState('Tunai');
  const [payNotes, setPayNotes] = useState('');
  const [isSubmittingPay, setIsSubmittingPay] = useState(false);

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

  // Tambahkan kalkulasi status dinamis dan status pembayaran untuk setiap transaksi
  const transactionsWithStatus = useMemo(() => {
    return transactions.map((tx) => {
      const st = getTransactionStatus(tx);
      const paySt = getPaymentStatus(tx);
      const vehicle = fleet.find((f) => f.nopol?.toUpperCase() === tx.nopol?.toUpperCase());
      return {
        ...tx,
        calculatedStatus: st,
        calculatedPaymentStatus: paySt,
        vehicleModel: vehicle ? `${vehicle.brand} ${vehicle.model}` : 'Motor Rental'
      };
    });
  }, [transactions, fleet]);

  // Hitung jumlah data per status sewa untuk badge filter tab
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

  // Hitung jumlah data per status pembayaran untuk badge filter pembayaran
  const paymentCounts = useMemo(() => {
    const res = {
      all: transactionsWithStatus.length,
      terhutang: 0,
      sebagian: 0,
      lunas: 0
    };

    transactionsWithStatus.forEach((tx) => {
      const k = tx.calculatedPaymentStatus.key;
      if (res[k] !== undefined) {
        res[k]++;
      }
    });

    return res;
  }, [transactionsWithStatus]);

  // Filter daftar transaksi berdasarkan pencarian, tab status sewa, dan tab status pembayaran
  const filteredTransactions = useMemo(() => {
    let list = transactionsWithStatus;

    // Filter tab status sewa
    if (statusFilter !== 'all') {
      list = list.filter((tx) => tx.calculatedStatus.key === statusFilter);
    }

    // Filter status pembayaran
    if (paymentFilter !== 'all') {
      list = list.filter((tx) => tx.calculatedPaymentStatus.key === paymentFilter);
    }

    // Filter pencarian nama pelanggan (dan nomor plat / telp)
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
  }, [transactionsWithStatus, statusFilter, paymentFilter, searchQuery]);

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
      const lateH = tx.calculatedStatus.lateHours || 0;
      const penaltyText = tx.calculatedStatus.isOverLimit
        ? `Denda sewa 1 hari penuh (${formatRupiah(tx.calculatedStatus.estimatedPenalty)})`
        : `Denda extend ${lateH} jam x Rp 10.000 (${formatRupiah(tx.calculatedStatus.estimatedPenalty)})`;
      extraNote = `Unit dikembalikan terlambat ${lateH} jam (${penaltyText})`;
      alertText += `\n\nPerhatian: Transaksi ini terlambat ${lateH} jam. Estimasi: ${penaltyText}. Pastikan periksa denda dan kelengkapan unit motor.`;
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

  // Handler: Buka Modal Pelunasan Cepat
  const handleOpenPayment = (tx) => {
    const paySt = tx.calculatedPaymentStatus || getPaymentStatus(tx);
    setPayingTx(tx);
    setAdditionalPayment(String(paySt.remaining > 0 ? paySt.remaining : ''));
    setPayMethod(tx.paymentMethod || 'Tunai');
    setPayNotes('Pelunasan sisa rental motor');
  };

  // Handler: Simpan Pembayaran Pelunasan
  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (!payingTx) return;

    const nominal = Number(additionalPayment);
    if (isNaN(nominal) || nominal <= 0) {
      showError('Input Tidak Valid', 'Masukkan nominal pembayaran tambahan yang valid.');
      return;
    }

    setIsSubmittingPay(true);
    try {
      await recordTransactionPayment(payingTx.id, {
        additionalAmount: nominal,
        paymentMethod: payMethod,
        notes: payNotes.trim()
      });
      showToast('Pembayaran berhasil dicatat!');
      setPayingTx(null);
      await loadData();
    } catch (err) {
      showError('Gagal Mencatat Pembayaran', err.message || 'Terjadi kesalahan server');
    } finally {
      setIsSubmittingPay(false);
    }
  };

  const tabs = [
    { key: 'all', label: 'Semua Sewa' },
    { key: 'booking', label: 'Booking' },
    { key: 'aktif', label: 'Aktif' },
    { key: 'hampir-selesai', label: 'Hampir Selesai' },
    { key: 'terlambat', label: 'Terlambat' },
    { key: 'selesai', label: 'Selesai' }
  ];

  const paymentTabs = [
    { key: 'all', label: 'Semua Status Bayar', dotColor: '#64748b' },
    { key: 'terhutang', label: 'Terhutang', dotColor: '#e11d48' },
    { key: 'sebagian', label: 'Sebagian', dotColor: '#d97706' },
    { key: 'lunas', label: 'Lunas', dotColor: '#16a34a' }
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
            Kelola status sewa, waktu pengembalian, dan status pembayaran rental
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

      {/* 1. Pencarian Berdasarkan Nama Pelanggan */}
      <div style={{ marginBottom: '14px' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input
            id="search-customer-input"
            type="text"
            className="form-input"
            placeholder="Cari berdasarkan nama pelanggan, no. plat, atau no. HP..."
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
            Menyaring hasil untuk: <strong>{searchQuery}</strong>
          </div>
        )}
      </div>

      {/* 2. Filter Status Sewa (Booking, Aktif, Hampir Selesai, Terlambat, Selesai) */}
      <div 
        style={{ 
          display: 'flex', 
          overflowX: 'auto', 
          gap: '6px', 
          paddingBottom: '8px', 
          marginBottom: '10px',
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
                padding: '7px 12px',
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

      {/* 3. Filter Status Pembayaran (Terhutang, Sebagian, Lunas) */}
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '6px', 
          overflowX: 'auto',
          paddingBottom: '8px', 
          marginBottom: '16px',
          scrollbarWidth: 'none'
        }}
      >
        <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginRight: '4px', flexShrink: 0 }}>
          Status Bayar:
        </span>
        {paymentTabs.map((tab) => {
          const isActive = paymentFilter === tab.key;
          const count = paymentCounts[tab.key] || 0;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setPaymentFilter(tab.key)}
              style={{
                flexShrink: 0,
                padding: '5px 11px',
                borderRadius: '16px',
                fontSize: '11px',
                fontWeight: isActive ? 700 : 600,
                border: isActive ? `1.5px solid ${tab.dotColor}` : '1px solid var(--border)',
                backgroundColor: isActive ? `${tab.dotColor}15` : '#ffffff',
                color: isActive ? tab.dotColor : 'var(--text-muted)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
            >
              <span 
                style={{ 
                  width: '7px', 
                  height: '7px', 
                  borderRadius: '50%', 
                  backgroundColor: tab.dotColor 
                }} 
              />
              <span>{tab.label}</span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '0 5px',
                  borderRadius: '8px',
                  backgroundColor: isActive ? `${tab.dotColor}25` : 'var(--bg-card)',
                  color: isActive ? tab.dotColor : 'var(--text-dim)'
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 4. Daftar Transaksi */}
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
              ? `Tidak ditemukan transaksi dengan kata kunci "${searchQuery}"`
              : `Belum ada data pada filter yang dipilih.`
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
            const paySt = tx.calculatedPaymentStatus || getPaymentStatus(tx);
            const isProcessing = processingId === tx.id;

            return (
              <div 
                key={tx.id} 
                className="card" 
                style={{ 
                  borderRadius: '14px', 
                  padding: '14px 16px', 
                  backgroundColor: '#ffffff',
                  border: st.key === 'terlambat' ? '1.5px solid rgba(225, 29, 72, 0.4)' : (paySt.key === 'terhutang' ? '1.5px solid rgba(225, 29, 72, 0.2)' : '1px solid var(--border)'),
                  boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
                }}
              >
                {/* Baris Atas: Nama Pelanggan & Badges Status */}
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

                  {/* Kanan: Badge Status Sewa & Badge Status Bayar */}
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      {/* Badge Status Pembayaran */}
                      <span 
                        className={`badge ${paySt.badgeClass}`}
                        style={{ 
                          fontSize: '10px', 
                          padding: '3px 8px', 
                          borderRadius: '10px', 
                          fontWeight: 700 
                        }}
                      >
                        {paySt.label}
                      </span>

                      {/* Badge Status Sewa */}
                      <span 
                        className={`badge ${st.badgeClass}`} 
                        style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '10px', fontWeight: 700 }}
                      >
                        {st.label}
                      </span>
                    </div>

                    <div style={{ fontSize: '10px', color: st.color, fontWeight: 700 }}>
                      {st.subtext}
                    </div>
                  </div>
                </div>

                {/* Detail Kendaraan & Biaya */}
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
                    <span style={{ color: 'var(--text-muted)' }}>Durasi Sewa:</span>
                    <strong style={{ color: 'var(--primary)' }}>
                      {formatRentalDuration(tx.durationDays, tx.extendHours, tx.durationHours)}
                    </strong>
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

                  {/* Rincian Finansial & Pembayaran */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border)', paddingTop: '6px', marginTop: '2px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Total Biaya:</span>
                    <strong style={{ color: 'var(--text-main)', fontSize: '13px' }}>{formatRupiah(tx.total)}</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Sudah Dibayar ({tx.paymentMethod || 'Tunai'}):</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{formatRupiah(paySt.paid)}</span>
                  </div>

                  {paySt.remaining > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--accent-rose)', fontWeight: 800 }}>
                      <span>Sisa Tagihan (Hutang):</span>
                      <span>{formatRupiah(paySt.remaining)}</span>
                    </div>
                  )}
                </div>

                {/* Tombol Aksi */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                  {/* Tombol Pelunasan Cepat jika belum lunas */}
                  {paySt.key !== 'lunas' && (
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => handleOpenPayment(tx)}
                      disabled={isProcessing}
                      style={{ 
                        fontWeight: 700, 
                        padding: '7px 14px', 
                        backgroundColor: '#f59e0b', 
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px'
                      }}
                      title="Catat pelunasan atau cicilan sisa tagihan"
                    >
                      Pelunasan
                    </button>
                  )}

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
          onSettle={(t) => {
            setDetailTx(null);
            handleOpenPayment(t);
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

      {/* Modal Pelunasan Cepat (Quick Settle) */}
      {payingTx && (
        <div 
          className="modal-overlay" 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            backgroundColor: 'rgba(15, 23, 42, 0.65)', 
            zIndex: 9999, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            padding: '16px',
            backdropFilter: 'blur(4px)'
          }}
          onClick={() => !isSubmittingPay && setPayingTx(null)}
        >
          <div 
            className="modal-content"
            style={{ 
              backgroundColor: '#ffffff', 
              borderRadius: '16px', 
              width: '100%', 
              maxWidth: '460px', 
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div 
              style={{ 
                padding: '16px 20px', 
                borderBottom: '1px solid var(--border)', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center' 
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-main)' }}>
                  Catat Pembayaran / Pelunasan
                </h3>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  ID: {payingTx.id} | {payingTx.customerName}
                </span>
              </div>
              <button 
                type="button" 
                onClick={() => !isSubmittingPay && setPayingTx(null)}
                style={{ 
                  background: 'transparent', 
                  border: 'none', 
                  fontSize: '20px', 
                  cursor: 'pointer', 
                  color: 'var(--text-muted)' 
                }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} style={{ padding: '20px' }}>
              {/* Ringkasan Tagihan */}
              <div 
                style={{ 
                  backgroundColor: 'var(--bg-card)', 
                  padding: '12px 14px', 
                  borderRadius: '12px', 
                  marginBottom: '16px', 
                  fontSize: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Unit Motor:</span>
                  <strong>{payingTx.nopol}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Total Biaya Sewa:</span>
                  <strong>{formatRupiah(payingTx.total)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Sudah Dibayar:</span>
                  <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>
                    {formatRupiah(payingTx.amountPaid || 0)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border)', paddingTop: '6px', color: 'var(--accent-rose)', fontWeight: 800, fontSize: '13px' }}>
                  <span>Sisa Tagihan Saat Ini:</span>
                  <span>{formatRupiah(Math.max(0, (payingTx.total || 0) - (payingTx.amountPaid || 0)))}</span>
                </div>
              </div>

              {/* Form Input Pembayaran */}
              <div style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                  Jumlah Uang Diterima (Rp) *
                </label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="Masukkan nominal bayar..."
                  value={additionalPayment}
                  onChange={(e) => setAdditionalPayment(e.target.value)}
                  required
                  min="1"
                  style={{ width: '100%', fontSize: '15px', fontWeight: 700, padding: '10px 12px', borderRadius: '10px' }}
                />
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Isi sesuai sisa tagihan untuk pelunasan langsung, atau isi sebagian untuk cicilan.
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label className="form-label" style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                  Metode Pembayaran *
                </label>
                <select
                  className="form-control"
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '13px' }}
                >
                  <option value="Tunai">Tunai (Cash)</option>
                  <option value="Transfer Bank">Transfer Bank</option>
                  <option value="QRIS">QRIS</option>
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="form-label" style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                  Catatan Pembayaran
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Contoh: Pelunasan saat pengembalian helm"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '13px' }}
                />
              </div>

              {/* Tombol Aksi */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setPayingTx(null)}
                  disabled={isSubmittingPay}
                  style={{ flex: 1, padding: '10px', borderRadius: '10px', fontWeight: 600 }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmittingPay}
                  style={{ flex: 1.5, padding: '10px', borderRadius: '10px', fontWeight: 700 }}
                >
                  {isSubmittingPay ? 'Menyimpan...' : 'Simpan Pembayaran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
