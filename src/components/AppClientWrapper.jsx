'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Header from './Header';
import BottomNav from './BottomNav';
import PinLockModal from './PinLockModal';
import NotFoundView from './NotFoundView';
import { getSettings } from '../lib/storage';
import { showConfirm } from '../lib/sweetalert';

export default function AppClientWrapper({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [settings, setSettings] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const isLoginPage = pathname === '/login' || pathname === '/login/';

  useEffect(() => {
    // 1. Muat konfigurasi toko
    const s = getSettings();
    setSettings(s);
    if (s?.isPinEnabled && s?.pin) {
      setIsLocked(true);
    }

    // 2. Periksa Otentikasi Sesi Pengguna
    checkAuth();

    // 3. Daftarkan Service Worker PWA jika didukung
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((reg) => {
          reg.update();
        })
        .catch((err) => {
          console.log('SW registration error:', err);
        });
    }
  }, [pathname]);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setCurrentUser(data.user);
          setAuthChecked(true);
          // Jika sudah login dan membuka rute /login, arahkan ke beranda
          if (isLoginPage) {
            router.push('/');
          }
          return;
        }
      }
    } catch (e) {
      console.warn('Auth check error:', e);
    }

    setCurrentUser(null);
    setAuthChecked(true);
  };

  const handleLogout = async () => {
    const confirmed = await showConfirm({
      title: 'Logout dari Perangkat Ini?',
      text: 'Apakah Anda yakin ingin logout? Sesi pada perangkat lain akan tetap aktif.',
      confirmButtonText: 'Ya, Logout',
      cancelButtonText: 'Batal',
      icon: 'warning',
      isDanger: true,
    });

    if (confirmed) {
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
      } catch (e) {}
      if (typeof window !== 'undefined') {
        localStorage.removeItem('pos_user');
        localStorage.removeItem('pos_logged_in');
      }
      setCurrentUser(null);
      router.push('/login');
      router.refresh();
    }
  };

  const handleUnlock = () => {
    setIsLocked(false);
  };

  const handleLock = () => {
    setIsLocked(true);
  };

  // 1. Tampilkan indikator loading saat pemeriksaan sesi awal
  if (!authChecked) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-dark)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            className="spin-animate"
            style={{
              width: '32px',
              height: '32px',
              border: '3px solid rgba(5, 150, 105, 0.2)',
              borderTopColor: 'var(--primary)',
              borderRadius: '50%',
              margin: '0 auto 12px',
            }}
          />
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Memverifikasi sesi aman...</span>
        </div>
      </div>
    );
  }

  // 2. Jika sedang di halaman login, tampilkan layar login tanpa Header & BottomNav
  if (isLoginPage) {
    return <>{children}</>;
  }

  // 3. Jika belum login dan mengakses halaman internal -> Tampilkan 404 murni (tanpa membocorkan keberadaan rute)
  if (!currentUser) {
    return <NotFoundView user={null} />;
  }

  // 4. Jika sudah login -> Tampilkan layout utama lengkap
  return (
    <div className="app-container">
      {/* Header Aplikasi dengan tombol Logout */}
      <Header 
        settings={settings} 
        user={currentUser} 
        onLock={handleLock} 
        onLogout={handleLogout} 
      />

      {/* Konten Halaman */}
      <main className="main-content">
        {children}
      </main>

      {/* Navigasi Bawah Khusus Mobile */}
      <BottomNav />

      {/* Layar Kunci PIN jika diaktifkan */}
      {isLocked && settings?.pin && (
        <PinLockModal 
          correctPin={settings.pin} 
          onUnlock={handleUnlock} 
        />
      )}
    </div>
  );
}
