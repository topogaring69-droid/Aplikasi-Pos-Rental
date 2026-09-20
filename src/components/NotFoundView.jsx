'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Home, 
  LogIn, 
  ArrowLeft, 
  Compass
} from 'lucide-react';

export default function NotFoundView({ user = null }) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(user);

  useEffect(() => {
    if (user) {
      setCurrentUser(user);
      return;
    }

    // Cek sesi pengguna secara diam-diam hanya untuk menentukan target tombol navigasi
    let isMounted = true;
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted) return;
        if (data?.authenticated && data?.user) {
          setCurrentUser(data.user);
        } else {
          setCurrentUser(null);
        }
      })
      .catch(() => {
        if (isMounted) setCurrentUser(null);
      });

    return () => {
      isMounted = false;
    };
  }, [user]);

  const isLoggedIn = Boolean(currentUser);

  return (
    <div
      style={{
        minHeight: '85vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: '450px',
          width: '100%',
          textAlign: 'center',
          padding: '36px 24px',
          boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.08), 0 0 1px 1px rgba(0,0,0,0.05)',
          borderRadius: '20px',
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid var(--border)',
          background: 'var(--bg-card)',
        }}
      >
        {/* Dekorasi Aksen Lingkaran Latar Belakang */}
        <div
          style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '140px',
            height: '140px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(5, 150, 105, 0.1) 0%, rgba(255,255,255,0) 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Icon Ilustrasi Standar 404 (Tanpa petunjuk otorisasi) */}
        <div
          style={{
            width: '76px',
            height: '76px',
            margin: '0 auto 20px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(5, 150, 105, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
          }}
        >
          <Compass size={36} color="var(--primary)" />
        </div>

        {/* Angka 404 Standar */}
        <div
          style={{
            fontSize: '64px',
            fontWeight: '900',
            letterSpacing: '-2px',
            lineHeight: 1,
            marginBottom: '8px',
            background: 'linear-gradient(135deg, #059669, #0f172a)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          404
        </div>

        {/* Judul & Keterangan Generik (Sama persis untuk semua rute tanpa membocorkan status rute) */}
        <h2
          style={{
            fontSize: '19px',
            fontWeight: '800',
            color: 'var(--text-main)',
            marginBottom: '8px',
          }}
        >
          Halaman Tidak Ditemukan
        </h2>

        <p
          style={{
            fontSize: '13px',
            color: 'var(--text-muted)',
            lineHeight: '1.6',
            marginBottom: '26px',
          }}
        >
          Mohon maaf, halaman yang Anda cari tidak ditemukan, telah dipindahkan, atau tautan yang Anda masukkan salah.
        </p>

        {/* Tombol Aksi: Masuk Login jika belum login, Dashboard jika sudah login */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {isLoggedIn ? (
            /* Jika SUDAH login -> tombol ke Halaman Utama */
            <Link
              href="/"
              className="btn btn-primary btn-block"
              style={{
                padding: '12px',
                fontSize: '14px',
                fontWeight: '700',
                borderRadius: '12px',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
              }}
            >
              <Home size={18} />
              <span>Kembali ke Halaman Utama</span>
            </Link>
          ) : (
            /* Jika BELUM login -> tombol ke Halaman Login */
            <Link
              href="/login"
              className="btn btn-primary btn-block"
              style={{
                padding: '12px',
                fontSize: '14px',
                fontWeight: '700',
                borderRadius: '12px',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
              }}
            >
              <LogIn size={18} />
              <span>Masuk ke Halaman Login</span>
            </Link>
          )}

          <button
            type="button"
            className="btn btn-secondary btn-block"
            onClick={() => router.back()}
            style={{
              padding: '10px',
              fontSize: '13px',
              borderRadius: '12px',
              gap: '6px',
            }}
          >
            <ArrowLeft size={16} />
            <span>Kembali ke Halaman Sebelumnya</span>
          </button>
        </div>
      </div>
    </div>
  );
}
