'use client';

import React, { useState } from 'react';
import { Lock, Unlock, Delete } from 'lucide-react';

export default function PinLockModal({ correctPin, onUnlock }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleDigit = (d) => {
    if (pin.length < 6) {
      const nextPin = pin + d;
      setPin(nextPin);
      setError(false);
      if (nextPin === correctPin) {
        onUnlock();
      }
    }
  };

  const handleClear = () => {
    setPin('');
    setError(false);
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    setError(false);
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (pin === correctPin) {
      onUnlock();
    } else {
      setError(true);
      setPin('');
    }
  };

  return (
    <div className="modal-overlay" style={{ background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(6px)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: '360px', width: '90%', textAlign: 'center', padding: '28px 24px', background: '#ffffff', borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', border: '1px solid var(--border)' }}>
        <div style={{ 
          width: '64px', 
          height: '64px', 
          borderRadius: '20px', 
          background: 'var(--primary-light)', 
          border: '1px solid var(--primary-border)',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          margin: '0 auto 16px',
          color: 'var(--primary)'
        }}>
          <Lock size={32} />
        </div>

        <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '6px' }}>Kunci Kasir Aktif</h2>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>
          Masukkan PIN keamanan untuk melanjutkan akses aplikasi POS
        </p>

        {/* PIN Dots Display */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '24px' }}>
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                border: error ? '2px solid var(--accent-rose)' : '2px solid var(--border)',
                background: pin.length > idx ? 'var(--primary)' : 'transparent',
                transition: 'all 0.15s ease'
              }}
            />
          ))}
        </div>

        {error && (
          <div style={{ color: 'var(--accent-rose)', fontSize: '12px', marginBottom: '14px', fontWeight: '600' }}>
            PIN salah! Silakan coba lagi.
          </div>
        )}

        {/* Keypad Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '20px', fontWeight: '700', minHeight: '52px', borderRadius: '16px' }}
              onClick={() => handleDigit(String(num))}
            >
              {num}
            </button>
          ))}

          <button
            type="button"
            className="btn btn-outline"
            style={{ fontSize: '13px', fontWeight: '700', minHeight: '52px', borderRadius: '16px', color: 'var(--accent-rose)' }}
            onClick={handleClear}
          >
            Hapus
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: '20px', fontWeight: '700', minHeight: '52px', borderRadius: '16px' }}
            onClick={() => handleDigit('0')}
          >
            0
          </button>

          <button
            type="button"
            className="btn btn-outline"
            style={{ fontSize: '16px', minHeight: '52px', borderRadius: '16px' }}
            onClick={handleDelete}
          >
            <Delete size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
