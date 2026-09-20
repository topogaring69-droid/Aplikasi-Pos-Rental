'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Search, 
  Printer, 
  Edit2, 
  Trash2, 
  X, 
  Plus, 
  CheckCircle2, 
  Bike,
  Calendar,
  Clock,
  DollarSign,
  User,
  Users,
  Phone,
  RotateCcw,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { 
  fetchTransactions, 
  saveTransaction, 
  deleteTransaction, 
  fetchFleet, 
  fetchCustomers,
  saveCustomer,
  fetchSettings, 
  getTransactionStatus,
  formatRupiah, 
  formatDateTime 
} from '../lib/storage';
import ModalDetail from '../components/ModalDetail';
import StrukModal from '../components/StrukModal';
import { showToast, showConfirm } from '../lib/sweetalert';
import { SkeletonList, SkeletonSearchBar } from '../components/Skeleton';

// Helper format Date ke format input datetime-local: YYYY-MM-DDTHH:mm
const formatToInput = (d) => {
  if (!d || isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function TransaksiPage() {
  const [transactions, setTransactions] = useState([]);
  const [fleet, setFleet] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // State Form Transaksi (Mode Buat Baru vs Mode Edit)
  const [showForm, setShowForm] = useState(false);
  const [editingTxId, setEditingTxId] = useState(null); // null = buat baru, string ID = edit
  
  const [nopol, setNopol] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [autoSaveCustomer, setAutoSaveCustomer] = useState(true);
  
  // Mulai Sewa (Tanggal & Jam), Selesai Sewa (Tanggal & Jam), Durasi Jam (Basis 24 Jam)
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [durationHours, setDurationHours] = useState(24);
  
  const [rentalPrice, setRentalPrice] = useState(100000);
  const [extraCosts, setExtraCosts] = useState([
    { id: '1', label: 'Helm Tambahan', amount: 0 }
  ]);
  const [paymentMethod, setPaymentMethod] = useState('Tunai');
  const [amountPaid, setAmountPaid] = useState('');
  const [notes, setNotes] = useState('');
  const [txStatus, setTxStatus] = useState('active'); // 'active' atau 'booking'

  // State Modal Detail & Struk
  const [selectedTx, setSelectedTx] = useState(null);
  const [strukTx, setStrukTx] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
    initDefaultDates();
  }, []);

  const initDefaultDates = () => {
    const now = new Date();
    now.setMinutes(0);
    now.setSeconds(0);
    const end = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    setStartDate(formatToInput(now));
    setEndDate(formatToInput(end));
    setDurationHours(24);
  };

  const loadData = async () => {
    try {
      const [txList, fleetList, custList, sett] = await Promise.all([
        fetchTransactions(),
        fetchFleet(),
        fetchCustomers(),
        fetchSettings()
      ]);
      setTransactions(txList);
      setFleet(fleetList);
      setCustomers(custList);
      setSettings(sett);
    } finally {
      setIsLoading(false);
    }
  };

  // Hitung otomatis harga sewa berdasarkan tarif armada (basis 24 jam & tarif per jam)
  const calculateRentalPrice = (targetNopol, hours) => {
    const found = fleet.find((f) => f.nopol === targetNopol);
    if (!found || !found.dailyRate) return;
    const rate = found.dailyRate;
    const fullDays = Math.floor(hours / 24);
    const remHours = hours % 24;
    const ratePerHour = Math.round(rate / 24);

    let price = 0;
    if (hours < 24) {
      // Standar rental: minimal sewa 1 hari (24 jam)
      price = rate;
    } else {
      // 24 jam x N hari + kelebihan jam (overtime)
      price = (fullDays * rate) + (remHours * ratePerHour);
    }
    setRentalPrice(price);
  };

  // Pilih motor dari armada: otomatis isi nopol & estimasi tarif harian/perjam
  const handleSelectMotor = (e) => {
    const selectedNopol = e.target.value;
    setNopol(selectedNopol);
    if (selectedNopol) {
      calculateRentalPrice(selectedNopol, durationHours);
    }
  };

  // Pilih pelanggan dari master data pelanggan: auto-fill nama & HP
  const handleSelectCustomer = (e) => {
    const custId = e.target.value;
    setSelectedCustomerId(custId);
    if (custId) {
      const found = customers.find((c) => c.id === custId);
      if (found) {
        setCustomerName(found.name);
        setCustomerPhone(found.phone || '');
        showToast(`Pelanggan "${found.name}" dipilih! Data terisi otomatis.`);
      }
    }
  };

  // ================= SINKRONISASI DUA ARAH TANGGAL, JAM & DURASI =================

  // 1. Kasir mengubah Mulai Sewa (Tanggal dan Jam)
  const handleStartDateChange = (val) => {
    setStartDate(val);
    if (val) {
      const start = new Date(val);
      if (!isNaN(start.getTime())) {
        const newEnd = new Date(start.getTime() + durationHours * 3600 * 1000);
        setEndDate(formatToInput(newEnd));
      }
    }
  };

  // 2. Kasir mengubah Durasi Jam (misal ketik 30 jam, atau klik chip 24/48/72 jam)
  const handleDurationHoursChange = (hours) => {
    const h = Math.max(1, Number(hours) || 1);
    setDurationHours(h);
    if (startDate) {
      const start = new Date(startDate);
      if (!isNaN(start.getTime())) {
        const newEnd = new Date(start.getTime() + h * 3600 * 1000);
        setEndDate(formatToInput(newEnd));
      }
    }
    if (nopol) {
      calculateRentalPrice(nopol, h);
    }
  };

  // 3. Kasir mengubah Selesai Sewa (Tanggal dan Jam) secara langsung
  const handleEndDateChange = (val) => {
    setEndDate(val);
    if (val && startDate) {
      const start = new Date(startDate);
      const end = new Date(val);
      const diffMs = end.getTime() - start.getTime();
      if (diffMs > 0) {
        const h = Math.max(1, Math.round(diffMs / (3600 * 1000)));
        setDurationHours(h);
        if (nopol) {
          calculateRentalPrice(nopol, h);
        }
      }
    }
  };

  // Tambah durasi cepat (+6 jam, +12 jam, +24 jam)
  const addHours = (extra) => {
    handleDurationHoursChange(durationHours + extra);
  };

  // Format durasi ramah kasir (misal: "24 Jam (1 Hari)" atau "28 Jam (1 Hari + 4 Jam)")
  const getDurationSummary = () => {
    const days = Math.floor(durationHours / 24);
    const rem = durationHours % 24;
    if (days === 0) return `${durationHours} Jam`;
    if (rem === 0) return `${durationHours} Jam (${days} Hari Penuh)`;
    return `${durationHours} Jam (${days} Hari + ${rem} Jam Overtime)`;
  };

  // Manajemen Baris Biaya Tambahan Dinamis
  const addExtraRow = () => {
    setExtraCosts([
      ...extraCosts,
      { id: Date.now().toString(), label: '', amount: 0 }
    ]);
  };

  const updateExtraRow = (id, field, value) => {
    setExtraCosts(
      extraCosts.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const removeExtraRow = (id) => {
    setExtraCosts(extraCosts.filter((item) => item.id !== id));
  };

  // Hitung Total
  const totalExtras = extraCosts.reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0
  );
  const totalAmount = Number(rentalPrice || 0) + totalExtras;
  const changeAmount = Math.max(0, (Number(amountPaid) || totalAmount) - totalAmount);

  // ================= FITUR EDIT TRANSAKSI =================
  const handleStartEdit = (tx) => {
    setEditingTxId(tx.id);
    setNopol(tx.nopol || '');
    setSelectedCustomerId(tx.customerId || '');
    setCustomerName(tx.customerName || '');
    setCustomerPhone(tx.customerPhone || '');
    
    // Normalisasi tanggal & jam ke input YYYY-MM-DDTHH:mm
    if (tx.startDate) {
      const s = new Date(tx.startDate);
      setStartDate(!isNaN(s.getTime()) ? formatToInput(s) : tx.startDate.slice(0, 16));
    }
    if (tx.endDate) {
      const e = new Date(tx.endDate);
      setEndDate(!isNaN(e.getTime()) ? formatToInput(e) : tx.endDate.slice(0, 16));
    }

    const h = tx.durationHours || (Number(tx.durationDays) || 1) * 24;
    setDurationHours(h);
    setRentalPrice(Number(tx.rentalPrice) || 0);

    const extras = Array.isArray(tx.extraCosts) && tx.extraCosts.length > 0 
      ? tx.extraCosts 
      : [{ id: '1', label: 'Helm Tambahan', amount: 0 }];
    setExtraCosts(extras);

    setPaymentMethod(tx.paymentMethod || 'Tunai');
    setAmountPaid(tx.amountPaid ? String(tx.amountPaid) : String(tx.total || ''));
    setNotes(tx.notes || '');
    setTxStatus(tx.status || 'active');

    setShowForm(true);
    setSelectedTx(null); // Tutup modal detail jika terbuka
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(`Mode Edit: Transaksi ${tx.id} siap diubah`, 'info');
  };

  const handleCancelEdit = () => {
    setEditingTxId(null);
    resetForm();
    setShowForm(false);
  };

  const resetForm = () => {
    setEditingTxId(null);
    setNopol('');
    setSelectedCustomerId('');
    setCustomerName('');
    setCustomerPhone('');
    initDefaultDates();
    setRentalPrice(100000);
    setExtraCosts([{ id: '1', label: 'Helm Tambahan', amount: 0 }]);
    setPaymentMethod('Tunai');
    setAmountPaid('');
    setNotes('');
    setTxStatus('active');
  };

  // Simpan Transaksi (Bisa Baru atau Perbarui yang Diedit)
  const handleSaveTransaction = async (e) => {
    e.preventDefault();
    if (!nopol.trim()) {
      showToast('Nomor polisi kendaraan wajib diisi!', 'error');
      return;
    }
    if (!customerName.trim()) {
      showToast('Nama pelanggan wajib diisi!', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const isEdit = Boolean(editingTxId);
      const txId = isEdit ? editingTxId : `TRX-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
      const calcDays = Math.max(1, Math.ceil(durationHours / 24));

      // Simpan/update data pelanggan jika belum terdaftar
      let finalCustId = selectedCustomerId;
      if (!finalCustId && autoSaveCustomer) {
        const existing = customers.find(
          (c) => c.name.toLowerCase() === customerName.trim().toLowerCase()
        );
        if (existing) {
          finalCustId = existing.id;
        } else {
          const newCust = {
            id: `CST-${Date.now().toString().slice(-4)}`,
            name: customerName.trim(),
            phone: customerPhone.trim(),
            nik: '',
            address: '',
            emergencyContact: '',
            notes: 'Tersimpan otomatis dari transaksi sewa',
            totalRentals: 1,
            createdAt: new Date().toISOString()
          };
          await saveCustomer(newCust);
          finalCustId = newCust.id;
        }
      }

      const payloadTx = {
        id: txId,
        nopol: nopol.toUpperCase().trim(),
        customerId: finalCustId || null,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        startDate,
        endDate,
        durationDays: calcDays,
        durationHours: durationHours,
        rentalPrice: Number(rentalPrice),
        extraCosts: extraCosts.filter((c) => c.label.trim() && Number(c.amount) > 0),
        total: totalAmount,
        paymentMethod,
        amountPaid: amountPaid ? Number(amountPaid) : totalAmount,
        changeAmount,
        status: txStatus,
        notes: notes.trim(),
        ...(isEdit ? {} : { createdAt: new Date().toISOString() })
      };

      await saveTransaction(payloadTx);
      await loadData();
      setShowForm(false);
      resetForm();

      if (isEdit) {
        showToast(`Transaksi ${txId} berhasil diperbarui di database!`);
      } else {
        showToast(`Transaksi ${txId} berhasil disimpan ke database!`);
      }
      setStrukTx(payloadTx);
    } catch (error) {
      showToast('Gagal menyimpan transaksi: ' + error.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ================= FITUR HAPUS TRANSAKSI =================
  const handleDelete = async (id) => {
    const target = transactions.find((t) => t.id === id);
    const nopolTarget = target?.nopol || 'kendaraan';
    
    const confirmed = await showConfirm({
      title: `Hapus Transaksi ${id}?`,
      text: `Unit motor (${nopolTarget}) akan otomatis dikembalikan ke status "Tersedia". Catatan transaksi akan diarsipkan.`,
      confirmButtonText: 'Ya, Hapus Transaksi',
      cancelButtonText: 'Batal',
      icon: 'warning',
      isDanger: true,
    });

    if (confirmed) {
      await deleteTransaction(id);
      await loadData();
      if (selectedTx?.id === id) {
        setSelectedTx(null);
      }
      showToast(`Transaksi ${id} dihapus. Unit ${nopolTarget} kini Tersedia kembali.`, 'info');
    }
  };

  // Filter Pencarian
  const filteredTransactions = transactions.filter((t) => {
    const q = search.toLowerCase();
    return (
      t.id.toLowerCase().includes(q) ||
      (t.nopol || '').toLowerCase().includes(q) ||
      (t.customerName || '').toLowerCase().includes(q)
    );
  });

  return (
    <div>

      {/* Tombol Buat Transaksi Baru */}
      <div style={{ marginBottom: '16px' }}>
        <button
          type="button"
          disabled={isSubmitting}
          className={`btn ${editingTxId ? 'btn-outline' : 'btn-primary'} btn-block`}
          onClick={() => {
            if (editingTxId) {
              handleCancelEdit();
            } else {
              setShowForm(!showForm);
            }
          }}
          style={{ gap: '10px', fontSize: '15px' }}
        >
          {showForm && <X size={20} />}
          <span>
            {editingTxId 
              ? 'Batal Edit (Kembali)' 
              : showForm 
                ? 'Tutup Formulir' 
                : 'Buat Transaksi Sewa Baru'}
          </span>
        </button>
      </div>

      {/* ================= FORMULIR TRANSAKSI (BUAT BARU / EDIT) ================= */}
      {showForm && (
        <div 
          className="card" 
          style={{ 
            borderColor: editingTxId ? 'var(--accent-amber)' : 'var(--primary-border)', 
            background: '#ffffff', 
            marginBottom: '24px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.06)'
          }}
        >
          <div className="card-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '16px' }}>
            <span className="card-title" style={{ fontSize: '16px' }}>
              <Bike size={20} color={editingTxId ? 'var(--accent-amber)' : 'var(--primary)'} />
              {editingTxId ? `Edit Transaksi: ${editingTxId}` : 'Formulir Transaksi Sewa Motor'}
            </span>
            <span className={`badge ${editingTxId ? 'badge-warning' : 'badge-success'}`}>
              {editingTxId ? 'Mode Edit' : 'Database Aktif'}
            </span>
          </div>

          {editingTxId && (
            <div style={{ 
              background: 'rgba(245, 158, 11, 0.08)', 
              border: '1px solid rgba(245, 158, 11, 0.3)', 
              padding: '10px 14px', 
              borderRadius: '8px', 
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '13px',
              color: '#92400e'
            }}>
              <AlertCircle size={18} />
              <div>
                Anda sedang mengubah data transaksi <strong>{editingTxId}</strong>. Klik <em>"Simpan Perubahan Transaksi"</em> di bawah untuk memperbarui ke database.
              </div>
            </div>
          )}

          <form onSubmit={handleSaveTransaction}>
            {/* Pilihan Jenis Sewa: Langsung atau Booking */}
            <div style={{ marginBottom: '14px', background: 'var(--bg-input)', padding: '6px', borderRadius: '12px', display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setTxStatus('active')}
                className={`tab-btn ${txStatus === 'active' ? 'active' : ''}`}
                style={{ flex: 1, minHeight: '36px', fontSize: '12px', padding: '6px' }}
              >
                Sewa Langsung (Aktif)
              </button>
              <button
                type="button"
                onClick={() => setTxStatus('booking')}
                className={`tab-btn ${txStatus === 'booking' ? 'active' : ''}`}
                style={{ flex: 1, minHeight: '36px', fontSize: '12px', padding: '6px' }}
              >
                Booking (Mulai Nanti)
              </button>
            </div>

            {/* 1. Referensi Unit Kendaraan */}
            <div className="form-group">
              <label className="form-label">Pilih Nomor Polisi Kendaraan *</label>
              <select
                className="form-control"
                value={nopol}
                onChange={handleSelectMotor}
              >
                <option value="">-- Pilih dari Armada Terdaftar --</option>
                {fleet.map((m) => (
                  <option key={m.id} value={m.nopol}>
                    {m.nopol} - {m.brand} {m.model} ({m.status === 'available' ? 'Tersedia' : m.status}) - {formatRupiah(m.dailyRate)}/24 Jam
                  </option>
                ))}
              </select>
              <input
                type="text"
                className="form-control"
                placeholder="Atau ketik nopol manual (B 1234 XYZ)..."
                value={nopol}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setNopol(val);
                  calculateRentalPrice(val, durationHours);
                }}
                style={{ marginTop: '8px', fontFamily: 'var(--font-mono)' }}
                required
              />
            </div>

            {/* 2. Integrasi Manajemen Pelanggan (Auto-fill) */}
            <div className="form-group" style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={14} />
                  PILIH PELANGGAN TERDAFTAR (AUTO-FILL)
                </span>
                <span className="badge badge-success" style={{ fontSize: '10px' }}>
                  {customers.length} Tersimpan
                </span>
              </div>

              <select
                className="form-control"
                value={selectedCustomerId}
                onChange={handleSelectCustomer}
                style={{ marginBottom: '8px' }}
              >
                <option value="">-- Cari / Pilih Pelanggan Yang Pernah Sewa --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ''} - {c.totalRentals || 0}x Sewa
                  </option>
                ))}
              </select>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '6px' }}>
                <div>
                  <label className="form-label">Nama Pelanggan *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Nama Pelanggan"
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      setSelectedCustomerId('');
                    }}
                    required
                  />
                </div>

                <div>
                  <label className="form-label">No. WhatsApp / HP</label>
                  <input
                    type="tel"
                    className="form-control"
                    placeholder="0812..."
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    inputMode="numeric"
                  />
                </div>
              </div>

              {!selectedCustomerId && customerName.trim() && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                  <input
                    type="checkbox"
                    checked={autoSaveCustomer}
                    onChange={(e) => setAutoSaveCustomer(e.target.checked)}
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  <span>Simpan otomatis ke Master Pelanggan agar bisa dipilih lagi berikutnya</span>
                </label>
              )}
            </div>

            {/* 3. MULAI SEWA TANGGAL & JAM + HITUNGAN DURASI PERJAM 24 JAM + SELESAI SEWA */}
            <div style={{ 
              background: '#f8fafc', 
              padding: '14px', 
              borderRadius: '12px', 
              border: '1px solid #e2e8f0', 
              marginBottom: '16px' 
            }}>
              <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={15} />
                JADWAL & HITUNGAN DURASI PER JAM (BASIS 24 JAM)
              </div>

              {/* Baris Mulai & Selesai Sewa */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: '700' }}>
                    📅 Mulai Sewa (Tgl & Jam) *
                  </label>
                  <input
                    type="datetime-local"
                    className="form-control"
                    value={startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: '700' }}>
                    🏁 Selesai Sewa (Tgl & Jam) *
                  </label>
                  <input
                    type="datetime-local"
                    className="form-control"
                    value={endDate}
                    onChange={(e) => handleEndDateChange(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Input Durasi Jam & Chip Cepat */}
              <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed #cbd5e1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="form-label" style={{ marginBottom: 0, fontWeight: '700' }}>
                    ⏱️ Durasi Sewa (Total Jam):
                  </label>
                  <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--primary)' }}>
                    {getDurationSummary()}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="number"
                    min="1"
                    className="form-control"
                    value={durationHours}
                    onChange={(e) => handleDurationHoursChange(e.target.value)}
                    inputMode="numeric"
                    style={{ maxWidth: '110px', fontWeight: '700', fontSize: '15px' }}
                    required
                  />
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>Jam</span>

                  {/* Tombol Preset Cepat */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginLeft: 'auto' }}>
                    <button
                      type="button"
                      className={`btn btn-sm ${durationHours === 24 ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => handleDurationHoursChange(24)}
                      style={{ padding: '4px 8px', fontSize: '11px' }}
                    >
                      24 Jam (1 Hr)
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${durationHours === 48 ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => handleDurationHoursChange(48)}
                      style={{ padding: '4px 8px', fontSize: '11px' }}
                    >
                      48 Jam (2 Hr)
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${durationHours === 72 ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => handleDurationHoursChange(72)}
                      style={{ padding: '4px 8px', fontSize: '11px' }}
                    >
                      72 Jam (3 Hr)
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() => addHours(6)}
                      style={{ padding: '4px 8px', fontSize: '11px' }}
                      title="Tambah 6 Jam"
                    >
                      +6 Jam
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() => addHours(24)}
                      style={{ padding: '4px 8px', fontSize: '11px' }}
                      title="Tambah 24 Jam"
                    >
                      +24 Jam
                    </button>
                  </div>
                </div>

                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                  * Mengubah tanggal selesai sewa otomatis menghitung durasi jam, begitu pula sebaliknya.
                </div>
              </div>
            </div>

            {/* 4. Biaya Sewa Pokok */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Biaya Sewa Pokok (Rp) *</label>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {durationHours} Jam (Tarif dasar: {formatRupiah(rentalPrice)})
                </span>
              </div>
              <input
                type="number"
                className="form-control"
                value={rentalPrice}
                onChange={(e) => setRentalPrice(Number(e.target.value))}
                inputMode="numeric"
                required
              />
            </div>

            {/* 5. Biaya Tambahan Dinamis */}
            <div className="form-group" style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>
                  BIAYA TAMBAHAN (OPSIONAL)
                </span>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={addExtraRow}
                  style={{ gap: '4px' }}
                >
                  <Plus size={14} />
                  <span>Tambah Item</span>
                </button>
              </div>

              {extraCosts.map((extra) => (
                <div key={extra.id} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Nama (Helm/Jas Hujan/Antar)"
                    value={extra.label}
                    onChange={(e) => updateExtraRow(extra.id, 'label', e.target.value)}
                    style={{ flex: 2 }}
                  />
                  <input
                    type="number"
                    className="form-control"
                    placeholder="Nominal"
                    value={extra.amount || ''}
                    onChange={(e) => updateExtraRow(extra.id, 'amount', Number(e.target.value))}
                    inputMode="numeric"
                    style={{ flex: 1.5 }}
                  />
                  {extraCosts.length > 1 && (
                    <button
                      type="button"
                      className="btn-icon"
                      onClick={() => removeExtraRow(extra.id)}
                      style={{ color: 'var(--accent-rose)', borderColor: 'rgba(244, 63, 94, 0.3)' }}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* 6. Total & Pembayaran */}
            <div style={{ background: 'var(--bg-card)', padding: '14px', borderRadius: '12px', marginBottom: '16px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '17px', fontWeight: '800', marginBottom: '10px' }}>
                <span>Total Biaya:</span>
                <span style={{ color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>{formatRupiah(totalAmount)}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="form-label">Metode Bayar</label>
                  <select
                    className="form-control"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="Tunai">Tunai (Cash)</option>
                    <option value="Transfer Bank">Transfer Bank</option>
                    <option value="QRIS">QRIS</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Jumlah Uang Diterima</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder={String(totalAmount)}
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    inputMode="numeric"
                  />
                </div>
              </div>

              {changeAmount > 0 && (
                <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--accent-amber)', fontWeight: '700' }}>
                  Kembalian: {formatRupiah(changeAmount)}
                </div>
              )}
            </div>

            {/* 7. Catatan */}
            <div className="form-group">
              <label className="form-label">Catatan Tambahan</label>
              <textarea
                className="form-control"
                rows="2"
                placeholder="Catatan jaminan identitas, kondisi bodi motor..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Tombol Simpan & Batal */}
            <div style={{ display: 'flex', gap: '10px' }}>
              {editingTxId && (
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  onClick={handleCancelEdit}
                  disabled={isSubmitting}
                  style={{ flex: 1 }}
                >
                  <RotateCcw size={16} />
                  <span>Batal Edit</span>
                </button>
              )}
              <button 
                type="submit" 
                className="btn btn-primary btn-block" 
                disabled={isSubmitting}
                style={{ flex: 2, fontSize: '15px', opacity: isSubmitting ? 0.7 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="spin-animate" />
                    <span>{editingTxId ? 'Menyimpan Perubahan...' : 'Menyimpan Transaksi...'}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    <span>
                      {editingTxId 
                        ? 'Simpan Perubahan Transaksi' 
                        : 'Simpan Transaksi & Cetak Struk'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Bar Pencarian */}
      <div className="search-box">
        <Search className="search-icon" size={18} />
        <input
          type="text"
          className="search-input"
          placeholder="Cari no. transaksi, nama pelanggan, atau nopol..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Riwayat Transaksi */}
      <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)' }}>
          RIWAYAT TRANSAKSI {!isLoading && `(${filteredTransactions.length})`}
        </span>
        <Link 
          href="/transaksi" 
          style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}
        >
          Menu Transaksi &rarr;
        </Link>
      </div>

      {isLoading ? (
        <SkeletonList count={3} variant="transaction" />
      ) : filteredTransactions.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-dim)' }}>
          <Bike size={42} strokeWidth={1.5} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
          <p style={{ fontWeight: '600', fontSize: '14px' }}>Belum ada transaksi sewa</p>
          <p style={{ fontSize: '12px', marginTop: '4px' }}>Klik "Buat Transaksi Sewa Baru" untuk memulai</p>
        </div>
      ) : (
        filteredTransactions.map((tx) => {
          const hours = tx.durationHours || (Number(tx.durationDays) || 1) * 24;
          const st = getTransactionStatus(tx);
          return (
            <div
              key={tx.id}
              className="list-item"
              onClick={() => setSelectedTx(tx)}
            >
              <div className="item-top">
                <span className="item-id">{tx.id}</span>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span className={`badge ${st.badgeClass}`} style={{ fontSize: '10px', fontWeight: '700' }}>
                    {st.label}
                  </span>
                  <span className="badge" style={{ background: '#e0f2fe', color: '#0369a1', fontWeight: '700' }}>
                    {hours} Jam
                  </span>
                  <span className="badge badge-plate">{tx.nopol}</span>
                </div>
              </div>

              <div className="item-middle">
                <div className="item-title">{tx.customerName}</div>
                <div className="item-amount" style={{ color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                  {formatRupiah(tx.total)}
                </div>
              </div>

              {/* Tanggal & Jam Mulai s/d Selesai */}
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                <div>Mulai: {formatDateTime(tx.startDate)}</div>
                <div>Selesai: {formatDateTime(tx.endDate)}</div>
              </div>

              <div className="item-bottom">
                <span className="badge badge-success" style={{ fontSize: '10px' }}>
                  {tx.paymentMethod || 'Lunas'}
                </span>

                {/* Tombol Aksi Cepat: Edit, Cetak, Hapus */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn-icon"
                    style={{ width: '32px', height: '32px', color: 'var(--primary)', borderColor: 'var(--primary-border)' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartEdit(tx);
                    }}
                    title="Edit Transaksi Ini"
                  >
                    <Edit2 size={14} />
                  </button>

                  <button
                    type="button"
                    className="btn-icon"
                    style={{ width: '32px', height: '32px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setStrukTx(tx);
                    }}
                    title="Cetak Struk / Invoice"
                  >
                    <Printer size={14} />
                  </button>

                  <button
                    type="button"
                    className="btn-icon"
                    style={{ width: '32px', height: '32px', color: 'var(--accent-rose)', borderColor: 'rgba(244, 63, 94, 0.3)' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(tx.id);
                    }}
                    title="Hapus Transaksi"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })
      )}

      {/* Modal Detail */}
      {selectedTx && (
        <ModalDetail
          tx={selectedTx}
          onClose={() => setSelectedTx(null)}
          onEdit={(item) => handleStartEdit(item)}
          onPrint={(item) => {
            setSelectedTx(null);
            setStrukTx(item);
          }}
          onDelete={handleDelete}
        />
      )}

      {/* Modal Struk & Invoice */}
      {strukTx && settings && (
        <StrukModal
          tx={strukTx}
          settings={settings}
          onClose={() => setStrukTx(null)}
        />
      )}
    </div>
  );
}
