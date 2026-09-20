/**
 * rentalPricing.js
 * Modul terpusat perhitungan tarif sewa berbasis HARI dan aturan extend/overtime:
 * 1. Satuan utama transaksi: HARI (1 Hari = 24 Jam).
 * 2. Tarif extend flat: Rp 10.000 / jam untuk semua model motor.
 * 3. Batas toleransi extend maksimal: 4 Jam (maks. Rp 40.000).
 * 4. Jika kelebihan waktu > 4 jam: Otomatis dibulatkan bertambah 1 HARI sewa penuh seharga tarif harian unit.
 */

export const EXTEND_HOURLY_RATE = 10000; // Rp 10.000 per jam
export const MAX_EXTEND_HOURS = 4;        // Maksimal 4 jam

/**
 * Hitung kalkulasi sewa dan penagihan
 * @param {Object} params
 * @param {number} [params.days] Jumlah hari sewa
 * @param {number} [params.extendHours] Jam extend (0 s/d 4)
 * @param {number} [params.totalHours] Total jam (opsional, jika dihitung dari selisih tanggal)
 * @param {number} params.dailyRate Tarif sewa motor per 24 jam
 * @param {number} [params.hourlyOvertimeRate] Tarif per jam extend (default Rp 10.000)
 */
export function calculateRentalBilling({
  days = 1,
  extendHours = 0,
  totalHours = null,
  dailyRate = 0,
  hourlyOvertimeRate = EXTEND_HOURLY_RATE
}) {
  const rate = Number(dailyRate) || 0;
  const extendRate = Number(hourlyOvertimeRate) || EXTEND_HOURLY_RATE;

  let billedDays = Math.max(1, Number(days) || 1);
  let billedExtendHours = Math.max(0, Number(extendHours) || 0);
  let isOvertimeRoundedToDay = false;
  let rawOvertimeHours = 0;
  let computedTotalHours = 0;

  // Kasus 1: Diberikan totalHours (misal hasil selisih tanggal mulai & selesai)
  if (totalHours != null && !isNaN(totalHours)) {
    const th = Math.max(1, Number(totalHours));
    computedTotalHours = th;
    const rawDays = Math.floor(th / 24);
    const rem = th % 24;
    rawOvertimeHours = rem;

    if (th <= 24) {
      billedDays = 1;
      billedExtendHours = 0;
    } else if (rem === 0) {
      billedDays = rawDays;
      billedExtendHours = 0;
    } else if (rem <= MAX_EXTEND_HOURS) {
      billedDays = rawDays;
      billedExtendHours = rem;
    } else {
      // Lebih dari 4 jam -> Otomatis nambah 1 hari sewa penuh!
      billedDays = rawDays + 1;
      billedExtendHours = 0;
      isOvertimeRoundedToDay = true;
    }
  } else {
    // Kasus 2: Diberikan days dan extendHours secara langsung
    if (billedExtendHours > MAX_EXTEND_HOURS) {
      rawOvertimeHours = billedExtendHours;
      billedDays += 1;
      billedExtendHours = 0;
      isOvertimeRoundedToDay = true;
    }
    computedTotalHours = (billedDays * 24) + billedExtendHours;
  }

  const daysCost = billedDays * rate;
  const extendCost = billedExtendHours * extendRate;
  const totalPrice = daysCost + extendCost;

  // Teks ringkasan ramah kasir
  let summaryText = '';
  if (billedExtendHours > 0) {
    summaryText = `${billedDays} Hari + ${billedExtendHours} Jam Extend (+Rp ${(billedExtendHours * extendRate).toLocaleString('id-ID')})`;
  } else if (isOvertimeRoundedToDay) {
    summaryText = `${billedDays} Hari Penuh (Kelebihan waktu >4 jam dihitung 1 hari)`;
  } else {
    summaryText = `${billedDays} Hari Penuh`;
  }

  return {
    billedDays,
    billedExtendHours,
    isOvertimeRoundedToDay,
    rawOvertimeHours,
    totalHours: computedTotalHours,
    daysCost,
    extendCost,
    totalPrice,
    dailyRate: rate,
    extendRate,
    summaryText
  };
}

/**
 * Format durasi ramah pembaca untuk Struk, Tabel, dan Modal Detail
 */
export function formatRentalDuration(durationDays, extendHours = 0, durationHours = null) {
  const d = Number(durationDays) || (durationHours ? Math.floor(durationHours / 24) : 1);
  const ext = Number(extendHours) || (durationHours ? durationHours % 24 : 0);

  if (ext > 0 && ext <= MAX_EXTEND_HOURS) {
    return `${d} Hari + ${ext} Jam Extend`;
  }
  if (ext > MAX_EXTEND_HOURS) {
    return `${d + 1} Hari Penuh`;
  }
  return `${Math.max(1, d)} Hari Penuh`;
}

/**
 * Hitung denda keterlambatan pengembalian unit
 * @param {number} lateHours Jumlah jam keterlambatan
 * @param {number} dailyRate Tarif sewa harian motor
 * @param {number} [hourlyOvertimeRate] Tarif flat per jam (default Rp 10.000)
 */
export function calculateOverdueFee(lateHours, dailyRate = 0, hourlyOvertimeRate = EXTEND_HOURLY_RATE) {
  const h = Math.ceil(Number(lateHours) || 0);
  if (h <= 0) return { fee: 0, text: 'Tepat Waktu', isDaily: false, lateHours: 0 };

  if (h <= MAX_EXTEND_HOURS) {
    const fee = h * hourlyOvertimeRate;
    return {
      fee,
      text: `Terlambat ${h} jam (Denda: Rp ${fee.toLocaleString('id-ID')})`,
      isDaily: false,
      lateHours: h
    };
  }

  // Lebih dari 4 jam -> Denda 1 hari penuh (atau kelipatannya jika berhari-hari)
  const days = Math.ceil(h / 24);
  const fee = days * Number(dailyRate || 0);
  return {
    fee,
    text: `Terlambat ${h} jam (Denda ${days} hari sewa penuh: Rp ${fee.toLocaleString('id-ID')})`,
    isDaily: true,
    lateHours: h,
    lateDays: days
  };
}
