'use client';

import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  User, 
  Lock, 
  Receipt, 
  Save, 
  Upload, 
  Database, 
  Download, 
  LogOut, 
  ShieldCheck, 
  CheckCircle2,
  Phone,
  MapPin,
  FileText
} from 'lucide-react';
import { 
  fetchSettings, 
  saveSettings, 
  exportAllData, 
  importAllData 
} from '../../lib/storage';
import Toast from '../../components/Toast';

export default function PengaturanPage() {
  const [settings, setSettings] = useState(null);
  const [toast, setToast] = useState(null);

  // Form Profile & Keamanan
  const [cashierName, setCashierName] = useState('');
  const [role, setRole] = useState('Kasir Utama');
  const [isPinEnabled, setIsPinEnabled] = useState(false);
  const [pin, setPin] = useState('');

  // Form Pengaturan Struk
  const [storeName, setStoreName] = useState('');
  const [tagline, setTagline] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [footerNote, setFooterNote] = useState('');
  const [paperSize, setPaperSize] = useState('58mm');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const s = await fetchSettings();
    setSettings(s);
    if (s) {
      setCashierName(s.cashierName || '');
      setRole(s.role || 'Kasir');
      setIsPinEnabled(Boolean(s.isPinEnabled));
      setPin(s.pin || '');
      setStoreName(s.storeName || '');
      setTagline(s.tagline || '');
      setAddress(s.address || '');
      setPhone(s.phone || '');
      setLogoUrl(s.logoUrl || '');
      setFooterNote(s.footerNote || '');
      setPaperSize(s.paperSize || '58mm');
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast('Ukuran logo maksimal 2MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setLogoUrl(event.target.result);
      showToast('Logo berhasil diunggah!');
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (isPinEnabled && pin.length < 4) {
      showToast('PIN keamanan minimal 4 digit angka!', 'error');
      return;
    }

    const updated = {
      ...settings,
      cashierName: cashierName.trim(),
      role: role.trim(),
      isPinEnabled,
      pin: pin.trim(),
      storeName: storeName.trim(),
      tagline: tagline.trim(),
      address: address.trim(),
      phone: phone.trim(),
      logoUrl,
      footerNote: footerNote.trim(),
      paperSize
    };

    await saveSettings(updated);
    setSettings(updated);
    showToast('Pengaturan akun & struk berhasil disimpan ke SQLite!');
  };

  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        importAllData(parsed);
        showToast('Data berhasil dipulihkan dari cadangan!', 'success');
        setTimeout(() => window.location.reload(), 1000);
      } catch (err) {
        showToast('Gagal memproses file cadangan. Format salah.', 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '800' }}>Menu Akun & Pengaturan Struk</h2>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Atur profil pengguna, keamanan PIN kasir, dan identitas struk thermal (Tersimpan di SQLite)
        </p>
      </div>

      <form onSubmit={handleSave}>
        {/* PENGATURAN STRUK */}
        <div className="card" style={{ borderColor: 'var(--primary-border)', marginBottom: '20px' }}>
          <div className="card-header">
            <span className="card-title">
              <Receipt size={18} color="var(--primary)" />
              Pengaturan Struk Kasir
            </span>
            <span className="badge badge-success">SQLite Database</span>
          </div>

          <div className="form-group">
            <label className="form-label">Nama Usaha / Toko Rental *</label>
            <input
              type="text"
              className="form-control"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="Contoh: GARASI RENTAL MOTOR"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Slogan / Sub-judul Usaha</label>
            <input
              type="text"
              className="form-control"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Contoh: Sewa Motor Cepat & Terpercaya"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Alamat Usaha *</label>
            <input
              type="text"
              className="form-control"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Alamat lengkap outlet atau garasi..."
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="form-group">
              <label className="form-label">Nomor Telepon / WhatsApp *</label>
              <input
                type="text"
                className="form-control"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0812-..."
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Lebar Kertas Thermal</label>
              <select
                className="form-control"
                value={paperSize}
                onChange={(e) => setPaperSize(e.target.value)}
              >
                <option value="58mm">58mm (Standar Portabel)</option>
                <option value="80mm">80mm (Printer Kasir Lebar)</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Logo Toko (Opsional)</label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', gap: '6px' }}>
                <Upload size={14} />
                <span>Upload Logo Toko</span>
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleLogoUpload}
                />
              </label>

              {logoUrl && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  style={{ color: 'var(--accent-rose)', borderColor: 'rgba(244, 63, 94, 0.4)' }}
                  onClick={() => setLogoUrl('')}
                >
                  Hapus Logo
                </button>
              )}
            </div>

            {logoUrl && (
              <div style={{ marginTop: '8px' }}>
                <img
                  src={logoUrl}
                  alt="Logo"
                  style={{ maxHeight: '50px', maxWidth: '140px', objectFit: 'contain', background: '#fff', padding: '4px', borderRadius: '6px' }}
                />
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Catatan Bagian Bawah Struk (Syarat & Ketentuan Sewa)</label>
            <textarea
              className="form-control"
              rows="4"
              value={footerNote}
              onChange={(e) => setFooterNote(e.target.value)}
              placeholder="Catatan aturan helm, bensin, denda keterlambatan..."
            />
          </div>

          {/* LIVE PREVIEW STRUK */}
          <div style={{ marginTop: '16px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--primary)', marginBottom: '10px', textAlign: 'center' }}>
              PRATINJAU LANGSUNG STRUK KASIR ({paperSize})
            </div>

            <div className={`receipt-paper ${paperSize === '80mm' ? 'w-80' : 'w-58'}`} style={{ margin: '0 auto', boxShadow: 'none' }}>
              <div className="receipt-header">
                {logoUrl && (
                  <img src={logoUrl} alt="Logo" style={{ maxHeight: '38px', maxWidth: '100px', objectFit: 'contain', marginBottom: '4px' }} />
                )}
                <h2>{storeName || 'NAMA TOKO'}</h2>
                {tagline && <p>{tagline}</p>}
                <p>{address || 'Alamat Toko'}</p>
                <p>Telp/WA: {phone || '-'}</p>
              </div>

              <div className="receipt-meta">
                <div className="receipt-row">
                  <span>No. Nota:</span>
                  <span style={{ fontWeight: '700' }}>TRX-CONTOH-001</span>
                </div>
                <div className="receipt-row">
                  <span>Pelanggan:</span>
                  <span>Rian Hidayat</span>
                </div>
                <div className="receipt-row">
                  <span>No. Polisi:</span>
                  <span style={{ fontWeight: '800' }}>B 4812 KDA</span>
                </div>
              </div>

              <div>
                <div className="receipt-row">
                  <span>Sewa Motor (2 Hari)</span>
                  <span>Rp 280.000</span>
                </div>
                <div className="receipt-row">
                  <span>+ Helm Tambahan</span>
                  <span>Rp 20.000</span>
                </div>
                <div className="receipt-divider" />
                <div className="receipt-row receipt-total">
                  <span>TOTAL</span>
                  <span>Rp 300.000</span>
                </div>
              </div>

              <div className="receipt-footer">
                <div className="receipt-divider" />
                <p>{footerNote || 'Terima kasih atas kunjungan Anda!'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* PROFIL AKUN & PIN */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-header">
            <span className="card-title">
              <User size={18} color="var(--primary)" />
              Profil Akun & Keamanan
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="form-group">
              <label className="form-label">Nama Pengguna / Kasir</label>
              <input
                type="text"
                className="form-control"
                value={cashierName}
                onChange={(e) => setCashierName(e.target.value)}
                placeholder="Nama Operator"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Peran / Jabatan</label>
              <input
                type="text"
                className="form-control"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Misal: Kasir Utama"
              />
            </div>
          </div>

          <div className="form-group" style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: '12px', marginTop: '6px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '700' }}>
              <input
                type="checkbox"
                checked={isPinEnabled}
                onChange={(e) => setIsPinEnabled(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
              />
              <span>Aktifkan Kunci Layar PIN untuk Kasir</span>
            </label>

            {isPinEnabled && (
              <div style={{ marginTop: '10px' }}>
                <label className="form-label">Kode PIN Keamanan (4-6 Digit Angka) *</label>
                <input
                  type="password"
                  maxLength={6}
                  className="form-control"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Contoh: 1234"
                  inputMode="numeric"
                  required={isPinEnabled}
                  style={{ letterSpacing: '4px', fontSize: '18px', fontWeight: '700', textAlign: 'center' }}
                />
              </div>
            )}
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <button type="submit" className="btn btn-primary btn-block" style={{ fontSize: '15px' }}>
            <Save size={18} />
            <span>Simpan Semua Pengaturan ke SQLite</span>
          </button>
        </div>
      </form>

      {/* CADANGAN & PEMULIHAN */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">
            <Database size={18} color="#60a5fa" />
            Cadangan & Pemulihan Data
          </span>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
          Simpan cadangan database SQLite ke file JSON atau pulihkan data dari perangkat lain.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={exportAllData}
            style={{ gap: '6px', fontSize: '13px' }}
          >
            <Download size={16} />
            <span>Ekspor Data (JSON)</span>
          </button>

          <label className="btn btn-outline" style={{ cursor: 'pointer', gap: '6px', fontSize: '13px' }}>
            <Upload size={16} />
            <span>Pulihkan Data</span>
            <input
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleImportFile}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
