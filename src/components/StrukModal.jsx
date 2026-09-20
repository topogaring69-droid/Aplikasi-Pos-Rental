'use client';

import React, { useState, useRef } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  Share2, 
  Receipt, 
  FileText, 
  Send, 
  CheckCircle2,
  Image as ImageIcon
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { formatRupiah, formatDateTime } from '../lib/storage';

export default function StrukModal({ tx, settings, onClose }) {
  if (!tx || !settings) return null;

  // Tab aktif: 'struk' (kecil/thermal) vs 'invoice' (lebar A4)
  const [docType, setDocType] = useState('struk');
  const [isGeneratingImg, setIsGeneratingImg] = useState(false);

  const receiptRef = useRef(null);
  const invoiceRef = useRef(null);

  const paperSize = settings.paperSize || '58mm';
  const logoUrl = settings.logoUrl || '/images/logo-shelby-rent.png';
  const extraCosts = tx.extraCosts || [];
  const extraTotal = extraCosts.reduce((s, c) => s + (Number(c.amount) || 0), 0);

  // 1. Cetak Dokumen Aktif (Struk Thermal atau Invoice A4)
  const handlePrint = () => {
    window.print();
  };

  // 2. Download Gambar Dokumen Aktif (PNG)
  const handleDownloadImage = async (type = docType) => {
    const targetEl = type === 'struk' ? receiptRef.current : invoiceRef.current;
    if (!targetEl) return;

    try {
      setIsGeneratingImg(true);
      const canvas = await html2canvas(targetEl, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');

      const a = document.createElement('a');
      a.href = imgData;
      a.download = `${type === 'struk' ? 'Struk' : 'Invoice'}_${tx.id}_SHELBY_RENT.png`;
      a.click();
    } catch (err) {
      console.error('Gagal membuat gambar:', err);
      alert('Gagal menghasilkan berkas gambar.');
    } finally {
      setIsGeneratingImg(false);
    }
  };

  // 3. Share Gambar & Pesan ke WhatsApp
  const handleShareWhatsApp = async () => {
    const targetEl = docType === 'struk' ? receiptRef.current : invoiceRef.current;
    if (!targetEl) return;

    // Bersihkan nomor WhatsApp pelanggan (misal: 0812 -> 62812)
    let phoneNum = (tx.customerPhone || '').replace(/\D/g, '');
    if (phoneNum.startsWith('0')) {
      phoneNum = '62' + phoneNum.slice(1);
    }

    const waMessage = 
`*SHELBY RENT - BUKTI PENYEWAAN KENDARAAN*
----------------------------------------
Halo Kak *${tx.customerName || 'Pelanggan'}*,
Terima kasih telah mempercayai layanan *SHELBY RENT*.

*No. Nota:* ${tx.id}
*Unit:* ${tx.nopol}
*Mulai Sewa:* ${formatDateTime(tx.startDate)}
*Selesai Sewa:* ${formatDateTime(tx.endDate)}
*Durasi:* ${tx.durationHours ? `${tx.durationHours} Jam` : `${tx.durationDays || 1} Hari`}
*Sewa Pokok:* ${formatRupiah(tx.rentalPrice)}
${extraTotal > 0 ? `*Biaya Tambahan:* ${formatRupiah(extraTotal)}\n` : ''}*TOTAL BAYAR:* *${formatRupiah(tx.total)}* (${tx.paymentMethod || 'Lunas'})

*Catatan:* ${settings.footerNote?.split('\n')[0] || 'Helm wajib SNI & BBM kembali sesuai awal.'}

Simpan pesan ini sebagai bukti transaksi resmi Anda.
_SHELBY RENT - Rental Motor Cepat & Terpercaya_`;

    const encodedMsg = encodeURIComponent(waMessage);
    const waUrl = phoneNum 
      ? `https://wa.me/${phoneNum}?text=${encodedMsg}` 
      : `https://wa.me/?text=${encodedMsg}`;

    // Cek apakah browser mendukung Web Share API file (khusus smartphone Android)
    if (navigator.share && navigator.canShare) {
      try {
        setIsGeneratingImg(true);
        const canvas = await html2canvas(targetEl, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
        canvas.toBlob(async (blob) => {
          if (blob) {
            const file = new File([blob], `${docType}_${tx.id}.png`, { type: 'image/png' });
            if (navigator.canShare({ files: [file] })) {
              await navigator.share({
                title: `Bukti ${docType === 'struk' ? 'Struk' : 'Invoice'} SHELBY RENT`,
                text: waMessage,
                files: [file]
              });
              setIsGeneratingImg(false);
              return;
            }
          }
          // Fallback: buka WhatsApp chat langsung
          window.open(waUrl, '_blank');
          setIsGeneratingImg(false);
        }, 'image/png');
      } catch (e) {
        setIsGeneratingImg(false);
        window.open(waUrl, '_blank');
      }
    } else {
      // Desktop: otomatis unduh gambar bukti & buka chat WhatsApp pelanggan
      await handleDownloadImage(docType);
      window.open(waUrl, '_blank');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()} style={{ maxWidth: docType === 'invoice' ? '720px' : '480px' }}>
        {/* Header Modal & Pilihan Tab Struk vs Invoice */}
        <div className="modal-header no-print">
          <div>
            <div className="modal-title">Bukti Transaksi Rental</div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
              Pilih bentuk dokumen yang ingin dicetak atau dibagikan
            </div>
          </div>
          <button type="button" className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Tab Pembeda Struk vs Invoice */}
        <div className="no-print" style={{ padding: '10px 16px 0', background: '#ffffff' }}>
          <div className="tab-group" style={{ marginBottom: 0 }}>
            <button
              type="button"
              className={`tab-btn ${docType === 'struk' ? 'active' : ''}`}
              onClick={() => setDocType('struk')}
              style={{ gap: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Receipt size={16} />
              <span>Struk Kasir (Thermal Kecil)</span>
            </button>
            <button
              type="button"
              className={`tab-btn ${docType === 'invoice' ? 'active' : ''}`}
              onClick={() => setDocType('invoice')}
              style={{ gap: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <FileText size={16} />
              <span>Invoice Resmi (Format Lebar A4)</span>
            </button>
          </div>
        </div>

        {/* Area Dokumen */}
        <div className="modal-body" style={{ padding: '16px 12px', background: '#f1f5f9' }}>
          {/* ================= BENTUK 1: STRUK KASIR (UKURAN KECIL 58mm/80mm) ================= */}
          {docType === 'struk' && (
            <div 
              ref={receiptRef}
              className={`receipt-paper print-target ${paperSize === '80mm' ? 'w-80' : 'w-58'}`}
            >
              {/* Header Struk */}
              <div className="receipt-header">
                {logoUrl && (
                  <div style={{ marginBottom: '6px' }}>
                    <img 
                      src={logoUrl} 
                      alt="Logo Shelby Rent" 
                      style={{ maxHeight: '48px', maxWidth: '140px', objectFit: 'contain' }} 
                    />
                  </div>
                )}
                <h2>{settings.storeName || 'SHELBY RENT'}</h2>
                <p>{settings.tagline || 'Rental Motor Cepat & Terpercaya'}</p>
                <p>{settings.address || 'Alamat Toko'}</p>
                <p>WA/Telp: {settings.phone || '-'}</p>
              </div>

              {/* Info Nota */}
              <div className="receipt-meta">
                <div className="receipt-row">
                  <span>No. Nota:</span>
                  <span style={{ fontWeight: '700' }}>{tx.id}</span>
                </div>
                <div className="receipt-row">
                  <span>Tanggal:</span>
                  <span>{formatDateTime(tx.startDate || tx.createdAt)}</span>
                </div>
                <div className="receipt-row">
                  <span>Kasir:</span>
                  <span>{settings.cashierName || 'Admin Shelby'}</span>
                </div>
                <div className="receipt-row">
                  <span>Pelanggan:</span>
                  <span style={{ fontWeight: '700' }}>{tx.customerName || '-'}</span>
                </div>
                <div className="receipt-row">
                  <span>No. Polisi:</span>
                  <span style={{ fontWeight: '800' }}>{tx.nopol || '-'}</span>
                </div>
                <div className="receipt-row">
                  <span>Mulai:</span>
                  <span>{formatDateTime(tx.startDate)}</span>
                </div>
                <div className="receipt-row">
                  <span>Selesai:</span>
                  <span>{formatDateTime(tx.endDate)}</span>
                </div>
                <div className="receipt-row">
                  <span>Durasi:</span>
                  <span style={{ fontWeight: '700' }}>
                    {tx.durationHours ? `${tx.durationHours} Jam` : `${tx.durationDays || 1} Hari`}
                  </span>
                </div>
              </div>

              {/* Rincian Biaya */}
              <div>
                <div className="receipt-row" style={{ fontWeight: '700' }}>
                  <span>Item / Layanan</span>
                  <span>Subtotal</span>
                </div>
                <div className="receipt-divider" style={{ margin: '4px 0 8px' }} />

                <div className="receipt-row">
                  <span>Sewa Motor ({tx.durationHours ? `${tx.durationHours} Jam` : `${tx.durationDays || 1} Hari`})</span>
                  <span>{formatRupiah(tx.rentalPrice)}</span>
                </div>

                {extraCosts.map((item, idx) => (
                  <div key={idx} className="receipt-row">
                    <span>+ {item.label || 'Biaya Tambahan'}</span>
                    <span>{formatRupiah(item.amount)}</span>
                  </div>
                ))}

                <div className="receipt-divider" />

                <div className="receipt-row receipt-total">
                  <span>TOTAL</span>
                  <span>{formatRupiah(tx.total)}</span>
                </div>

                <div className="receipt-row" style={{ marginTop: '4px', fontSize: '11px' }}>
                  <span>Bayar ({tx.paymentMethod || 'Tunai'}):</span>
                  <span>{formatRupiah(tx.amountPaid || tx.total)}</span>
                </div>
                <div className="receipt-row" style={{ fontSize: '11px' }}>
                  <span>Kembali:</span>
                  <span>{formatRupiah(tx.changeAmount || 0)}</span>
                </div>
              </div>

              {/* Footer Ketentuan Struk */}
              <div className="receipt-footer">
                <div className="receipt-divider" />
                <p>{settings.footerNote || 'Terima kasih atas kunjungan Anda!'}</p>
                <div style={{ marginTop: '8px', fontSize: '9px', letterSpacing: '1px', opacity: 0.7 }}>
                  * SIMPAN STRUK SEBAGAI BUKTI SEWA SAH *
                </div>
              </div>
            </div>
          )}

          {/* ================= BENTUK 2: INVOICE RESMI (FORMAT DOKUMEN LEBAR A4) ================= */}
          {docType === 'invoice' && (
            <div ref={invoiceRef} className="invoice-paper print-target">
              {/* Kop Surat Resmi */}
              <div className="invoice-kop">
                <div className="invoice-brand">
                  <img src={logoUrl} alt="Logo Shelby Rent" />
                  <div>
                    <h2>{settings.storeName || 'SHELBY RENT'}</h2>
                    <p style={{ fontSize: '12px', color: '#64748b' }}>{settings.tagline}</p>
                    <p style={{ fontSize: '12px', color: '#64748b' }}>{settings.address}</p>
                    <p style={{ fontSize: '12px', color: '#64748b' }}>WhatsApp: {settings.phone}</p>
                  </div>
                </div>

                <div className="invoice-meta-top">
                  <h3>INVOICE SEWA</h3>
                  <span>{tx.id.replace('TRX', 'INV')}</span>
                  <div style={{ marginTop: '6px' }}>
                    <span className="invoice-paid-badge">LUNAS</span>
                  </div>
                </div>
              </div>

              {/* Informasi Pelanggan & Sewa */}
              <div className="invoice-grid-info">
                <div>
                  <div style={{ fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>DITAGIHKAN KEPADA:</div>
                  <div style={{ fontWeight: '800', fontSize: '14px', color: '#059669' }}>{tx.customerName}</div>
                  <div>No. WhatsApp: {tx.customerPhone || '-'}</div>
                  <div>Status: Pelanggan Terverifikasi</div>
                </div>
                <div>
                  <div style={{ fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>RINCIAN KENDARAAN:</div>
                  <div>Unit / Plat: <strong>{tx.nopol}</strong></div>
                  <div>Mulai Sewa: <strong>{formatDateTime(tx.startDate)}</strong></div>
                  <div>Selesai Sewa: <strong>{formatDateTime(tx.endDate)}</strong></div>
                  <div>Durasi Sewa: <strong>{tx.durationHours ? `${tx.durationHours} Jam (${Math.floor(tx.durationHours / 24)} Hari ${tx.durationHours % 24 > 0 ? `+ ${tx.durationHours % 24} Jam` : ''})` : `${tx.durationDays || 1} Hari`}</strong></div>
                </div>
              </div>

              {/* Tabel Rincian Biaya */}
              <table className="invoice-table">
                <thead>
                  <tr>
                    <th>Deskripsi Item / Layanan</th>
                    <th>Durasi / Qty</th>
                    <th className="text-right">Tarif</th>
                    <th className="text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <strong>Sewa Unit Motor ({tx.nopol})</strong>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Sewa rental kendaraan roda dua ({tx.durationHours ? `${tx.durationHours} Jam` : `${tx.durationDays || 1} Hari`})</div>
                    </td>
                    <td>{tx.durationHours ? `${tx.durationHours} Jam` : `${tx.durationDays || 1} Hari`}</td>
                    <td className="text-right">{formatRupiah(tx.rentalPrice)}</td>
                    <td className="text-right"><strong>{formatRupiah(tx.rentalPrice)}</strong></td>
                  </tr>

                  {extraCosts.map((extra, idx) => (
                    <tr key={idx}>
                      <td>
                        <strong>{extra.label || 'Biaya Tambahan'}</strong>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Fasilitas tambahan penyewaan</div>
                      </td>
                      <td>1 Pcs</td>
                      <td className="text-right">{formatRupiah(extra.amount)}</td>
                      <td className="text-right">{formatRupiah(extra.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Total & Rincian Pembayaran */}
              <div className="invoice-totals">
                <div className="invoice-totals-row">
                  <span>Subtotal Sewa:</span>
                  <span>{formatRupiah(tx.rentalPrice)}</span>
                </div>
                {extraTotal > 0 && (
                  <div className="invoice-totals-row">
                    <span>Biaya Tambahan:</span>
                    <span>{formatRupiah(extraTotal)}</span>
                  </div>
                )}
                <div className="invoice-totals-row" style={{ borderTop: '2px solid #0f172a', borderBottom: '2px solid #0f172a', padding: '6px 0', marginTop: '6px', fontWeight: '800', fontSize: '15px' }}>
                  <span>TOTAL TAGIHAN:</span>
                  <span style={{ color: '#059669' }}>{formatRupiah(tx.total)}</span>
                </div>
                <div className="invoice-totals-row" style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                  <span>Metode Pembayaran:</span>
                  <span>{tx.paymentMethod || 'Tunai'}</span>
                </div>
                <div className="invoice-totals-row" style={{ fontSize: '11px', color: '#64748b' }}>
                  <span>Status:</span>
                  <span style={{ color: '#059669', fontWeight: '700' }}>LUNAS</span>
                </div>
              </div>

              {/* Syarat & Ketentuan */}
              <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', fontSize: '11px', color: '#475569', marginBottom: '20px' }}>
                <div style={{ fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>KETENTUAN SEWA SHELBY RENT:</div>
                <p>{settings.footerNote}</p>
              </div>

              {/* Tanda Tangan */}
              <div className="invoice-sign">
                <div>
                  <div style={{ color: '#64748b', marginBottom: '45px' }}>Penyewa / Pelanggan,</div>
                  <div style={{ fontWeight: '700', borderTop: '1px solid #94a3b8', paddingTop: '4px' }}>{tx.customerName}</div>
                </div>
                <div>
                  <div style={{ color: '#64748b', marginBottom: '45px' }}>Petugas SHELBY RENT,</div>
                  <div style={{ fontWeight: '700', borderTop: '1px solid #94a3b8', paddingTop: '4px' }}>{settings.cashierName || 'Admin Shelby'}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ================= DUA BENTUK TOMBOL DOWNLOAD & FITUR SHARE WHATSAPP ================= */}
        <div className="modal-footer no-print" style={{ flexDirection: 'column', gap: '8px' }}>
          {/* Baris Tombol Aksi Download Khusus */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '100%' }}>
            {/* Tombol 1: Unduh Struk Thermal Kecil */}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => handleDownloadImage('struk')}
              disabled={isGeneratingImg}
              style={{ fontSize: '12px', padding: '10px' }}
            >
              <Download size={14} />
              <span>Unduh Struk (Kecil)</span>
            </button>

            {/* Tombol 2: Unduh Invoice A4 Lebar */}
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => handleDownloadImage('invoice')}
              disabled={isGeneratingImg}
              style={{ fontSize: '12px', padding: '10px', color: 'var(--primary)', borderColor: 'var(--primary)' }}
            >
              <FileText size={14} />
              <span>Unduh Invoice (A4)</span>
            </button>
          </div>

          {/* Baris Cetak & Share ke WhatsApp */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '8px', width: '100%' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handlePrint}
              style={{ fontSize: '13px' }}
            >
              <Printer size={16} />
              <span>Cetak {docType === 'struk' ? 'Struk' : 'Invoice'}</span>
            </button>

            <button
              type="button"
              className="btn btn-whatsapp"
              onClick={handleShareWhatsApp}
              disabled={isGeneratingImg}
              style={{ fontSize: '13px' }}
            >
              <Send size={16} />
              <span>{isGeneratingImg ? 'Memproses...' : 'Share ke WhatsApp'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
