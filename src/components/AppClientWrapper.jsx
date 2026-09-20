'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Header from './Header';
import BottomNav from './BottomNav';
import PinLockModal from './PinLockModal';
import { getSettings } from '../lib/storage';

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
      navigator.serviceWorker.register('/service-worker.js').catch((err) => {
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

    setAuthChecked(true);
    // Jika belum login dan sedang mengakses halaman internal, arahkan ke /login
    if (!isLoginPage) {
      router.push('/login');
    }
  };

  const handleLogout = async () => {
    if (confirm('Apakah Anda yakin ingin logout dari perangkat ini? (Perangkat lain akan tetap aktif)')) {
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

  // Jika sedang di halaman login, tampilkan layar login tanpa Header & BottomNav
  if (isLoginPage) {
    return <>{children}</>;
  }

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
