import { initialSettings } from './seedData.js';

const KEYS = {
  CUSTOMERS: 'pos_customers',
  FLEET: 'pos_fleet',
  TRANSACTIONS: 'pos_transactions',
  EXPENSES: 'pos_expenses',
  SETTINGS: 'pos_settings'
};

const isBrowser = typeof window !== 'undefined';

// ==================== PELANGGAN (CUSTOMERS) ====================

export async function fetchCustomers() {
  if (!isBrowser) return [];
  try {
    const res = await fetch('/api/pelanggan');
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(json.data));
        return json.data;
      }
    }
  } catch (e) {
    console.warn('Gagal fetch pelanggan dari API, fallback cache lokal:', e);
  }
  return getCustomers();
}

export function getCustomers() {
  if (!isBrowser) return [];
  try {
    const data = localStorage.getItem(KEYS.CUSTOMERS);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveCustomer(cust) {
  if (!isBrowser) return;
  const list = getCustomers();
  const isEdit = list.some((c) => c.id === cust.id);

  const res = await fetch('/api/pelanggan', {
    method: isEdit ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cust)
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    throw new Error(json.error || `Gagal menyimpan pelanggan (${res.status})`);
  }

  const saved = json.data || cust;
  const index = list.findIndex((c) => c.id === saved.id);
  if (index >= 0) {
    list[index] = saved;
  } else {
    list.unshift(saved);
  }
  localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(list));
  return list;
}

export async function deleteCustomer(id) {
  if (!isBrowser) return;
  const res = await fetch(`/api/pelanggan?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    throw new Error(json.error || `Gagal menghapus pelanggan (${res.status})`);
  }

  const list = getCustomers().filter((c) => c.id !== id);
  localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(list));
  return list;
}

// ==================== ARMADA (FLEET) ====================

export async function fetchFleet() {
  if (!isBrowser) return [];
  try {
    const res = await fetch('/api/armada');
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        localStorage.setItem(KEYS.FLEET, JSON.stringify(json.data));
        return json.data;
      }
    }
  } catch (e) {
    console.warn('Gagal fetch armada dari API, fallback cache lokal:', e);
  }
  return getFleet();
}

export function getFleet() {
  if (!isBrowser) return [];
  try {
    const data = localStorage.getItem(KEYS.FLEET);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveFleetItem(item) {
  if (!isBrowser) return;
  const list = getFleet();
  const isEdit = list.some((m) => m.id === item.id);

  const res = await fetch('/api/armada', {
    method: isEdit ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item)
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    throw new Error(json.error || `Gagal menyimpan armada (${res.status})`);
  }

  const saved = json.data || item;
  const index = list.findIndex((m) => m.id === saved.id);
  if (index >= 0) {
    list[index] = saved;
  } else {
    list.unshift(saved);
  }
  localStorage.setItem(KEYS.FLEET, JSON.stringify(list));
  return list;
}

export async function updateVehicleStatus(nopol, status) {
  if (!isBrowser || !nopol) return;
  const list = getFleet();
  const index = list.findIndex((m) => m.nopol.toUpperCase() === nopol.toUpperCase());
  if (index >= 0) {
    list[index].status = status;
    localStorage.setItem(KEYS.FLEET, JSON.stringify(list));
    try {
      await fetch('/api/armada', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(list[index])
      });
    } catch {}
  }
}

export async function deleteFleetItem(id) {
  if (!isBrowser) return;
  const res = await fetch(`/api/armada?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    throw new Error(json.error || `Gagal menghapus armada (${res.status})`);
  }

  const list = getFleet().filter((m) => m.id !== id);
  localStorage.setItem(KEYS.FLEET, JSON.stringify(list));
  return list;
}

// ==================== TRANSAKSI ====================

export async function fetchTransactions() {
  if (!isBrowser) return [];
  try {
    const res = await fetch('/api/transaksi');
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(json.data));
        return json.data;
      }
    }
  } catch (e) {
    console.warn('Gagal fetch transaksi dari API, fallback cache lokal:', e);
  }
  return getTransactions();
}

