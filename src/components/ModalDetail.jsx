'use client';

import React from 'react';
import { X, Printer, Trash2, Calendar, Phone, User, ShieldCheck } from 'lucide-react';
import { formatRupiah, formatDateTime } from '../lib/storage';
import { formatRentalDuration } from '../lib/rentalPricing';

export default function ModalDetail({ tx, onClose, onPrint, onEdit, onDelete }) {
  if (!tx) return null;

  const extraCosts = tx.extraCosts || [];
  const extraTotal = extraCosts.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const durationText = formatRentalDuration(tx.durationDays, tx.extendHours, tx.durationHours);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Detail Transaksi</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{tx.id}</div>
          </div>
          <button type="button" className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Plat Nomor & Status Badge */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span className="badge badge-plate" style={{ fontSize: '15px', padding: '6px 12px' }}>
              {tx.nopol || 'Tanpa Nopol'}
            </span>
            <span className="badge badge-success">
              {tx.paymentMethod || 'Lunas'}
            </span>
          </div>

          {/* Informasi Pelanggan & Jadwal Sewa */}
          <div className="card" style={{ marginBottom: '16px', background: 'var(--bg-input)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <User size={16} color="var(--primary)" />
              <strong style={{ fontSize: '14px' }}>{tx.customerName || '-'}</strong>
            </div>
            {tx.customerPhone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '13px', marginBottom: '8px' }}>
                <Phone size={14} />
                <span>{tx.customerPhone}</span>
              </div>
            )}
            <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '8px', marginTop: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', fontSize: '13px', marginBottom: '4px' }}>
                <Calendar size={14} color="var(--primary)" />
                <span><strong>Mulai:</strong> {formatDateTime(tx.startDate)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', fontSize: '13px', marginBottom: '4px' }}>
                <Calendar size={14} color="var(--accent-amber)" />
                <span><strong>Selesai:</strong> {formatDateTime(tx.endDate)}</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: '700', paddingLeft: '22px' }}>
                Durasi Sewa: {durationText}
              </div>
            </div>
          </div>

          {/* Rincian Biaya */}
          <div style={{ marginBottom: '16px' }}>
            <div className="card-title" style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '10px' }}>
              RINCIAN BIAYA SEWA & TAMBAHAN
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <span>Sewa Pokok Kendaraan ({durationText})</span>
              <strong style={{ fontFamily: 'var(--font-mono)' }}>{formatRupiah(tx.rentalPrice)}</strong>
            </div>

            {extraCosts.map((extra, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-muted)' }}>+ {extra.label || 'Biaya Tambahan'}</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{formatRupiah(extra.amount)}</span>
              </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 6px', fontSize: '16px', fontWeight: '800' }}>
              <span>Total Keseluruhan</span>
              <span style={{ color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>{formatRupiah(tx.total)}</span>
            </div>

            {/* Rincian Pembayaran */}
            <div style={{ background: 'var(--bg-input)', padding: '10px 14px', borderRadius: '10px', marginTop: '10px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Metode Bayar:</span>
                <strong>{tx.paymentMethod || 'Tunai'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Jumlah Diterima:</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{formatRupiah(tx.amountPaid || tx.total)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Kembalian:</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-amber)' }}>{formatRupiah(tx.changeAmount || 0)}</span>
              </div>
            </div>
          </div>

          {/* Catatan Tambahan */}
          {tx.notes && (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'var(--bg-card)', padding: '10px', borderRadius: '8px' }}>
              <span style={{ fontWeight: '600' }}>Catatan: </span>
              {tx.notes}
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ display: 'flex', gap: '8px' }}>
          {onEdit && (
            <button 
              type="button" 
              className="btn btn-outline" 
              style={{ flex: 1, borderColor: 'var(--primary)', color: 'var(--primary)' }}
              onClick={() => onEdit(tx)}
              title="Edit Data Transaksi"
            >
              <span>Edit Transaksi</span>
            </button>
          )}
          <button 
            type="button" 
            className="btn btn-primary" 
            style={{ flex: 1.5 }}
            onClick={() => onPrint(tx)}
          >
            <Printer size={16} />
            <span>Cetak / Invoice</span>
          </button>
          {onDelete && (
            <button 
              type="button" 
              className="btn btn-outline" 
              style={{ color: 'var(--accent-rose)', borderColor: 'rgba(244, 63, 94, 0.4)' }}
              onClick={() => onDelete(tx.id)}
              title="Hapus Transaksi"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
