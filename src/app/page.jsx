'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Search, 
  Printer, 
  Edit2, 
  Trash2, 
  X, 
  Plus, 
  CheckCircle2, 
  Bike,
  Calendar,
  Clock,
  DollarSign,
  User,
  Users,
  Phone,
  RotateCcw,
  AlertCircle,
  Info,
  Loader2
} from 'lucide-react';
import { 
  fetchTransactions, 
  getTransactions,
  saveTransaction, 
  deleteTransaction, 
  fetchFleet, 
  getFleet,
  fetchCustomers,
  getCustomers,
  saveCustomer, 
  fetchSettings, 
  getSettings,
  getTransactionStatus,
  getPaymentStatus,
  formatRupiah, 
  formatDateTime 
} from '../lib/storage';
import ModalDetail from '../components/ModalDetail';
import StrukModal from '../components/StrukModal';
import { showToast, showConfirm } from '../lib/sweetalert';
import { SkeletonList, SkeletonSearchBar } from '../components/Skeleton';
import SearchableSelect from '../components/SearchableSelect';
import { exportTransactionsToExcel } from '../lib/excelExport';
import { 
  calculateRentalBilling, 
  formatRentalDuration, 
  EXTEND_HOURLY_RATE, 
  MAX_EXTEND_HOURS 
} from '../lib/rentalPricing';

