import crypto from 'crypto';
import { prisma } from './prisma.js';

// ==================== 1. HASHING PASSWORD (SCRYPT + SALT) ====================

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

export function verifyPassword(password, storedHash) {
  try {
    if (!storedHash || !storedHash.includes(':')) return false;
    const [salt, key] = storedHash.split(':');
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch (e) {
    return false;
  }
}

// ==================== 2. SEED & SYNC INITIAL ADMIN USER ====================

export async function ensureInitialAdmin() {
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const configuredPassword = process.env.ADMIN_PASSWORD || 'ShelbyRent@2026!Admin';

  try {
    const adminUser = await prisma.user.findFirst({
      where: { role: 'admin' },
    });

    if (!adminUser) {
      const defaultUser = await prisma.user.create({
        data: {
          username: adminUsername,
          name: 'Admin Shelby Rent',
          password: hashPassword(configuredPassword),
          role: 'admin',
        },
      });
      console.log(`Akun admin berhasil diinisialisasi dengan username: ${adminUsername}`);
      return defaultUser;
    } else {
      // Jika akun admin masih memakai password default lama 'shelby123', migrasi otomatis ke password aman terenkripsi
      const isOldWeakPassword = verifyPassword('shelby123', adminUser.password);
      if (isOldWeakPassword) {
        await prisma.user.update({
          where: { id: adminUser.id },
          data: {
            password: hashPassword(configuredPassword),
            username: adminUsername,
          },
        });
        console.log('Keamanan: Password admin yang lemah telah diperbarui secara otomatis.');
      }
    }
  } catch (e) {
    console.warn('ensureInitialAdmin check:', e.message);
  }
}

/**
 * Mengubah password akun admin secara aman
 */
export async function changeAdminPassword(userId, currentPassword, newPassword) {
  if (!newPassword || newPassword.length < 8) {
    throw new Error('Password baru minimal harus 8 karakter!');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('Pengguna tidak ditemukan!');
  }

  const isValidCurrent = verifyPassword(currentPassword, user.password);
  if (!isValidCurrent) {
    throw new Error('Password lama yang Anda masukkan salah!');
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      password: hashPassword(newPassword),
    },
  });

  return { success: true, message: 'Password admin berhasil diubah!' };
}

// ==================== 3. MULTI-DEVICE SESSION MANAGEMENT ====================

/**
 * Membuat sesi baru untuk perangkat yang login.
 * Setiap perangkat memiliki token unik tersendiri sehingga akun yang sama
 * dapat aktif bersamaan di berbagai smartphone, tablet, atau komputer.
 */
export async function createSession(userId, userAgent = '', ipAddress = '') {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Aktif 30 Hari

  const session = await prisma.session.create({
    data: {
      userId,
      token,
      userAgent: userAgent.slice(0, 255),
      ipAddress: ipAddress.slice(0, 45),
      expiresAt,
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          name: true,
          role: true,
        },
      },
    },
  });

  return session;
}

/**
 * Memverifikasi keabsahan token sesi perangkat dari database
 */
export async function verifySession(token) {
  if (!token) return null;

  try {
    const session = await prisma.session.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            role: true,
          },
        },
      },
    });

    if (!session) return null;

    // Cek apakah masa berlaku sesi telah habis
    if (new Date() > session.expiresAt) {
      await prisma.session.delete({ where: { token } }).catch(() => {});
      return null;
    }

    return session;
  } catch (error) {
    console.error('Session verify error:', error);
    return null;
  }
}

/**
 * Logout perangkat saat ini (menghapus hanya sesi perangkat ini,
 * perangkat lain milik akun yang sama tetap aktif)
 */
export async function deleteSession(token) {
  if (!token) return;
  try {
    await prisma.session.delete({
      where: { token },
    });
  } catch (e) {
    // Abaikan jika sudah terhapus
  }
}

/**
 * Mengambil seluruh perangkat aktif untuk akun tertentu
 */
export async function getActiveSessions(userId) {
  try {
    const list = await prisma.session.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        createdAt: true,
        expiresAt: true,
      },
    });
    return list;
  } catch (e) {
    return [];
  }
}

// ==================== 4. RATE LIMITER (PROTEKSI BRUTE FORCE) ====================

// Cache pencatat percobaan gagal: IP/User -> { attempts, resetTime }
const rateLimitMap = new Map();

/**
 * Memeriksa apakah request melebihi batas percobaan gagal (Rate Limit)
 * Default: Maksimal 5 percobaan gagal dalam rentang 15 menit
 */
export function checkRateLimit(key, maxAttempts = 5, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetTime) {
    return { allowed: true, remaining: maxAttempts };
  }

  if (entry.attempts >= maxAttempts) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: retryAfter,
      message: `Terlalu banyak percobaan gagal. Akses diblokir sementara selama ${retryAfter} detik untuk perlindungan keamanan.`,
    };
  }

  return { allowed: true, remaining: maxAttempts - entry.attempts };
}

export function recordFailedAttempt(key, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(key, { attempts: 1, resetTime: now + windowMs });
  } else {
    entry.attempts += 1;
  }
}

export function resetRateLimit(key) {
  rateLimitMap.delete(key);
}
