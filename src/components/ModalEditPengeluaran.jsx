'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Lock, 
  CheckCircle2, 
  Loader2, 
  Camera, 
  AlertCircle, 
  RotateCcw,
  Calendar,
  Image as ImageIcon
} from 'lucide-react';
import { saveExpense, getFleet, fetchFleet } from '../lib/storage';
import { showToast } from '../lib/sweetalert';
import SearchableSelect from './SearchableSelect';

export default function ModalEditPengeluaran({ exp, onClose, onSaveSuccess }) {
  const [fleet, setFleet] = useState(() => getFleet());
  const [isVehicleRelated, setIsVehicleRelated] = useState(Boolean(exp?.isVehicleRelated));
  const [nopol, setNopol] = useState(exp?.nopol || '');
  const [category, setCategory] = useState(exp?.category || 'Servis & Sparepart');
  const [amount, setAmount] = useState(String(exp?.amount || ''));
  const [description, setDescription] = useState(exp?.description || '');
  const [date, setDate] = useState(exp?.date ? exp.date.slice(0, 16) : new Date().toISOString().slice(0, 16));
  const [receiptPhoto, setReceiptPhoto] = useState(exp?.receiptPhoto || null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchFleet().then((list) => {
      if (Array.isArray(list)) setFleet(list);
    }).catch(() => {});
  }, []);

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
    showToast('Foto nota baru dipilih. Klik "Simpan Perubahan" untuk mengunggah.', 'info');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isVehicleRelated && !nopol.trim()) {
      showToast('Nomor polisi harus diisi jika berkaitan dengan kendaraan!', 'error');
      return;
    }

    if (!amount || Number(amount) <= 0) {
      showToast('Jumlah biaya pengeluaran harus lebih dari 0!', 'error');
      return;
    }

    if (!description.trim()) {
      showToast('Keterangan pengeluaran tidak boleh kosong!', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      // Nomor transaksi (ID) tetap sama dan tidak boleh diubah
      const updatedPayload = {
        id: exp.id,
        isVehicleRelated,
        nopol: isVehicleRelated ? nopol.toUpperCase().trim() : '',
        category,
        amount: Number(amount),
        description: description.trim(),
        date,
        receiptPhoto: selectedFile ? null : receiptPhoto,
        gdriveFileId: selectedFile ? null : exp.gdriveFileId,
        gdriveLink: selectedFile ? null : exp.gdriveLink,
      };

      const saved = await saveExpense(updatedPayload, selectedFile);
      showToast(`Transaksi pengeluaran ${exp.id} berhasil diperbarui!`, 'success');
      if (onSaveSuccess) {
        onSaveSuccess(saved || updatedPayload);
      }
      onClose();
    } catch (err) {
      console.error('Update expense error:', err);
      showToast(err.message || 'Gagal memperbarui pengeluaran', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-sheet" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '540px', background: '#ffffff', borderRadius: '16px', overflow: 'hidden' }}
      >
        {/* Header Modal */}
        <div className="modal-header" style={{ borderBottom: '1px solid var(--border)', padding: '16px 20px' }}>
          <div>
            <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: '800' }}>
              <span>Edit Transaksi Pengeluaran</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Ubah rincian pengeluaran tanpa mengubah nomor transaksi
            </div>
          </div>
          <button type="button" className="btn-icon" onClick={onClose} disabled={isSubmitting}>
            <X size={18} />
          </button>
        </div>

        {/* Body Modal */}
        <div className="modal-body" style={{ padding: '20px', maxHeight: '78vh', overflowY: 'auto' }}>
          <form onSubmit={handleSubmit}>
            {/* Nomor Transaksi Pengeluaran (Read-only / Terkunci) */}
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700' }}>
                <Lock size={14} color="var(--primary)" />
                <span>Nomor Transaksi Pengeluaran (Permanen)</span>
              </label>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                background: '#f1f5f9', 
                border: '1px solid #cbd5e1', 
                borderRadius: '8px', 
                padding: '10px 14px' 
              }}>
                <span style={{ 
                  fontFamily: 'var(--font-mono)', 
                  fontWeight: '800', 
                  fontSize: '15px', 
                  color: 'var(--primary)',
                  letterSpacing: '0.5px' 
                }}>
                  {exp.id}
                </span>
                <span className="badge badge-success" style={{ marginLeft: 'auto', fontSize: '11px' }}>
                  Terkunci
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                * Nomor transaksi pengeluaran bersifat permanen dan tidak dapat diubah demi keteraturan administrasi.
              </div>
            </div>

            {/* Tanggal Pengeluaran */}
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ fontWeight: '700' }}>Tanggal & Waktu Pengeluaran *</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="datetime-local"
                  className="form-control"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Checkbox Terkait Kendaraan */}
            <div className="form-group" style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: '10px', marginBottom: '16px' }}>
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
                  ? 'Catat nomor polisi armada agar riwayat perawatan unit terlacak'
                  : 'Pengeluaran operasional toko dicatat tanpa nomor polisi'}
              </div>
            </div>

            {/* Nomor Polisi Kendaraan (jika dicentang) */}
            {isVehicleRelated && (
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontWeight: '700' }}>Nomor Polisi Kendaraan *</label>
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

            {/* Kategori & Jumlah Biaya */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: '700' }}>Kategori Pengeluaran</label>
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

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: '700' }}>Jumlah Biaya (Rp) *</label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="Contoh: 150000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  inputMode="numeric"
                  required
                />
              </div>
            </div>

            {/* Keterangan */}
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ fontWeight: '700' }}>Keterangan / Rincian Pengeluaran *</label>
              <textarea
                className="form-control"
                rows="3"
                placeholder="Rincian suku cadang, bengkel, toko tempat beli..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            {/* Lampiran Foto Bukti Nota */}
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label" style={{ fontWeight: '700', marginBottom: '6px' }}>
                Lampiran Bukti Nota (Opsional)
              </label>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <label className="btn btn-secondary btn-sm" style={{ cursor: isSubmitting ? 'not-allowed' : 'pointer', gap: '6px' }}>
                  <Camera size={15} />
                  <span>{selectedFile || receiptPhoto ? 'Ganti Foto Nota' : 'Pilih Foto Nota'}</span>
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
                    }}
                  >
                    Hapus Foto
                  </button>
                )}
              </div>

              {(previewUrl || receiptPhoto) && (
                <div style={{ marginTop: '10px' }}>
                  <img
                    src={previewUrl || receiptPhoto}
                    alt="Nota Pengeluaran"
                    style={{ maxWidth: '120px', maxHeight: '120px', borderRadius: '8px', border: '1px solid var(--border)', objectFit: 'cover' }}
                  />
                  <div style={{ fontSize: '11px', color: selectedFile ? '#0284c7' : 'var(--text-muted)', marginTop: '2px' }}>
                    {selectedFile ? '★ Foto baru (disimpan saat submit)' : 'Foto nota tersimpan'}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
              <button
                type="button"
                className="btn btn-outline"
                disabled={isSubmitting}
                onClick={onClose}
                style={{ flex: 1 }}
              >
                <RotateCcw size={16} />
                <span>Batal</span>
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
                style={{ flex: 2, gap: '8px' }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="spin-animate" />
                    <span>Menyimpan Perubahan...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Simpan Perubahan</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
