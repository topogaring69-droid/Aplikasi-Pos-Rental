'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  CheckCircle2, 
  Calendar, 
  User, 
  FileText, 
  DollarSign, 
  Bike, 
  AlertCircle, 
  Loader2,
  TrendingDown,
  Info,
  CreditCard
} from 'lucide-react';
import { formatRupiah, terbilangRupiah } from '../lib/storage';
import { showToast } from '../lib/sweetalert';
import SearchableSelect from './SearchableSelect';

export default function ModalBpkForm({ 
  initialData = null, 
  transactions = [], 
  fleet = [], 
  onClose, 
  onSaved 
}) {
  const isEdit = Boolean(initialData?.id);

  // Form State
  const [date, setDate] = useState(() => {
    if (initialData?.date) {
      return initialData.date.slice(0, 16);
    }
    const now = new Date();
    return now.toISOString().slice(0, 16);
  });
  const [paymentMethod, setPaymentMethod] = useState(initialData?.paymentMethod || 'Tunai');
  const [recipientName, setRecipientName] = useState(initialData?.recipientName || '');
  const [recipientRole, setRecipientRole] = useState(initialData?.recipientRole || 'Tim Antar');
  const [category, setCategory] = useState(initialData?.category || 'Antar motor');
  const [categoryOther, setCategoryOther] = useState(initialData?.categoryOther || '');

  // Hubungan dengan Transaksi Rental
  const [isRentalRelated, setIsRentalRelated] = useState(initialData?.isRentalRelated ?? true);
  const [transactionId, setTransactionId] = useState(initialData?.transactionId || '');
  const [nopol, setNopol] = useState(initialData?.nopol || '');
  const [customerName, setCustomerName] = useState(initialData?.customerName || '');
  const [customerPhone, setCustomerPhone] = useState(initialData?.customerPhone || '');
  const [customerFee, setCustomerFee] = useState(initialData?.customerFee || 0);

  const [amount, setAmount] = useState(initialData?.amount ? String(initialData.amount) : '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [status, setStatus] = useState(initialData?.status || 'Sudah Dibayar');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Opsi transaksi rental yang diformat untuk SearchableSelect
  const transactionOptions = useMemo(() => {
    return (transactions || []).map((t) => {
      let deliveryFee = 0;
      const extraList = Array.isArray(t.extraCosts) ? t.extraCosts : [];
      for (const extra of extraList) {
        const lbl = (extra.label || '').toLowerCase();
        if (lbl.includes('antar') || lbl.includes('jemput') || lbl.includes('delivery') || lbl.includes('drop')) {
          deliveryFee += Number(extra.amount) || 0;
        }
      }

      return {
        ...t,
        id: t.id,
        nopol: t.nopol || '',
        customerName: t.customerName || '',
        customerPhone: t.customerPhone || '',
        phone: t.customerPhone || '',
        deliveryFee,
        displayTitle: `${t.id} - ${t.nopol} (${t.customerName})`,
        secondaryTitle: `${formatRupiah(t.total)} • ${t.paymentMethod || 'Tunai'}${deliveryFee > 0 ? ` • Ada Biaya Antar ${formatRupiah(deliveryFee)}` : ''}`
      };
    });
  }, [transactions]);

  // Saat nomor transaksi dipilih, otomatis isi nopol, pelanggan, dan deteksi biaya antar dari pelanggan
  const handleTransactionChange = (selectedTxId, item = null) => {
    setTransactionId(selectedTxId || '');
    if (!selectedTxId) {
      setNopol('');
      setCustomerName('');
      setCustomerPhone('');
      setCustomerFee(0);
      return;
    }

    const tx = item || transactions.find((t) => t.id === selectedTxId);
    if (tx) {
      setNopol(tx.nopol || '');
      setCustomerName(tx.customerName || '');
      setCustomerPhone(tx.customerPhone || '');

      // Deteksi biaya antar / jemput dari extraCosts transaksi
      let detectedFee = tx.deliveryFee !== undefined ? tx.deliveryFee : 0;
      if (detectedFee === 0) {
        const extraList = Array.isArray(tx.extraCosts) ? tx.extraCosts : [];
        for (const extra of extraList) {
          const lbl = (extra.label || '').toLowerCase();
          if (lbl.includes('antar') || lbl.includes('jemput') || lbl.includes('delivery') || lbl.includes('drop')) {
            detectedFee += Number(extra.amount) || 0;
          }
        }
      }

      setCustomerFee(detectedFee);

      // Otomatis buat template keterangan jika belum diisi atau masih template default
      if (!description.trim() || description.startsWith('Biaya ')) {
        const dest = tx.notes ? ` (${tx.notes})` : '';
        setDescription(`Biaya ${category.toLowerCase()} unit ${tx.nopol} untuk pelanggan ${tx.customerName}${dest}.`);
      }
    }
  };

  // Update deskripsi otomatis jika kategori berubah dan deskripsi masih kosong
  const handleCategoryChange = (newCat) => {
    setCategory(newCat);
    if (isRentalRelated && transactionId && (!description.trim() || description.startsWith('Biaya '))) {
      const tx = transactions.find((t) => t.id === transactionId);
      if (tx) {
        setDescription(`Biaya ${newCat.toLowerCase()} unit ${tx.nopol} untuk pelanggan ${tx.customerName}.`);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!recipientName.trim()) {
      showToast('Nama penerima kas wajib diisi!', 'error');
      return;
    }
    if (category === 'Lainnya' && !categoryOther.trim()) {
      showToast('Harap tuliskan keterangan kategori lainnya!', 'error');
      return;
    }
    if (isRentalRelated && !transactionId) {
      showToast('Nomor transaksi rental wajib dipilih jika terkait sewa!', 'error');
      return;
    }
    const amountVal = Number(amount);
    if (!amount || isNaN(amountVal) || amountVal <= 0) {
      showToast('Jumlah pengeluaran harus lebih besar dari Rp 0!', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const bpkPayload = {
        id: initialData?.id || undefined,
        date,
        paymentMethod,
        recipientName: recipientName.trim(),
        recipientRole: recipientRole.trim(),
        category,
        categoryOther: category === 'Lainnya' ? categoryOther.trim() : '',
        isRentalRelated,
        transactionId: isRentalRelated ? transactionId : null,
        nopol: isRentalRelated ? nopol : (nopol.trim() || null),
        customerName: isRentalRelated ? customerName : '',
        customerPhone: isRentalRelated ? customerPhone : '',
        customerFee: isRentalRelated ? Number(customerFee) : 0,
        amount: amountVal,
        description: description.trim(),
        status,
      };

      await onSaved(bpkPayload);
    } catch (err) {
      console.error('Gagal submit BPK:', err);
      showToast(err.message || 'Gagal menyimpan BPK', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const diffMargin = customerFee > 0 ? (customerFee - (Number(amount) || 0)) : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-sheet" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '620px', width: '96%', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
      >
        <div className="modal-header">
          <div>
            <div className="modal-title">
              {isEdit ? `Edit BPK (${initialData.id})` : 'Tambah Bukti Pengeluaran Kas (BPK)'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
              {isEdit ? 'Perbarui data administrasi pengeluaran kas resmi' : 'Nomor BPK otomatis berurutan (BPK-YYYY-XXXXX)'}
            </div>
          </div>
          <button type="button" className="btn-icon" onClick={onClose} disabled={isSubmitting}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {/* SECTION A: INFORMASI BPK */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px', marginBottom: '14px' }}>
            <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
              A. Informasi Dokumen BPK
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group" style={{ marginBottom: '8px' }}>
                <label className="form-label" style={{ fontSize: '11.5px' }}>Nomor BPK (Otomatis)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={initialData?.id || '(Dibuat otomatis oleh sistem)'} 
                  disabled 
                  style={{ background: '#f1f5f9', fontWeight: '700', color: 'var(--primary)', fontFamily: 'monospace', fontSize: '12px' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '8px' }}>
                <label className="form-label" style={{ fontSize: '11.5px' }}>Tanggal Pengeluaran *</label>
                <input 
                  type="datetime-local" 
                  className="form-control" 
                  value={date} 
                  onChange={(e) => setDate(e.target.value)} 
                  required 
                  style={{ fontSize: '12px' }}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '11.5px' }}>Metode Pembayaran Kas</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {['Tunai', 'Transfer', 'QRIS'].map((method) => (
                  <button
                    key={method}
                    type="button"
                    className={`btn btn-sm ${paymentMethod === method ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setPaymentMethod(method)}
                    style={{ fontSize: '12px', fontWeight: '700', borderRadius: '8px' }}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION B: PENERIMA */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px', marginBottom: '14px' }}>
            <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
              B. Penerima Uang Kas
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '11.5px' }}>Nama Penerima *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Contoh: Andi, Budi, Bengkel Jaya"
                  value={recipientName} 
                  onChange={(e) => setRecipientName(e.target.value)} 
                  required 
                  style={{ fontSize: '13px' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '11.5px' }}>Jabatan / Peran</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Misal: Tim Antar / Driver"
                  value={recipientRole} 
                  onChange={(e) => setRecipientRole(e.target.value)} 
                  style={{ fontSize: '13px' }}
                />
              </div>
            </div>
          </div>

          {/* SECTION C: KEPERLUAN */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px', marginBottom: '14px' }}>
            <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
              C. Keperluan Pengeluaran
            </div>

            <div className="form-group" style={{ marginBottom: category === 'Lainnya' ? '8px' : 0 }}>
              <label className="form-label" style={{ fontSize: '11.5px' }}>Jenis / Keperluan *</label>
              <select 
                className="form-control"
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                style={{ fontSize: '13px' }}
              >
                <option value="Antar motor">Antar motor</option>
                <option value="Jemput motor">Jemput motor</option>
                <option value="Antar & jemput motor">Antar & jemput motor</option>
                <option value="Operasional">Operasional</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>

            {category === 'Lainnya' && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '11.5px' }}>Keterangan Kategori Lainnya *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Sebutkan keperluan pengeluaran..."
                  value={categoryOther} 
                  onChange={(e) => setCategoryOther(e.target.value)} 
                  required 
                  style={{ fontSize: '13px' }}
                />
              </div>
            )}
          </div>

          {/* SECTION D: HUBUNGAN DENGAN TRANSAKSI RENTAL */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                D. Hubungan dengan Transaksi Rental
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}>
                <input 
                  type="checkbox"
                  checked={isRentalRelated}
                  onChange={(e) => setIsRentalRelated(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                />
                <span>Terkait Transaksi Rental</span>
              </label>
            </div>

            {isRentalRelated ? (
              <div>
                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <label className="form-label" style={{ fontSize: '11.5px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Pilih / Cari Transaksi Rental *</span>
                    <span style={{ fontSize: '10.5px', color: 'var(--primary)', fontWeight: 'normal' }}>
                      (Ketik No. TRX / Plat / Nama)
                    </span>
                  </label>
                  <SearchableSelect
                    options={transactionOptions}
                    value={transactionId}
                    valueKey="id"
                    displayKey="displayTitle"
                    secondaryKey="secondaryTitle"
                    placeholder="Ketik atau pilih transaksi rental..."
                    searchPlaceholder="Cari no. TRX, nopol, atau nama pelanggan..."
                    showSecondaryInTrigger={false}
                    allowCustom={false}
                    badgeRenderer={(item) => (
                      <span 
                        className={`badge ${item.status === 'active' ? 'badge-success' : (item.status === 'booking' ? 'badge-warning' : 'badge-secondary')}`}
                        style={{ fontSize: '10px', textTransform: 'capitalize' }}
                      >
                        {item.status === 'active' ? 'Aktif' : (item.status === 'booking' ? 'Booking' : (item.status || 'Selesai'))}
                      </span>
                    )}
                    onChange={(val, item) => {
                      handleTransactionChange(val, item);
                    }}
                  />
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    * Anda dapat mengetik nomor transaksi (misal: TRX-...), plat nomor (misal: B 1189), atau nama pelanggan.
                  </div>
                </div>

                {transactionId && (
                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '10px 12px', marginBottom: '10px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '12px' }}>
                      <div>
                        <div style={{ fontSize: '10.5px', color: '#64748b' }}>Nomor Polisi:</div>
                        <strong style={{ color: '#0f172a' }}>{nopol || '-'}</strong>
                      </div>
                      <div>
                        <div style={{ fontSize: '10.5px', color: '#64748b' }}>Pelanggan:</div>
                        <strong style={{ color: '#0f172a' }}>{customerName || '-'}</strong>
                      </div>
                      <div>
                        <div style={{ fontSize: '10.5px', color: '#64748b' }}>No. HP / WA:</div>
                        <strong style={{ color: '#0f172a' }}>{customerPhone || '-'}</strong>
                      </div>
                    </div>

                    {/* Analisis Biaya Antar-Jemput */}
                    {customerFee > 0 && (
                      <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #93c5fd', fontSize: '11.5px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#1e3a8a' }}>
                          <span>Biaya antar dari pelanggan (Transaksi):</span>
                          <strong>{formatRupiah(customerFee)}</strong>
                        </div>
                        {amount && Number(amount) > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#166534', marginTop: '3px' }}>
                            <span>Selisih analisis (Pelanggan vs Tim):</span>
                            <strong>{formatRupiah(diffMargin)}</strong>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Pengeluaran kas operasional umum yang tidak terikat langsung dengan nomor sewa pelanggan.
              </div>
            )}
          </div>

          {/* SECTION E: JUMLAH */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px', marginBottom: '14px' }}>
            <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
              E. Jumlah Kas Dikeluarkan
            </div>

            <div className="form-group" style={{ marginBottom: '6px' }}>
              <label className="form-label" style={{ fontSize: '11.5px' }}>Jumlah Biaya (Rp) *</label>
              <input 
                type="number" 
                className="form-control" 
                placeholder="Contoh: 40000"
                value={amount} 
                onChange={(e) => setAmount(e.target.value)} 
                required 
                inputMode="numeric"
                min="1"
                style={{ fontSize: '16px', fontWeight: '800', color: '#e11d48', fontFamily: 'monospace' }}
              />
            </div>

            {amount && Number(amount) > 0 && (
              <div style={{ fontSize: '12px', color: '#047857', fontWeight: '600', marginTop: '4px' }}>
                Terbilang: <em>{terbilangRupiah(amount)}</em>
              </div>
            )}
          </div>

          {/* SECTION F: KETERANGAN */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px', marginBottom: '14px' }}>
            <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
              F. Keterangan Pengeluaran
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <textarea 
                className="form-control"
                rows="2"
                placeholder="Biaya antar motor ke Stasiun Cikarang untuk pelanggan transaksi..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{ fontSize: '12.5px' }}
              />
            </div>
          </div>

          {/* SECTION G: STATUS */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px', marginBottom: '14px' }}>
            <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
              G. Status BPK
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                className={`btn btn-sm ${status === 'Sudah Dibayar' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setStatus('Sudah Dibayar')}
                style={{ fontSize: '12px', fontWeight: '700' }}
              >
                Sudah Dibayar (Masuk Kas)
              </button>

              <button
                type="button"
                className={`btn btn-sm ${status === 'Draft' ? 'btn-secondary' : 'btn-outline'}`}
                onClick={() => setStatus('Draft')}
                style={{ fontSize: '12px', fontWeight: '700' }}
              >
                Draft (Belum Dicatat Kas)
              </button>
            </div>
          </div>

          {/* TOMBOL AKSI */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <button
              type="button"
              className="btn btn-outline"
              disabled={isSubmitting}
              onClick={onClose}
              style={{ flex: 1 }}
            >
              Batal
            </button>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              style={{ flex: 2, gap: '6px' }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="spin-animate" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>{isEdit ? 'Simpan Perubahan' : 'Simpan & Buat BPK'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
