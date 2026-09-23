'use client';

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Trash2, 
  Edit3, 
  X, 
  Camera, 
  Image as ImageIcon, 
  Bike, 
  CheckCircle2, 
  Calendar,
  AlertCircle, 
  Cloud, 
  RotateCcw, 
  Download, 
  Loader2, 
  ExternalLink,
  FileCheck2,
  Plus,
  Printer,
  Eye,
  Send,
  Ban,
  ArrowDownCircle,
  TrendingDown,
  Info
} from 'lucide-react';
import { 
  fetchExpenses, 
  getExpenses, 
  saveExpense, 
  deleteExpense, 
  fetchBpkList,
  getBpkList,
  saveBpk,
  cancelBpk,
  deleteBpk,
  fetchTransactions,
  getTransactions,
  fetchFleet, 
  getFleet, 
  fetchSettings, 
  getSettings, 
  formatRupiah, 
  formatDateTime, 
  getGdriveReceiptUrl 
} from '../../lib/storage';
import { showToast, showConfirm } from '../../lib/sweetalert';
import { SkeletonList } from '../../components/Skeleton';
import SearchableSelect from '../../components/SearchableSelect';
import { exportExpensesToExcel, exportBpkToExcel } from '../../lib/excelExport';
import { exportBpkReportToPrintable } from '../../lib/pdfExport';
import ModalBpkForm from '../../components/ModalBpkForm';
import BpkDocumentModal from '../../components/BpkDocumentModal';

