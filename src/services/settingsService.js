import { prisma } from '../lib/prisma.js';
import { initialSettings } from '../lib/seedData.js';
import { ensureSystemInitialized } from './dbInitService.js';

export const settingsService = {
  /**
   * Ambil seluruh konfigurasi aplikasi & struk
   */
  async getSettings() {
    await ensureSystemInitialized();

    const list = await prisma.setting.findMany();
    const settings = { ...initialSettings };

    for (const r of list) {
      if (r.key === 'isPinEnabled') {
        settings[r.key] = r.value === 'true';
      } else {
        settings[r.key] = r.value;
      }
    }

    return settings;
  },

  /**
   * Simpan atau perbarui konfigurasi aplikasi & struk
   */
  async saveSettings(body) {
    if (!body || typeof body !== 'object') {
      throw new Error('Payload pengaturan tidak valid');
    }

    for (const [k, v] of Object.entries(body)) {
      await prisma.setting.upsert({
        where: { key: k },
        update: { value: typeof v === 'object' ? JSON.stringify(v) : String(v) },
        create: { key: k, value: typeof v === 'object' ? JSON.stringify(v) : String(v) },
      });
    }

    return body;
  },
};
