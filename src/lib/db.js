import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { initialCustomers, initialFleet, initialTransactions, initialExpenses, initialSettings } from './seedData';

let dbInstance = null;

export function getDb() {
  if (dbInstance) return dbInstance;

  const dbPath = path.join(process.cwd(), 'pos_rental.db');
  dbInstance = new DatabaseSync(dbPath);

  // Inisialisasi tabel jika belum ada
  initTables(dbInstance);

  return dbInstance;
}

function initTables(db) {
  // 1. Tabel Pelanggan (Customers)
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      nik TEXT,
      address TEXT,
      emergency_contact TEXT,
      notes TEXT,
      total_rentals INTEGER DEFAULT 0,
      created_at TEXT
    );
  `);

  // 2. Tabel Armada Motor (Fleet)
  db.exec(`
    CREATE TABLE IF NOT EXISTS fleet (
      id TEXT PRIMARY KEY,
      nopol TEXT UNIQUE,
      brand TEXT,
      model TEXT,
      color TEXT,
      year TEXT,
      daily_rate INTEGER,
      status TEXT
    );
  `);

  // 3. Tabel Transaksi (Transactions)
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      nopol TEXT,
      customer_id TEXT,
      customer_name TEXT,
      customer_phone TEXT,
      start_date TEXT,
      end_date TEXT,
      duration_days INTEGER,
      rental_price INTEGER,
      extra_costs TEXT,
      total INTEGER,
      payment_method TEXT,
      amount_paid INTEGER,
      change_amount INTEGER,
      notes TEXT,
      created_at TEXT
    );
  `);

  // 4. Tabel Pengeluaran (Expenses) dengan kolom Google Drive
  db.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      is_vehicle_related INTEGER DEFAULT 0,
      nopol TEXT,
      category TEXT,
      amount INTEGER,
      description TEXT,
      date TEXT,
      receipt_photo TEXT,
      gdrive_file_id TEXT,
      gdrive_link TEXT,
      created_at TEXT
    );
  `);

  // 5. Tabel Pengaturan (Settings)
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // Seed Data jika tabel masih kosong
  seedIfEmpty(db);
}

function seedIfEmpty(db) {
  // Cek customers
  const custCount = db.prepare('SELECT COUNT(*) as count FROM customers').get().count;
  if (custCount === 0) {
    const stmt = db.prepare(`
      INSERT INTO customers (id, name, phone, nik, address, emergency_contact, notes, total_rentals, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const c of initialCustomers) {
      stmt.run(c.id, c.name, c.phone, c.nik, c.address, c.emergencyContact, c.notes, c.totalRentals, c.createdAt);
    }
  }

  // Cek fleet
  const fleetCount = db.prepare('SELECT COUNT(*) as count FROM fleet').get().count;
  if (fleetCount === 0) {
    const stmt = db.prepare(`
      INSERT INTO fleet (id, nopol, brand, model, color, year, daily_rate, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const m of initialFleet) {
      stmt.run(m.id, m.nopol, m.brand, m.model, m.color, m.year, m.dailyRate, m.status);
    }
  }

  // Cek transactions
  const txCount = db.prepare('SELECT COUNT(*) as count FROM transactions').get().count;
  if (txCount === 0) {
    const stmt = db.prepare(`
      INSERT INTO transactions (
        id, nopol, customer_id, customer_name, customer_phone, start_date, end_date,
        duration_days, rental_price, extra_costs, total, payment_method, amount_paid,
        change_amount, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const t of initialTransactions) {
      stmt.run(
        t.id,
        t.nopol,
        t.customerId || null,
        t.customerName,
        t.customerPhone,
        t.startDate,
        t.endDate,
        t.durationDays,
        t.rentalPrice,
        JSON.stringify(t.extraCosts || []),
        t.total,
        t.paymentMethod,
        t.amountPaid,
        t.changeAmount,
        t.notes,
        t.createdAt
      );
    }
  }

  // Cek expenses
  const expCount = db.prepare('SELECT COUNT(*) as count FROM expenses').get().count;
  if (expCount === 0) {
    const stmt = db.prepare(`
      INSERT INTO expenses (
        id, is_vehicle_related, nopol, category, amount, description, date,
        receipt_photo, gdrive_file_id, gdrive_link, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const e of initialExpenses) {
      stmt.run(
        e.id,
        e.isVehicleRelated ? 1 : 0,
        e.nopol || '',
        e.category,
        e.amount,
        e.description,
        e.date,
        e.receiptPhoto || null,
        e.gdriveFileId || null,
        e.gdriveLink || null,
        e.createdAt
      );
    }
  }

  // Cek settings
  const settingsCount = db.prepare('SELECT COUNT(*) as count FROM settings').get().count;
  if (settingsCount === 0) {
    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    for (const [k, v] of Object.entries(initialSettings)) {
      stmt.run(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
    }
  }
}
