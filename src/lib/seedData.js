// Data Awal Demo POS SHELBY RENT

export const initialCustomers = [
  {
    id: "CST-001",
    name: "Rian Hidayat",
    phone: "081298765432",
    nik: "3171012345670001",
    address: "Jl. Melati No. 12, Jakarta",
    emergencyContact: "081211223344 (Istri)",
    notes: "Pelanggan langganan mingguan. SIM C aktif.",
    totalRentals: 4,
    createdAt: "2026-08-10T10:00:00.000Z"
  },
  {
    id: "CST-002",
    name: "Dimas Anggara",
    phone: "085712348899",
    nik: "3275023456780002",
    address: "Jl. Kenanga No. 45, Bekasi",
    emergencyContact: "085799887766 (Kakak)",
    notes: "Sering sewa Vario harian untuk dinas kantor.",
    totalRentals: 2,
    createdAt: "2026-09-01T14:30:00.000Z"
  },
  {
    id: "CST-003",
    name: "Siti Nurhaliza",
    phone: "087899881122",
    nik: "3175034567890003",
    address: "Apartemen Bassura City Tower D, Jakarta Timur",
    emergencyContact: "087833445566 (Teman)",
    notes: "Unit selalu kembali dalam kondisi sangat bersih.",
    totalRentals: 3,
    createdAt: "2026-09-05T09:15:00.000Z"
  }
];

export const initialFleet = [
  {
    id: "MTR-001",
    nopol: "B 4812 KDA",
    brand: "Yamaha",
    model: "NMAX 155",
    color: "Hitam Doff",
    year: "2023",
    dailyRate: 140000,
    status: "rented",
    taxAnnualDate: "2026-11-20",
    taxFiveYearDate: "2028-11-20"
  },
  {
    id: "MTR-002",
    nopol: "B 3901 UZH",
    brand: "Honda",
    model: "Vario 160",
    color: "Merah",
    year: "2023",
    dailyRate: 110000,
    status: "available",
    taxAnnualDate: "2026-10-10",
    taxFiveYearDate: "2028-10-10"
  },
  {
    id: "MTR-003",
    nopol: "B 6520 ZEL",
    brand: "Honda",
    model: "Beat Street",
    color: "Abu-abu",
    year: "2022",
    dailyRate: 85000,
    status: "available",
    taxAnnualDate: "2026-08-15",
    taxFiveYearDate: "2027-08-15"
  },
  {
    id: "MTR-004",
    nopol: "B 1189 JKL",
    brand: "Honda",
    model: "PCX 160",
    color: "Putih",
    year: "2024",
    dailyRate: 145000,
    status: "maintenance",
    taxAnnualDate: "2027-03-25",
    taxFiveYearDate: "2029-03-25"
  },
  {
    id: "MTR-005",
    nopol: "B 5543 TRX",
    brand: "Honda",
    model: "Scoopy Prestige",
    color: "Hijau Sage",
    year: "2023",
    dailyRate: 95000,
    status: "available",
    taxAnnualDate: "2026-12-05",
    taxFiveYearDate: "2028-12-05"
  }
];

