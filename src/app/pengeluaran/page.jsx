'use client';

import React, { useState, useEffect } from 'react';
import { 
  PlusCircle, 
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
  Download
} from 'lucide-react';
import { 
  fetchExpenses, 
  saveExpense, 
  deleteExpense, 
  fetchFleet, 
  formatRupiah, 
  formatDateTime 
} from '../../lib/storage';
import Toast from '../../components/Toast';

export default function PengeluaranPage() {
  const [expenses, setExpenses] = useState([]);
  const [fleet, setFleet] = useState([]);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);

  // Form State
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

  // Modal Zoom Bukti Nota
  const [zoomPhoto, setZoomPhoto] = useState(null);

  useEffect(() => {
    loadData();
    resetDateNow();
  }, []);

  const loadData = async () => {
    const [expList, fleetList] = await Promise.all([
      fetchExpenses(),
      fetchFleet()
    ]);
    setExpenses(expList);
    setFleet(fleetList);
  };

  const resetDateNow = () => {
    const now = new Date();
    setDate(now.toISOString().slice(0, 16));
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Unggah foto nota ke server (Lokal public/uploads atau Google Drive via .env)
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast('Ukuran file maksimal 10MB', 'error');
      return;
    }

    try {
      showToast('Mengunggah berkas foto nota...', 'info');
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.url) {
        setReceiptPhoto(data.url);
        if (data.gdriveFileId) setGdriveFileId(data.gdriveFileId);
        if (data.gdriveLink) setGdriveLink(data.gdriveLink);
        showToast(
          data.driver === 'google_drive'
            ? 'Foto nota berhasil diunggah ke Google Drive!'
            : 'Foto nota berhasil disimpan di penyimpanan lokal!'
        );
      } else {
        throw new Error(data.error || 'Gagal mengunggah foto');
      }
    } catch (err) {
      console.error('Upload error:', err);
      // Fallback base64 client jika offline
      const reader = new FileReader();
      reader.onload = (event) => {
        setReceiptPhoto(event.target.result);
        showToast('Foto nota dilampirkan (mode offline)!');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setIsVehicleRelated(true);
    setNopol('');
    setCategory('Servis & Sparepart');
    setAmount('');
    setDescription('');
    setReceiptPhoto(null);
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
    setGdriveFileId(exp.gdriveFileId || null);
    setGdriveLink(exp.gdriveLink || null);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Yakin ingin menghapus catatan pengeluaran ini?')) {
      await deleteExpense(id);
      await loadData();
      showToast('Pengeluaran berhasil dihapus', 'info');
    }
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

    const id = editingId || `EXP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const expData = {
      id,
      isVehicleRelated,
      nopol: isVehicleRelated ? nopol.toUpperCase().trim() : '',
      category,
      amount: Number(amount),
      description: description.trim(),
      date,
      receiptPhoto,
      gdriveFileId,
      gdriveLink,
      createdAt: new Date().toISOString()
    };

    await saveExpense(expData);
    await loadData();
    setShowForm(false);
    showToast(editingId ? 'Pengeluaran diperbarui di SQLite!' : 'Pengeluaran baru disimpan ke SQLite!');
  };

  const filteredExpenses = expenses.filter((e) => {
    const q = search.toLowerCase();
    return (
      (e.description || '').toLowerCase().includes(q) ||
      (e.nopol || '').toLowerCase().includes(q) ||
      (e.category || '').toLowerCase().includes(q)
    );
  });

  const totalExpenseFiltered = filteredExpenses.reduce((acc, c) => acc + (Number(c.amount) || 0), 0);

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ marginBottom: '16px' }}>
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={() => {
            if (showForm) {
              setShowForm(false);
            } else {
              handleOpenNew();
            }
          }}
          style={{ gap: '10px', fontSize: '15px' }}
        >
          {showForm ? <X size={20} /> : <PlusCircle size={20} />}
          <span>{showForm ? 'Tutup Formulir' : '+ Catat Pengeluaran Baru'}</span>
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
              {editingId ? <Edit3 size={18} color="var(--accent-amber)" /> : <PlusCircle size={18} color="var(--primary)" />}
              {editingId ? 'Edit Catatan Pengeluaran' : 'Form Pengeluaran Baru'}
            </span>
            <span className={`badge ${editingId ? 'badge-warning' : 'badge-success'}`}>
              {editingId ? 'Mode Edit' : 'SQLite Database'}
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
                Anda sedang mengubah catatan pengeluaran <strong>{editingId}</strong>. Klik <em>"Simpan Perubahan ke SQLite"</em> untuk memperbarui.
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
                <select
                  className="form-control"
                  value={nopol}
                  onChange={(e) => setNopol(e.target.value)}
                  style={{ marginBottom: '8px' }}
                >
                  <option value="">-- Pilih Armada Terdaftar --</option>
                  {fleet.map((m) => (
                    <option key={m.id} value={m.nopol}>
                      {m.nopol} - {m.brand} {m.model}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Atau masukkan nopol manual..."
                  value={nopol}
                  onChange={(e) => setNopol(e.target.value.toUpperCase())}
                  style={{ fontFamily: 'var(--font-mono)' }}
                  required={isVehicleRelated}
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

            {/* Lampiran Foto Nota & Kesiapan Google Drive */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Lampiran Foto Nota (Opsional)</label>
                <span className="badge badge-blue" style={{ fontSize: '10px', gap: '4px' }}>
                  <Cloud size={12} />
                  <span>Google Drive Ready</span>
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', gap: '6px' }}>
                  <Camera size={16} />
                  <span>Ambil Foto / Upload Nota</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style={{ display: 'none' }}
                    onChange={handlePhotoUpload}
                  />
                </label>

                {receiptPhoto && (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    style={{ color: 'var(--accent-rose)', borderColor: 'rgba(244, 63, 94, 0.4)' }}
                    onClick={() => {
                      setReceiptPhoto(null);
                      setGdriveFileId(null);
                      setGdriveLink(null);
                    }}
                  >
                    Hapus Foto
                  </button>
                )}
              </div>

              {receiptPhoto && (
                <div style={{ marginTop: '10px', position: 'relative', display: 'inline-block' }}>
                  <img
                    src={receiptPhoto}
                    alt="Pratinjau Bukti Nota"
                    style={{ maxWidth: '140px', maxHeight: '140px', borderRadius: '10px', border: '1px solid var(--border)', objectFit: 'cover', cursor: 'pointer' }}
                    onClick={() => setZoomPhoto(receiptPhoto)}
                  />
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Klik foto untuk memperbesar
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              {editingId && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setEditingId(null);
                    setShowForm(false);
                  }}
                  style={{ flex: 1 }}
                >
                  <RotateCcw size={16} />
                  <span>Batal Edit</span>
                </button>
              )}
              <button type="submit" className="btn btn-primary btn-block" style={{ flex: 2 }}>
                <CheckCircle2 size={18} />
                <span>{editingId ? 'Simpan Perubahan ke SQLite' : 'Simpan Pengeluaran ke SQLite'}</span>
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
          placeholder="Cari pengeluaran, keterangan, atau nopol..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Total Card */}
      <div className="card" style={{ padding: '12px 16px', background: 'rgba(244, 63, 94, 0.08)', borderColor: 'rgba(244, 63, 94, 0.3)', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--accent-rose)' }}>
              Total Pengeluaran Tercatat (SQLite)
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

      {/* Daftar Pengeluaran */}
      {filteredExpenses.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-dim)' }}>
          <AlertCircle size={40} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
          <p style={{ fontWeight: '600', fontSize: '14px' }}>Belum ada data pengeluaran</p>
          <p style={{ fontSize: '12px', marginTop: '4px' }}>Klik tombol "+ Catat Pengeluaran Baru" untuk mencatat</p>
        </div>
      ) : (
        filteredExpenses.map((exp) => (
          <div key={exp.id} className="list-item" style={{ cursor: 'default' }}>
            <div className="item-top">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                      onClick={() => setZoomPhoto({ url: exp.receiptPhoto, exp })}
                      title="Lihat Foto Bukti Nota"
                    >
                      <ImageIcon size={15} />
                    </button>
                    <button
                      type="button"
                      className="btn-icon"
                      style={{ width: '32px', height: '32px', color: 'var(--primary)', borderColor: 'var(--primary-border)' }}
                      onClick={() => handleDownloadReceipt(exp.receiptPhoto, exp.id)}
                      title="Unduh Berkas Foto Nota"
                    >
                      <Download size={15} />
                    </button>
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

      {/* Modal Zoom & Unduh Nota */}
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
              <button 
                type="button" 
                className="btn btn-primary" 
                style={{ flex: 2, gap: '6px' }}
                onClick={() => handleDownloadReceipt(typeof zoomPhoto === 'string' ? zoomPhoto : zoomPhoto.url, zoomPhoto.exp?.id || 'pengeluaran')}
              >
                <Download size={16} />
                <span>Unduh Foto Nota</span>
              </button>
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
    </div>
  );
}