// Helper format Date ke format input datetime-local: YYYY-MM-DDTHH:mm
const formatToInput = (d) => {
  if (!d || isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function TransaksiPage() {
  const [transactions, setTransactions] = useState(() => getTransactions());
  const [fleet, setFleet] = useState(() => getFleet());
  const [customers, setCustomers] = useState(() => getCustomers());
  const [settings, setSettings] = useState(() => getSettings());
  const [isLoading, setIsLoading] = useState(() => getTransactions().length === 0 && getFleet().length === 0);
  const [search, setSearch] = useState('');
  
  // State Form Transaksi (Mode Buat Baru vs Mode Edit)
  const [showForm, setShowForm] = useState(false);
  const [editingTxId, setEditingTxId] = useState(null); // null = buat baru, string ID = edit
  
  const [nopol, setNopol] = useState('');
  const [vehicleQuantity, setVehicleQuantity] = useState(1);
  const [vehiclePlates, setVehiclePlates] = useState(['']);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [autoSaveCustomer, setAutoSaveCustomer] = useState(true);
  
  // Mulai Sewa (Tanggal & Jam), Selesai Sewa (Tanggal & Jam), Durasi Hari & Extend (Maks. 4 Jam)
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [durationDays, setDurationDays] = useState(1);
  const [extendHours, setExtendHours] = useState(0); // 0 s/d 4 jam
  const [durationHours, setDurationHours] = useState(24);
  const [overtimeAlert, setOvertimeAlert] = useState(null);
  
  const [rentalPrice, setRentalPrice] = useState(100000);
  const [extraCosts, setExtraCosts] = useState([
    { id: '1', label: 'Helm Tambahan', amount: 0 }
  ]);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Tunai');
  const [paymentStatusOption, setPaymentStatusOption] = useState('lunas'); // 'lunas', 'sebagian', 'terhutang'
  const [amountPaid, setAmountPaid] = useState('');
  const [notes, setNotes] = useState('');
  const [txStatus, setTxStatus] = useState('active'); // 'active' atau 'booking'

  // State Modal Detail & Struk
  const [selectedTx, setSelectedTx] = useState(null);
  const [strukTx, setStrukTx] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
    initDefaultDates();
  }, []);

  const initDefaultDates = () => {
    const now = new Date();
    now.setMinutes(0);
    now.setSeconds(0);
    const end = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    setStartDate(formatToInput(now));
    setEndDate(formatToInput(end));
    setDurationDays(1);
    setExtendHours(0);
    setDurationHours(24);
    setOvertimeAlert(null);
  };

  const loadData = async () => {
    try {
      // 1. Fokus cepat kasir: transaksi & armada
      const txPromise = fetchTransactions();
      const fleetPromise = fetchFleet();
      const [txList, fleetList] = await Promise.all([txPromise, fleetPromise]);
      if (Array.isArray(txList)) setTransactions(txList);
      if (Array.isArray(fleetList)) setFleet(fleetList);
      setIsLoading(false);

      // 2. Muat data pelanggan & pengaturan secara non-blocking
      fetchCustomers().then((c) => Array.isArray(c) && setCustomers(c)).catch(() => {});
      fetchSettings().then((s) => s && setSettings(s)).catch(() => {});
    } catch {
      setIsLoading(false);
    }
  };

  // Data armada yang cocok dengan nopol (jika 1 unit) atau unit pertama
  const selectedFleetItem = React.useMemo(() => {
    const targetPlate = vehiclePlates[0] || nopol;
    if (!targetPlate) return null;
    const clean = targetPlate.trim().toLowerCase().replace(/\s+/g, '');
    return fleet.find((f) => {
      const fn = String(f.nopol || '').trim().toLowerCase().replace(/\s+/g, '');
      const fid = String(f.id || '').trim().toLowerCase();
      return fn === clean || fid === clean;
    }) || null;
  }, [fleet, vehiclePlates, nopol]);

  // Helper untuk mengambil objek armada dari plat nomor apapun
  const getFleetForPlate = React.useCallback((plateStr) => {
    if (!plateStr) return null;
    const clean = String(plateStr).trim().toLowerCase().replace(/\s+/g, '');
    return fleet.find((f) => {
      const fn = String(f.nopol || '').trim().toLowerCase().replace(/\s+/g, '');
      const fid = String(f.id || '').trim().toLowerCase();
      return fn === clean || fid === clean;
    }) || null;
  }, [fleet]);

  // Muat ulang daftar armada jika formulir sewa baru dibuka
  useEffect(() => {
    if (showForm) {
      fetchFleet().then((f) => {
        if (Array.isArray(f) && f.length > 0) setFleet(f);
      }).catch(() => {});
    }
  }, [showForm]);

  // Hitung otomatis harga sewa berdasarkan akumulasi tarif motor pada masing-masing unit
  const calculateRentalPriceFromPlates = (plates = vehiclePlates, days = durationDays, ext = extendHours, qty = vehicleQuantity) => {
    const count = Math.max(1, qty, plates.length);
    let totalDailyRate = 0;

    for (let i = 0; i < count; i++) {
      const p = plates[i] || '';
      let unitRate = 0;

      if (p) {
        const cleanP = p.trim().toLowerCase().replace(/\s+/g, '');
        const found = fleet.find((f) => {
          const fn = String(f.nopol || '').trim().toLowerCase().replace(/\s+/g, '');
          const fid = String(f.id || '').trim().toLowerCase();
          return fn === cleanP || fid === cleanP;
        });
        if (found && found.dailyRate) {
          unitRate = Number(found.dailyRate);
        }
      }

      if (!unitRate) {
        unitRate = 100000; // default tarif standar per 24 jam jika unit belum dipilih
      }

      totalDailyRate += unitRate;
    }

    const billing = calculateRentalBilling({
      days,
      extendHours: ext,
      dailyRate: totalDailyRate,
      hourlyOvertimeRate: EXTEND_HOURLY_RATE * count
    });

    setRentalPrice(billing.totalPrice);
    return { ...billing, totalDailyRate, count };
  };

  const calculateRentalPrice = (targetMotorOrRate = selectedFleetItem || nopol, days = durationDays, ext = extendHours, qty = vehicleQuantity) => {
    return calculateRentalPriceFromPlates(vehiclePlates, days, ext, qty);
  };

  // Kasir mengubah jumlah unit kendaraan yang disewa
  const handleVehicleQuantityChange = (val) => {
    const q = Math.max(1, Number(val) || 1);
    setVehicleQuantity(q);
    const updatedPlates = [...vehiclePlates];
    if (updatedPlates.length < q) {
      while (updatedPlates.length < q) updatedPlates.push('');
    } else if (updatedPlates.length > q) {
      updatedPlates.splice(q);
    }
    setVehiclePlates(updatedPlates);
    setNopol(updatedPlates.filter(Boolean).join(', '));
    calculateRentalPriceFromPlates(updatedPlates, durationDays, extendHours, q);
  };

  // Kasir menambah 1 unit motor baru
  const handleAddVehicleUnit = () => {
    handleVehicleQuantityChange(vehicleQuantity + 1);
  };

  // Kasir menghapus 1 baris unit motor
  const handleRemoveVehicleUnit = (idxToRemove) => {
    if (vehicleQuantity <= 1) return;
    const updatedPlates = vehiclePlates.filter((_, i) => i !== idxToRemove);
    if (updatedPlates.length === 0) updatedPlates.push('');
    const newQ = updatedPlates.length;
    setVehicleQuantity(newQ);
    setVehiclePlates(updatedPlates);
    setNopol(updatedPlates.filter(Boolean).join(', '));
    calculateRentalPriceFromPlates(updatedPlates, durationDays, extendHours, newQ);
  };

  // Kasir memilih / mengubah nopol pada baris unit tertentu
  const handleUpdatePlate = (index, plateVal, itemObj) => {
    const updatedPlates = [...vehiclePlates];
    while (updatedPlates.length <= index) updatedPlates.push('');
    updatedPlates[index] = (plateVal || '').toUpperCase().trim();
    setVehiclePlates(updatedPlates);

    const filled = updatedPlates.filter(Boolean);
    setNopol(filled.join(', '));
    calculateRentalPriceFromPlates(updatedPlates, durationDays, extendHours, vehicleQuantity);

    if (itemObj) {
      showToast(`Unit ${index + 1}: Motor ${itemObj.nopol} (${itemObj.brand} ${itemObj.model}) dipilih.`);
    }
  };

  // Pilih pelanggan dari master data pelanggan: auto-fill nama & HP
  const handleSelectCustomer = (e) => {
    const custId = e.target.value;
    setSelectedCustomerId(custId);
    if (custId) {
      const found = customers.find((c) => c.id === custId);
      if (found) {
        setCustomerName(found.name);
        setCustomerPhone(found.phone || '');
        showToast(`Pelanggan "${found.name}" dipilih! Data terisi otomatis.`);
      }
    }
  };

  // ================= SINKRONISASI DUA ARAH TANGGAL, JAM & DURASI HARI =================

  // 1. Kasir mengubah Jumlah Hari Sewa
  const handleDaysChange = (daysVal) => {
    const d = Math.max(1, Number(daysVal) || 1);
    setDurationDays(d);
    setOvertimeAlert(null);

    const totalH = (d * 24) + extendHours;
    setDurationHours(totalH);

    if (startDate) {
      const start = new Date(startDate);
      if (!isNaN(start.getTime())) {
        const totalMs = totalH * 3600 * 1000;
        const newEnd = new Date(start.getTime() + totalMs);
        setEndDate(formatToInput(newEnd));
      }
    }
    calculateRentalPrice(selectedFleetItem || nopol, d, extendHours);
  };

  // 2. Kasir memilih jam extend (0 s/d 4 jam, Rp 10.000/jam)
  const handleExtendChange = (extVal) => {
    const ext = Math.max(0, Math.min(MAX_EXTEND_HOURS, Number(extVal) || 0));
    setExtendHours(ext);
    setOvertimeAlert(null);

    const totalH = (durationDays * 24) + ext;
    setDurationHours(totalH);

    if (startDate) {
      const start = new Date(startDate);
      if (!isNaN(start.getTime())) {
        const totalMs = totalH * 3600 * 1000;
        const newEnd = new Date(start.getTime() + totalMs);
        setEndDate(formatToInput(newEnd));
      }
    }
    calculateRentalPrice(selectedFleetItem || nopol, durationDays, ext, vehicleQuantity);
  };

  // 3. Kasir mengubah Mulai Sewa (Tanggal dan Jam)
  const handleStartDateChange = (val) => {
    setStartDate(val);
    if (val) {
      const start = new Date(val);
      if (!isNaN(start.getTime())) {
        const totalMs = ((durationDays * 24) + extendHours) * 3600 * 1000;
        const newEnd = new Date(start.getTime() + totalMs);
        setEndDate(formatToInput(newEnd));
      }
    }
  };

  // 4. Kasir mengubah Selesai Sewa (Tanggal dan Jam) secara langsung
  const handleEndDateChange = (val) => {
    setEndDate(val);
    if (val && startDate) {
      const start = new Date(startDate);
      const end = new Date(val);
      const diffMs = end.getTime() - start.getTime();
      if (diffMs > 0) {
        const totalH = Math.max(1, Math.round(diffMs / 3600000));
        const rawDays = Math.floor(totalH / 24);
        const remHours = totalH % 24;

        let d = rawDays;
        let ext = 0;
        let alertMsg = null;

        if (totalH <= 24) {
          d = 1;
          ext = 0;
        } else if (remHours === 0) {
          d = rawDays;
          ext = 0;
        } else if (remHours <= MAX_EXTEND_HOURS) {
          d = rawDays;
          ext = remHours;
        } else {
          // Lebih dari 4 jam -> Otomatis nambah 1 hari sewa penuh!
          d = rawDays + 1;
          ext = 0;
          alertMsg = `Kelebihan waktu ${remHours} jam melebihi batas extend (maks. 4 jam). Otomatis dihitung bertambah 1 hari sewa (${d} Hari Penuh).`;
        }

        setDurationDays(d);
        setExtendHours(ext);
        setDurationHours(totalH);
        setOvertimeAlert(alertMsg);
        calculateRentalPrice(selectedFleetItem || nopol, d, ext, vehicleQuantity);
      }
    }
  };

  // Format durasi ramah kasir
  const getDurationSummary = () => {
    return formatRentalDuration(durationDays, extendHours, durationHours);
  };

  // Manajemen Baris Biaya Tambahan Dinamis
  const addExtraRow = () => {
    setExtraCosts([
      ...extraCosts,
      { id: Date.now().toString(), label: '', amount: 0 }
    ]);
  };

  const updateExtraRow = (id, field, value) => {
    setExtraCosts(
      extraCosts.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const removeExtraRow = (id) => {
    setExtraCosts(extraCosts.filter((item) => item.id !== id));
  };

  // Hitung Total
  const totalExtras = extraCosts.reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0
  );
  const subtotal = Number(rentalPrice || 0) + totalExtras;
  const totalAmount = Math.max(0, subtotal - Number(discount || 0));
  const currentNumPaid = amountPaid !== '' 
    ? Number(amountPaid) 
    : (paymentStatusOption === 'terhutang' ? 0 : totalAmount);
  const changeAmount = Math.max(0, currentNumPaid - totalAmount);
  const remainingDebt = Math.max(0, totalAmount - currentNumPaid);

  const handleDiscountChange = (val) => {
    const num = Math.max(0, Number(val) || 0);
    setDiscount(num);
    const newTotal = Math.max(0, subtotal - num);
    if (paymentStatusOption === 'lunas' && amountPaid !== '') {
      setAmountPaid(String(newTotal));
    }
  };

  // ================= FITUR EDIT TRANSAKSI =================
  const handleStartEdit = (tx) => {
    setEditingTxId(tx.id);
    
    // Ekstrak data nopol dan jumlah kendaraan
    let qty = Number(tx.vehicleQuantity) || 1;
    let plates = [''];

    if (tx.nopol) {
      if (tx.nopol.startsWith('MULTI-UNIT')) {
        const m = tx.nopol.match(/\((\d+)\s*Kendaraan\)/i);
        qty = tx.vehicleQuantity || (m ? parseInt(m[1]) : 2);
        plates = Array(qty).fill('');
      } else if (tx.nopol.includes(',')) {
        plates = tx.nopol.split(',').map((s) => s.replace(/\(\+\d+.*?\)/, '').trim());
        qty = Math.max(plates.length, Number(tx.vehicleQuantity) || plates.length);
        while (plates.length < qty) plates.push('');
      } else {
        plates = [tx.nopol.replace(/\(\+\d+.*?\)/, '').trim()];
        qty = Math.max(1, Number(tx.vehicleQuantity) || 1);
        while (plates.length < qty) plates.push('');
      }
    }

    setVehicleQuantity(qty);
    setVehiclePlates(plates);
    setNopol(plates.filter(Boolean).join(', '));
    setSelectedCustomerId(tx.customerId || '');
    setCustomerName(tx.customerName || '');
    setCustomerPhone(tx.customerPhone || '');
    
    // Normalisasi tanggal & jam ke input YYYY-MM-DDTHH:mm
    if (tx.startDate) {
      const s = new Date(tx.startDate);
      setStartDate(!isNaN(s.getTime()) ? formatToInput(s) : tx.startDate.slice(0, 16));
    }
    if (tx.endDate) {
      const e = new Date(tx.endDate);
      setEndDate(!isNaN(e.getTime()) ? formatToInput(e) : tx.endDate.slice(0, 16));
    }

    const totalH = tx.durationHours || (Number(tx.durationDays) || 1) * 24;
    const d = tx.durationDays || Math.floor(totalH / 24) || 1;
    const ext = tx.extendHours != null ? tx.extendHours : (totalH % 24 <= MAX_EXTEND_HOURS ? totalH % 24 : 0);
    setDurationDays(d);
    setExtendHours(ext);
    setDurationHours(totalH);
    setOvertimeAlert(null);
    setRentalPrice(Number(tx.rentalPrice) || 0);

    const extras = Array.isArray(tx.extraCosts) && tx.extraCosts.length > 0 
      ? tx.extraCosts 
      : [{ id: '1', label: 'Helm Tambahan', amount: 0 }];
    setExtraCosts(extras);
    setDiscount(Number(tx.discount || 0));

    setPaymentMethod(tx.paymentMethod || 'Tunai');
    setAmountPaid(tx.amountPaid != null ? String(tx.amountPaid) : String(tx.total || ''));
    const initialPaySt = getPaymentStatus(tx);
    setPaymentStatusOption(initialPaySt.key);
    setNotes(tx.notes || '');
    setTxStatus(tx.status || 'active');

    setShowForm(true);
    setSelectedTx(null); // Tutup modal detail jika terbuka
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(`Mode Edit: Transaksi ${tx.id} siap diubah`, 'info');
  };

  const handleCancelEdit = () => {
    setEditingTxId(null);
    resetForm();
    setShowForm(false);
  };

  const resetForm = () => {
    setEditingTxId(null);
    setNopol('');
    setVehicleQuantity(1);
    setVehiclePlates(['']);
    setSelectedCustomerId('');
    setCustomerName('');
    setCustomerPhone('');
    initDefaultDates();
    setRentalPrice(100000);
    setExtraCosts([{ id: '1', label: 'Helm Tambahan', amount: 0 }]);
    setDiscount(0);
    setPaymentMethod('Tunai');
    setPaymentStatusOption('lunas');
    setAmountPaid('');
    setNotes('');
    setTxStatus('active');
  };

  // Simpan Transaksi (Bisa Baru atau Perbarui yang Diedit)
  const handleSaveTransaction = async (e) => {
    e.preventDefault();
    const isMultiVehicle = vehicleQuantity > 1;

    // Kumpulkan plat nomor yang terisi
    const filledPlates = vehiclePlates
      .map((p) => p.trim().toUpperCase())
      .filter(Boolean);

    // Validasi: Jika hanya 1 kendaraan, nopol WAJIB diisi
    if (!isMultiVehicle && filledPlates.length === 0 && !nopol.trim()) {
      showToast('Nomor polisi kendaraan wajib diisi jika hanya menyewa 1 kendaraan!', 'error');
      return;
    }
    if (!customerName.trim()) {
      showToast('Nama pelanggan wajib diisi!', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const isEdit = Boolean(editingTxId);
      const txId = isEdit ? editingTxId : `TRX-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
      const calcDays = Math.max(1, Math.ceil(durationHours / 24));

      // Susun nopol yang rapi:
      let finalNopol = '';
      if (filledPlates.length > 0) {
        const remaining = vehicleQuantity - filledPlates.length;
        finalNopol = filledPlates.join(', ') + (remaining > 0 ? ` (+${remaining} Unit)` : '');
      } else {
        finalNopol = `MULTI-UNIT (${vehicleQuantity} Kendaraan)`;
      }

      // Simpan/update data pelanggan jika belum terdaftar
      let finalCustId = selectedCustomerId;
      if (!finalCustId && autoSaveCustomer) {
        const existing = customers.find(
          (c) => c.name.toLowerCase() === customerName.trim().toLowerCase()
        );
        if (existing) {
          finalCustId = existing.id;
        } else {
          const newCust = {
            id: `CST-${Date.now().toString().slice(-4)}`,
            name: customerName.trim(),
            phone: customerPhone.trim(),
            nik: '',
            address: '',
            emergencyContact: '',
            notes: 'Tersimpan otomatis dari transaksi sewa',
            totalRentals: 1,
            createdAt: new Date().toISOString()
          };
          await saveCustomer(newCust);
          finalCustId = newCust.id;
        }
      }

      const payloadTx = {
        id: txId,
        nopol: finalNopol,
        vehicleQuantity: vehicleQuantity,
        customerId: finalCustId || null,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        startDate,
        endDate,
        durationDays: durationDays,
        extendHours: extendHours,
        durationHours: (durationDays * 24) + extendHours,
        rentalPrice: Number(rentalPrice),
        extraCosts: extraCosts.filter((c) => c.label.trim() && Number(c.amount) > 0),
        discount: Number(discount || 0),
        total: totalAmount,
        paymentMethod,
        amountPaid: currentNumPaid,
        changeAmount,
        paymentStatus: paymentStatusOption,
        status: txStatus,
        notes: notes.trim(),
        ...(isEdit ? {} : { createdAt: new Date().toISOString() })
      };

      await saveTransaction(payloadTx);
      await loadData();
      setShowForm(false);
      resetForm();

      if (isEdit) {
        showToast(`Transaksi ${txId} berhasil diperbarui di database!`);
      } else {
        showToast(`Transaksi ${txId} berhasil disimpan ke database!`);
      }
      setStrukTx(payloadTx);
    } catch (error) {
      showToast('Gagal menyimpan transaksi: ' + error.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ================= FITUR HAPUS TRANSAKSI =================
  const handleDelete = async (id) => {
    const target = transactions.find((t) => t.id === id);
    const nopolTarget = target?.nopol || 'kendaraan';
    
    const confirmed = await showConfirm({
      title: `Hapus Transaksi ${id}?`,
      text: `Unit motor (${nopolTarget}) akan otomatis dikembalikan ke status "Tersedia". Catatan transaksi akan diarsipkan.`,
      confirmButtonText: 'Ya, Hapus Transaksi',
      cancelButtonText: 'Batal',
      icon: 'warning',
      isDanger: true,
    });

    if (confirmed) {
      await deleteTransaction(id);
      await loadData();
      if (selectedTx?.id === id) {
        setSelectedTx(null);
      }
      showToast(`Transaksi ${id} dihapus. Unit ${nopolTarget} kini Tersedia kembali.`, 'info');
    }
  };

  // Filter Pencarian
  const filteredTransactions = transactions.filter((t) => {
    const q = search.toLowerCase();
    return (
      t.id.toLowerCase().includes(q) ||
      (t.nopol || '').toLowerCase().includes(q) ||
      (t.customerName || '').toLowerCase().includes(q)
    );
  });

  return (
    <div>

      {/* Tombol Buat Transaksi Baru */}
      <div style={{ marginBottom: '16px' }}>
        <button
          type="button"
          disabled={isSubmitting}
          className={`btn ${editingTxId ? 'btn-outline' : 'btn-primary'} btn-block`}
          onClick={() => {
            if (editingTxId) {
              handleCancelEdit();
            } else {
              setShowForm(!showForm);
            }
          }}
          style={{ gap: '10px', fontSize: '15px' }}
        >
          {showForm && <X size={20} />}
          <span>
            {editingTxId 
              ? 'Batal Edit (Kembali)' 
              : showForm 
                ? 'Tutup Formulir' 
                : 'Buat Transaksi Sewa Baru'}
          </span>
        </button>
      </div>

      {/* ================= FORMULIR TRANSAKSI (BUAT BARU / EDIT) ================= */}
      {showForm && (
        <div 
          className="card" 
          style={{ 
            borderColor: editingTxId ? 'var(--accent-amber)' : 'var(--primary-border)', 
            background: '#ffffff', 
            marginBottom: '24px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.06)'
          }}
        >
          <div className="card-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '16px' }}>
            <span className="card-title" style={{ fontSize: '16px' }}>
              <Bike size={20} color={editingTxId ? 'var(--accent-amber)' : 'var(--primary)'} />
              {editingTxId ? `Edit Transaksi: ${editingTxId}` : 'Formulir Transaksi Sewa Motor'}
            </span>
            <span className={`badge ${editingTxId ? 'badge-warning' : 'badge-success'}`}>
              {editingTxId ? 'Mode Edit' : 'Database Aktif'}
            </span>
          </div>

          {editingTxId && (
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
                Anda sedang mengubah data transaksi <strong>{editingTxId}</strong>. Klik <em>"Simpan Perubahan Transaksi"</em> di bawah untuk memperbarui ke database.
              </div>
            </div>
          )}

          <form onSubmit={handleSaveTransaction}>
            {/* Pilihan Status Transaksi: Booking, Aktif, Selesai */}
            <div style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                Status Transaksi (Sewa)
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setTxStatus('booking')}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: txStatus === 'booking' ? '2px solid #d97706' : '1px solid var(--border)',
                    backgroundColor: txStatus === 'booking' ? 'rgba(217, 119, 6, 0.12)' : '#ffffff',
                    color: txStatus === 'booking' ? '#d97706' : 'var(--text-main)',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '2px'
                  }}
                >
                  <span>🟡 Booking</span>
                  <span style={{ fontSize: '10px', fontWeight: 500, color: txStatus === 'booking' ? '#b45309' : 'var(--text-muted)' }}>
                    Mulai Nanti
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setTxStatus('active')}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: txStatus === 'active' ? '2px solid #16a34a' : '1px solid var(--border)',
                    backgroundColor: txStatus === 'active' ? 'rgba(22, 163, 74, 0.12)' : '#ffffff',
                    color: txStatus === 'active' ? '#16a34a' : 'var(--text-main)',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '2px'
                  }}
                >
                  <span>🟢 Aktif</span>
                  <span style={{ fontSize: '10px', fontWeight: 500, color: txStatus === 'active' ? '#15803d' : 'var(--text-muted)' }}>
                    Sedang Disewa
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setTxStatus('selesai')}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: txStatus === 'selesai' ? '2px solid #64748b' : '1px solid var(--border)',
                    backgroundColor: txStatus === 'selesai' ? 'rgba(100, 116, 139, 0.12)' : '#ffffff',
                    color: txStatus === 'selesai' ? '#475569' : 'var(--text-main)',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '2px'
                  }}
                >
                  <span>⚪ Selesai</span>
                  <span style={{ fontSize: '10px', fontWeight: 500, color: txStatus === 'selesai' ? '#334155' : 'var(--text-muted)' }}>
                    Sudah Kembali
                  </span>
                </button>
              </div>
            </div>

            {/* 1. Referensi Unit Kendaraan & Jumlah Unit */}
            <div className="form-group" style={{ background: vehicleQuantity > 1 ? 'rgba(59, 130, 246, 0.03)' : 'transparent', padding: vehicleQuantity > 1 ? '14px' : '0', borderRadius: '12px', border: vehicleQuantity > 1 ? '1px solid rgba(59, 130, 246, 0.2)' : 'none', marginBottom: '16px' }}>
              
              {/* Pilihan Jumlah Kendaraan */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="form-label" style={{ margin: 0, fontWeight: 700, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Bike size={15} color="var(--primary)" />
                    Jumlah Kendaraan yang Disewa:
                  </label>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: vehicleQuantity > 1 ? '#2563eb' : 'var(--text-muted)' }}>
                    {vehicleQuantity} Unit {vehicleQuantity > 1 ? '(Multi-Kendaraan)' : '(Tunggal)'}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Stepper Jumlah */}
                  <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', background: '#fff' }}>
                    <button
                      type="button"
                      onClick={() => handleVehicleQuantityChange(Math.max(1, vehicleQuantity - 1))}
                      style={{ padding: '5px 12px', border: 'none', background: '#f8fafc', fontWeight: 800, fontSize: '14px', cursor: vehicleQuantity <= 1 ? 'not-allowed' : 'pointer', color: 'var(--text-main)' }}
                      disabled={vehicleQuantity <= 1}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={vehicleQuantity}
                      onChange={(e) => handleVehicleQuantityChange(Math.max(1, Number(e.target.value) || 1))}
                      style={{ width: '50px', textAlign: 'center', border: 'none', fontWeight: 800, fontSize: '14px', outline: 'none', color: 'var(--primary)' }}
                    />
                    <button
                      type="button"
                      onClick={() => handleVehicleQuantityChange(vehicleQuantity + 1)}
                      style={{ padding: '5px 12px', border: 'none', background: '#f8fafc', fontWeight: 800, fontSize: '14px', cursor: 'pointer', color: 'var(--text-main)' }}
                    >
                      +
                    </button>
                  </div>

                  {/* Preset Chips Jumlah Unit */}
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                    {[1, 2, 3, 4, 5].map((qty) => (
                      <button
                        key={qty}
                        type="button"
                        className={`btn btn-sm ${vehicleQuantity === qty ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => handleVehicleQuantityChange(qty)}
                        style={{ padding: '3px 8px', fontSize: '11px', borderRadius: '6px' }}
                      >
                        {qty} Unit
                      </button>
                    ))}
                  </div>

                  {/* Tombol Tambah Unit Cepat */}
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={handleAddVehicleUnit}
                    style={{ fontSize: '11px', padding: '4px 10px', gap: '4px', marginLeft: 'auto' }}
                  >
                    <Plus size={13} />
                    <span>Tambah Unit</span>
                  </button>
                </div>
              </div>

              {/* Banner Penjelasan jika > 1 Kendaraan */}
              {vehicleQuantity > 1 && (
                <div style={{
                  marginBottom: '12px',
                  padding: '8px 12px',
                  background: 'rgba(59, 130, 246, 0.08)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  borderRadius: '8px',
                  fontSize: '11px',
                  color: '#1e40af',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <Info size={16} style={{ flexShrink: 0 }} />
                  <span>
                    Pelanggan menyewa <strong>{vehicleQuantity} kendaraan</strong>. Setiap unit memiliki pilihan nomor polisi tersendiri yang bersifat <strong>tidak wajib diisi (opsional)</strong>.
                  </span>
                </div>
              )}

              {/* Daftar Input Nomor Polisi per Kendaraan */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {Array.from({ length: vehicleQuantity }).map((_, idx) => {
                  const currentPlate = vehiclePlates[idx] || '';
                  const fleetItem = getFleetForPlate(currentPlate);
                  const otherPlates = vehiclePlates.filter((_, i) => i !== idx).map(p => p.trim().toUpperCase()).filter(Boolean);

                  return (
                    <div 
                      key={idx} 
                      style={{ 
                        background: vehicleQuantity > 1 ? '#ffffff' : 'transparent',
                        padding: vehicleQuantity > 1 ? '10px 12px' : '0',
                        borderRadius: '10px',
                        border: vehicleQuantity > 1 ? '1px solid var(--border)' : 'none',
                        boxShadow: vehicleQuantity > 1 ? '0 1px 3px rgba(0,0,0,0.03)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                        <label className="form-label" style={{ margin: 0, fontSize: '12px', fontWeight: 700 }}>
                          {vehicleQuantity > 1 ? `Unit ${idx + 1}: Nomor Polisi Kendaraan` : 'Nomor Polisi Kendaraan'}{' '}
                          <span style={{ color: vehicleQuantity > 1 ? '#2563eb' : 'var(--accent-rose)', fontWeight: 700 }}>
                            {vehicleQuantity > 1 ? '(Opsional)' : '* (Wajib)'}
                          </span>
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {idx === 0 && (
                            <span className="badge badge-success" style={{ fontSize: '10px' }}>
                              {fleet.filter(f => f.status === 'available').length} Tersedia
                            </span>
                          )}
                          {vehicleQuantity > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveVehicleUnit(idx)}
                              className="btn-icon"
                              title={`Hapus Unit ${idx + 1}`}
                              style={{ color: 'var(--accent-rose)', padding: '2px', width: '22px', height: '22px', borderColor: 'transparent' }}
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      <SearchableSelect
                        options={fleet}
                        value={currentPlate}
                        valueKey="nopol"
                        displayKey="nopol"
                        secondaryKey="model"
                        badgeKey="status"
                        badgeRenderer={(item) => {
                          const isPickedOther = otherPlates.includes(item.nopol?.toUpperCase());
                          if (isPickedOther) {
                            return (
                              <span className="badge badge-warning" style={{ fontSize: '10px' }}>
                                Dipilih di unit lain
                              </span>
                            );
                          }
                          return (
                            <span className={`badge ${item.status === 'available' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '10px' }}>
                              {item.status === 'available' ? 'Tersedia' : item.status} • {formatRupiah(item.dailyRate)}/hari
                            </span>
                          );
                        }}
                        placeholder={vehicleQuantity > 1 ? `Opsional: Pilih atau ketik nopol Unit ${idx + 1}...` : "Pilih atau cari motor armada (nopol, merk, tipe)..."}
                        searchPlaceholder="Ketik nopol (B 1234 XYZ) atau nama motor..."
                        allowCustom={true}
                        customLabel="Gunakan nopol baru"
                        onChange={(val, item) => {
                          const plate = (item?.nopol || val || '').toUpperCase().trim();
                          handleUpdatePlate(idx, plate, item);
                        }}
                      />

                      {/* Rincian Motor Terpilih jika diisi */}
                      {fleetItem && (
                        <div style={{
                          marginTop: '6px',
                          padding: '6px 10px',
                          background: 'rgba(5, 150, 105, 0.07)',
                          border: '1px solid rgba(5, 150, 105, 0.25)',
                          borderRadius: '6px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '11px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Bike size={13} color="var(--primary)" />
                            <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>
                              {fleetItem.brand} {fleetItem.model} {fleetItem.color ? `(${fleetItem.color})` : ''}
                            </span>
                          </div>
                          <div style={{ color: 'var(--primary)', fontWeight: '700', fontFamily: 'var(--font-mono)' }}>
                            {formatRupiah(fleetItem.dailyRate)} / 24 Jam
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Integrasi Manajemen Pelanggan (Auto-fill) */}
            <div className="form-group" style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={14} />
                  PILIH PELANGGAN TERDAFTAR (AUTO-FILL)
                </span>
                <span className="badge badge-success" style={{ fontSize: '10px' }}>
                  {customers.length} Tersimpan
                </span>
              </div>

              <SearchableSelect
                options={customers}
                value={selectedCustomerId}
                onChange={(val, item) => {
                  if (item) {
                    setSelectedCustomerId(item.id);
                    setCustomerName(item.name);
                    setCustomerPhone(item.phone || '');
                    showToast(`Pelanggan "${item.name}" dipilih! Data terisi otomatis.`);
                  } else {
                    setSelectedCustomerId('');
                    setCustomerName(val);
                  }
                }}
                displayKey="name"
                secondaryKey="phone"
                badgeRenderer={(item) => (
                  <span className="badge" style={{ fontSize: '10px' }}>
                    {item.totalRentals || 0}x Sewa
                  </span>
                )}
                placeholder="Ketik nama pelanggan untuk mencari atau buat baru..."
                searchPlaceholder="Ketik nama pelanggan atau No. HP..."
                allowCustom={true}
                customLabel="Gunakan sebagai nama baru"
                style={{ marginBottom: '8px' }}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '6px' }}>
                <div>
                  <label className="form-label">Nama Pelanggan *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Nama Pelanggan"
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      setSelectedCustomerId('');
                    }}
                    required
                  />
                </div>

                <div>
                  <label className="form-label">No. WhatsApp / HP</label>
                  <input
                    type="tel"
                    className="form-control"
                    placeholder="0812..."
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    inputMode="numeric"
                  />
                </div>
              </div>

              {!selectedCustomerId && customerName.trim() && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                  <input
                    type="checkbox"
                    checked={autoSaveCustomer}
                    onChange={(e) => setAutoSaveCustomer(e.target.checked)}
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  <span>Simpan otomatis ke Master Pelanggan agar bisa dipilih lagi berikutnya</span>
                </label>
              )}
            </div>

            {/* 3. JADWAL SEWA & HITUNGAN HARI + EXTEND MAKSIMAL 4 JAM */}
            <div style={{ 
              background: '#f8fafc', 
              padding: '14px', 
              borderRadius: '12px', 
              border: '1px solid #e2e8f0', 
              marginBottom: '16px' 
            }}>
              <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={15} />
                JADWAL & DURASI SEWA (BERBASIS HARI & EXTEND MAKS. 4 JAM)
              </div>

              {/* Baris Mulai & Selesai Sewa */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: '700' }}>
                    📅 Mulai Sewa (Tgl & Jam) *
                  </label>
                  <input
                    type="datetime-local"
                    className="form-control"
                    value={startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: '700' }}>
                    🏁 Selesai Sewa (Tgl & Jam) *
                  </label>
                  <input
                    type="datetime-local"
                    className="form-control"
                    value={endDate}
                    onChange={(e) => handleEndDateChange(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Banner Peringatan jika Extend > 4 Jam */}
              {overtimeAlert && (
                <div style={{
                  marginTop: '10px',
                  padding: '8px 12px',
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '12px',
                  color: '#92400e'
                }}>
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{overtimeAlert}</span>
                </div>
              )}

              {/* Input Jumlah Hari & Preset Cepat */}
              <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed #cbd5e1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="form-label" style={{ marginBottom: 0, fontWeight: '700' }}>
                    ⏱️ Durasi Pokok Sewa (Hari):
                  </label>
                  <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                    {durationDays} Hari ({durationDays * 24} Jam)
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                  <input
                    type="number"
                    min="1"
                    className="form-control"
                    value={durationDays}
                    onChange={(e) => handleDaysChange(e.target.value)}
                    inputMode="numeric"
                    style={{ maxWidth: '90px', fontWeight: '700', fontSize: '15px' }}
                    required
                  />
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>Hari</span>

                  {/* Preset Chip Hari */}
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginLeft: 'auto' }}>
                    {[1, 2, 3, 7, 14, 28, 30].map((d) => (
                      <button
                        key={d}
                        type="button"
                        className={`btn btn-sm ${durationDays === d && extendHours === 0 ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => handleDaysChange(d)}
                        style={{ padding: '3px 7px', fontSize: '11px', borderRadius: '6px' }}
                      >
                        {d === 7 ? '7 Hr (1 Mgg)' : d === 14 ? '14 Hr (2 Mgg)' : d === 28 ? '28 Hr (1 Bln)' : `${d} Hr`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pilihan Extend / Jam Tambahan (Max 4 Jam @ Rp 10.000) */}
                <div style={{ marginTop: '10px', padding: '10px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)' }}>
                      Extend / Jam Tambahan (Maks. 4 Jam @ Rp 10.000/jam):
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: extendHours > 0 ? 'var(--primary)' : 'var(--text-muted)' }}>
                      {extendHours > 0 ? `+${extendHours} Jam (+${formatRupiah(extendHours * 10000)})` : 'Tidak Ada'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {[0, 1, 2, 3, 4].map((h) => (
                      <button
                        key={h}
                        type="button"
                        className={`btn btn-sm ${extendHours === h ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => handleExtendChange(h)}
                        style={{ flex: 1, minWidth: '60px', padding: '4px 6px', fontSize: '11px', borderRadius: '6px', textAlign: 'center' }}
                      >
                        {h === 0 ? 'Tanpa Extend' : `+${h} Jam (${h * 10}rb)`}
                      </button>
                    ))}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    * Kelebihan waktu lebih dari 4 jam otomatis dihitung nambah 1 hari sewa penuh.
                  </div>
                </div>

                {/* Ringkasan Durasi Lengkap */}
                <div style={{ 
                  marginTop: '10px', 
                  padding: '8px 12px', 
                  background: 'rgba(5, 150, 105, 0.05)', 
                  borderRadius: '8px', 
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--primary)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>Total Durasi Ditagih:</span>
                  <span style={{ fontWeight: '800' }}>
                    {getDurationSummary()}
                  </span>
                </div>
              </div>
            </div>

            {/* 4. Biaya Sewa Pokok */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Biaya Sewa Pokok (Rp) *</label>
                <span style={{ fontSize: '11px', color: selectedFleetItem ? 'var(--primary)' : 'var(--text-muted)', fontWeight: selectedFleetItem ? '700' : '400' }}>
                  {vehicleQuantity > 1 ? `${vehicleQuantity} Unit x ` : ''}
                  {durationDays} Hari x {formatRupiah(selectedFleetItem ? selectedFleetItem.dailyRate : 100000)}
                  {extendHours > 0 ? ` + Extend ${extendHours} Jam (${formatRupiah(extendHours * 10000 * vehicleQuantity)})` : ''}
                </span>
              </div>
              <input
                type="number"
                className="form-control"
                value={rentalPrice}
                onChange={(e) => setRentalPrice(Number(e.target.value))}
                inputMode="numeric"
                required
              />
            </div>

            {/* 5. Biaya Tambahan Dinamis */}
            <div className="form-group" style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>
                  BIAYA TAMBAHAN (OPSIONAL)
                </span>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={addExtraRow}
                  style={{ gap: '4px' }}
                >
                  <Plus size={14} />
                  <span>Tambah Item</span>
                </button>
              </div>

              {extraCosts.map((extra) => (
                <div key={extra.id} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Nama (Helm/Jas Hujan/Antar)"
                    value={extra.label}
                    onChange={(e) => updateExtraRow(extra.id, 'label', e.target.value)}
                    style={{ flex: 2 }}
                  />
                  <input
                    type="number"
                    className="form-control"
                    placeholder="Nominal"
                    value={extra.amount || ''}
                    onChange={(e) => updateExtraRow(extra.id, 'amount', Number(e.target.value))}
                    inputMode="numeric"
                    style={{ flex: 1.5 }}
                  />
                  {extraCosts.length > 1 && (
                    <button
                      type="button"
                      className="btn-icon"
                      onClick={() => removeExtraRow(extra.id)}
                      style={{ color: 'var(--accent-rose)', borderColor: 'rgba(244, 63, 94, 0.3)' }}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* 6. Total & Pembayaran */}
            <div style={{ background: 'var(--bg-card)', padding: '14px', borderRadius: '12px', marginBottom: '16px', border: '1px solid var(--border)' }}>
              
              {/* Diskon Nominal */}
              <div style={{ marginBottom: '14px', paddingBottom: '12px', borderBottom: '1px dashed var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="form-label" style={{ marginBottom: 0, fontWeight: 700, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    🏷️ Diskon Nominal (Potongan Harga)
                  </label>
                  {discount > 0 && (
                    <span style={{ fontSize: '12px', color: 'var(--accent-rose)', fontWeight: 800 }}>
                      - {formatRupiah(discount)}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>
                      Rp
                    </span>
                    <input
                      type="number"
                      min="0"
                      className="form-control"
                      placeholder="0"
                      value={discount || ''}
                      onChange={(e) => handleDiscountChange(e.target.value)}
                      inputMode="numeric"
                      style={{ paddingLeft: '36px', fontWeight: '700' }}
                    />
                  </div>
                  {discount > 0 && (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => handleDiscountChange(0)}
                      style={{ fontSize: '11px', padding: '7px 12px', color: 'var(--accent-rose)', borderColor: 'rgba(244, 63, 94, 0.4)' }}
                    >
                      Reset Diskon
                    </button>
                  )}
                </div>

                {/* Preset Chip Diskon */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[0, 10000, 20000, 25000, 50000, 100000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      className={`btn btn-sm ${discount === val ? 'btn-primary' : 'btn-outline'}`}
                      onClick={() => handleDiscountChange(val)}
                      style={{ padding: '3px 8px', fontSize: '11px', borderRadius: '6px' }}
                    >
                      {val === 0 ? 'Rp 0 (Tanpa Diskon)' : formatRupiah(val)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rincian Subtotal & Diskon jika ada */}
              {discount > 0 && (
                <div style={{ marginBottom: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span>Subtotal Sewa:</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{formatRupiah(subtotal)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent-rose)', fontWeight: 600 }}>
                    <span>Potongan Diskon:</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>- {formatRupiah(discount)}</span>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '17px', fontWeight: '800', marginBottom: '12px' }}>
                <span>Total Biaya:</span>
                <span style={{ color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>{formatRupiah(totalAmount)}</span>
              </div>

              {/* Status Pembayaran Pills */}
              <div style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                  Status Pembayaran
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentStatusOption('lunas');
                      setAmountPaid(String(totalAmount));
                    }}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '10px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: paymentStatusOption === 'lunas' ? '2px solid #16a34a' : '1px solid var(--border)',
                      backgroundColor: paymentStatusOption === 'lunas' ? 'rgba(22, 163, 74, 0.12)' : '#ffffff',
                      color: paymentStatusOption === 'lunas' ? '#16a34a' : 'var(--text-main)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    🟢 Lunas
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentStatusOption('sebagian');
                      if (amountPaid === '' || Number(amountPaid) >= totalAmount || amountPaid === '0') {
                        setAmountPaid('');
                      }
                    }}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '10px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: paymentStatusOption === 'sebagian' ? '2px solid #d97706' : '1px solid var(--border)',
                      backgroundColor: paymentStatusOption === 'sebagian' ? 'rgba(217, 119, 6, 0.12)' : '#ffffff',
                      color: paymentStatusOption === 'sebagian' ? '#d97706' : 'var(--text-main)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    🟡 Sebagian (DP)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentStatusOption('terhutang');
                      setAmountPaid('0');
                    }}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '10px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: paymentStatusOption === 'terhutang' ? '2px solid #e11d48' : '1px solid var(--border)',
                      backgroundColor: paymentStatusOption === 'terhutang' ? 'rgba(225, 29, 72, 0.12)' : '#ffffff',
                      color: paymentStatusOption === 'terhutang' ? '#e11d48' : 'var(--text-main)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    🔴 Terhutang
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="form-label">Metode Bayar</label>
                  <select
                    className="form-control"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="Tunai">Tunai (Cash)</option>
                    <option value="Transfer Bank">Transfer Bank</option>
                    <option value="QRIS">QRIS</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Jumlah Uang Diterima</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder={paymentStatusOption === 'terhutang' ? '0' : String(totalAmount)}
                    value={amountPaid}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAmountPaid(val);
                      if (val === '' || val === '0') {
                        setPaymentStatusOption('terhutang');
                      } else {
                        const num = Number(val);
                        if (num < totalAmount) {
                          setPaymentStatusOption('sebagian');
                        } else {
                          setPaymentStatusOption('lunas');
                        }
                      }
                    }}
                    inputMode="numeric"
                  />
                </div>
              </div>

              {/* Tampilan Sisa Tagihan (Hutang) atau Kembalian */}
              {remainingDebt > 0 && (
                <div style={{ marginTop: '10px', fontSize: '13px', color: 'var(--accent-rose)', fontWeight: '800', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Sisa Tagihan (Hutang):</span>
                  <span>{formatRupiah(remainingDebt)}</span>
                </div>
              )}

              {changeAmount > 0 && (
                <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--accent-amber)', fontWeight: '700', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Kembalian:</span>
                  <span>{formatRupiah(changeAmount)}</span>
                </div>
              )}
            </div>

            {/* 7. Catatan */}
            <div className="form-group">
              <label className="form-label">Catatan Tambahan</label>
              <textarea
                className="form-control"
                rows="2"
                placeholder="Catatan jaminan identitas, kondisi bodi motor..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Tombol Simpan & Batal */}
            <div style={{ display: 'flex', gap: '10px' }}>
              {editingTxId && (
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  onClick={handleCancelEdit}
                  disabled={isSubmitting}
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
                style={{ flex: 2, fontSize: '15px', opacity: isSubmitting ? 0.7 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="spin-animate" />
                    <span>{editingTxId ? 'Menyimpan Perubahan...' : 'Menyimpan Transaksi...'}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    <span>
                      {editingTxId 
                        ? 'Simpan Perubahan Transaksi' 
                        : 'Simpan Transaksi & Cetak Struk'}
                    </span>
                  </>
                )}
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
          placeholder="Cari no. transaksi, nama pelanggan, atau nopol..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Riwayat Transaksi */}
      <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)' }}>
          RIWAYAT TRANSAKSI {!isLoading && `(${filteredTransactions.length})`}
        </span>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => exportTransactionsToExcel(filteredTransactions, fleet, settings)}
            style={{ fontSize: '11px', padding: '4px 10px', background: '#ffffff', borderRadius: '8px', fontWeight: 600 }}
            title="Ekspor ke Excel"
          >
            Ekspor Excel
          </button>
          <Link 
            href="/transaksi" 
            style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}
          >
            Menu Transaksi &rarr;
          </Link>
        </div>
      </div>

      {isLoading ? (
        <SkeletonList count={3} variant="transaction" />
      ) : filteredTransactions.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-dim)' }}>
          <Bike size={42} strokeWidth={1.5} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
          <p style={{ fontWeight: '600', fontSize: '14px' }}>Belum ada transaksi sewa</p>
          <p style={{ fontSize: '12px', marginTop: '4px' }}>Klik "Buat Transaksi Sewa Baru" untuk memulai</p>
        </div>
      ) : (
        filteredTransactions.map((tx) => {
          const hours = tx.durationHours || (Number(tx.durationDays) || 1) * 24;
          const st = getTransactionStatus(tx);
          const paySt = getPaymentStatus(tx);
          return (
            <div
              key={tx.id}
              className="list-item"
              onClick={() => setSelectedTx(tx)}
            >
              <div className="item-top">
                <span className="item-id">{tx.id}</span>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span className={`badge ${paySt.badgeClass}`} style={{ fontSize: '10px', fontWeight: '700' }}>
                    {paySt.label}
                  </span>
                  <span className={`badge ${st.badgeClass}`} style={{ fontSize: '10px', fontWeight: '700' }}>
                    {st.label}
                  </span>
                  <span className="badge" style={{ background: '#e0f2fe', color: '#0369a1', fontWeight: '700' }}>
                    {hours} Jam
                  </span>
                  <span className="badge badge-plate">{tx.nopol}</span>
                </div>
              </div>

              <div className="item-middle">
                <div className="item-title">{tx.customerName}</div>
                <div className="item-amount" style={{ color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                  {formatRupiah(tx.total)}
                </div>
              </div>

              {/* Tanggal & Jam Mulai s/d Selesai */}
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                <div>Mulai: {formatDateTime(tx.startDate)}</div>
                <div>Selesai: {formatDateTime(tx.endDate)}</div>
              </div>

              <div className="item-bottom">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Metode: <strong>{tx.paymentMethod || 'Tunai'}</strong>
                  </span>
                  {paySt.remaining > 0 && (
                    <span style={{ fontSize: '11px', color: 'var(--accent-rose)', fontWeight: 800 }}>
                      (Kurang {formatRupiah(paySt.remaining)})
                    </span>
                  )}
                </div>

                {/* Tombol Aksi Cepat: Edit, Cetak, Hapus */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn-icon"
                    style={{ width: '32px', height: '32px', color: 'var(--primary)', borderColor: 'var(--primary-border)' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartEdit(tx);
                    }}
                    title="Edit Transaksi Ini"
                  >
                    <Edit2 size={14} />
                  </button>

                  <button
                    type="button"
                    className="btn-icon"
                    style={{ width: '32px', height: '32px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setStrukTx(tx);
                    }}
                    title="Cetak Struk / Invoice"
                  >
                    <Printer size={14} />
                  </button>

                  <button
                    type="button"
                    className="btn-icon"
                    style={{ width: '32px', height: '32px', color: 'var(--accent-rose)', borderColor: 'rgba(244, 63, 94, 0.3)' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(tx.id);
                    }}
                    title="Hapus Transaksi"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })
      )}

      {/* Modal Detail */}
      {selectedTx && (
        <ModalDetail
          tx={selectedTx}
          onClose={() => setSelectedTx(null)}
          onEdit={(item) => handleStartEdit(item)}
          onPrint={(item) => {
            setSelectedTx(null);
            setStrukTx(item);
          }}
          onDelete={handleDelete}
        />
      )}

      {/* Modal Struk & Invoice */}
      {strukTx && settings && (
        <StrukModal
          tx={strukTx}
          settings={settings}
          onClose={() => setStrukTx(null)}
        />
      )}
    </div>
  );
}