export default function PengeluaranPage() {
  const [activeSubtab, setActiveSubtab] = useState('operasional'); // 'operasional' | 'bpk'

  const [expenses, setExpenses] = useState(() => getExpenses());
  const [bpkList, setBpkList] = useState(() => getBpkList());
  const [transactions, setTransactions] = useState(() => getTransactions());
  const [fleet, setFleet] = useState(() => getFleet());
  const [settings, setSettings] = useState(() => getSettings());

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [bpkSearch, setBpkSearch] = useState('');
  const [bpkStatusFilter, setBpkStatusFilter] = useState('all');

  // Form Pengeluaran Reguler State
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isVehicleRelated, setIsVehicleRelated] = useState(true);
  const [nopol, setNopol] = useState('');
  const [category, setCategory] = useState('Servis & Sparepart');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [receiptPhoto, setReceiptPhoto] = useState(null);
  const [gdriveFileId, setGdriveFileId] = useState(null);
  const [gdriveLink, setGdriveLink] = useState(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(() => getExpenses().length === 0 && getBpkList().length === 0);

  // Modal State
  const [zoomPhoto, setZoomPhoto] = useState(null);
  const [showBpkForm, setShowBpkForm] = useState(false);
  const [editingBpk, setEditingBpk] = useState(null);
  const [viewingBpkDoc, setViewingBpkDoc] = useState(null);

  useEffect(() => {
    loadData();
    resetDateNow();
  }, []);

  const loadData = async () => {
    try {
      const [expList, bList, txList, fltList, sett] = await Promise.all([
        fetchExpenses().catch(() => getExpenses()),
        fetchBpkList().catch(() => getBpkList()),
        fetchTransactions().catch(() => getTransactions()),
        fetchFleet().catch(() => getFleet()),
        fetchSettings().catch(() => getSettings()),
      ]);

      if (Array.isArray(expList)) setExpenses(expList);
      if (Array.isArray(bList)) setBpkList(bList);
      if (Array.isArray(txList)) setTransactions(txList);
      if (Array.isArray(fltList)) setFleet(fltList);
      if (sett) setSettings(sett);

      setIsLoading(false);
    } catch {
      setIsLoading(false);
    }
  };

  const resetDateNow = () => {
    const now = new Date();
    setDate(now.toISOString().slice(0, 16));
  };

  // ------------------- PENGELUARAN REGULER HANDLERS -------------------
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast('Ukuran file maksimal 10MB', 'error');
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    showToast('Foto nota dipilih. Akan diunggah saat formulir disimpan.', 'info');
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setIsVehicleRelated(true);
    setNopol('');
    setCategory('Servis & Sparepart');
    setAmount('');
    setDescription('');
    setReceiptPhoto(null);
    setSelectedFile(null);
    setPreviewUrl(null);
    setGdriveFileId(null);
    setGdriveLink(null);
    resetDateNow();
    setShowForm(true);
  };

  const handleEdit = (exp) => {
    setEditingId(exp.id);
    setIsVehicleRelated(Boolean(exp.isVehicleRelated));
    setNopol(exp.nopol || '');
    setCategory(exp.category || 'Lain-lain');
    setAmount(String(exp.amount));
    setDescription(exp.description || '');
    setDate(exp.date ? exp.date.slice(0, 16) : new Date().toISOString().slice(0, 16));
    setReceiptPhoto(exp.receiptPhoto || null);
    setSelectedFile(null);
    setPreviewUrl(null);
    setGdriveFileId(exp.gdriveFileId || null);
    setGdriveLink(exp.gdriveLink || null);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    const confirmed = await showConfirm({
      title: 'Hapus Catatan Pengeluaran?',
      text: 'Catatan pengeluaran ini akan dihapus dari pembukuan aktif.',
      confirmButtonText: 'Ya, Hapus Pengeluaran',
      cancelButtonText: 'Batal',
      icon: 'warning',
      isDanger: true,
    });

    if (confirmed) {
      await deleteExpense(id);
      await loadData();
      showToast('Pengeluaran berhasil dihapus', 'info');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isVehicleRelated && !nopol.trim()) {
      showToast('Nomor polisi harus diisi jika terkait kendaraan!', 'error');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      showToast('Jumlah biaya pengeluaran tidak boleh kosong!', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const id = editingId || null;
      const expData = {
        id,
        isVehicleRelated,
        nopol: isVehicleRelated ? nopol.toUpperCase().trim() : '',
        category,
        amount: Number(amount),
        description: description.trim(),
        date,
        receiptPhoto: selectedFile ? null : receiptPhoto,
        gdriveFileId,
        gdriveLink,
        createdAt: new Date().toISOString()
      };

      await saveExpense(expData, selectedFile);
      await loadData();
      setShowForm(false);
      showToast(
        editingId
          ? 'Pengeluaran & foto nota berhasil diperbarui!'
          : 'Pengeluaran baru & foto nota berhasil disimpan!',
        'success'
      );
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (err) {
      console.error('Submit error:', err);
      showToast(err.message || 'Gagal menyimpan pengeluaran', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ------------------- BPK HANDLERS -------------------
  const handleOpenNewBpk = () => {
    setEditingBpk(null);
    setShowBpkForm(true);
  };

  const handleEditBpk = (item) => {
    setEditingBpk(item);
    setShowBpkForm(true);
  };

  const handleSaveBpk = async (payload) => {
    await saveBpk(payload);
    await loadData();
    setShowBpkForm(false);
    showToast(
      editingBpk ? 'Bukti Pengeluaran Kas (BPK) berhasil diperbarui!' : 'Bukti Pengeluaran Kas (BPK) berhasil dibuat & dicatat ke kas!',
      'success'
    );
  };

  const handleCancelBpk = async (b) => {
    const confirmed = await showConfirm({
      title: 'Batalkan Bukti Kas (BPK)?',
      text: `BPK ${b.id} akan diubah statusnya menjadi Dibatalkan. Pengeluaran kas terkait akan dilepas dari total pengeluaran, namun riwayat BPK tetap tersimpan untuk arsip administrasi.`,
      confirmButtonText: 'Ya, Batalkan BPK',
      cancelButtonText: 'Kembali',
      icon: 'warning',
      isDanger: true,
    });

    if (confirmed) {
      await cancelBpk(b.id, 'Dibatalkan oleh petugas kasir');
      await loadData();
      showToast(`BPK ${b.id} telah dibatalkan`, 'info');
    }
  };

  const handleDeleteBpk = async (b) => {
    // Jika berstatus sudah dibayar, tawarkan batalkan terlebih dahulu
    if (b.status === 'Sudah Dibayar') {
      const askAction = await showConfirm({
        title: 'Pengeluaran Sudah Dibayar',
        text: 'BPK ini berstatus Sudah Dibayar. Lebih baik gunakan "Batalkan" agar bukti tetap tersimpan dalam jejak administrasi. Apakah Anda yakin ingin membatalkannya sekarang?',
        confirmButtonText: 'Batalkan BPK',
        cancelButtonText: 'Kembali',
        icon: 'question',
      });
      if (askAction) {
        await cancelBpk(b.id, 'Dibatalkan oleh kasir');
        await loadData();
        showToast('BPK berhasil dibatalkan', 'info');
      }
      return;
    }

    const confirmed = await showConfirm({
      title: 'Hapus BPK Permanen?',
      text: `Data Bukti Pengeluaran Kas ${b.id} akan dihapus dari sistem.`,
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
      icon: 'warning',
      isDanger: true,
    });

    if (confirmed) {
      await deleteBpk(b.id);
      await loadData();
      showToast('BPK berhasil dihapus', 'info');
    }
  };

  // Filtered Pengeluaran Reguler
  const filteredExpenses = expenses.filter((e) => {
    const q = search.toLowerCase();
    return (
      (e.description || '').toLowerCase().includes(q) ||
      (e.nopol || '').toLowerCase().includes(q) ||
      (e.category || '').toLowerCase().includes(q)
    );
  });
  const totalExpenseFiltered = filteredExpenses.reduce((acc, c) => acc + (Number(c.amount) || 0), 0);

  // Filtered BPK
  const filteredBpk = bpkList.filter((b) => {
    if (bpkStatusFilter !== 'all' && b.status !== bpkStatusFilter) return false;
    const q = bpkSearch.toLowerCase();
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

  const totalBpkPaid = filteredBpk
    .filter((b) => b.status === 'Sudah Dibayar')
    .reduce((acc, b) => acc + (Number(b.amount) || 0), 0);

  const totalCustFeePaid = filteredBpk
    .filter((b) => b.status === 'Sudah Dibayar')
    .reduce((acc, b) => acc + (Number(b.customerFee) || 0), 0);

  const totalBpkMargin = totalCustFeePaid > 0 ? (totalCustFeePaid - totalBpkPaid) : 0;

  return (
    <div>
      {/* HEADER NAVIGASI SUBTAB */}
      <div className="tab-group" style={{ marginBottom: '16px' }}>
        <button
          type="button"
          className={`tab-btn ${activeSubtab === 'operasional' ? 'active' : ''}`}
          onClick={() => setActiveSubtab('operasional')}
          style={{ fontSize: '13px', fontWeight: '700' }}
        >
          <ArrowDownCircle size={15} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} />
          Pengeluaran Operasional & Servis ({expenses.length})
        </button>

        <button
          type="button"
          className={`tab-btn ${activeSubtab === 'bpk' ? 'active' : ''}`}
          onClick={() => setActiveSubtab('bpk')}
          style={{ fontSize: '13px', fontWeight: '700' }}
        >
          <FileCheck2 size={15} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }} />
          Bukti Pengeluaran Kas (BPK) ({bpkList.length})
        </button>
      </div>

      {/* ======================================================== */}
      {/* SUBTAB 1: PENGELUARAN OPERASIONAL & SERVIS              */}
      {/* ======================================================== */}
      {activeSubtab === 'operasional' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px', marginBottom: '16px' }}>
            <button
              type="button"
              disabled={isSubmitting}
              className="btn btn-primary"
              onClick={() => {
                if (showForm) {
                  setShowForm(false);
                } else {
                  handleOpenNew();
                }
              }}
              style={{ gap: '10px', fontSize: '14px', width: '100%' }}
            >
              {showForm && <X size={18} />}
              <span>{showForm ? 'Tutup Formulir' : 'Catat Pengeluaran Baru'}</span>
            </button>

            <button
              type="button"
              className="btn btn-outline"
              onClick={() => exportExpensesToExcel(filteredExpenses, settings)}
              style={{ fontSize: '13px', fontWeight: 700, padding: '0 16px', background: '#ffffff' }}
              title="Ekspor catatan pengeluaran ke file Excel (.xlsx)"
            >
              Ekspor Excel
            </button>
          </div>

          {showForm && (
            <div 
              className="card" 
              style={{ 
                borderColor: editingId ? 'var(--accent-amber)' : 'var(--primary-border)', 
                background: '#ffffff', 
                marginBottom: '24px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.06)'
              }}
            >
              <div className="card-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '16px' }}>
                <span className="card-title">
                  {editingId ? <Edit3 size={18} color="var(--accent-amber)" /> : <Calendar size={18} color="var(--primary)" />}
                  {editingId ? 'Edit Catatan Pengeluaran' : 'Form Pengeluaran Baru'}
                </span>
                <span className={`badge ${editingId ? 'badge-warning' : 'badge-success'}`}>
                  {editingId ? 'Mode Edit' : 'Database Aktif'}
                </span>
              </div>

              {editingId && (
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
                    Anda sedang mengubah catatan pengeluaran <strong>{editingId}</strong>. Klik <em>"Simpan Perubahan"</em> untuk memperbarui.
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="form-group" style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '700' }}>
                    <input
                      type="checkbox"
                      checked={isVehicleRelated}
                      onChange={(e) => setIsVehicleRelated(e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                    />
                    <span>Pengeluaran Berkaitan dengan Unit Kendaraan</span>
                  </label>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', marginLeft: '28px' }}>
                    {isVehicleRelated 
                      ? 'Nomor polisi akan dicatat untuk melacak riwayat biaya unit motor ini'
                      : 'Pengeluaran operasional toko dicatat tanpa nomor polisi'}
                  </div>
                </div>

                {isVehicleRelated && (
                  <div className="form-group">
                    <label className="form-label">Nomor Polisi Kendaraan *</label>
                    <SearchableSelect
                      options={fleet}
                      value={nopol}
                      valueKey="nopol"
                      displayKey="nopol"
                      secondaryKey="model"
                      placeholder="Cari nopol atau ketik nopol baru..."
                      searchPlaceholder="Ketik nopol / merk / tipe..."
                      allowCustom={true}
                      customLabel="Gunakan nopol baru"
                      onChange={(val, item) => {
                        const plate = (item?.nopol || val || '').toUpperCase().trim();
                        setNopol(plate);
                      }}
                    />
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label className="form-label">Kategori</label>
                    <select
                      className="form-control"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option value="Servis & Sparepart">Servis & Sparepart</option>
                      <option value="Ganti Oli">Ganti Oli</option>
                      <option value="BBM / Bensin">BBM / Bensin</option>
                      <option value="Cuci Motor">Cuci Motor</option>
                      <option value="Biaya Antar / Jemput">Biaya Antar / Jemput</option>
                      <option value="Operasional Toko">Operasional Toko</option>
                      <option value="Sewa & Listrik">Sewa & Listrik</option>
                      <option value="Lain-lain">Lain-lain</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Jumlah Biaya (Rp) *</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Contoh: 75000"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      inputMode="numeric"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Tanggal Pengeluaran (Tercatat Otomatis)</label>
                  <input
                    type="datetime-local"
                    className="form-control"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Keterangan / Rincian Pengeluaran *</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    placeholder="Rincian suku cadang, bengkel, toko tempat beli..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                </div>

                {/* Lampiran Foto Nota */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>Lampiran Foto Nota (Opsional)</label>
                    <span className="badge badge-blue" style={{ fontSize: '10px', gap: '4px' }}>
                      <Cloud size={12} />
                      <span>Google Drive Ready</span>
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <label className="btn btn-secondary btn-sm" style={{ cursor: isSubmitting ? 'not-allowed' : 'pointer', gap: '6px', opacity: isSubmitting ? 0.6 : 1 }}>
                      <Camera size={16} />
                      <span>{selectedFile || receiptPhoto ? 'Ganti Foto Nota' : 'Pilih Foto / Ambil Gambar'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        style={{ display: 'none' }}
                        disabled={isSubmitting}
                        onChange={handlePhotoSelect}
                      />
                    </label>

                    {(previewUrl || receiptPhoto) && (
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        disabled={isSubmitting}
                        style={{ color: 'var(--accent-rose)', borderColor: 'rgba(244, 63, 94, 0.4)' }}
                        onClick={() => {
                          setSelectedFile(null);
                          setPreviewUrl(null);
                          setReceiptPhoto(null);
                          setGdriveFileId(null);
                          setGdriveLink(null);
                        }}
                      >
                        Hapus Foto
                      </button>
                    )}
                  </div>

                  {(previewUrl || receiptPhoto) && (
                    <div style={{ marginTop: '10px', position: 'relative', display: 'inline-block' }}>
                      <img
                        src={previewUrl || receiptPhoto}
                        alt="Pratinjau Bukti Nota"
                        style={{ maxWidth: '140px', maxHeight: '140px', borderRadius: '10px', border: '1px solid var(--border)', objectFit: 'cover', cursor: 'pointer' }}
                        onClick={() => setZoomPhoto(previewUrl || receiptPhoto)}
                      />
                      <div style={{ fontSize: '11px', color: selectedFile ? '#0284c7' : 'var(--text-muted)', marginTop: '2px', fontWeight: selectedFile ? '700' : 'normal' }}>
                        {selectedFile ? '★ Foto baru (diunggah saat Anda klik Simpan)' : 'Foto nota tersimpan'} (Klik untuk perbesar)
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                  {editingId && (
                    <button
                      type="button"
                      className="btn btn-outline"
                      disabled={isSubmitting}
                      onClick={() => {
                        setEditingId(null);
                        setSelectedFile(null);
                        setPreviewUrl(null);
                        setShowForm(false);
                      }}
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
                    style={{ flex: 2, opacity: isSubmitting ? 0.7 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={18} className="spin-animate" />
                        <span>{editingId ? 'Menyimpan Perubahan...' : 'Menyimpan & Mengunggah Nota...'}</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={18} />
                        <span>{editingId ? 'Simpan Perubahan' : 'Simpan Pengeluaran'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Bar Pencarian Pengeluaran */}
          <div className="search-box">
            <Search className="search-icon" size={18} />
            <input
              type="text"
              className="search-input"
              placeholder="Cari pengeluaran operasional, keterangan, atau nopol..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Total Card */}
          <div className="card" style={{ padding: '12px 16px', background: 'rgba(244, 63, 94, 0.08)', borderColor: 'rgba(244, 63, 94, 0.3)', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--accent-rose)' }}>
                  Total Pengeluaran Kas Tercatat
                </div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--accent-rose)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                  {formatRupiah(totalExpenseFiltered)}
                </div>
              </div>
              <span className="badge badge-danger">
                {filteredExpenses.length} Item
              </span>
            </div>
          </div>

          {/* Daftar Pengeluaran Reguler */}
          {isLoading ? (
            <SkeletonList count={3} variant="expense" />
          ) : filteredExpenses.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-dim)' }}>
              <AlertCircle size={40} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <p style={{ fontWeight: '600', fontSize: '14px' }}>Belum ada data pengeluaran</p>
              <p style={{ fontSize: '12px', marginTop: '4px' }}>Klik tombol "Catat Pengeluaran Baru" untuk mencatat</p>
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
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Operasional Toko</span>
                    )}
                  </div>
                  <div className="item-amount" style={{ color: 'var(--accent-rose)', fontFamily: 'var(--font-mono)' }}>
                    {formatRupiah(exp.amount)}
                  </div>
                </div>

                <div className="item-middle">
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-main)', marginTop: '4px' }}>
                    {exp.description}
                  </div>
                </div>

                <div className="item-bottom" style={{ marginTop: '10px' }}>
                  <span>{formatDateTime(exp.date)}</span>
                  
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {exp.receiptPhoto && (
                      <>
                        <button
                          type="button"
                          className="btn-icon"
                          style={{ width: '32px', height: '32px', color: 'var(--accent-blue)', borderColor: 'rgba(59, 130, 246, 0.4)' }}
                          onClick={() => setZoomPhoto({ url: getGdriveReceiptUrl(exp) || exp.receiptPhoto, exp })}
                          title="Lihat Foto Bukti Nota"
                        >
                          <ImageIcon size={15} />
                        </button>
                        <a
                          href={getGdriveReceiptUrl(exp) || exp.receiptPhoto}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-icon"
                          style={{ width: '32px', height: '32px', color: 'var(--primary)', borderColor: 'var(--primary-border)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
                          title="Buka Berkas di Google Drive"
                        >
                          <ExternalLink size={15} />
                        </a>
                      </>
                    )}

                    <button
                      type="button"
                      className="btn-icon"
                      style={{ width: '32px', height: '32px', color: 'var(--accent-amber)' }}
                      onClick={() => handleEdit(exp)}
                      title="Edit Pengeluaran"
                    >
                      <Edit3 size={15} />
                    </button>

                    <button
                      type="button"
                      className="btn-icon"
                      style={{ width: '32px', height: '32px', color: 'var(--accent-rose)' }}
                      onClick={() => handleDelete(exp.id)}
                      title="Hapus Pengeluaran"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* SUBTAB 2: BUKTI PENGELUARAN KAS (BPK)                   */}
      {/* ======================================================== */}
      {activeSubtab === 'bpk' && (
        <div>
          {/* Action Bar BPK */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleOpenNewBpk}
              style={{ gap: '8px', fontSize: '13px', fontWeight: '700' }}
            >
              <Plus size={16} />
              <span>Tambah BPK</span>
            </button>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => exportBpkToExcel(filteredBpk, settings)}
                style={{ fontWeight: '700', background: '#ffffff', gap: '6px' }}
                title="Ekspor daftar BPK ke file Excel (.xlsx)"
              >
                <Download size={14} />
                <span>Ekspor Excel</span>
              </button>

              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => exportBpkReportToPrintable({ settings, periodLabel: 'Semua Periode', bpkList: filteredBpk })}
                style={{ fontWeight: '700', background: '#ffffff', gap: '6px' }}
                title="Cetak seluruh rekap BPK"
              >
                <Printer size={14} />
                <span>Cetak Rekap</span>
              </button>
            </div>
          </div>

          {/* Bar Filter Status & Search BPK */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', marginBottom: '12px' }}>
            <div className="search-box" style={{ margin: 0 }}>
              <Search className="search-icon" size={16} />
              <input
                type="text"
                className="search-input"
                placeholder="Cari BPK (No. BPK, penerima, nopol, TRX)..."
                value={bpkSearch}
                onChange={(e) => setBpkSearch(e.target.value)}
              />
            </div>

            <select
              className="form-control"
              value={bpkStatusFilter}
              onChange={(e) => setBpkStatusFilter(e.target.value)}
              style={{ fontSize: '12px', fontWeight: '600', width: 'auto', minWidth: '140px' }}
            >
              <option value="all">Semua Status</option>
              <option value="Sudah Dibayar">Sudah Dibayar</option>
              <option value="Draft">Draft</option>
              <option value="Dibatalkan">Dibatalkan</option>
            </select>
          </div>

          {/* Kartu Ringkasan BPK */}
          <div className="stat-card-grid" style={{ marginBottom: '16px' }}>
            <div className="stat-card expense">
              <div className="stat-label">Total BPK Dibayarkan (Kas Keluar)</div>
              <div className="stat-val" style={{ color: 'var(--accent-rose)', fontFamily: 'var(--font-mono)' }}>
                {formatRupiah(totalBpkPaid)}
              </div>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Status: Sudah Dibayar
              </span>
            </div>

            <div className="stat-card blue">
              <div className="stat-label">Jumlah Dokumen BPK</div>
              <div className="stat-val" style={{ color: '#2563eb', fontFamily: 'var(--font-mono)' }}>
                {filteredBpk.length} <span style={{ fontSize: '13px', fontWeight: 'normal' }}>Item</span>
              </div>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {filteredBpk.filter(b => b.status === 'Sudah Dibayar').length} Lunas &bull; {filteredBpk.filter(b => b.status === 'Dibatalkan').length} Dibatalkan
              </span>
            </div>

            <div className="stat-card profit">
              <div className="stat-label">Analisis Selisih Biaya Antar</div>
              <div className="stat-val" style={{ color: '#059669', fontFamily: 'var(--font-mono)' }}>
                {formatRupiah(totalBpkMargin)}
              </div>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Biaya Pelanggan: {formatRupiah(totalCustFeePaid)}
              </span>
            </div>
          </div>

          {/* Daftar BPK */}
          {isLoading ? (
            <SkeletonList count={3} variant="expense" />
          ) : filteredBpk.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-dim)' }}>
              <FileCheck2 size={40} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <p style={{ fontWeight: '600', fontSize: '14px' }}>Belum ada Bukti Pengeluaran Kas (BPK)</p>
              <p style={{ fontSize: '12px', marginTop: '4px' }}>Klik tombol "Tambah BPK" untuk mencatat pengeluaran resmi kas.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredBpk.map((b) => {
                const isPaid = b.status === 'Sudah Dibayar';
                const isCancelled = b.status === 'Dibatalkan';
                const isDraft = b.status === 'Draft';

                return (
                  <div 
                    key={b.id} 
                    className="card" 
                    style={{ 
                      padding: '14px 16px', 
                      background: isCancelled ? '#fff5f5' : '#ffffff',
                      borderColor: isCancelled ? '#fecaca' : 'var(--border)',
                      opacity: isCancelled ? 0.85 : 1
                    }}
                  >
                    {/* Header Baris Item */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ 
                          fontFamily: 'monospace', 
                          fontWeight: '800', 
                          fontSize: '13px', 
                          color: isCancelled ? '#991b1b' : 'var(--primary)',
                          background: isCancelled ? '#fee2e2' : 'rgba(16, 185, 129, 0.1)',
                          border: `1px solid ${isCancelled ? '#fca5a5' : 'rgba(16, 185, 129, 0.3)'}`,
                          padding: '2px 8px', 
                          borderRadius: '6px' 
                        }}>
                          {b.id}
                        </span>

                        <span style={{ 
                          fontSize: '11px', 
                          fontWeight: '700',
                          padding: '2px 8px', 
                          borderRadius: '12px',
                          background: isPaid ? '#dcfce7' : (isCancelled ? '#fee2e2' : '#f1f5f9'),
                          color: isPaid ? '#166534' : (isCancelled ? '#991b1b' : '#475569')
                        }}>
                          {b.status}
                        </span>

                        <span className="badge" style={{ background: '#f1f5f9', color: '#475569', fontSize: '11px' }}>
                          {b.category} {b.categoryOther ? `(${b.categoryOther})` : ''}
                        </span>

                        <span className="badge badge-success" style={{ fontSize: '10px' }}>
                          {b.paymentMethod || 'Tunai'}
                        </span>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '16px', fontWeight: '900', color: isCancelled ? '#94a3b8' : 'var(--accent-rose)', fontFamily: 'monospace' }}>
                          {formatRupiah(b.amount)}
                        </div>
                      </div>
                    </div>

                    {/* Penerima & Keperluan */}
                    <div style={{ fontSize: '13px', color: '#1e293b', marginBottom: '6px' }}>
                      Dibayarkan kepada: <strong style={{ color: '#0f172a' }}>{b.recipientName}</strong> {b.recipientRole ? <span style={{ color: '#64748b' }}>({b.recipientRole})</span> : ''}
                    </div>

                    {/* Rincian Transaksi / Armada jika Terkait */}
                    {b.isRentalRelated && b.transactionId && (
                      <div style={{ 
                        background: '#f8fafc', 
                        border: '1px solid #e2e8f0', 
                        borderRadius: '8px', 
                        padding: '8px 12px', 
                        fontSize: '11.5px', 
                        marginBottom: '8px',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                        gap: '6px'
                      }}>
                        <div>
                          <span style={{ color: '#64748b' }}>No. Transaksi: </span>
                          <strong style={{ fontFamily: 'monospace', color: '#0284c7' }}>{b.transactionId}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b' }}>No. Polisi: </span>
                          <strong>{b.nopol || '-'}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b' }}>Pelanggan: </span>
                          <span>{b.customerName || '-'}</span>
                        </div>
                        {Number(b.customerFee) > 0 && (
                          <div style={{ color: '#166534', fontWeight: '700' }}>
                            Biaya Pelanggan: {formatRupiah(b.customerFee)}
                          </div>
                        )}
                      </div>
                    )}

                    {b.description && (
                      <div style={{ fontSize: '12px', color: '#475569', fontStyle: 'italic', marginBottom: '8px' }}>
                        "{b.description}"
                      </div>
                    )}

                    {/* Footer Item: Tanggal & Action Buttons */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '8px', flexWrap: 'wrap', gap: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                        {formatDateTime(b.date)}
                      </span>

                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {/* Tombol Lihat Dokumen */}
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{ padding: '3px 9px', fontSize: '11px', gap: '4px', color: '#0284c7', borderColor: '#bae6fd' }}
                          onClick={() => setViewingBpkDoc(b)}
                          title="Buka Dokumen Resmi BPK"
                        >
                          <Eye size={13} />
                          <span>Lihat</span>
                        </button>

                        {/* Tombol Cetak / PDF */}
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{ padding: '3px 9px', fontSize: '11px', gap: '4px', color: 'var(--primary)', borderColor: 'var(--primary-border)' }}
                          onClick={() => setViewingBpkDoc(b)}
                          title="Cetak atau Unduh Dokumen BPK"
                        >
                          <Printer size={13} />
                          <span>Cetak/PDF</span>
                        </button>

                        {/* Tombol Edit */}
                        {!isCancelled && (
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            style={{ padding: '3px 9px', fontSize: '11px', gap: '4px', color: 'var(--accent-amber)', borderColor: '#fde68a' }}
                            onClick={() => handleEditBpk(b)}
                            title="Edit Data BPK"
                          >
                            <Edit3 size={13} />
                            <span>Edit</span>
                          </button>
                        )}

                        {/* Tombol Batalkan / Hapus */}
                        {isPaid ? (
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            style={{ padding: '3px 9px', fontSize: '11px', gap: '4px', color: 'var(--accent-rose)', borderColor: '#fecdd3' }}
                            onClick={() => handleCancelBpk(b)}
                            title="Batalkan BPK (Lepas dari Kas)"
                          >
                            <Ban size={13} />
                            <span>Batalkan</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            style={{ padding: '3px 9px', fontSize: '11px', gap: '4px', color: 'var(--accent-rose)', borderColor: '#fecdd3' }}
                            onClick={() => handleDeleteBpk(b)}
                            title="Hapus BPK"
                          >
                            <Trash2 size={13} />
                            <span>Hapus</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal Zoom & Unduh Nota Pengeluaran Reguler */}
      {zoomPhoto && (
        <div className="modal-overlay" onClick={() => setZoomPhoto(null)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div>
                <div className="modal-title">Lampiran Foto Bukti Nota</div>
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
                alt="Lampiran Nota"
                style={{ width: '100%', maxHeight: '65vh', objectFit: 'contain', borderRadius: '12px', border: '1px solid var(--border)', background: '#f8fafc' }}
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

      {/* Modal Form BPK */}
      {showBpkForm && (
        <ModalBpkForm
          initialData={editingBpk}
          transactions={transactions}
          fleet={fleet}
          onClose={() => {
            setShowBpkForm(false);
            setEditingBpk(null);
          }}
          onSaved={handleSaveBpk}
        />
      )}

      {/* Modal Dokumen Resmi BPK */}
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
