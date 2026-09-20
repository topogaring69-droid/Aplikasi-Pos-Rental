'use client';

import React from 'react';

/**
 * Komponen Skeleton Loading - Animasi placeholder saat data sedang dimuat.
 * Digunakan pada seluruh halaman untuk memberi kesan profesional saat loading.
 */

// Elemen Skeleton dasar (kotak, lingkaran, teks)
export function SkeletonBox({ width = '100%', height = '16px', borderRadius = '8px', style = {} }) {
  return (
    <div
      className="skeleton-pulse"
      style={{
        width,
        height,
        borderRadius,
        ...style,
      }}
    />
  );
}

// Skeleton untuk satu item list (mirip kartu transaksi/armada/pelanggan)
export function SkeletonListItem({ variant = 'default' }) {
  if (variant === 'transaction') {
    return (
      <div className="skeleton-card">
        {/* Header: ID & Badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <SkeletonBox width="140px" height="14px" />
          <div style={{ display: 'flex', gap: '6px' }}>
            <SkeletonBox width="52px" height="22px" borderRadius="12px" />
            <SkeletonBox width="80px" height="22px" borderRadius="12px" />
          </div>
        </div>
        {/* Middle: Nama & Total */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <SkeletonBox width="55%" height="18px" />
          <SkeletonBox width="100px" height="18px" />
        </div>
        {/* Tanggal */}
        <div style={{ marginBottom: '10px' }}>
          <SkeletonBox width="70%" height="12px" style={{ marginBottom: '5px' }} />
          <SkeletonBox width="65%" height="12px" />
        </div>
        {/* Footer: Badge & Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <SkeletonBox width="60px" height="20px" borderRadius="10px" />
          <div style={{ display: 'flex', gap: '8px' }}>
            <SkeletonBox width="32px" height="32px" borderRadius="8px" />
            <SkeletonBox width="32px" height="32px" borderRadius="8px" />
            <SkeletonBox width="32px" height="32px" borderRadius="8px" />
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'fleet') {
    return (
      <div className="skeleton-card">
        {/* Header: Nopol & Status */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <SkeletonBox width="110px" height="22px" borderRadius="12px" />
          <SkeletonBox width="70px" height="22px" borderRadius="12px" />
        </div>
        {/* Merk & Model */}
        <SkeletonBox width="65%" height="16px" style={{ marginBottom: '8px' }} />
        {/* Warna & Tahun */}
        <SkeletonBox width="45%" height="13px" style={{ marginBottom: '10px' }} />
        {/* Tarif */}
        <SkeletonBox width="120px" height="16px" style={{ marginBottom: '10px' }} />
        {/* Tax badges */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
          <SkeletonBox width="48%" height="28px" borderRadius="8px" />
          <SkeletonBox width="48%" height="28px" borderRadius="8px" />
        </div>
        {/* Footer: Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <SkeletonBox width="32px" height="32px" borderRadius="8px" />
          <SkeletonBox width="32px" height="32px" borderRadius="8px" />
        </div>
      </div>
    );
  }

  if (variant === 'customer') {
    return (
      <div className="skeleton-card">
        {/* Header: Nama & Rental Count */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <SkeletonBox width="55%" height="16px" />
          <SkeletonBox width="60px" height="22px" borderRadius="12px" />
        </div>
        {/* Phone & NIK */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
          <SkeletonBox width="35%" height="13px" />
          <SkeletonBox width="40%" height="13px" />
        </div>
        {/* Address */}
        <SkeletonBox width="75%" height="13px" style={{ marginBottom: '10px' }} />
        {/* Footer: Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <SkeletonBox width="32px" height="32px" borderRadius="8px" />
          <SkeletonBox width="32px" height="32px" borderRadius="8px" />
        </div>
      </div>
    );
  }

  if (variant === 'expense') {
    return (
      <div className="skeleton-card">
        {/* Header: Category & Amount */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <SkeletonBox width="120px" height="22px" borderRadius="12px" />
          <SkeletonBox width="110px" height="18px" />
        </div>
        {/* Description */}
        <SkeletonBox width="80%" height="14px" style={{ marginBottom: '8px' }} />
        {/* Date & Nopol */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>
          <SkeletonBox width="130px" height="13px" />
          <SkeletonBox width="80px" height="13px" />
        </div>
        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <SkeletonBox width="32px" height="32px" borderRadius="8px" />
          <SkeletonBox width="32px" height="32px" borderRadius="8px" />
        </div>
      </div>
    );
  }

  // Default
  return (
    <div className="skeleton-card">
      <SkeletonBox width="60%" height="16px" style={{ marginBottom: '10px' }} />
      <SkeletonBox width="40%" height="14px" style={{ marginBottom: '8px' }} />
      <SkeletonBox width="80%" height="12px" />
    </div>
  );
}

// Skeleton untuk daftar items (multiple cards)
export function SkeletonList({ count = 3, variant = 'default' }) {
  return (
    <div className="skeleton-list">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonListItem key={i} variant={variant} />
      ))}
    </div>
  );
}

// Skeleton untuk search bar
export function SkeletonSearchBar() {
  return (
    <div className="skeleton-card" style={{ padding: '0', overflow: 'hidden' }}>
      <SkeletonBox width="100%" height="46px" borderRadius="12px" />
    </div>
  );
}

// Skeleton untuk summary card (total pengeluaran)
export function SkeletonSummaryCard() {
  return (
    <div className="skeleton-card" style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <SkeletonBox width="45%" height="14px" />
        <SkeletonBox width="120px" height="20px" />
      </div>
    </div>
  );
}
