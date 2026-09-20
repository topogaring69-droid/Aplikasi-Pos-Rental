'use client';

import React from 'react';
import { Lock, LogOut, ShieldCheck, Wifi } from 'lucide-react';

export default function Header({ settings, user, onLock, onLogout }) {
  const storeName = settings?.storeName || 'SHELBY RENT';
  const logoUrl = settings?.logoUrl || '/images/logo-shelby-rent.png';
  const cashierName = user?.name || settings?.cashierName || 'Admin Shelby';
  const role = user?.role ? (user.role === 'admin' ? 'Admin' : 'Kasir') : (settings?.role || 'Kasir');
  const isPinEnabled = settings?.isPinEnabled;

  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="header-logo-box">
          <img 
            src={logoUrl} 
            alt="Logo Shelby Rent" 
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        </div>
        <div className="header-titles">
          <h1>{storeName}</h1>
          <span>{cashierName} ({role})</span>
        </div>
      </div>

      <div className="header-actions">
        <div className="badge badge-success" title="Mode Database SQLite Aktif" style={{ gap: '4px' }}>
          <Wifi size={12} />
          <span>Prisma DB</span>
        </div>

        {isPinEnabled && (
          <button 
            type="button" 
            className="btn-icon" 
            onClick={onLock} 
            title="Kunci Aplikasi (PIN)"
          >
            <Lock size={16} />
          </button>
        )}

        {onLogout && (
          <button 
            type="button" 
            className="btn-icon" 
            onClick={onLogout} 
            title="Logout dari Perangkat Ini"
            style={{ color: 'var(--accent-rose)', borderColor: 'rgba(225, 29, 72, 0.3)' }}
          >
            <LogOut size={16} />
          </button>
        )}
      </div>
    </header>
  );
}