export function getTransactions() {
  if (!isBrowser) return [];
  try {
    const data = localStorage.getItem(KEYS.TRANSACTIONS);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveTransaction(tx) {
  if (!isBrowser) return;
  const list = getTransactions();
  const index = list.findIndex((t) => t.id === tx.id);
  const isEdit = index >= 0;
  const oldItem = isEdit ? list[index] : null;

  const res = await fetch('/api/transaksi', {
    method: isEdit ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tx)
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    throw new Error(json.error || `Gagal menyimpan transaksi (${res.status})`);
  }

  const saved = json.data || tx;

  if (isEdit) {
    list[index] = saved;
  } else {
    list.unshift(saved);
  }
  localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(list));

  // Jika nopol ganti saat edit, kembalikan nopol lama ke available
  if (oldItem && oldItem.nopol && oldItem.nopol.toUpperCase() !== saved.nopol?.toUpperCase()) {
    updateVehicleStatus(oldItem.nopol, 'available');
  }
  if (saved.nopol) {
    if (saved.status === 'booking') {
      // Motor belum diambil (masih booking)
    } else if (saved.status === 'selesai') {
      updateVehicleStatus(saved.nopol, 'available');
    } else {
      updateVehicleStatus(saved.nopol, 'rented');
    }
  }

  return list;
}

export function getTransactionStatus(tx) {
  if (!tx) return { key: 'selesai', label: 'Selesai', badgeClass: 'badge-secondary', color: '#64748b' };

  const rawStatus = (tx.status || 'active').toLowerCase();
  if (rawStatus === 'booking') {
    return {
      key: 'booking',
      label: 'Booking',
      badgeClass: 'badge-warning',
      color: '#d97706',
      subtext: 'Menunggu Pengambilan'
    };
  }

  if (rawStatus === 'selesai' || rawStatus === 'completed') {
    return {
      key: 'selesai',
      label: 'Selesai',
      badgeClass: 'badge-secondary',
      color: '#64748b',
      subtext: 'Unit Telah Kembali'
    };
  }

  // Cek masa aktif berdasarkan endDate
  const endTime = new Date(tx.endDate).getTime();
  const now = Date.now();
  const diffMs = endTime - now;

  if (isNaN(endTime)) {
    return {
      key: 'aktif',
      label: 'Aktif',
      badgeClass: 'badge-success',
      color: '#16a34a',
      subtext: 'Sedang Disewa'
    };
  }

  if (diffMs < 0) {
    const lateHours = Math.ceil(Math.abs(diffMs) / 3600000);
    return {
      key: 'terlambat',
      label: 'Terlambat',
      badgeClass: 'badge-danger',
      color: '#e11d48',
      lateHours,
      subtext: `Lewat ${lateHours} jam`
    };
  }

  // Jika sisa waktu <= 4 jam
  if (diffMs <= 4 * 3600000) {
    const remainingHours = (diffMs / 3600000).toFixed(1);
    return {
      key: 'hampir-selesai',
      label: 'Hampir Selesai',
      badgeClass: 'badge-warning',
      color: '#ea580c',
      remainingHours,
      subtext: `Sisa ${remainingHours} jam`
    };
  }

  const remainingHours = Math.ceil(diffMs / 3600000);
  const remainingDays = Math.ceil(diffMs / 86400000);
  return {
    key: 'aktif',
    label: 'Aktif',
    badgeClass: 'badge-success',
    color: '#16a34a',
    remainingHours,
    subtext: remainingDays > 1 ? `Sisa ${remainingDays} hari` : `Sisa ${remainingHours} jam`
  };
}

export async function activateTransaction(id) {
  if (!isBrowser) return;
  const res = await fetch('/api/transaksi', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, action: 'activate' })
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    throw new Error(json.error || `Gagal mengaktifkan transaksi (${res.status})`);
  }

  const updated = json.data;
  const list = getTransactions();
  const idx = list.findIndex((t) => t.id === id);
  if (idx >= 0) {
    list[idx] = updated;
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(list));
  }

  if (updated?.nopol) {
    updateVehicleStatus(updated.nopol, 'rented');
  }

  return updated;
}

export async function completeTransaction(id, extraNotes = '') {
  if (!isBrowser) return;
  const res = await fetch('/api/transaksi', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, action: 'complete', notes: extraNotes })
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    throw new Error(json.error || `Gagal menyelesaikan transaksi (${res.status})`);
  }

  const updated = json.data;
  const list = getTransactions();
  const idx = list.findIndex((t) => t.id === id);
  if (idx >= 0) {
    list[idx] = updated;
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(list));
  }

  if (updated?.nopol) {
    updateVehicleStatus(updated.nopol, 'available');
  }

  return updated;
}

