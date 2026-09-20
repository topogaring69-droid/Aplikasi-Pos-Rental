'use client';

import React, { useState, useEffect } from 'react';
import { 
  Bike, 
  Search, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  Clock, 
  X,
  RotateCcw,
  AlertCircle,
  Download,
  FileText,
  ChevronDown,
  Calendar,
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { 
  fetchFleet, 
  saveFleetItem, 
  deleteFleetItem, 
  fetchSettings,
  formatRupiah 
} from '../../lib/storage';
import { exportFleetToCSV, exportFleetToPrintable } from '../../lib/fleetExport';
import { showToast, showConfirm } from '../../lib/sweetalert';
import { SkeletonList } from '../../components/Skeleton';

export default function ArmadaPage() {
  const [fleet, setFleet] = useState([]);
  const [settings, setSettings] = useState(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [nopol, setNopol] = useState('');
  const [brand, setBrand] = useState('Honda');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [year, setYear] = useState('2023');
  const [dailyRate, setDailyRate] = useState(100000);
  const [status, setStatus] = useState('available');
  const [taxAnnualDate, setTaxAnnualDate] = useState('');
  const [taxFiveYearDate, setTaxFiveYearDate] = useState('');

  useEffect(() => {
    loadFleet();
  }, []);

  const loadFleet = async () => {
    try {
      const [list, sett] = await Promise.all([fetchFleet(), fetchSettings()]);
      setFleet(list);
      setSettings(sett);
    } finally {
      setIsLoading(false);
    }
  };

  const getTaxBadge = (dateStr, label = 'Tahunan') => {
    if (!dateStr) {
      return {
        text: `${label}: Belum diatur`,
        daysLeft: null,
        status: 'none',
        style: { background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1' }
      };
    }
    const target = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((target - today) / (1000 * 60 * 60 * 24));

    let formattedDate = dateStr;
    try {
      formattedDate = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(target);
    } catch {}

    if (diffDays < 0) {
      return {
        text: `${label}: Terlewat ${Math.abs(diffDays)} hr (${formattedDate})`,
        daysLeft: diffDays,
        status: 'expired',
        style: { background: '#fef2f2', color: '#b91c1c', border: '1px solid #fca5a5' }
      };
    } else if (diffDays <= 30) {
      return {
        text: `${label}: ${diffDays} hr lagi (${formattedDate})`,
        daysLeft: diffDays,
        status: 'warning',
        style: { background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }
      };
    } else {
      return {
        text: `${label}: ${formattedDate}`,
        daysLeft: diffDays,
        status: 'safe',
        style: { background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }
      };
    }
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setNopol('');
    setBrand('Honda');
    setModel('');
    setColor('');
    setYear(new Date().getFullYear().toString());
    setDailyRate(100000);
    setStatus('available');
    setTaxAnnualDate('');
    setTaxFiveYearDate('');
    setShowForm(true);
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setNopol(item.nopol || '');
    setBrand(item.brand || 'Honda');
    setModel(item.model || '');
    setColor(item.color || '');
    setYear(item.year || '2023');
    setDailyRate(item.dailyRate || 100000);
    setStatus(item.status || 'available');
    setTaxAnnualDate(item.taxAnnualDate || '');
    setTaxFiveYearDate(item.taxFiveYearDate || '');
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    const confirmed = await showConfirm({
      title: 'Hapus Unit Kendaraan?',
      text: 'Data armada ini akan dihapus dari daftar aktif.',
      confirmButtonText: 'Ya, Hapus Unit',
      cancelButtonText: 'Batal',
      icon: 'warning',
      isDanger: true,
    });

    if (confirmed) {
      await deleteFleetItem(id);
      await loadFleet();
      showToast('Unit kendaraan berhasil dihapus', 'info');
    }
  };

  const handleStatusChange = async (item, newStatus) => {
    const updated = { ...item, status: newStatus };
    await saveFleetItem(updated);
    await loadFleet();
    showToast(`Status ${item.nopol} diubah menjadi ${newStatus}`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nopol.trim()) {
      showToast('Nomor polisi wajib diisi!', 'error');
      return;
    }
    if (!model.trim()) {
      showToast('Tipe/Model motor wajib diisi!', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const id = editingId || `MTR-${Date.now().toString().slice(-4)}`;
      const motorData = {
        id,
        nopol: nopol.toUpperCase().trim(),
        brand,
        model: model.trim(),
        color: color.trim(),
        year: year.trim(),
        dailyRate: Number(dailyRate),
        status,
        taxAnnualDate: taxAnnualDate || null,
        taxFiveYearDate: taxFiveYearDate || null,
      };

      await saveFleetItem(motorData);
      await loadFleet();
      setShowForm(false);
      showToast(editingId ? 'Data motor diperbarui!' : 'Motor baru berhasil disimpan!');
    } catch (err) {
      console.error('Error saving fleet:', err);
      showToast('Gagal menyimpan armada: ' + (err.message || 'Terjadi kesalahan'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredFleet = fleet.filter((m) => {
    const q = search.toLowerCase();
    return (
      m.nopol.toLowerCase().includes(q) ||
      m.model.toLowerCase().includes(q) ||
      m.brand.toLowerCase().includes(q)
    );
  });

  const availableCount = fleet.filter((m) => m.status === 'available').length;
  const rentedCount = fleet.filter((m) => m.status === 'rented').length;
  const maintenanceCount = fleet.filter((m) => m.status === 'maintenance').length;

  const taxAlertCount = fleet.filter((m) => {
    const a = getTaxBadge(m.taxAnnualDate);
    const f = getTaxBadge(m.taxFiveYearDate);
    return a.status === 'expired' || a.status === 'warning' || f.status === 'expired' || f.status === 'warning';
  }).length;

  return (
    <div>

      {/* Banner Peringatan Pajak Jatuh Tempo */}
      {taxAlertCount > 0 && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          borderRadius: '10px',
          padding: '12px 16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '13px',
          color: '#92400e',
          boxShadow: '0 2px 8px rgba(245, 158, 11, 0.08)'
        }}>
          <AlertCircle size={20} color="#d97706" style={{ flexShrink: 0 }} />
          <div>
            <strong>Perhatian Masa Berlaku Pajak:</strong> Terdapat <strong>{taxAlertCount} unit motor</strong> yang pajaknya mendekati jatuh tempo (dalam 30 hari) atau telah terlewat. Periksa detail pada kartu unit di bawah.
          </div>
        </div>
      )}

      <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', position: 'relative' }}>
        <button
          type="button"
          className="btn btn-primary"
          disabled={isSubmitting}
          onClick={() => {
            if (showForm) {
              setShowForm(false);
            } else {
              handleOpenNew();
            }
          }}
          style={{ flex: 2, gap: '8px', fontSize: '14px' }}
        >
          {showForm && <X size={18} />}
          <span>{showForm ? 'Tutup Formulir' : 'Tambah Motor Baru'}</span>
        </button>

        <div style={{ position: 'relative', flex: 1 }}>
          <button
            type="button"
            className="btn btn-outline btn-block"
            onClick={() => setShowExportMenu(!showExportMenu)}
            style={{ gap: '6px', fontSize: '13px', height: '100%', borderColor: 'var(--primary)', color: 'var(--primary)' }}
          >
            <Download size={15} />
            <span>Ekspor</span>
            <ChevronDown size={14} />
          </button>

          {showExportMenu && (
            <div 
              className="card" 
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '6px',
                zIndex: 50,
                minWidth: '220px',
                padding: '8px',
                boxShadow: '0 12px 28px rgba(0,0,0,0.15)',
                border: '1px solid var(--border)',
                background: '#ffffff'
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '6px', padding: '0 4px' }}>
                PILIH FORMAT EKSPOR:
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-block btn-sm"
                onClick={() => {
                  setShowExportMenu(false);
                  exportFleetToCSV(fleet);
                }}
                style={{ justifyContent: 'flex-start', gap: '8px', marginBottom: '6px', textAlign: 'left', width: '100%' }}
              >
                <Download size={14} color="var(--primary)" />
                <span>Unduh Excel (.CSV)</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-block btn-sm"
                onClick={() => {
                  setShowExportMenu(false);
                  exportFleetToPrintable(fleet, settings);
                }}
                style={{ justifyContent: 'flex-start', gap: '8px', textAlign: 'left', width: '100%' }}
              >
                <FileText size={14} color="var(--accent-blue)" />
                <span>Cetak / Simpan PDF</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div 
          className="card" 
          style={{ 
            borderColor: editingId ? 'var(--accent-amber)' : 'var(--primary-border)', 
            background: '#ffffff', 
            marginBottom: '24px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.06)'
          }}
        >
          <div className="card-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '16px' }}>
            <span className="card-title">
              <Bike size={18} color={editingId ? 'var(--accent-amber)' : 'var(--primary)'} />
              {editingId ? 'Edit Data Kendaraan' : 'Form Tambah Kendaraan Baru'}
            </span>
            <span className={`badge ${editingId ? 'badge-warning' : 'badge-success'}`}>
              {editingId ? 'Mode Edit' : 'Database Aktif'}
            </span>
          </div>

          {editingId && (
            <div style={{ 
              background: 'rgba(245, 158, 11, 0.08)', 
              border: '1px solid rgba(245, 158, 11, 0.3)', 
              padding: '10px 14px', 
              borderRadius: '8px', 
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '13px',
              color: '#92400e'
            }}>
              <AlertCircle size={18} />
              <div>
                Anda sedang mengubah data armada <strong>{nopol || editingId}</strong>. Klik <em>"Simpan Perubahan"</em> untuk memperbarui.
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Nomor Polisi (Plat Motor) *</label>
              <input
                type="text"
                className="form-control"
                placeholder="Contoh: B 1234 ABC"
                value={nopol}
                onChange={(e) => setNopol(e.target.value.toUpperCase())}
                style={{ fontFamily: 'var(--font-mono)', fontSize: '16px', fontWeight: '700' }}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group">
                <label className="form-label">Merk</label>
                <select
                  className="form-control"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                >
                  <option value="Honda">Honda</option>
                  <option value="Yamaha">Yamaha</option>
                  <option value="Suzuki">Suzuki</option>
                  <option value="Kawasaki">Kawasaki</option>
                  <option value="Vespa">Vespa</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Tipe / Model *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="NMAX 155 / Beat / Vario"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group">
                <label className="form-label">Warna Kendaraan</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Hitam Doff / Merah"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tahun Pembuatan</label>
                <input
                  type="text"
                  className="form-control"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  inputMode="numeric"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group">
                <label className="form-label">Tarif Sewa Harian (Rp) *</label>
                <input
                  type="number"
                  className="form-control"
                  value={dailyRate}
                  onChange={(e) => setDailyRate(Number(e.target.value))}
                  inputMode="numeric"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Status Ketersediaan</label>
                <select
                  className="form-control"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="available">Tersedia</option>
                  <option value="rented">Sedang Disewa</option>
                  <option value="maintenance">Dalam Perawatan/Servis</option>
                </select>
              </div>
            </div>

            {/* Input Data Pajak Kendaraan */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px', marginBottom: '14px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px' }}>
                  <Calendar size={14} color="var(--primary)" />
                  <span>Jatuh Tempo Pajak Tahunan (PKB)</span>
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={taxAnnualDate}
                  onChange={(e) => setTaxAnnualDate(e.target.value)}
                />
                <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '3px' }}>
                  Pembayaran PKB / STNK tahunan
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px' }}>
                  <ShieldAlert size={14} color="var(--accent-blue)" />
                  <span>Jatuh Tempo Pajak 5 Thn (Plat)</span>
                </label>
                <input
                  type="date"
                  className="form-control"
                  value={taxFiveYearDate}
                  onChange={(e) => setTaxFiveYearDate(e.target.value)}
                />
                <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '3px' }}>
                  Ganti plat kaleng & STNK 5 tahunan
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              {editingId && (
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={isSubmitting}
                  onClick={() => {
                    setEditingId(null);
                    setShowForm(false);
                  }}
                  style={{ flex: 1 }}
                >
                  <RotateCcw size={16} />
                  <span>Batal Edit</span>
                </button>
              )}
              <button 
                type="submit" 
                className="btn btn-primary btn-block" 
                disabled={isSubmitting}
                style={{ flex: 2 }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="spin-animate" />
                    <span>{editingId ? 'Menyimpan Perubahan...' : 'Menyimpan Kendaraan...'}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    <span>{editingId ? 'Simpan Perubahan' : 'Simpan Kendaraan'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Ringkasan Armada */}
      <div className="stat-card-grid">
        <div className="stat-card income">
          <div className="stat-label">Tersedia</div>
          <div className="stat-val" style={{ color: 'var(--primary)' }}>{availableCount} Unit</div>
        </div>
        <div className="stat-card expense">
          <div className="stat-label">Disewa</div>
          <div className="stat-val" style={{ color: 'var(--accent-amber)' }}>{rentedCount} Unit</div>
        </div>
        <div className="stat-card profit">
          <div className="stat-label">Servis</div>
          <div className="stat-val" style={{ color: 'var(--accent-rose)' }}>{maintenanceCount} Unit</div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="search-box">
        <Search className="search-icon" size={16} />
        <input
          type="text"
          className="search-input"
          placeholder="Cari nopol, merk, atau tipe motor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* List Armada */}
      {isLoading ? (
        <SkeletonList count={3} variant="fleet" />
      ) : filteredFleet.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-dim)' }}>
          Tidak ada data motor yang cocok.
        </div>
      ) : (
        filteredFleet.map((m) => {
          const statusBadge = 
            m.status === 'available'
              ? <span className="badge badge-success">Tersedia</span>
              : m.status === 'rented'
              ? <span className="badge badge-warning">Sedang Disewa</span>
              : <span className="badge badge-danger">Dalam Servis</span>;

          return (
            <div key={m.id} className="list-item" style={{ cursor: 'default' }}>
              <div className="item-top">
                <span className="badge badge-plate" style={{ fontSize: '13px' }}>{m.nopol}</span>
                {statusBadge}
              </div>

              <div className="item-middle">
                <div>
                  <div className="item-title">{m.brand} {m.model}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {m.color} ({m.year})
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                    {formatRupiah(m.dailyRate)}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>/ Hari</div>
                </div>
              </div>

              {/* Status Pajak Tahunan & 5 Tahunan */}
              {(() => {
                const annualTax = getTaxBadge(m.taxAnnualDate, 'Tahunan');
                const fiveYearTax = getTaxBadge(m.taxFiveYearDate, '5 Thn (Plat)');

                return (
                  <div style={{
                    marginTop: '10px',
                    padding: '8px 10px',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', flexWrap: 'wrap', gap: '4px' }}>
                      <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Calendar size={13} color="var(--primary)" />
                        <span>Pajak Tahunan (PKB):</span>
                      </span>
                      <span style={{ ...annualTax.style, padding: '2px 8px', borderRadius: '5px', fontSize: '11px', fontWeight: '700' }}>
                        {annualTax.text}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', flexWrap: 'wrap', gap: '4px' }}>
                      <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <ShieldAlert size={13} color="var(--accent-blue)" />
                        <span>Pajak 5 Thn (Ganti Plat):</span>
                      </span>
                      <span style={{ ...fiveYearTax.style, padding: '2px 8px', borderRadius: '5px', fontSize: '11px', fontWeight: '700' }}>
                        {fiveYearTax.text}
                      </span>
                    </div>
                  </div>
                );
              })()}

              <div className="item-bottom" style={{ marginTop: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Ubah Status:</span>
                  <select
                    className="form-control"
                    value={m.status}
                    onChange={(e) => handleStatusChange(m, e.target.value)}
                    style={{ minHeight: '30px', height: '30px', padding: '2px 24px 2px 8px', fontSize: '11px' }}
                  >
                    <option value="available">Tersedia</option>
                    <option value="rented">Disewa</option>
                    <option value="maintenance">Servis</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    className="btn-icon"
                    style={{ width: '32px', height: '32px', color: 'var(--accent-amber)' }}
                    onClick={() => handleEdit(m)}
                    title="Edit Data Motor"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    type="button"
                    className="btn-icon"
                    style={{ width: '32px', height: '32px', color: 'var(--accent-rose)' }}
                    onClick={() => handleDelete(m.id)}
                    title="Hapus Unit"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
