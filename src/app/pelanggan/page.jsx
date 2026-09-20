'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  PlusCircle, 
  Search, 
  Trash2, 
  Edit3, 
  Phone, 
  CreditCard, 
  MapPin, 
  CheckCircle2, 
  X, 
  Bike,
  ShieldCheck,
  RotateCcw,
  AlertCircle
} from 'lucide-react';
import { 
  fetchCustomers, 
  saveCustomer, 
  deleteCustomer 
} from '../../lib/storage';
import Toast from '../../components/Toast';

export default function PelangganPage() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [nik, setNik] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [notes, setNotes] = useState('');
  const [totalRentals, setTotalRentals] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await fetchCustomers();
    setCustomers(data);
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setName('');
    setPhone('');
    setNik('');
    setAddress('');
    setEmergencyContact('');
    setNotes('');
    setTotalRentals(0);
    setShowForm(true);
  };

  const handleEdit = (cust) => {
    setEditingId(cust.id);
    setName(cust.name || '');
    setPhone(cust.phone || '');
    setNik(cust.nik || '');
    setAddress(cust.address || '');
    setEmergencyContact(cust.emergencyContact || '');
    setNotes(cust.notes || '');
    setTotalRentals(cust.totalRentals || 0);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Yakin ingin menghapus data pelanggan ini?')) {
      await deleteCustomer(id);
      await loadData();
      showToast('Data pelanggan berhasil dihapus', 'info');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Nama pelanggan wajib diisi!', 'error');
      return;
    }

    const id = editingId || `CST-${Date.now().toString().slice(-4)}`;
    const custData = {
      id,
      name: name.trim(),
      phone: phone.trim(),
      nik: nik.trim(),
      address: address.trim(),
      emergencyContact: emergencyContact.trim(),
      notes: notes.trim(),
      totalRentals: Number(totalRentals) || 0,
      createdAt: new Date().toISOString()
    };

    await saveCustomer(custData);
    await loadData();
    setShowForm(false);
    showToast(editingId ? 'Data pelanggan diperbarui!' : 'Pelanggan baru berhasil ditambahkan!');
  };

  const filteredCustomers = customers.filter((c) => {
    const q = search.toLowerCase();
    return (
      (c.name || '').toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q) ||
      (c.nik || '').toLowerCase().includes(q)
    );
  });

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header & Tombol Tambah */}
      <div style={{ marginBottom: '16px' }}>
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={() => {
            if (showForm) {
              setShowForm(false);
            } else {
              handleOpenNew();
            }
          }}
          style={{ gap: '10px', fontSize: '15px' }}
        >
          {showForm ? <X size={20} /> : <PlusCircle size={20} />}
          <span>{showForm ? 'Tutup Formulir' : '+ Tambah Pelanggan Baru'}</span>
        </button>
      </div>

      {/* Form Tambah/Edit Pelanggan */}
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
              <Users size={18} color={editingId ? 'var(--accent-amber)' : 'var(--primary)'} />
              {editingId ? 'Edit Data Pelanggan' : 'Form Tambah Pelanggan Master'}
            </span>
            <span className={`badge ${editingId ? 'badge-warning' : 'badge-success'}`}>
              {editingId ? 'Mode Edit' : 'Dapat Dipakai Berulang'}
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
                Anda sedang mengubah data pelanggan <strong>{name || editingId}</strong>. Klik <em>"Simpan Perubahan Pelanggan"</em> untuk memperbarui.
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Nama Lengkap Pelanggan *</label>
              <input
                type="text"
                className="form-control"
                placeholder="Contoh: Rian Hidayat"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group">
                <label className="form-label">No. WhatsApp / HP</label>
                <input
                  type="tel"
                  className="form-control"
                  placeholder="0812..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  inputMode="numeric"
                />
              </div>

              <div className="form-group">
                <label className="form-label">NIK / No. KTP</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="3171..."
                  value={nik}
                  onChange={(e) => setNik(e.target.value)}
                  inputMode="numeric"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Alamat Domisili / Tempat Tinggal</label>
              <input
                type="text"
                className="form-control"
                placeholder="Jl. Pemuda No..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Kontak Darurat (Keluarga / Kerabat)</label>
              <input
                type="text"
                className="form-control"
                placeholder="08... (Nama & Hubungan)"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Catatan Pelanggan (SIM C, Riwayat Sewa)</label>
              <textarea
                className="form-control"
                rows="2"
                placeholder="Pelanggan langganan, SIM C aktif, domisili terverifikasi..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              {editingId && (
                <button
                  type="button"
                  className="btn btn-outline"
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
              <button type="submit" className="btn btn-primary btn-block" style={{ flex: 2 }}>
                <CheckCircle2 size={18} />
                <span>{editingId ? 'Simpan Perubahan Pelanggan' : 'Simpan Pelanggan ke Database'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Bar Pencarian */}
      <div className="search-box">
        <Search className="search-icon" size={18} />
        <input
          type="text"
          className="search-input"
          placeholder="Cari pelanggan (nama, WhatsApp, atau NIK)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Statistik Pelanggan */}
      <div className="card" style={{ padding: '12px 16px', background: 'rgba(16, 185, 129, 0.08)', borderColor: 'rgba(16, 185, 129, 0.3)', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--primary)' }}>
              Total Pelanggan Terdaftar
            </div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--primary)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
              {customers.length} Pelanggan
            </div>
          </div>
          <span className="badge badge-success">
            Master Data Aktif
          </span>
        </div>
      </div>

      {/* Daftar Pelanggan */}
      {filteredCustomers.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-dim)' }}>
          <Users size={40} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
          <p style={{ fontWeight: '600', fontSize: '14px' }}>Belum ada data pelanggan</p>
          <p style={{ fontSize: '12px', marginTop: '4px' }}>Klik tombol "+ Tambah Pelanggan Baru" untuk mendaftarkan</p>
        </div>
      ) : (
        filteredCustomers.map((cust) => (
          <div key={cust.id} className="list-item" style={{ cursor: 'default' }}>
            <div className="item-top">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge" style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                  {cust.id}
                </span>
                <span className="badge badge-success" style={{ fontSize: '11px' }}>
                  {cust.totalRentals || 0}x Pernah Sewa
                </span>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  className="btn-icon"
                  style={{ width: '32px', height: '32px', color: 'var(--accent-amber)' }}
                  onClick={() => handleEdit(cust)}
                  title="Edit Data Pelanggan"
                >
                  <Edit3 size={15} />
                </button>
                <button
                  type="button"
                  className="btn-icon"
                  style={{ width: '32px', height: '32px', color: 'var(--accent-rose)' }}
                  onClick={() => handleDelete(cust.id)}
                  title="Hapus Pelanggan"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            <div className="item-middle">
              <div>
                <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main)' }}>
                  {cust.name}
                </div>
                {cust.nik && (
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                    NIK: {cust.nik}
                  </div>
                )}
              </div>
            </div>

            <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
              {cust.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <Phone size={13} color="var(--primary)" />
                  <span>{cust.phone}</span>
                </div>
              )}
              {cust.address && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <MapPin size={13} />
                  <span>{cust.address}</span>
                </div>
              )}
              {cust.notes && (
                <div style={{ background: 'var(--bg-input)', padding: '6px 10px', borderRadius: '6px', marginTop: '6px', fontSize: '11px' }}>
                  <span style={{ color: 'var(--primary)', fontWeight: '600' }}>Catatan: </span>
                  {cust.notes}
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
