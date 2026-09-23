'use client';

import React, { useRef, useState } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  Share2, 
  FileCheck2, 
  CheckCircle2, 
  AlertCircle, 
  Ban,
  Building2,
  Calendar,
  Send
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { formatRupiah, formatDateTime, formatDateOnly, terbilangRupiah } from '../lib/storage';
import { showError, showToast } from '../lib/sweetalert';

export default function BpkDocumentModal({ bpk, settings, onClose }) {
  const docRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);

  if (!bpk || !settings) return null;

  const storeName = settings.storeName || 'SHELBY RENT';
  const tagline = settings.tagline || 'Rental Motor Cepat & Terpercaya';
  const address = settings.address || 'Komp. Ruko Bisnis, Area Stasiun';
  const phone = settings.phone || '0812-3456-7890';
  const logoUrl = settings.logoUrl || '/images/logo-shelby-rent.png';
  const cashierName = bpk.createdByName || settings.cashierName || 'Admin Kasir';

  const amountNumber = Number(bpk.amount) || 0;
  const customerFeeNumber = Number(bpk.customerFee) || 0;
  const marginNumber = customerFeeNumber > 0 ? (customerFeeNumber - amountNumber) : null;

  // Handle Cetak Dokumen
  const handlePrint = () => {
    window.print();
  };

  // Handle Download Dokumen sebagai Gambar / PDF PNG
  const handleDownload = async () => {
    if (!docRef.current) return;
    try {
      setIsExporting(true);
      const canvas = await html2canvas(docRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      const imgData = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = imgData;
      a.download = `BPK_${bpk.id}_${storeName.replace(/\s+/g, '_')}.png`;
      a.click();
      showToast('Dokumen Bukti Pengeluaran Kas berhasil diunduh', 'success');
    } catch (err) {
      console.error('Gagal mengunduh dokumen BPK:', err);
      showError('Gagal Unduh', 'Terjadi kesalahan saat membuat berkas gambar BPK.');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Share WhatsApp
  const handleShareWhatsApp = () => {
    const waText = 
`*BUKTI PENGELUARAN KAS (BPK)*
*${storeName.toUpperCase()}*
----------------------------------------
*No. BPK:* ${bpk.id}
*Tanggal:* ${formatDateTime(bpk.date)}
*Status:* ${bpk.status}
*Metode:* ${bpk.paymentMethod || 'Tunai'}
*Dibayarkan Kepada:* ${bpk.recipientName}${bpk.recipientRole ? ` (${bpk.recipientRole})` : ''}
*Keperluan:* ${bpk.category}${bpk.categoryOther ? ` - ${bpk.categoryOther}` : ''}
${bpk.isRentalRelated && bpk.transactionId ? `*No. Transaksi:* ${bpk.transactionId}\n*No. Polisi:* ${bpk.nopol || '-'}\n*Pelanggan:* ${bpk.customerName || '-'}\n` : ''}*Jumlah:* *${formatRupiah(bpk.amount)}*
*Terbilang:* _${terbilangRupiah(bpk.amount)}_
${bpk.description ? `*Keterangan:* ${bpk.description}\n` : ''}----------------------------------------
_Dokumen resmi pengeluaran kas internal ${storeName}._`;

    let phoneTarget = (bpk.customerPhone || '').replace(/\D/g, '');
    if (phoneTarget.startsWith('0')) {
      phoneTarget = '62' + phoneTarget.slice(1);
    }
    const waUrl = phoneTarget ? `https://wa.me/${phoneTarget}?text=${encodeURIComponent(waText)}` : `https://wa.me/?text=${encodeURIComponent(waText)}`;
    window.open(waUrl, '_blank');
  };

  const getStatusBadge = () => {
    switch (bpk.status) {
      case 'Sudah Dibayar':
        return { label: 'SUDAH DIBAYAR / LUNAS', bg: '#dcfce7', color: '#166534', border: '#bbf7d0', icon: CheckCircle2 };
      case 'Draft':
        return { label: 'DRAFT PENGELUARAN', bg: '#f1f5f9', color: '#475569', border: '#cbd5e1', icon: AlertCircle };
      case 'Dibatalkan':
        return { label: 'DIBATALKAN', bg: '#fee2e2', color: '#991b1b', border: '#fecaca', icon: Ban };
      default:
        return { label: bpk.status, bg: '#f1f5f9', color: '#475569', border: '#cbd5e1', icon: CheckCircle2 };
    }
  };

  const st = getStatusBadge();
  const StIcon = st.icon;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-sheet" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '640px', width: '95%', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header Modal (Tersembunyi saat dicetak) */}
        <div className="modal-header no-print">
          <div>
            <div className="modal-title">Dokumen Bukti Pengeluaran Kas</div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
              {bpk.id} &bull; Siap dicetak atau disimpan sebagai PDF / berkas gambar
            </div>
          </div>
          <button type="button" className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Isi Dokumen Cetak BPK */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', background: '#f8fafc' }}>
          <div 
            ref={docRef}
            className="bpk-voucher-card"
            style={{
              background: '#ffffff',
              border: '2px solid #cbd5e1',
              borderRadius: '12px',
              padding: '24px 28px',
              color: '#0f172a',
              boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Watermark jika Dibatalkan */}
            {bpk.status === 'Dibatalkan' && (
              <div style={{
                position: 'absolute',
                top: '40%',
                left: '50%',
                transform: 'translate(-50%, -50%) rotate(-25deg)',
                fontSize: '48px',
                fontWeight: '900',
                color: 'rgba(239, 68, 68, 0.15)',
                border: '6px dashed rgba(239, 68, 68, 0.25)',
                padding: '12px 30px',
                borderRadius: '16px',
                pointerEvents: 'none',
                letterSpacing: '4px',
                zIndex: 1
              }}>
                DIBATALKAN
              </div>
            )}

            {/* KOP USAHA */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0f172a', paddingBottom: '14px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                <img 
                  src={logoUrl} 
                  alt="Logo Usaha" 
                  style={{ width: '48px', height: '48px', objectFit: 'contain', borderRadius: '8px' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: '900', color: '#047857', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
                    {storeName}
                  </h2>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                    {tagline}
                  </div>
                  <div style={{ fontSize: '11px', color: '#334155', marginTop: '2px' }}>
                    {address} {phone ? `| Telp/WA: ${phone}` : ''}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  background: st.bg, 
                  color: st.color, 
                  border: `1px solid ${st.border}`,
                  padding: '4px 10px', 
                  borderRadius: '20px', 
                  fontSize: '11px', 
                  fontWeight: '800',
                  letterSpacing: '0.5px'
                }}>
                  <StIcon size={13} />
                  <span>{st.label}</span>
                </div>
              </div>
            </div>

            {/* JUDUL DOKUMEN */}
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <h1 style={{ fontSize: '16px', fontWeight: '900', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
                BUKTI PENGELUARAN KAS (BPK)
              </h1>
              <div style={{ fontSize: '12px', color: '#475569', marginTop: '3px' }}>
                Nomor: <strong style={{ fontFamily: 'monospace', color: '#047857' }}>{bpk.id}</strong>
              </div>
            </div>

            {/* TABEL RINCIAN BPK */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', marginBottom: '16px' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '6px 0', width: '38%', color: '#64748b' }}>Tanggal Pengeluaran</td>
                  <td style={{ padding: '6px 0', width: '4%' }}>:</td>
                  <td style={{ padding: '6px 0', width: '58%', fontWeight: '700', color: '#0f172a' }}>
                    {formatDateTime(bpk.date)}
                  </td>
                </tr>

                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '6px 0', color: '#64748b' }}>Metode Pembayaran</td>
                  <td style={{ padding: '6px 0' }}>:</td>
                  <td style={{ padding: '6px 0', fontWeight: '700', color: '#047857' }}>
                    {bpk.paymentMethod || 'Tunai'}
                  </td>
                </tr>

                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '6px 0', color: '#64748b' }}>Dibayarkan Kepada</td>
                  <td style={{ padding: '6px 0' }}>:</td>
                  <td style={{ padding: '6px 0', fontWeight: '800', color: '#0f172a' }}>
                    {bpk.recipientName} {bpk.recipientRole ? `(${bpk.recipientRole})` : ''}
                  </td>
                </tr>

                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '6px 0', color: '#64748b' }}>Keperluan / Jenis</td>
                  <td style={{ padding: '6px 0' }}>:</td>
                  <td style={{ padding: '6px 0', fontWeight: '700', color: '#0f172a' }}>
                    {bpk.category} {bpk.categoryOther ? `- ${bpk.categoryOther}` : ''}
                  </td>
                </tr>

                {bpk.isRentalRelated && bpk.transactionId && (
                  <>
                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '6px 0', color: '#64748b' }}>Nomor Transaksi Rental</td>
                      <td style={{ padding: '6px 0' }}>:</td>
                      <td style={{ padding: '6px 0', fontFamily: 'monospace', fontWeight: '700', color: '#0284c7' }}>
                        {bpk.transactionId}
                      </td>
                    </tr>

                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '6px 0', color: '#64748b' }}>Nomor Polisi Kendaraan</td>
                      <td style={{ padding: '6px 0' }}>:</td>
                      <td style={{ padding: '6px 0', fontWeight: '800' }}>
                        <span style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '2px 8px', borderRadius: '4px', letterSpacing: '0.5px' }}>
                          {bpk.nopol || '-'}
                        </span>
                      </td>
                    </tr>

                    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '6px 0', color: '#64748b' }}>Pelanggan Rental</td>
                      <td style={{ padding: '6px 0' }}>:</td>
                      <td style={{ padding: '6px 0', fontWeight: '600' }}>
                        {bpk.customerName || '-'} {bpk.customerPhone ? `(${bpk.customerPhone})` : ''}
                      </td>
                    </tr>
                  </>
                )}

                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '6px 0', color: '#64748b' }}>Keterangan / Rincian</td>
                  <td style={{ padding: '6px 0' }}>:</td>
                  <td style={{ padding: '6px 0', color: '#1e293b' }}>
                    {bpk.description || '-'}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* JUMLAH PENGELUARAN & TERBILANG */}
            <div style={{ 
              background: '#f1f5f9', 
              border: '1px solid #e2e8f0', 
              borderRadius: '8px', 
              padding: '12px 16px', 
              marginBottom: '16px' 
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: '#475569' }}>
                  Jumlah Dibayarkan (Kas Keluar)
                </span>
                <span style={{ fontSize: '20px', fontWeight: '900', color: '#e11d48', fontFamily: 'monospace' }}>
                  {formatRupiah(bpk.amount)}
                </span>
              </div>
              <div style={{ fontSize: '11.5px', color: '#64748b', fontStyle: 'italic', marginTop: '4px' }}>
                Terbilang: <strong>{terbilangRupiah(bpk.amount)}</strong>
              </div>
            </div>

            {/* ANALISIS BIAYA ANTAR-JEMPUT JIKA ADA */}
            {bpk.isRentalRelated && customerFeeNumber > 0 && (
              <div style={{ 
                background: '#eff6ff', 
                border: '1px solid #bfdbfe', 
                borderRadius: '8px', 
                padding: '10px 14px', 
                marginBottom: '18px',
                fontSize: '11.5px'
              }}>
                <div style={{ fontWeight: '800', color: '#1d4ed8', marginBottom: '4px' }}>
                  ★ Informasi Analisis Biaya Antar-Jemput Transaksi {bpk.transactionId}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#334155' }}>
                  <span>Biaya antar yang dibayar pelanggan:</span>
                  <strong style={{ fontFamily: 'monospace' }}>{formatRupiah(customerFeeNumber)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#334155', marginTop: '2px' }}>
                  <span>Biaya dibayarkan kepada tim (BPK):</span>
                  <strong style={{ fontFamily: 'monospace', color: '#e11d48' }}>{formatRupiah(amountNumber)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#166534', marginTop: '2px', borderTop: '1px dashed #93c5fd', paddingTop: '4px' }}>
                  <span style={{ fontWeight: '700' }}>Selisih (Efisiensi Kas):</span>
                  <strong style={{ fontFamily: 'monospace' }}>{formatRupiah(marginNumber)}</strong>
                </div>
                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
                  * Catatan: Selisih merupakan kalkulasi analisis internal dan bukan pencatatan pendapatan otomatis.
                </div>
              </div>
            )}

            {/* TANDA TANGAN DUA PIHAK */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '24px', paddingTop: '12px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Dibayarkan oleh:</div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>{cashierName}</div>
                <div style={{ height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '10px', color: '#94a3b8', fontStyle: 'italic' }}>(Tanda Tangan Kasir)</span>
                </div>
                <div style={{ borderTop: '1px solid #94a3b8', width: '80%', margin: '0 auto', paddingTop: '4px', fontSize: '11px', fontWeight: '600', color: '#334155' }}>
                  Petugas Kasir
                </div>
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Diterima oleh:</div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>{bpk.recipientName}</div>
                <div style={{ height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '10px', color: '#94a3b8', fontStyle: 'italic' }}>(Tanda Tangan Penerima)</span>
                </div>
                <div style={{ borderTop: '1px solid #94a3b8', width: '80%', margin: '0 auto', paddingTop: '4px', fontSize: '11px', fontWeight: '600', color: '#334155' }}>
                  Penerima Kas
                </div>
              </div>
            </div>

            {/* Footer Nota */}
            <div style={{ textAlign: 'center', fontSize: '10px', color: '#94a3b8', marginTop: '20px', borderTop: '1px dotted #e2e8f0', paddingTop: '8px' }}>
              Dicetak secara digital oleh sistem POS {storeName} pada {formatDateTime(new Date().toISOString())}
            </div>
          </div>
        </div>

        {/* Modal Footer / Action Buttons (Tersembunyi saat print) */}
        <div className="modal-footer no-print" style={{ display: 'flex', gap: '8px', padding: '12px 16px', background: '#ffffff', borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={handleShareWhatsApp}
            style={{ flex: 1, minWidth: '120px', gap: '6px', color: '#16a34a', borderColor: '#86efac' }}
            title="Bagikan rincian BPK ke nomor WhatsApp"
          >
            <Send size={15} />
            <span>Bagikan WA</span>
          </button>

          <button
            type="button"
            className="btn btn-outline btn-sm"
            disabled={isExporting}
            onClick={handleDownload}
            style={{ flex: 1, minWidth: '130px', gap: '6px', color: 'var(--primary)', borderColor: 'var(--primary-border)' }}
            title="Download dokumen BPK sebagai berkas gambar / PDF PNG"
          >
            <Download size={15} />
            <span>{isExporting ? 'Memproses...' : 'Download PDF'}</span>
          </button>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handlePrint}
            style={{ flex: 1, minWidth: '110px', gap: '6px' }}
            title="Cetak langsung ke printer"
          >
            <Printer size={15} />
            <span>Cetak BPK</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            style={{ minWidth: '70px' }}
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
