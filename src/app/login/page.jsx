'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  LogIn, 
  Smartphone, 
  ShieldCheck, 
  AlertCircle,
  Loader2
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retryAfter, setRetryAfter] = useState(0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Harap isi username dan kata sandi.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (res.status === 429) {
          setRetryAfter(data.retryAfterSeconds || 60);
          setError(data.error || 'Terlalu banyak percobaan gagal. Akses diblokir sementara.');
        } else {
          setError(data.error || 'Username atau kata sandi tidak valid.');
        }
        setLoading(false);
        return;
      }

      // Login berhasil, simpan user state dan arahkan ke beranda kasir
      if (typeof window !== 'undefined') {
        localStorage.setItem('pos_user', JSON.stringify(data.user));
        localStorage.setItem('pos_logged_in', 'true');
      }

      router.push('/');
      router.refresh();
    } catch (err) {
      console.error('Login submit error:', err);
      setError('Gagal menghubungi server. Periksa koneksi internet Anda.');
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px',
      background: 'linear-gradient(180deg, #ecfdf5 0%, #f8fafc 100%)'
    }}>
      <div style={{
        maxWidth: '420px',
        width: '100%',
        background: '#ffffff',
        borderRadius: '24px',
        padding: '32px 24px',
        boxShadow: '0 20px 40px -10px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05)',
        border: '1px solid #e2e8f0'
      }}>
        {/* Brand & Logo */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '20px',
            background: '#ffffff',
            margin: '0 auto 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 16px rgba(5, 150, 105, 0.12)',
            border: '1px solid #a7f3d0'
          }}>
            <img 
              src="/images/logo-shelby-rent.png" 
              alt="Logo Shelby Rent" 
              style={{ maxHeight: '60px', maxWidth: '60px', objectFit: 'contain' }}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#059669', letterSpacing: '-0.5px' }}>
            SHELBY RENT
          </h1>
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
            Sistem Kasir & Pembukuan Rental Motor
          </p>
        </div>

        {/* Fitur Multi-Perangkat Badge */}
        <div style={{
          background: '#ecfdf5',
          border: '1px solid #a7f3d0',
          borderRadius: '12px',
          padding: '10px 12px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '12px',
          color: '#065f46'
        }}>
          <Smartphone size={20} color="#059669" style={{ flexShrink: 0 }} />
          <div>
            <strong>Akses Multi-Perangkat Aktif</strong>
            <div style={{ fontSize: '11px', color: '#047857' }}>
              1 akun dapat login bersamaan di beberapa smartphone kasir & laptop tanpa terputus.
            </div>
          </div>
        </div>

        {/* Notifikasi Error */}
        {error && (
          <div style={{
            background: '#fff1f2',
            border: '1px solid #fecdd3',
            color: '#be123c',
            padding: '12px 14px',
            borderRadius: '12px',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            fontSize: '13px'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>{error}</div>
          </div>
        )}

        {/* Form Login */}
        <form onSubmit={handleSubmit}>
          {/* Input Username */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label" style={{ fontWeight: '700', fontSize: '13px' }}>
              Username Akun
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Masukkan username..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoCapitalize="none"
                autoComplete="username"
                required
                style={{ paddingLeft: '38px' }}
              />
              <User 
                size={18} 
                color="#94a3b8" 
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} 
              />
            </div>
          </div>

          {/* Input Password */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label" style={{ fontWeight: '700', fontSize: '13px' }}>
              Kata Sandi
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-control"
                placeholder="Masukkan kata sandi..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                style={{ paddingLeft: '38px', paddingRight: '40px' }}
              />
              <Lock 
                size={18} 
                color="#94a3b8" 
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Remember Me Checkbox */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: '#475569' }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ accentColor: '#059669', width: '16px', height: '16px' }}
              />
              <span>Ingat saya di perangkat ini</span>
            </label>
          </div>

          {/* Tombol Submit */}
          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading || retryAfter > 0}
            style={{
              padding: '12px',
              fontSize: '15px',
              fontWeight: '700',
              borderRadius: '12px',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)'
            }}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="spin-animate" />
                <span>Memverifikasi...</span>
              </>
            ) : (
              <>
                <LogIn size={18} />
                <span>Masuk ke Aplikasi Kasir</span>
              </>
            )}
          </button>
        </form>

        {/* Info Bawaan */}
        <div style={{
          marginTop: '20px',
          paddingTop: '16px',
          borderTop: '1px dashed #e2e8f0',
          textAlign: 'center',
          fontSize: '11px',
          color: '#64748b'
        }}>
          <div>Aplikasi POS Kasir & Rental Motor Shelby</div>
          <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: '#059669' }}>
            <ShieldCheck size={13} />
            <span>Dilindungi Brute-Force Rate Limiting & Enkripsi Sesi</span>
          </div>
        </div>
      </div>
    </div>
  );
}
