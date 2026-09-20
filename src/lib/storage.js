import { initialCustomers, initialFleet, initialTransactions, initialExpenses, initialSettings } from './seedData';

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
  if (!isBrowser) return initialCustomers;
  try {
    const res = await fetch('/api/pelanggan');
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(json.data));
        return json.data;
      }
    }
  } catch (e) {
    console.warn('Gagal fetch pelanggan dari API SQLite, fallback lokal:', e);
  }
  return getCustomers();
}

export function getCustomers() {
  if (!isBrowser) return initialCustomers;
  try {
    const data = localStorage.getItem(KEYS.CUSTOMERS);
    if (!data) {
      localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(initialCustomers));
      return initialCustomers;
    }
    return JSON.parse(data);
  } catch {
    return initialCustomers;
  }
}

export async function saveCustomer(cust) {
  if (!isBrowser) return;
  const list = getCustomers();
  const index = list.findIndex((c) => c.id === cust.id);
  if (index >= 0) {
    list[index] = cust;
  } else {
    list.unshift(cust);
  }
  localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(list));

  // Sync ke SQLite backend
  try {
    await fetch('/api/pelanggan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cust)
    });
  } catch (e) {
    console.warn('Sync pelanggan ke SQLite tertunda:', e);
  }
  return list;
}

export async function deleteCustomer(id) {
  if (!isBrowser) return;
  const list = getCustomers().filter((c) => c.id !== id);
  localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(list));

  // Sync ke SQLite backend
  try {
    await fetch(`/api/pelanggan?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  } catch (e) {
    console.warn('Hapus pelanggan di SQLite tertunda:', e);
  }
  return list;
}

// ==================== ARMADA (FLEET) ====================

export async function fetchFleet() {
  if (!isBrowser) return initialFleet;
  try {
    const res = await fetch('/api/armada');
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        localStorage.setItem(KEYS.FLEET, JSON.stringify(json.data));
        return json.data;
      }
    }
  } catch (e) {
    console.warn('Gagal fetch armada dari API SQLite, fallback lokal:', e);
  }
  return getFleet();
}

export function getFleet() {
  if (!isBrowser) return initialFleet;
  try {
    const data = localStorage.getItem(KEYS.FLEET);
    if (!data) {
      localStorage.setItem(KEYS.FLEET, JSON.stringify(initialFleet));
      return initialFleet;
    }
    return JSON.parse(data);
  } catch {
    return initialFleet;
  }
}

export async function saveFleetItem(item) {
  if (!isBrowser) return;
  const list = getFleet();
  const index = list.findIndex((m) => m.id === item.id);
  if (index >= 0) {
    list[index] = item;
  } else {
    list.unshift(item);
  }
  localStorage.setItem(KEYS.FLEET, JSON.stringify(list));

  try {
    await fetch('/api/armada', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    });
  } catch (e) {
    console.warn('Sync armada ke SQLite tertunda:', e);
  }
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(list[index])
      });
    } catch {}
  }
}

export async function deleteFleetItem(id) {
  if (!isBrowser) return;
  const list = getFleet().filter((m) => m.id !== id);
  localStorage.setItem(KEYS.FLEET, JSON.stringify(list));

  try {
    await fetch(`/api/armada?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  } catch (e) {
    console.warn('Hapus armada di SQLite tertunda:', e);
  }
  return list;
}

// ==================== TRANSAKSI ====================

export async function fetchTransactions() {
  if (!isBrowser) return initialTransactions;
  try {
    const res = await fetch('/api/transaksi');
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(json.data));
        return json.data;
      }
    }
  } catch (e) {
    console.warn('Gagal fetch transaksi dari API SQLite, fallback lokal:', e);
  }
  return getTransactions();
}

export function getTransactions() {
  if (!isBrowser) return initialTransactions;
  try {
    const data = localStorage.getItem(KEYS.TRANSACTIONS);
    if (!data) {
      localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(initialTransactions));
      return initialTransactions;
    }
    return JSON.parse(data);
  } catch {
    return initialTransactions;
  }
}

export async function saveTransaction(tx) {
  if (!isBrowser) return;
  const list = getTransactions();
  const index = list.findIndex((t) => t.id === tx.id);
  const isEdit = index >= 0;
  const oldItem = isEdit ? list[index] : null;

  if (isEdit) {
    list[index] = tx;
  } else {
    list.unshift(tx);
  }
  localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(list));

  // Jika nopol ganti saat edit, kembalikan nopol lama ke available
  if (oldItem && oldItem.nopol && oldItem.nopol.toUpperCase() !== tx.nopol.toUpperCase()) {
    updateVehicleStatus(oldItem.nopol, 'available');
  }
  if (tx.nopol) {
    updateVehicleStatus(tx.nopol, 'rented');
  }

  try {
    await fetch('/api/transaksi', {
      method: isEdit ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tx)
    });
  } catch (e) {
    console.warn('Sync transaksi ke SQLite tertunda:', e);
  }
  return list;
}

export async function deleteTransaction(id) {
  if (!isBrowser) return;
  const list = getTransactions();
  const item = list.find((t) => t.id === id);
  if (item && item.nopol) {
    updateVehicleStatus(item.nopol, 'available');
  }
  const filtered = list.filter((t) => t.id !== id);
  localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(filtered));

  try {
    await fetch(`/api/transaksi?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  } catch (e) {
    console.warn('Hapus transaksi di SQLite tertunda:', e);
  }
  return filtered;
}

// ==================== PENGELUARAN ====================

export async function fetchExpenses() {
  if (!isBrowser) return initialExpenses;
  try {
    const res = await fetch('/api/pengeluaran');
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        localStorage.setItem(KEYS.EXPENSES, JSON.stringify(json.data));
        return json.data;
      }
    }
  } catch (e) {
    console.warn('Gagal fetch pengeluaran dari API SQLite, fallback lokal:', e);
  }
  return getExpenses();
}

export function getExpenses() {
  if (!isBrowser) return initialExpenses;
  try {
    const data = localStorage.getItem(KEYS.EXPENSES);
    if (!data) {
      localStorage.setItem(KEYS.EXPENSES, JSON.stringify(initialExpenses));
      return initialExpenses;
    }
    return JSON.parse(data);
  } catch {
    return initialExpenses;
  }
}

export async function saveExpense(exp) {
  if (!isBrowser) return;
  const list = getExpenses();
  const index = list.findIndex((e) => e.id === exp.id);
  if (index >= 0) {
    list[index] = exp;
  } else {
    list.unshift(exp);
  }
  localStorage.setItem(KEYS.EXPENSES, JSON.stringify(list));

  try {
    await fetch('/api/pengeluaran', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(exp)
    });
  } catch (e) {
    console.warn('Sync pengeluaran ke SQLite tertunda:', e);
  }
  return list;
}

export async function deleteExpense(id) {
  if (!isBrowser) return;
  const list = getExpenses().filter((e) => e.id !== id);
  localStorage.setItem(KEYS.EXPENSES, JSON.stringify(list));

  try {
    await fetch(`/api/pengeluaran?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  } catch (e) {
    console.warn('Hapus pengeluaran di SQLite tertunda:', e);
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
    console.warn('Gagal fetch pengaturan dari API SQLite, fallback lokal:', e);
  }
  return getSettings();
}

export function getSettings() {
  if (!isBrowser) return initialSettings;
  try {
    const data = localStorage.getItem(KEYS.SETTINGS);
    if (!data) {
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(initialSettings));
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
    console.warn('Sync pengaturan ke SQLite tertunda:', e);
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