export const initialTransactions = [
  {
    id: "TRX-20260919-001",
    nopol: "B 4812 KDA",
    customerId: "CST-001",
    customerName: "Rian Hidayat",
    customerPhone: "081298765432",
    startDate: "2026-09-19T09:00",
    endDate: "2026-09-21T09:00",
    durationDays: 2,
    rentalPrice: 280000,
    extraCosts: [
      { id: "e1", label: "Helm Tambahan", amount: 20000 },
      { id: "e2", label: "Jas Hujan Dobel", amount: 15000 },
      { id: "e3", label: "Antar Unit ke Stasiun", amount: 25000 }
    ],
    total: 340000,
    paymentMethod: "QRIS",
    amountPaid: 340000,
    changeAmount: 0,
    notes: "KTP asli + SIM C aktif sudah diverifikasi. Helm 2 pcs.",
    createdAt: "2026-09-19T09:15:00.000Z"
  },
  {
    id: "TRX-20260918-002",
    nopol: "B 3901 UZH",
    customerId: "CST-002",
    customerName: "Dimas Anggara",
    customerPhone: "085712348899",
    startDate: "2026-09-18T10:00",
    endDate: "2026-09-19T10:00",
    durationDays: 1,
    rentalPrice: 110000,
    extraCosts: [
      { id: "e1", label: "Jas Hujan", amount: 10000 }
    ],
    total: 120000,
    paymentMethod: "Tunai",
    amountPaid: 150000,
    changeAmount: 30000,
    notes: "Sewa harian keliling kota. Unit sudah dikembalikan tepat waktu.",
    createdAt: "2026-09-18T10:10:00.000Z"
  },
  {
    id: "TRX-20260917-003",
    nopol: "B 6520 ZEL",
    customerId: "CST-003",
    customerName: "Siti Nurhaliza",
    customerPhone: "087899881122",
    startDate: "2026-09-17T08:00",
    endDate: "2026-09-19T08:00",
    durationDays: 2,
    rentalPrice: 170000,
    extraCosts: [
      { id: "e1", label: "Helm Tambahan", amount: 20000 }
    ],
    total: 190000,
    paymentMethod: "Transfer Bank",
    amountPaid: 190000,
    changeAmount: 0,
    notes: "Selesai tepat waktu. Unit bersih.",
    createdAt: "2026-09-17T08:05:00.000Z"
  }
];

export const initialExpenses = [
  {
    id: "EXP-20260919-001",
    isVehicleRelated: true,
    nopol: "B 1189 JKL",
    category: "Servis & Sparepart",
    amount: 175000,
    description: "Ganti Oli Mesin Motul & Oli Gardan + Service CVT Berkala",
    date: "2026-09-19T11:30",
    receiptPhoto: null,
    gdriveFileId: null,
    gdriveLink: null,
    createdAt: "2026-09-19T11:35:00.000Z"
  },
  {
    id: "EXP-20260918-002",
    isVehicleRelated: true,
    nopol: "B 3901 UZH",
    category: "Cuci & Perawatan",
    amount: 25000,
    description: "Cuci motor hidrolik + poles bodi setelah sewa",
    date: "2026-09-18T16:00",
    receiptPhoto: null,
    gdriveFileId: null,
    gdriveLink: null,
    createdAt: "2026-09-18T16:05:00.000Z"
  },
  {
    id: "EXP-20260916-003",
    isVehicleRelated: false,
    nopol: "",
    category: "Operasional Toko",
    amount: 150000,
    description: "Beli Token Listrik PLN Outlet & Galon Air Minum",
    date: "2026-09-16T14:00",
    receiptPhoto: null,
    gdriveFileId: null,
    gdriveLink: null,
    createdAt: "2026-09-16T14:10:00.000Z"
  }
];

export const initialSettings = {
  storeName: "SHELBY RENT",
  tagline: "Rental Motor Profesional, Cepat & Terpercaya",
  address: "Jl. Pemuda No. 88, Rawamangun, Jakarta Timur",
  phone: "0812-3456-7890",
  logoUrl: "/images/logo-shelby-rent.png",
  footerNote: "SYARAT & KETENTUAN SHELBY RENT:\n1. KTP/Identitas asli dititipkan selama masa sewa.\n2. Wajib menggunakan helm SNI yang telah disediakan.\n3. Bahan bakar kembali sesuai indikator posisi awal.\n4. Keterlambatan pengembalian unit dikenakan denda Rp 15.000/jam.\nTerima kasih telah mempercayai layanan SHELBY RENT!",
  paperSize: "58mm", // '58mm' atau '80mm'
  cashierName: "Admin Shelby",
  role: "Kasir Operasional",
  pin: "1234",
  isPinEnabled: false
};