export async function deleteTransaction(id) {
  if (!isBrowser) return;
  const res = await fetch(`/api/transaksi?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    throw new Error(json.error || `Gagal menghapus transaksi (${res.status})`);
  }

  const list = getTransactions();
  const item = list.find((t) => t.id === id);
  if (item && item.nopol) {
    updateVehicleStatus(item.nopol, 'available');
  }
  const filtered = list.filter((t) => t.id !== id);
  localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(filtered));
  return filtered;
}

// ==================== PENGELUARAN ====================

export async function fetchExpenses() {
  if (!isBrowser) return [];
  try {
    const res = await fetch('/api/pengeluaran');
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        localStorage.setItem(KEYS.EXPENSES, JSON.stringify(json.data));
        return json.data;
      }
    }
  } catch (e) {
    console.warn('Gagal fetch pengeluaran dari API, fallback cache lokal:', e);
  }
  return getExpenses();
}

export function getExpenses() {
  if (!isBrowser) return [];
  try {
    const data = localStorage.getItem(KEYS.EXPENSES);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveExpense(exp, file = null) {
  if (!isBrowser) return;

  let savedItem = { ...exp };

  // Kirim data ke backend (termasuk berkas foto jika ada yang diunggah saat submit)
  let res;
  if (file && typeof file === 'object') {
    const formData = new FormData();
    for (const [k, v] of Object.entries(exp)) {
      if (v !== null && v !== undefined) {
        formData.append(k, typeof v === 'boolean' ? String(v) : v);
      }
    }
    formData.append('file', file);

    res = await fetch('/api/pengeluaran', {
      method: 'POST',
      body: formData,
    });
  } else {
    res = await fetch('/api/pengeluaran', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(exp),
    });
  }

  const json = await res.json().catch(() => ({}));

  if (!res.ok || !json.success) {
    throw new Error(json.error || `Gagal menyimpan pengeluaran (${res.status})`);
  }

  if (json.data) {
    savedItem = json.data;
  }

  // Perbarui cache lokal browser setelah backend sukses
  const list = getExpenses();
  const index = list.findIndex((e) => e.id === savedItem.id);
  if (index >= 0) {
    list[index] = savedItem;
  } else {
    list.unshift(savedItem);
  }
  localStorage.setItem(KEYS.EXPENSES, JSON.stringify(list));

  return savedItem;
}

export async function deleteExpense(id) {
  if (!isBrowser) return;
  const list = getExpenses().filter((e) => e.id !== id);
  localStorage.setItem(KEYS.EXPENSES, JSON.stringify(list));

  try {
    await fetch(`/api/pengeluaran?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  } catch (e) {
    console.warn('Hapus pengeluaran di server tertunda:', e);
  }
  return list;
}

// ==================== PENGATURAN ====================

export async function fetchSettings() {
  if (!isBrowser) return initialSettings;
  try {
    const res = await fetch('/api/pengaturan');
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        localStorage.setItem(KEYS.SETTINGS, JSON.stringify(json.data));
        return json.data;
      }
    }
  } catch (e) {
    console.warn('Gagal fetch pengaturan dari API, fallback cache lokal:', e);
  }
  return getSettings();
}

export function getSettings() {
  if (!isBrowser) return initialSettings;
  try {
    const data = localStorage.getItem(KEYS.SETTINGS);
    if (!data) {
      return initialSettings;
    }
    return { ...initialSettings, ...JSON.parse(data) };
  } catch {
    return initialSettings;
  }
}

export async function saveSettings(settings) {
  if (!isBrowser) return;
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));

  try {
    await fetch('/api/pengaturan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
  } catch (e) {
    console.warn('Sync pengaturan ke server tertunda:', e);
  }
  return settings;
}

// ==================== FORMATTER UTILS ====================

export function formatRupiah(amount) {
  const val = Number(amount) || 0;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(val);
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(d);
  } catch {
    return dateStr;
  }
}

export function formatDateOnly(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(d);
  } catch {
    return dateStr;
  }
}

export function exportAllData() {
  const data = {
    app: "POS Rental Motor",
    exportedAt: new Date().toISOString(),
    customers: getCustomers(),
    fleet: getFleet(),
    transactions: getTransactions(),
    expenses: getExpenses(),
    settings: getSettings()
  };
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup_pos_rental_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importAllData(jsonData) {
  if (!jsonData || typeof jsonData !== 'object') throw new Error('Format berkas tidak valid');
  if (jsonData.customers) localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(jsonData.customers));
  if (jsonData.fleet) localStorage.setItem(KEYS.FLEET, JSON.stringify(jsonData.fleet));
  if (jsonData.transactions) localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(jsonData.transactions));
  if (jsonData.expenses) localStorage.setItem(KEYS.EXPENSES, JSON.stringify(jsonData.expenses));
  if (jsonData.settings) localStorage.setItem(KEYS.SETTINGS, JSON.stringify(jsonData.settings));
  return true;
}

/**
 * Menghasilkan link Google Drive CDN (lh3.googleusercontent.com/d/ID)
 * untuk lampiran nota agar tidak memicu error rate limit download.
 */
export function getGdriveReceiptUrl(expOrUrl) {
  if (!expOrUrl) return '';
  let url = typeof expOrUrl === 'string' ? expOrUrl : (expOrUrl.gdriveLink || expOrUrl.receiptPhoto || '');
  const fileId = typeof expOrUrl === 'object' ? expOrUrl.gdriveFileId : null;

  if (fileId) {
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }

  if (!url) return '';

  if (url.includes('googleusercontent.com/d/')) {
    return url;
  }

  // Cek format drive.google.com/file/d/<FILE_ID>
  const matchFile = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchFile && matchFile[1]) {
    return `https://lh3.googleusercontent.com/d/${matchFile[1]}`;
  }

  // Cek format id=<FILE_ID>
  const matchId = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchId && matchId[1]) {
    return `https://lh3.googleusercontent.com/d/${matchId[1]}`;
  }

  return url;
}
